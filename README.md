# AI Product Description Generator

Internal AI tool for generating SEO-ready product titles, descriptions, tags, and meta descriptions from product notes or images.

## Why This Project

This project shows practical AI tool building: a React TypeScript UI, a Go API, PostgreSQL-backed version history, prompt files, evals, rate limiting, and cost tracking. It is designed as an internal productivity tool for fast product catalog operations.

## Features

- Upload a product image or enter product notes
- Generate SEO-optimized title, description, tags, meta description, and highlights
- Bulk mode for up to 100 products per request
- PostgreSQL version history for every generation
- One-click copy to clipboard
- Export generation history as CSV
- Rate limiting by client IP
- Cost tracking dashboard using token usage
- Versioned prompt file in `prompts/`
- Prompt quality evals in `evals/`

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind
- API: Go, standard `net/http`
- Database: PostgreSQL
- AI: Anthropic API, OpenAI API, or local mock mode
- Deployment target: GCP Cloud Run / Cloud Functions style container

## Project Structure

```text
ai-product-description-generator/
|-- frontend/   React + TypeScript UI
|-- api/        Go REST API
|-- prompts/    Versioned prompt files
|-- evals/      Prompt quality test suite
|-- docs/       Learning and delivery plan
|-- Dockerfile
|-- docker-compose.yml
`-- README.md
```

## Local Setup

1. Start PostgreSQL:

```bash
docker compose up -d postgres
```

2. Configure environment:

```bash
cp .env.example .env
```

Use `AI_PROVIDER=mock` for local demo mode without API keys. Use `AI_PROVIDER=anthropic` or `AI_PROVIDER=openai` when keys are available.

3. Run the Go API:

```bash
cd api
go mod tidy
go run ./cmd/server
```

4. Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:8080`

## API Endpoints

- `POST /api/generate` - Generate one product description
- `POST /api/bulk` - Generate up to 100 product descriptions
- `GET /api/history` - Load generation history
- `GET /api/costs` - Load token and cost summary
- `GET /healthz` - Health check

## Cost Benchmarks

Default local benchmark uses configurable token prices:

| Run Type | Estimated Tokens | Estimated Cost |
|---|---:|---:|
| Text-only single product | 470 tokens | `$0.0037` |
| Image + text single product | 900 tokens | `$0.0075` |
| 100-product bulk run | 47,000 tokens | `$0.3700` |

The real cost depends on provider, model, image usage, and final token counts returned by the API.

## Prompt Evals

With the API running:

```bash
cd evals
npm install
npm run eval
```

The eval checks required product terms, tag count, and meta description length.

## Deployment Notes

The API is container-ready through `Dockerfile`. For GCP Cloud Run:

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/product-description-api
gcloud run deploy product-description-api --image gcr.io/PROJECT_ID/product-description-api --platform managed
```

Set secrets for `DATABASE_URL`, `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY` in GCP Secret Manager before production deployment.

## Security Notes

- API keys stay server-side in the Go API.
- The frontend never calls Anthropic or OpenAI directly.
- `.env` files are ignored by Git.
- Raw uploaded images are not persisted by default.
- Rate limiting protects cost and abuse risk.
