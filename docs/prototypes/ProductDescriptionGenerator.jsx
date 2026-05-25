import { useState, useRef, useCallback } from "react";

const FONT = "'DM Mono', 'Courier New', monospace";
const SANS = "'DM Sans', 'Segoe UI', sans-serif";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0c0c0f; color: #e8e6e0; font-family: ${SANS}; min-height: 100vh; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0c0c0f; } ::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 2px; }
  .app { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
  .sidebar { background: #111116; border-right: 1px solid #1e1e28; padding: 24px 20px; display: flex; flex-direction: column; gap: 24px; }
  .logo { font-family: ${FONT}; font-size: 13px; font-weight: 500; color: #b8b4a8; letter-spacing: 0.08em; }
  .logo span { color: #c8a97e; }
  .nav-section { display: flex; flex-direction: column; gap: 2px; }
  .nav-label { font-size: 10px; font-weight: 500; letter-spacing: 0.12em; color: #4a4a5a; text-transform: uppercase; margin-bottom: 8px; font-family: ${FONT}; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13px; font-weight: 400; color: #7a7a8a; cursor: pointer; transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; }
  .nav-item:hover { background: #1a1a22; color: #c8c4b8; }
  .nav-item.active { background: #1a1a22; color: #c8a97e; border: 1px solid #2a2a1e; }
  .nav-item .icon { font-size: 15px; width: 18px; text-align: center; }
  .stat-mini { background: #0c0c0f; border: 1px solid #1e1e28; border-radius: 10px; padding: 14px; }
  .stat-mini-label { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; color: #4a4a5a; text-transform: uppercase; font-family: ${FONT}; margin-bottom: 6px; }
  .stat-mini-val { font-size: 22px; font-weight: 300; color: #c8a97e; font-family: ${FONT}; }
  .stat-mini-sub { font-size: 11px; color: #4a4a5a; margin-top: 2px; }
  .main { display: flex; flex-direction: column; overflow: hidden; }
  .topbar { padding: 20px 32px; border-bottom: 1px solid #1e1e28; display: flex; align-items: center; justify-content: space-between; background: #0e0e12; }
  .topbar-title { font-size: 15px; font-weight: 500; color: #e8e6e0; }
  .topbar-sub { font-size: 12px; color: #4a4a5a; font-family: ${FONT}; margin-top: 2px; }
  .content { flex: 1; padding: 28px 32px; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; }
  .card { background: #111116; border: 1px solid #1e1e28; border-radius: 14px; padding: 24px; }
  .card-title { font-size: 11px; font-weight: 500; letter-spacing: 0.12em; color: #4a4a5a; text-transform: uppercase; font-family: ${FONT}; margin-bottom: 16px; }
  .upload-zone { border: 1.5px dashed #2a2a35; border-radius: 10px; padding: 32px; text-align: center; cursor: pointer; transition: all 0.2s; background: #0c0c0f; }
  .upload-zone:hover, .upload-zone.drag { border-color: #c8a97e; background: #141410; }
  .upload-zone .uz-icon { font-size: 28px; margin-bottom: 10px; color: #3a3a4a; }
  .upload-zone.has-image .uz-icon { color: #c8a97e; }
  .upload-zone p { font-size: 13px; color: #5a5a6a; }
  .upload-zone p.hint { font-size: 11px; color: #3a3a4a; margin-top: 4px; font-family: ${FONT}; }
  .img-preview { width: 100%; max-height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; }
  textarea, input[type=text] { background: #0c0c0f; border: 1px solid #1e1e28; border-radius: 8px; color: #e8e6e0; font-size: 13px; font-family: ${SANS}; padding: 12px 14px; width: 100%; resize: vertical; outline: none; transition: border 0.15s; }
  textarea:focus, input[type=text]:focus { border-color: #c8a97e44; }
  textarea::placeholder, input::placeholder { color: #3a3a4a; }
  .btn { padding: 11px 22px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; font-family: ${SANS}; letter-spacing: 0.01em; }
  .btn-primary { background: #c8a97e; color: #0c0c0f; }
  .btn-primary:hover { background: #d9bb92; }
  .btn-primary:disabled { background: #3a3020; color: #6a5a40; cursor: not-allowed; }
  .btn-ghost { background: none; border: 1px solid #2a2a35; color: #7a7a8a; }
  .btn-ghost:hover { border-color: #3a3a45; color: #c8c4b8; }
  .btn-sm { padding: 7px 14px; font-size: 12px; }
  .row { display: flex; gap: 12px; align-items: flex-start; }
  .col { flex: 1; display: flex; flex-direction: column; gap: 10px; }
  .field-label { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; color: #5a5a6a; text-transform: uppercase; font-family: ${FONT}; margin-bottom: 4px; }
  .result-field { background: #0c0c0f; border: 1px solid #1e1e28; border-radius: 8px; padding: 14px; min-height: 60px; font-size: 13px; color: #c8c4b8; line-height: 1.6; position: relative; }
  .result-field .copy-btn { position: absolute; top: 8px; right: 8px; background: #1a1a22; border: 1px solid #2a2a35; border-radius: 6px; padding: 4px 8px; font-size: 10px; color: #5a5a6a; cursor: pointer; font-family: ${FONT}; transition: all 0.15s; }
  .result-field .copy-btn:hover { color: #c8a97e; border-color: #c8a97e44; }
  .tags-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
  .tag { background: #1a1a22; border: 1px solid #2a2a2e; border-radius: 20px; padding: 4px 12px; font-size: 11px; color: #8a8a9a; font-family: ${FONT}; }
  .tag.highlight { background: #1a1a10; border-color: #3a3020; color: #c8a97e; }
  .gen-btn-row { display: flex; gap: 10px; margin-top: 6px; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #3a3020; border-top-color: #0c0c0f; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 8px; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .history-item { background: #0c0c0f; border: 1px solid #1e1e28; border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: all 0.15s; }
  .history-item:hover { border-color: #2a2a35; background: #0e0e12; }
  .history-item-title { font-size: 13px; font-weight: 500; color: #c8c4b8; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .history-item-meta { font-size: 11px; color: #4a4a5a; font-family: ${FONT}; display: flex; gap: 12px; }
  .history-grid { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
  .empty-state { text-align: center; padding: 40px 20px; color: #3a3a4a; }
  .empty-state .es-icon { font-size: 32px; margin-bottom: 12px; }
  .empty-state p { font-size: 13px; }
  .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .dash-stat { background: #0c0c0f; border: 1px solid #1e1e28; border-radius: 10px; padding: 16px; }
  .dash-stat-label { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; color: #4a4a5a; text-transform: uppercase; font-family: ${FONT}; margin-bottom: 8px; }
  .dash-stat-val { font-size: 26px; font-weight: 300; font-family: ${FONT}; }
  .dash-stat-val.gold { color: #c8a97e; }
  .dash-stat-val.green { color: #7ab87a; }
  .dash-stat-val.blue { color: #7aaab8; }
  .dash-stat-val.muted { color: #5a5a6a; }
  .cost-bar-row { display: flex; flex-direction: column; gap: 10px; }
  .cost-bar-item { display: flex; flex-direction: column; gap: 4px; }
  .cost-bar-top { display: flex; justify-content: space-between; font-size: 12px; color: #7a7a8a; }
  .cost-bar-track { height: 4px; background: #1e1e28; border-radius: 2px; overflow: hidden; }
  .cost-bar-fill { height: 100%; border-radius: 2px; background: #c8a97e; transition: width 0.6s ease; }
  .cost-bar-fill.green { background: #7ab87a; }
  .cost-bar-fill.blue { background: #7aaab8; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
  .modal { background: #111116; border: 1px solid #2a2a35; border-radius: 16px; padding: 28px; width: 100%; max-width: 560px; max-height: 80vh; overflow-y: auto; }
  .modal-title { font-size: 14px; font-weight: 500; color: #c8c4b8; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
  .close-btn { background: none; border: none; color: #5a5a6a; cursor: pointer; font-size: 18px; padding: 0; line-height: 1; }
  .close-btn:hover { color: #c8c4b8; }
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-family: ${FONT}; }
  .badge-success { background: #0e1e0e; border: 1px solid #1e3e1e; color: #7ab87a; }
  .badge-warn { background: #1e1a0e; border: 1px solid #3e3010; color: #c8a97e; }
  .badge-info { background: #0e181e; border: 1px solid #1e3040; color: #7aaab8; }
  .divider { height: 1px; background: #1e1e28; margin: 4px 0; }
  .mode-tabs { display: flex; gap: 4px; background: #0c0c0f; border: 1px solid #1e1e28; border-radius: 8px; padding: 4px; }
  .mode-tab { flex: 1; padding: 7px; border-radius: 6px; font-size: 12px; font-weight: 400; color: #5a5a6a; cursor: pointer; text-align: center; transition: all 0.15s; border: none; background: none; }
  .mode-tab.active { background: #1e1e28; color: #c8a97e; }
  select { background: #0c0c0f; border: 1px solid #1e1e28; border-radius: 8px; color: #c8c4b8; font-size: 13px; font-family: ${SANS}; padding: 10px 12px; outline: none; cursor: pointer; width: 100%; }
  select:focus { border-color: #c8a97e44; }
`;

const MODEL_COSTS = { input: 0.000003, output: 0.000015 };

const TONES = ["Professional", "Playful", "Luxury", "Minimalist", "Bold", "Friendly"];
const CATEGORIES = ["Electronics", "Apparel", "Home & Garden", "Beauty", "Sports", "Food & Beverage", "Art & Crafts", "Other"];

const SAMPLE_PRODUCTS = [
  { name: "Wireless Earbuds", desc: "Premium audio with active noise cancellation, 30hr battery, IPX5 water resistance, touch controls" },
  { name: "Handmade Ceramic Mug", desc: "Artisan stoneware mug, 12oz, food-safe glaze, microwave and dishwasher safe, earthy tones" },
  { name: "Yoga Mat", desc: "Non-slip natural rubber, 6mm thick, alignment lines, carrying strap, eco-friendly materials" },
];

function generatePrompt({ productName, productDesc, tone, category, imageDesc }) {
  return `You are an expert e-commerce copywriter. Generate compelling product content for the following product.

Product Name: ${productName || "Unknown"}
Product Description / Notes: ${productDesc || "No description provided"}
${imageDesc ? `Image Analysis: ${imageDesc}` : ""}
Tone: ${tone}
Category: ${category}

Return ONLY a valid JSON object with these exact keys:
{
  "title": "compelling product title (max 80 chars)",
  "description": "engaging product description (150-250 words, highlight benefits)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "metaDescription": "SEO meta description (max 160 chars)",
  "highlights": ["key benefit 1", "key benefit 2", "key benefit 3", "key benefit 4"]
}

No preamble, no explanation, just the JSON object.`;
}

function calcCost(inputTokens, outputTokens) {
  return (inputTokens * MODEL_COSTS.input + outputTokens * MODEL_COSTS.output);
}

function fmt(n, dec = 4) { return n.toFixed(dec); }
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return <button className="copy-btn" onClick={copy}>{copied ? "✓ copied" : "copy"}</button>;
}

function HistoryModal({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          <span>Generation #{item.id}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="field-label">Title</div>
            <div className="result-field" style={{ minHeight: "auto" }}>{item.result.title}</div>
          </div>
          <div>
            <div className="field-label">Description</div>
            <div className="result-field">{item.result.description}</div>
          </div>
          <div>
            <div className="field-label">Key Highlights</div>
            <div className="result-field" style={{ minHeight: "auto" }}>
              {(item.result.highlights || []).map((h, i) => <div key={i} style={{ marginBottom: 4 }}>• {h}</div>)}
            </div>
          </div>
          <div>
            <div className="field-label">Tags</div>
            <div className="tags-wrap">{(item.result.tags || []).map((t, i) => <span key={i} className="tag">{t}</span>)}</div>
          </div>
          <div>
            <div className="field-label">Meta Description</div>
            <div className="result-field" style={{ minHeight: "auto", fontSize: 12 }}>{item.result.metaDescription}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge badge-info">~{item.tokens.input}t in</span>
            <span className="badge badge-info">~{item.tokens.output}t out</span>
            <span className="badge badge-warn">${fmt(item.cost)} cost</span>
            <span className="badge badge-success">{fmtDate(item.ts)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("generate");
  const [inputMode, setInputMode] = useState("text");
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [tone, setTone] = useState("Professional");
  const [category, setCategory] = useState("Electronics");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageB64, setImageB64] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyModal, setHistoryModal] = useState(null);
  const [genCount, setGenCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState({ input: 0, output: 0 });
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => {
      setImagePreview(e.target.result);
      setImageB64(e.target.result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const loadSample = (s) => { setProductName(s.name); setProductDesc(s.desc); };

  const generate = async () => {
    if (!productName.trim() && !productDesc.trim() && !imageFile) {
      setError("Please enter a product name, description, or upload an image."); return;
    }
    setLoading(true); setError(null); setResult(null);

    try {
      const messages = [];
      const userContent = [];

      if (imageB64 && inputMode === "image") {
        userContent.push({ type: "image", source: { type: "base64", media_type: imageFile.type, data: imageB64 } });
        userContent.push({ type: "text", text: "First, describe what you see in this product image in detail (materials, colors, design, features visible). Then, " + generatePrompt({ productName, productDesc, tone, category, imageDesc: "[see image above]" }) });
      } else {
        userContent.push({ type: "text", text: generatePrompt({ productName, productDesc, tone, category }) });
      }

      messages.push({ role: "user", content: userContent });

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages })
      });

      const data = await resp.json();
      const rawText = (data.content || []).map(c => c.type === "text" ? c.text : "").join("");

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse AI response.");
      const parsed = JSON.parse(jsonMatch[0]);

      const inputTok = data.usage?.input_tokens || 350;
      const outputTok = data.usage?.output_tokens || 280;
      const cost = calcCost(inputTok, outputTok);
      const id = genCount + 1;
      const entry = {
        id, result: parsed, cost, tokens: { input: inputTok, output: outputTok },
        ts: Date.now(), productName: productName || "Untitled", tone, category
      };

      setResult(parsed);
      setHistory(h => [entry, ...h]);
      setGenCount(c => c + 1);
      setTotalCost(c => c + cost);
      setTotalTokens(t => ({ input: t.input + inputTok, output: t.output + outputTok }));
    } catch (e) {
      setError("Generation failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!history.length) return;
    const headers = ["ID", "Product Name", "Tone", "Category", "Title", "Description", "Tags", "Meta Description", "Cost ($)", "Tokens In", "Tokens Out", "Generated At"];
    const rows = history.map(h => [
      h.id, `"${(h.productName || "").replace(/"/g, '""')}"`, h.tone, h.category,
      `"${(h.result.title || "").replace(/"/g, '""')}"`,
      `"${(h.result.description || "").replace(/"/g, '""')}"`,
      `"${(h.result.tags || []).join(", ")}"`,
      `"${(h.result.metaDescription || "").replace(/"/g, '""')}"`,
      fmt(h.cost), h.tokens.input, h.tokens.output, fmtDate(h.ts)
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "product_descriptions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const maxCost = Math.max(...history.map(h => h.cost), 0.001);

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="logo">prod<span>/</span>gen</div>
          <div className="nav-section">
            <div className="nav-label">Workspace</div>
            {[
              { id: "generate", icon: "✦", label: "Generate" },
              { id: "history", icon: "◈", label: "History" },
              { id: "dashboard", icon: "◉", label: "Cost Dashboard" },
            ].map(n => (
              <button key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
                <span className="icon">{n.icon}</span>{n.label}
                {n.id === "history" && history.length > 0 && (
                  <span style={{ marginLeft: "auto", background: "#2a2a1e", borderRadius: 20, padding: "2px 8px", fontSize: 10, color: "#c8a97e", fontFamily: FONT }}>{history.length}</span>
                )}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="stat-mini">
              <div className="stat-mini-label">Total Spent</div>
              <div className="stat-mini-val">${fmt(totalCost)}</div>
              <div className="stat-mini-sub">{genCount} generation{genCount !== 1 ? "s" : ""}</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-label">Tokens Used</div>
              <div className="stat-mini-val">{(totalTokens.input + totalTokens.output).toLocaleString()}</div>
              <div className="stat-mini-sub">in + out</div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div>
              <div className="topbar-title">
                {tab === "generate" && "Generate Product Content"}
                {tab === "history" && "Generation History"}
                {tab === "dashboard" && "Cost Dashboard"}
              </div>
              <div className="topbar-sub">
                {tab === "generate" && "AI-powered titles, descriptions & tags"}
                {tab === "history" && `${history.length} record${history.length !== 1 ? "s" : ""} saved`}
                {tab === "dashboard" && "Token usage & cost tracking"}
              </div>
            </div>
            {tab === "history" && history.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
            )}
          </div>

          <div className="content">
            {/* ── GENERATE TAB ── */}
            {tab === "generate" && (
              <>
                <div className="card">
                  <div className="card-title">Input Mode</div>
                  <div className="mode-tabs">
                    <button className={`mode-tab ${inputMode === "text" ? "active" : ""}`} onClick={() => setInputMode("text")}>Text Only</button>
                    <button className={`mode-tab ${inputMode === "image" ? "active" : ""}`} onClick={() => setInputMode("image")}>Image + Text</button>
                  </div>
                  {inputMode === "image" && (
                    <div style={{ marginTop: 14 }}>
                      <div
                        className={`upload-zone ${drag ? "drag" : ""} ${imagePreview ? "has-image" : ""}`}
                        onClick={() => fileRef.current.click()}
                        onDragOver={e => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={onDrop}
                      >
                        {imagePreview ? (
                          <>
                            <img src={imagePreview} alt="preview" className="img-preview" />
                            <p style={{ color: "#c8a97e", fontSize: 12, marginTop: 4 }}>✓ {imageFile.name}</p>
                          </>
                        ) : (
                          <>
                            <div className="uz-icon">⬆</div>
                            <p>Drop product image here or click to browse</p>
                            <p className="hint">JPG, PNG, WEBP · max 5MB</p>
                          </>
                        )}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-title">Product Details</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div className="field-label">Product Name</div>
                      <input type="text" placeholder="e.g. Wireless Noise-Cancelling Earbuds" value={productName} onChange={e => setProductName(e.target.value)} />
                    </div>
                    <div>
                      <div className="field-label">Product Notes / Features</div>
                      <textarea rows={4} placeholder="Describe key features, materials, dimensions, unique selling points..." value={productDesc} onChange={e => setProductDesc(e.target.value)} />
                    </div>
                    <div className="row">
                      <div className="col">
                        <div className="field-label">Tone</div>
                        <select value={tone} onChange={e => setTone(e.target.value)}>
                          {TONES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="col">
                        <div className="field-label">Category</div>
                        <select value={category} onChange={e => setCategory(e.target.value)}>
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <div className="field-label">Quick Samples</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {SAMPLE_PRODUCTS.map(s => (
                          <button key={s.name} className="btn btn-ghost btn-sm" onClick={() => loadSample(s)}>{s.name}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="gen-btn-row">
                  <button className="btn btn-primary" onClick={generate} disabled={loading} style={{ minWidth: 160 }}>
                    {loading ? <><span className="spinner" />Generating...</> : "✦ Generate Content"}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setProductName(""); setProductDesc(""); setImageFile(null); setImagePreview(null); setImageB64(null); setResult(null); setError(null); }}>Clear</button>
                </div>

                {error && (
                  <div style={{ background: "#1e0e0e", border: "1px solid #4a1a1a", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#e87a7a" }}>{error}</div>
                )}

                {result && (
                  <div className="card" style={{ borderColor: "#2a2a1e" }}>
                    <div className="card-title" style={{ color: "#c8a97e" }}>Generated Content</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div>
                        <div className="field-label">Title</div>
                        <div className="result-field" style={{ fontSize: 15, fontWeight: 500, color: "#e8e6e0" }}>
                          {result.title}
                          <CopyBtn text={result.title} />
                        </div>
                      </div>
                      <div>
                        <div className="field-label">Description</div>
                        <div className="result-field">
                          {result.description}
                          <CopyBtn text={result.description} />
                        </div>
                      </div>
                      {result.highlights && result.highlights.length > 0 && (
                        <div>
                          <div className="field-label">Key Highlights</div>
                          <div className="result-field" style={{ minHeight: "auto" }}>
                            {result.highlights.map((h, i) => <div key={i} style={{ marginBottom: 6, display: "flex", gap: 8 }}><span style={{ color: "#c8a97e" }}>→</span><span>{h}</span></div>)}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="field-label">Tags</div>
                        <div className="tags-wrap">
                          {(result.tags || []).map((t, i) => <span key={i} className={`tag ${i < 3 ? "highlight" : ""}`}>{t}</span>)}
                        </div>
                      </div>
                      {result.metaDescription && (
                        <div>
                          <div className="field-label">SEO Meta Description</div>
                          <div className="result-field" style={{ fontSize: 12, color: "#8a8a9a", minHeight: "auto" }}>
                            {result.metaDescription}
                            <CopyBtn text={result.metaDescription} />
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className="badge badge-success">✓ generated</span>
                        <span className="badge badge-warn">${fmt(history[0]?.cost || 0)} cost</span>
                        <span className="badge badge-info">{tone} · {category}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── HISTORY TAB ── */}
            {tab === "history" && (
              <>
                {history.length === 0 ? (
                  <div className="card">
                    <div className="empty-state">
                      <div className="es-icon">◈</div>
                      <p>No generations yet. Go to Generate to create your first product description.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#5a5a6a", fontFamily: FONT }}>{history.length} record{history.length !== 1 ? "s" : ""} · click to view full details</span>
                      <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Export All CSV</button>
                    </div>
                    <div className="history-grid">
                      {history.map(item => (
                        <div key={item.id} className="history-item" onClick={() => setHistoryModal(item)}>
                          <div className="history-item-title">{item.result.title || item.productName}</div>
                          <div className="history-item-meta">
                            <span>#{item.id}</span>
                            <span>{item.tone}</span>
                            <span>{item.category}</span>
                            <span>${fmt(item.cost)}</span>
                            <span style={{ marginLeft: "auto" }}>{fmtDate(item.ts)}</span>
                          </div>
                          <div className="tags-wrap" style={{ marginTop: 8 }}>
                            {(item.result.tags || []).slice(0, 4).map((t, i) => <span key={i} className="tag">{t}</span>)}
                            {(item.result.tags || []).length > 4 && <span className="tag" style={{ color: "#4a4a5a" }}>+{item.result.tags.length - 4}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── DASHBOARD TAB ── */}
            {tab === "dashboard" && (
              <>
                <div className="dash-grid">
                  <div className="dash-stat">
                    <div className="dash-stat-label">Total Cost</div>
                    <div className="dash-stat-val gold">${fmt(totalCost)}</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-label">Generations</div>
                    <div className="dash-stat-val blue">{genCount}</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-label">Avg Cost</div>
                    <div className="dash-stat-val gold">${genCount > 0 ? fmt(totalCost / genCount) : "0.0000"}</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-label">Total Tokens</div>
                    <div className="dash-stat-val muted">{(totalTokens.input + totalTokens.output).toLocaleString()}</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">Token Breakdown</div>
                  <div className="cost-bar-row">
                    <div className="cost-bar-item">
                      <div className="cost-bar-top"><span>Input tokens</span><span style={{ fontFamily: FONT }}>{totalTokens.input.toLocaleString()} · ${fmt(totalTokens.input * MODEL_COSTS.input)}</span></div>
                      <div className="cost-bar-track">
                        <div className="cost-bar-fill blue" style={{ width: totalTokens.input + totalTokens.output > 0 ? `${(totalTokens.input / (totalTokens.input + totalTokens.output)) * 100}%` : "0%" }} />
                      </div>
                    </div>
                    <div className="cost-bar-item">
                      <div className="cost-bar-top"><span>Output tokens</span><span style={{ fontFamily: FONT }}>{totalTokens.output.toLocaleString()} · ${fmt(totalTokens.output * MODEL_COSTS.output)}</span></div>
                      <div className="cost-bar-track">
                        <div className="cost-bar-fill green" style={{ width: totalTokens.input + totalTokens.output > 0 ? `${(totalTokens.output / (totalTokens.input + totalTokens.output)) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">Per-Generation Cost</div>
                  {history.length === 0 ? (
                    <div className="empty-state" style={{ padding: "24px 0" }}>
                      <p style={{ fontSize: 12 }}>No data yet. Generate some product descriptions first.</p>
                    </div>
                  ) : (
                    <div className="cost-bar-row">
                      {history.slice(0, 10).map(h => (
                        <div key={h.id} className="cost-bar-item">
                          <div className="cost-bar-top">
                            <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{h.id} {h.result.title || h.productName}</span>
                            <span style={{ fontFamily: FONT }}>${fmt(h.cost)}</span>
                          </div>
                          <div className="cost-bar-track">
                            <div className="cost-bar-fill" style={{ width: `${(h.cost / maxCost) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-title">Pricing Reference</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "#0c0c0f", border: "1px solid #1e1e28", borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#4a4a5a", fontFamily: FONT, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Input</div>
                      <div style={{ fontSize: 18, fontWeight: 300, fontFamily: FONT, color: "#7aaab8" }}>${(MODEL_COSTS.input * 1000000).toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: "#4a4a5a", marginTop: 2 }}>per million tokens</div>
                    </div>
                    <div style={{ background: "#0c0c0f", border: "1px solid #1e1e28", borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#4a4a5a", fontFamily: FONT, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Output</div>
                      <div style={{ fontSize: 18, fontWeight: 300, fontFamily: FONT, color: "#c8a97e" }}>${(MODEL_COSTS.output * 1000000).toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: "#4a4a5a", marginTop: 2 }}>per million tokens</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {historyModal && <HistoryModal item={historyModal} onClose={() => setHistoryModal(null)} />}
    </>
  );
}
