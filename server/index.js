import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "@xenova/transformers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

/* ─── CSV Parser ─────────────────────────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
  const headers = lines[0].split(csvRegex).map((h) => h.replace(/^"|"$/g, "").trim());

  const idxNum  = headers.indexOf("Republic Act Number");
  const idxShort = headers.indexOf("Short Title");
  const idxFull  = headers.indexOf("Full Title");
  const idxDate  = headers.indexOf("Date Signed");
  const idxComm  = headers.indexOf("Primary Committee");
  const idxCat   = headers.indexOf("Macro-Category");

  const acts = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const col = lines[i].split(csvRegex).map((c) => c.replace(/^"|"$/g, "").trim());
    const dateStr = col[idxDate] || "";
    const yearMatch = dateStr.match(/\d{4}/);
    acts.push({
      id: `ra-${i}`,
      number: col[idxNum] || "N/A",
      shortTitle: col[idxShort] || col[idxFull] || "Untitled",
      title: col[idxFull] || "",
      dateSigned: dateStr || "Unknown Date",
      yearSigned: yearMatch ? parseInt(yearMatch[0], 10) : 0,
      primaryCommittee: col[idxComm] || "N/A",
      category: col[idxCat] || "Uncategorized",
    });
  }
  return acts;
}

/* ─── Cosine Similarity ──────────────────────────────────────────────────────── */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ─── Boot ───────────────────────────────────────────────────────────────────── */
async function init() {
  // Load CSV — looks for it in the client's public folder
  const csvPath = path.resolve(__dirname, "../client/public/19thcongress_first100.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const acts = parseCSV(csvText);
  console.log(`Loaded ${acts.length} acts from CSV.`);

  // Load model
  console.log("Loading embedding model...");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("Model loaded. Embedding acts...");

  // Embed all acts once at startup
  const actVectors = [];
  for (const act of acts) {
    const out = await embedder(`${act.shortTitle} ${act.title} ${act.category} ${act.primaryCommittee}`, {
      pooling: "mean",
      normalize: true,
    });
    actVectors.push(Array.from(out.data));
  }
  console.log("All acts embedded. Server ready.");

  /* ── Routes ── */

  // Return all acts (for initial page load)
  app.get("/api/acts", (_req, res) => {
    res.json({ results: acts });
  });

  // Semantic search
  app.get("/api/search", async (req, res) => {
    const { q, category, committee, sort } = req.query;

    if (!q?.trim()) {
      return res.json({ results: acts });
    }

    try {
      const out = await embedder(q, { pooling: "mean", normalize: true });
      const queryVec = Array.from(out.data);

      let results = acts
        .map((act, i) => ({ ...act, score: cosineSimilarity(queryVec, actVectors[i]) }))
        .filter((a) => a.score > 0.3)
        .sort((a, b) => b.score - a.score);

        // Also include any acts where category or committee contains the query
        const q_lower = q.toLowerCase();
        const keywordMatches = acts.filter(
        (a) =>
            a.category.toLowerCase().includes(q_lower) ||
            a.primaryCommittee.toLowerCase().includes(q_lower)
        );

        // Merge — avoid duplicates
        const ids = new Set(results.map((a) => a.id));
        for (const act of keywordMatches) {
        if (!ids.has(act.id)) results.push(act);
}

      // Apply filters
      if (category && category !== "All") results = results.filter((a) => a.category === category);
      if (committee && committee !== "All") results = results.filter((a) => a.primaryCommittee === committee);

      // Sort override (only when explicitly requested — default keeps semantic rank)
      if (sort === "newest") results.sort((a, b) => b.yearSigned - a.yearSigned);
      if (sort === "oldest") results.sort((a, b) => a.yearSigned - b.yearSigned);
      if (sort === "number") results.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

      res.json({ results });
    } catch (err) {
      console.error("Search error:", err);
      res.status(500).json({ error: "Search failed." });
    }
  });

  app.listen(3001, () => console.log("Server running on http://localhost:3001"));
}

init();