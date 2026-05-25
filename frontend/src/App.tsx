import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Clipboard, Download, ImagePlus, Loader2, Sparkles, Table2 } from "lucide-react";
import { CostSummary, Generation, ProductInput, generateBulk, generateProduct, loadCosts, loadHistory } from "./api";

const tones = ["Professional", "Playful", "Luxury", "Bold", "Minimalist", "Friendly"];
const categories = ["Stickers", "Labels", "Packaging", "Apparel", "Home Goods", "Electronics", "Other"];

const emptyInput: ProductInput = {
  productName: "",
  productNotes: "",
  category: "Stickers",
  tone: "Professional"
};

function money(value: number) {
  return `$${value.toFixed(4)}`;
}

function exportCSV(items: Generation[]) {
  const header = ["id", "productName", "title", "description", "tags", "costUsd", "createdAt"];
  const rows = items.map((item) => [
    item.id,
    item.productName,
    item.title,
    item.description,
    item.tags.join("|"),
    item.costUsd,
    item.createdAt
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "product-description-history.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function parseBulkCSV(csv: string, defaults: ProductInput): ProductInput[] {
  return csv
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((line) => {
      const [productName, productNotes, category, tone] = line.split(",").map((part) => part.trim());
      return {
        productName,
        productNotes,
        category: category || defaults.category,
        tone: tone || defaults.tone
      };
    });
}

export default function App() {
  const [input, setInput] = useState<ProductInput>(emptyInput);
  const [bulkText, setBulkText] = useState("Die Cut Sticker,Waterproof vinyl sticker for laptops,Stickers,Playful");
  const [history, setHistory] = useState<Generation[]>([]);
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [active, setActive] = useState("generate");
  const [selected, setSelected] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      const [historyResponse, costResponse] = await Promise.all([loadHistory(), loadCosts()]);
      setHistory(historyResponse.items);
      setCosts(costResponse);
      setSelected(historyResponse.items[0] ?? null);
    } catch {
      setHistory([]);
      setCosts(null);
    }
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      setInput((current) => ({
        ...current,
        imageBase64: result.split(",")[1],
        imageMime: file.type
      }));
    };
    reader.readAsDataURL(file);
  }

  async function runSingle() {
    setLoading(true);
    setError("");
    try {
      const generated = await generateProduct(input);
      setSelected(generated);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function runBulk() {
    const products = parseBulkCSV(bulkText, input);
    setLoading(true);
    setError("");
    try {
      const response = await generateBulk(products);
      setSelected(response.results[0] ?? null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk generation failed");
    } finally {
      setLoading(false);
    }
  }

  const totalTokens = useMemo(() => {
    if (!costs) return 0;
    return costs.inputTokens + costs.outputTokens;
  }, [costs]);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-brass">internal ai tool</p>
            <h1 className="text-2xl font-bold">AI Product Description Generator</h1>
          </div>
          <div className="flex gap-2">
            {["generate", "bulk", "history"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`rounded-md border px-4 py-2 text-sm font-semibold capitalize ${
                  active === tab ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          {active === "generate" && (
            <div className="rounded-lg border border-line bg-white p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">Generate one product</h2>
                <Sparkles className="h-5 w-5 text-tomato" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Product name</span>
                  <input className="w-full rounded-md border border-line px-3 py-2" value={input.productName} onChange={(event) => setInput({ ...input, productName: event.target.value })} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Category</span>
                  <select className="w-full rounded-md border border-line px-3 py-2" value={input.category} onChange={(event) => setInput({ ...input, category: event.target.value })}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold">Product notes</span>
                  <textarea className="min-h-28 w-full rounded-md border border-line px-3 py-2" value={input.productNotes} onChange={(event) => setInput({ ...input, productNotes: event.target.value })} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Tone</span>
                  <select className="w-full rounded-md border border-line px-3 py-2" value={input.tone} onChange={(event) => setInput({ ...input, tone: event.target.value })}>
                    {tones.map((tone) => <option key={tone}>{tone}</option>)}
                  </select>
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-sm font-semibold">
                  <ImagePlus className="h-4 w-4" />
                  Upload image
                  <input className="hidden" type="file" accept="image/*" onChange={handleImage} />
                </label>
              </div>
              <button onClick={runSingle} disabled={loading} className="mt-5 inline-flex items-center gap-2 rounded-md bg-tomato px-5 py-3 font-bold text-white disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate copy
              </button>
            </div>
          )}

          {active === "bulk" && (
            <div className="rounded-lg border border-line bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Bulk processing</h2>
                <Table2 className="h-5 w-5 text-pine" />
              </div>
              <p className="mb-3 text-sm text-neutral-600">CSV rows: productName, productNotes, category, tone. Supports up to 100 products per run.</p>
              <textarea className="min-h-72 w-full rounded-md border border-line px-3 py-2 font-mono text-sm" value={bulkText} onChange={(event) => setBulkText(event.target.value)} />
              <button onClick={runBulk} disabled={loading} className="mt-5 inline-flex items-center gap-2 rounded-md bg-pine px-5 py-3 font-bold text-white disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Run bulk generation
              </button>
            </div>
          )}

          {active === "history" && (
            <div className="rounded-lg border border-line bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Version history</h2>
                <button onClick={() => exportCSV(history)} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold">
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
              <div className="space-y-2">
                {history.map((item) => (
                  <button key={item.id} onClick={() => setSelected(item)} className="w-full rounded-md border border-line p-3 text-left hover:border-pine">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-neutral-500">{item.productName} - {money(item.costUsd)} - {new Date(item.createdAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        <aside className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="font-mono text-xs uppercase text-neutral-500">runs</p>
              <p className="text-2xl font-bold">{costs?.generations ?? 0}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="font-mono text-xs uppercase text-neutral-500">tokens</p>
              <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="font-mono text-xs uppercase text-neutral-500">cost</p>
              <p className="text-2xl font-bold">{money(costs?.costUsd ?? 0)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">Generated output</h2>
            {selected ? (
              <div className="space-y-4">
                <OutputBlock label="Title" value={selected.title} />
                <OutputBlock label="Description" value={selected.description} />
                <OutputBlock label="SEO meta" value={selected.metaDescription} />
                <div>
                  <p className="mb-2 text-sm font-semibold">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.tags.map((tag) => <span key={tag} className="rounded-full bg-paper px-3 py-1 text-xs font-semibold">{tag}</span>)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Generated content appears here after the first run.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function OutputBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <button onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-semibold">
          <Clipboard className="h-3 w-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="rounded-md bg-paper p-3 text-sm leading-6">{value}</div>
    </div>
  );
}
