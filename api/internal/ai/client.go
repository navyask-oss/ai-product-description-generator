package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"ai-product-description-generator/api/internal/config"
)

type ProductInput struct {
	ProductName string `json:"productName"`
	ProductNotes string `json:"productNotes"`
	Category     string `json:"category"`
	Tone         string `json:"tone"`
	ImageBase64  string `json:"imageBase64,omitempty"`
	ImageMime    string `json:"imageMime,omitempty"`
}

type GeneratedContent struct {
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	Tags            []string `json:"tags"`
	MetaDescription string   `json:"metaDescription"`
	Highlights      []string `json:"highlights"`
}

type Usage struct {
	InputTokens  int     `json:"inputTokens"`
	OutputTokens int     `json:"outputTokens"`
	CostUSD      float64 `json:"costUsd"`
	Provider     string  `json:"provider"`
	Model        string  `json:"model"`
}

type Client struct {
	cfg        config.Config
	httpClient *http.Client
}

func NewClient(cfg config.Config) *Client {
	return &Client{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

func (c *Client) Generate(ctx context.Context, input ProductInput, prompt string) (GeneratedContent, Usage, string, error) {
	provider := strings.ToLower(c.cfg.AIProvider)
	switch provider {
	case "anthropic":
		return c.generateAnthropic(ctx, input, prompt)
	case "openai":
		return c.generateOpenAI(ctx, input, prompt)
	case "mock":
		return c.generateMock(input)
	default:
		return GeneratedContent{}, Usage{}, "", fmt.Errorf("unsupported AI_PROVIDER %q", c.cfg.AIProvider)
	}
}

func (c *Client) generateMock(input ProductInput) (GeneratedContent, Usage, string, error) {
	name := fallback(input.ProductName, "Custom Product")
	category := fallback(input.Category, "e-commerce")
	tone := fallback(input.Tone, "professional")
	content := GeneratedContent{
		Title:           fmt.Sprintf("%s for %s buyers", name, category),
		Description:     fmt.Sprintf("Meet %s, a polished %s product description written in a %s tone. This draft focuses on clear benefits, buyer confidence, and searchable language while keeping the copy easy to reuse across product pages, ads, and marketplace listings.", name, category, strings.ToLower(tone)),
		Tags:            []string{"custom", strings.ToLower(category), "seo", "product-copy", "ecommerce", "ai-generated"},
		MetaDescription: fmt.Sprintf("Shop %s with clear benefits, polished details, and SEO-ready product copy.", name),
		Highlights:      []string{"SEO-ready title", "Benefit-led description", "Reusable tags", "Fast internal workflow"},
	}
	usage := Usage{InputTokens: 280, OutputTokens: 190, Provider: "mock", Model: c.cfg.AIModel}
	usage.CostUSD = c.cost(usage.InputTokens, usage.OutputTokens)
	raw, _ := json.Marshal(content)
	return content, usage, string(raw), nil
}

func (c *Client) generateAnthropic(ctx context.Context, input ProductInput, prompt string) (GeneratedContent, Usage, string, error) {
	if c.cfg.AnthropicKey == "" {
		return GeneratedContent{}, Usage{}, "", errors.New("ANTHROPIC_API_KEY is required")
	}

	userContent := []map[string]any{{"type": "text", "text": renderPrompt(prompt, input)}}
	if input.ImageBase64 != "" && input.ImageMime != "" {
		userContent = append([]map[string]any{{
			"type": "image",
			"source": map[string]any{
				"type":       "base64",
				"media_type": input.ImageMime,
				"data":       input.ImageBase64,
			},
		}}, userContent...)
	}

	body := map[string]any{
		"model":      c.cfg.AIModel,
		"max_tokens": 900,
		"messages": []map[string]any{{
			"role":    "user",
			"content": userContent,
		}},
	}

	payload, _ := json.Marshal(body)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(payload))
	req.Header.Set("content-type", "application/json")
	req.Header.Set("x-api-key", c.cfg.AnthropicKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return GeneratedContent{}, Usage{}, "", err
	}
	defer resp.Body.Close()

	rawBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return GeneratedContent{}, Usage{}, string(rawBody), fmt.Errorf("anthropic error: %s", resp.Status)
	}

	var parsed struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(rawBody, &parsed); err != nil {
		return GeneratedContent{}, Usage{}, string(rawBody), err
	}

	text := ""
	for _, part := range parsed.Content {
		if part.Type == "text" {
			text += part.Text
		}
	}

	content, err := parseGeneratedContent(text)
	if err != nil {
		return GeneratedContent{}, Usage{}, text, err
	}

	usage := Usage{InputTokens: parsed.Usage.InputTokens, OutputTokens: parsed.Usage.OutputTokens, Provider: "anthropic", Model: c.cfg.AIModel}
	usage.CostUSD = c.cost(usage.InputTokens, usage.OutputTokens)
	return content, usage, text, nil
}

