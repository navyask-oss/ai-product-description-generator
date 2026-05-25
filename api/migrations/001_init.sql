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
