package config

import (
	"os"
	"strconv"
)

type Config struct {
	AIProvider         string
	AIModel            string
	OpenAIKey          string
	AnthropicKey       string
	DatabaseURL        string
	Port               string
	AllowedOrigin      string
	RateLimitPerMinute int
	InputTokenUSD      float64
	OutputTokenUSD     float64
}

func Load() Config {
	return Config{
		AIProvider:         getenv("AI_PROVIDER", "mock"),
		AIModel:            getenv("AI_MODEL", "mock-product-copy-v1"),
		OpenAIKey:          os.Getenv("OPENAI_API_KEY"),
		AnthropicKey:       os.Getenv("ANTHROPIC_API_KEY"),
		DatabaseURL:        getenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/product_ai?sslmode=disable"),
		Port:               getenv("PORT", "8080"),
		AllowedOrigin:      getenv("ALLOWED_ORIGIN", "http://localhost:5173"),
		RateLimitPerMinute: getenvInt("RATE_LIMIT_PER_MINUTE", 30),
		InputTokenUSD:      getenvFloat("INPUT_TOKEN_USD", 0.000003),
		OutputTokenUSD:     getenvFloat("OUTPUT_TOKEN_USD", 0.000015),
	}
}

func getenv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func getenvInt(key string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func getenvFloat(key string, fallback float64) float64 {
	value, err := strconv.ParseFloat(os.Getenv(key), 64)
	if err != nil || value < 0 {
		return fallback
	}
	return value
}
