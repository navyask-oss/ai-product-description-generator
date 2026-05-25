export type Generation = {
  id: number;
  productName: string;
  category: string;
  tone: string;
  title: string;
  description: string;
  tags: string[];
  metaDescription: string;
  highlights: string[];
  provider: string;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
};

export type ProductInput = {
  productName: string;
  productNotes: string;
  category: string;
  tone: string;
  imageBase64?: string;
  imageMime?: string;
};

export type CostSummary = {
  generations: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data as T;
}

export function generateProduct(input: ProductInput) {
  return request<Generation>("/api/generate", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function generateBulk(products: ProductInput[]) {
  return request<{ results: Generation[] }>("/api/bulk", {
    method: "POST",
    body: JSON.stringify({ products })
  });
}

export function loadHistory() {
  return request<{ items: Generation[] }>("/api/history?limit=100");
}

export function loadCosts() {
  return request<CostSummary>("/api/costs");
}
