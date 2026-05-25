package httpapi

import (
	"database/sql"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"ai-product-description-generator/api/internal/ai"
	"ai-product-description-generator/api/internal/config"
	"ai-product-description-generator/api/internal/store"
)

const promptVersion = "product_description_v1"

type Server struct {
	cfg     config.Config
	db      *sql.DB
	ai      *ai.Client
	prompt  string
	limiter *Limiter
}

type generateRequest struct {
	ProductName string `json:"productName"`
	ProductNotes string `json:"productNotes"`
	Category     string `json:"category"`
	Tone         string `json:"tone"`
	ImageBase64  string `json:"imageBase64"`
	ImageMime    string `json:"imageMime"`
}

type bulkRequest struct {
	Products []generateRequest `json:"products"`
}

func NewServer(cfg config.Config, db *sql.DB, aiClient *ai.Client) *Server {
	promptBytes, err := os.ReadFile("../prompts/product_description_v1.md")
	if err != nil {
		promptBytes, _ = os.ReadFile("../../prompts/product_description_v1.md")
	}
	if len(promptBytes) == 0 {
		promptBytes = []byte("Generate JSON product copy for {{product_name}} in {{tone}} tone.")
	}
	return &Server{
		cfg:     cfg,
		db:      db,
		ai:      aiClient,
		prompt:  string(promptBytes),
		limiter: NewLimiter(cfg.RateLimitPerMinute),
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("POST /api/generate", s.generate)
	mux.HandleFunc("POST /api/bulk", s.bulk)
	mux.HandleFunc("GET /api/history", s.history)
	mux.HandleFunc("GET /api/costs", s.costs)
	return s.cors(s.rateLimit(mux))
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) generate(w http.ResponseWriter, r *http.Request) {
	var req generateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	item, err := s.generateOne(r, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, item)
}

func (s *Server) bulk(w http.ResponseWriter, r *http.Request) {
	var req bulkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if len(req.Products) == 0 || len(req.Products) > 100 {
		writeError(w, http.StatusBadRequest, "bulk mode supports 1 to 100 products")
		return
	}

	results := []store.Generation{}
	for _, product := range req.Products {
		item, err := s.generateOne(r, product)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		results = append(results, item)
	}
	writeJSON(w, http.StatusOK, map[string]any{"results": results})
}

func (s *Server) history(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := store.ListGenerations(r.Context(), s.db, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load history")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) costs(w http.ResponseWriter, r *http.Request) {
	summary, err := store.CostSummaryForAll(r.Context(), s.db)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load cost summary")
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) generateOne(r *http.Request, req generateRequest) (store.Generation, error) {
	req.ProductName = strings.TrimSpace(req.ProductName)
	req.ProductNotes = strings.TrimSpace(req.ProductNotes)
	req.Category = fallback(strings.TrimSpace(req.Category), "general")
	req.Tone = fallback(strings.TrimSpace(req.Tone), "professional")

	if req.ProductName == "" && req.ProductNotes == "" && req.ImageBase64 == "" {
		return store.Generation{}, errors.New("product name, notes, or image is required")
	}
	if req.ImageBase64 != "" {
		if _, err := base64.StdEncoding.DecodeString(req.ImageBase64); err != nil {
			return store.Generation{}, errors.New("imageBase64 must be valid base64")
		}
	}

	generated, usage, _, err := s.ai.Generate(r.Context(), ai.ProductInput{
		ProductName: req.ProductName,
		ProductNotes: req.ProductNotes,
		Category:     req.Category,
		Tone:         req.Tone,
		ImageBase64:  req.ImageBase64,
		ImageMime:    req.ImageMime,
	}, s.prompt)
	if err != nil {
		return store.Generation{}, err
	}

	return store.InsertGeneration(r.Context(), s.db, store.Generation{
		ProductName:     fallback(req.ProductName, "Untitled product"),
		Category:        req.Category,
		Tone:            req.Tone,
		Title:           generated.Title,
		Description:     generated.Description,
		Tags:            generated.Tags,
		MetaDescription: generated.MetaDescription,
		Highlights:      generated.Highlights,
		Provider:        usage.Provider,
		Model:           usage.Model,
		PromptVersion:   promptVersion,
		InputTokens:     usage.InputTokens,
		OutputTokens:    usage.OutputTokens,
		CostUSD:         usage.CostUSD,
	})
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", s.cfg.AllowedOrigin)
		w.Header().Set("Access-Control-Allow-Headers", "content-type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) rateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" {
			next.ServeHTTP(w, r)
			return
		}
		host, _, _ := net.SplitHostPort(r.RemoteAddr)
		if host == "" {
			host = r.RemoteAddr
		}
		if !s.limiter.Allow(host) {
			writeError(w, http.StatusTooManyRequests, "rate limit exceeded")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func fallback(value, fallbackValue string) string {
	if strings.TrimSpace(value) == "" {
		return fallbackValue
	}
	return value
}

func CSVProducts(reader *csv.Reader) ([]generateRequest, error) {
	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}
	products := []generateRequest{}
	for index, row := range records {
		if index == 0 && strings.EqualFold(row[0], "productName") {
			continue
		}
		if len(row) < 2 {
			continue
		}
		products = append(products, generateRequest{
			ProductName:  row[0],
			ProductNotes: row[1],
			Category:     valueAt(row, 2, "general"),
			Tone:         valueAt(row, 3, "professional"),
		})
	}
	return products, nil
}

func valueAt(values []string, index int, fallbackValue string) string {
	if len(values) <= index || strings.TrimSpace(values[index]) == "" {
		return fallbackValue
	}
	return values[index]
}

type Limiter struct {
	mu       sync.Mutex
	limit    int
	counters map[string]counter
}

type counter struct {
	window time.Time
	count  int
}

func NewLimiter(limit int) *Limiter {
	return &Limiter{limit: limit, counters: map[string]counter{}}
}

func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now().Truncate(time.Minute)
	current := l.counters[key]
	if !current.window.Equal(now) {
		current = counter{window: now}
	}
	current.count++
	l.counters[key] = current
	return current.count <= l.limit
}