func (c *Client) generateOpenAI(ctx context.Context, input ProductInput, prompt string) (GeneratedContent, Usage, string, error) {
	if c.cfg.OpenAIKey == "" {
		return GeneratedContent{}, Usage{}, "", errors.New("OPENAI_API_KEY is required")
	}

	content := []map[string]any{{"type": "text", "text": renderPrompt(prompt, input)}}
	if input.ImageBase64 != "" && input.ImageMime != "" {
		content = append(content, map[string]any{
			"type": "image_url",
			"image_url": map[string]string{
				"url": "data:" + input.ImageMime + ";base64," + input.ImageBase64,
			},
		})
	}

	body := map[string]any{
		"model": c.cfg.AIModel,
		"messages": []map[string]any{{
			"role":    "user",
			"content": content,
		}},
		"temperature": 0.4,
	}

	payload, _ := json.Marshal(body)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(payload))
	req.Header.Set("content-type", "application/json")
	req.Header.Set("authorization", "Bearer "+c.cfg.OpenAIKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return GeneratedContent{}, Usage{}, "", err
	}
	defer resp.Body.Close()

	rawBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return GeneratedContent{}, Usage{}, string(rawBody), fmt.Errorf("openai error: %s", resp.Status)
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(rawBody, &parsed); err != nil {
		return GeneratedContent{}, Usage{}, string(rawBody), err
	}
	if len(parsed.Choices) == 0 {
		return GeneratedContent{}, Usage{}, string(rawBody), errors.New("openai response had no choices")
	}

	text := parsed.Choices[0].Message.Content
	generated, err := parseGeneratedContent(text)
	if err != nil {
		return GeneratedContent{}, Usage{}, text, err
	}

	usage := Usage{InputTokens: parsed.Usage.PromptTokens, OutputTokens: parsed.Usage.CompletionTokens, Provider: "openai", Model: c.cfg.AIModel}
	usage.CostUSD = c.cost(usage.InputTokens, usage.OutputTokens)
	return generated, usage, text, nil
}

func renderPrompt(prompt string, input ProductInput) string {
	replacements := map[string]string{
		"{{product_name}}":  input.ProductName,
		"{{product_notes}}": input.ProductNotes,
		"{{category}}":      input.Category,
		"{{tone}}":          input.Tone,
	}
	for key, value := range replacements {
		prompt = strings.ReplaceAll(prompt, key, fallback(value, "not provided"))
	}
	return prompt
}

func parseGeneratedContent(raw string) (GeneratedContent, error) {
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start == -1 || end == -1 || end <= start {
		return GeneratedContent{}, errors.New("model did not return a JSON object")
	}
	var content GeneratedContent
	if err := json.Unmarshal([]byte(raw[start:end+1]), &content); err != nil {
		return GeneratedContent{}, err
	}
	if content.Title == "" || content.Description == "" {
		return GeneratedContent{}, errors.New("generated content missing title or description")
	}
	return content, nil
}

func (c *Client) cost(inputTokens, outputTokens int) float64 {
	return float64(inputTokens)*c.cfg.InputTokenUSD + float64(outputTokens)*c.cfg.OutputTokenUSD
}

func fallback(value, fallbackValue string) string {
	if strings.TrimSpace(value) == "" {
		return fallbackValue
	}
	return value
}
