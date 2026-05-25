package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type Generation struct {
	ID              int64     `json:"id"`
	ProductName     string    `json:"productName"`
	Category        string    `json:"category"`
	Tone            string    `json:"tone"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	Tags            []string  `json:"tags"`
	MetaDescription string    `json:"metaDescription"`
	Highlights      []string  `json:"highlights"`
	Provider        string    `json:"provider"`
	Model           string    `json:"model"`
	PromptVersion   string    `json:"promptVersion"`
	InputTokens     int       `json:"inputTokens"`
	OutputTokens    int       `json:"outputTokens"`
	CostUSD         float64   `json:"costUsd"`
	CreatedAt       time.Time `json:"createdAt"`
}

type CostSummary struct {
	Generations  int64   `json:"generations"`
	InputTokens  int64   `json:"inputTokens"`
	OutputTokens int64   `json:"outputTokens"`
	CostUSD      float64 `json:"costUsd"`
}

func Open(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetConnMaxLifetime(30 * time.Minute)
	return db, db.Ping()
}

func EnsureSchema(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS generations (
	id BIGSERIAL PRIMARY KEY,
	product_name TEXT NOT NULL,
	category TEXT NOT NULL,
	tone TEXT NOT NULL,
	title TEXT NOT NULL,
	description TEXT NOT NULL,
	tags JSONB NOT NULL DEFAULT '[]',
	meta_description TEXT NOT NULL DEFAULT '',
	highlights JSONB NOT NULL DEFAULT '[]',
	provider TEXT NOT NULL,
	model TEXT NOT NULL,
	prompt_version TEXT NOT NULL,
	input_tokens INTEGER NOT NULL DEFAULT 0,
	output_tokens INTEGER NOT NULL DEFAULT 0,
	cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_product_name ON generations(product_name);
`)
	return err
}

func InsertGeneration(ctx context.Context, db *sql.DB, generation Generation) (Generation, error) {
	tags, _ := json.Marshal(generation.Tags)
	highlights, _ := json.Marshal(generation.Highlights)
	err := db.QueryRowContext(ctx, `
INSERT INTO generations (
	product_name, category, tone, title, description, tags, meta_description,
	highlights, provider, model, prompt_version, input_tokens, output_tokens, cost_usd
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
RETURNING id, created_at
`,
		generation.ProductName,
		generation.Category,
		generation.Tone,
		generation.Title,
		generation.Description,
		tags,
		generation.MetaDescription,
		highlights,
		generation.Provider,
		generation.Model,
		generation.PromptVersion,
		generation.InputTokens,
		generation.OutputTokens,
		generation.CostUSD,
	).Scan(&generation.ID, &generation.CreatedAt)
	return generation, err
}

func ListGenerations(ctx context.Context, db *sql.DB, limit int) ([]Generation, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := db.QueryContext(ctx, `
SELECT id, product_name, category, tone, title, description, tags, meta_description,
	highlights, provider, model, prompt_version, input_tokens, output_tokens, cost_usd, created_at
FROM generations
ORDER BY created_at DESC
LIMIT $1
`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Generation{}
	for rows.Next() {
		var item Generation
		var tags []byte
		var highlights []byte
		if err := rows.Scan(
			&item.ID,
			&item.ProductName,
			&item.Category,
			&item.Tone,
			&item.Title,
			&item.Description,
			&tags,
			&item.MetaDescription,
			&highlights,
			&item.Provider,
			&item.Model,
			&item.PromptVersion,
			&item.InputTokens,
			&item.OutputTokens,
			&item.CostUSD,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(tags, &item.Tags)
		_ = json.Unmarshal(highlights, &item.Highlights)
		items = append(items, item)
	}
	return items, rows.Err()
}

func CostSummaryForAll(ctx context.Context, db *sql.DB) (CostSummary, error) {
	var summary CostSummary
	err := db.QueryRowContext(ctx, `
SELECT COUNT(*), COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0), COALESCE(SUM(cost_usd),0)
FROM generations
`).Scan(&summary.Generations, &summary.InputTokens, &summary.OutputTokens, &summary.CostUSD)
	return summary, err
}
