from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer, util
import pandas as pd
import torch
import os
import json
from pathlib import Path
from dotenv import load_dotenv
from google import genai

load_dotenv(Path(__file__).resolve().parent.parent.parent / "server" / ".env")
print(f"GEMINI_API_KEY: {os.getenv('GEMINI_API_KEY')}")
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model + CSV once at startup ──────────────────────────────────────────
print("Loading all-MiniLM-L6-v2...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("✅ Model loaded.")

CSV_PATH = os.path.join(os.path.dirname(__file__), "../../client/public/19thcongress_first100.csv")
df = pd.read_csv(CSV_PATH).fillna("")
print(f"✅ Loaded {len(df)} acts from CSV.")

# ── Build corpus + embed once ─────────────────────────────────────────────────
corpus = (
    df["Short Title"].astype(str) + " " +
    df["Full Title"].astype(str) + " " +
    df["Macro-Category"].astype(str) + " " +
    df["Primary Committee"].astype(str)
).tolist()

EMBEDDINGS_PATH = os.path.join(os.path.dirname(__file__), "corpus_embeddings.pt")

if os.path.exists(EMBEDDINGS_PATH):
    print("Loading cached embeddings...")
    corpus_embeddings = torch.load(EMBEDDINGS_PATH)
    print("✅ Embeddings loaded from cache.")
else:
    print("Embedding corpus...")
    corpus_embeddings = model.encode(corpus, convert_to_tensor=True, show_progress_bar=True)
    torch.save(corpus_embeddings, EMBEDDINGS_PATH)
    print("✅ Corpus embedded and cached.")

# ── Helper ────────────────────────────────────────────────────────────────────
def row_to_act(row, idx, score=None):
    date_str = str(row.get("Date Signed", ""))
    year = int(date_str[-4:]) if date_str[-4:].isdigit() else 0
    return {
        "id": f"ra-{idx}",
        "number": row.get("Republic Act Number", "N/A"),
        "shortTitle": row.get("Short Title", "Untitled"),
        "title": row.get("Full Title", ""),
        "dateSigned": date_str or "Unknown",
        "yearSigned": year,
        "primaryCommittee": row.get("Primary Committee", "N/A"),
        "category": row.get("Macro-Category", "Uncategorized"),
        "score": round(float(score), 4) if score is not None else None,
    }

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/acts")
def get_all_acts():
    return {"results": [row_to_act(df.iloc[i].to_dict(), i) for i in range(len(df))]}


@app.get("/api/search")
def search(q: str = Query(...), top_k: int = 15):
    # Semantic search
    query_embedding = model.encode(q, convert_to_tensor=True)
    hits = util.semantic_search(query_embedding, corpus_embeddings, top_k=len(corpus))[0]
    # Similarity Threshold: To make stricter raise add +, too loosen, lower it (-)
    hits = [h for h in hits if h["score"] >= 0.3]

    results = []
    seen_ids = set()

    for hit in hits:
        idx = hit["corpus_id"]
        act = row_to_act(df.iloc[idx].to_dict(), idx, score=hit["score"])
        results.append(act)
        seen_ids.add(act["id"])

    # Also include keyword matches on category/committee not caught by semantic search
    q_lower = q.lower()
    for i, row in df.iterrows():
        act_id = f"ra-{i}"
        if act_id in seen_ids:
            continue
        if (
            q_lower in str(row.get("Macro-Category", "")).lower() or
            q_lower in str(row.get("Primary Committee", "")).lower() or
            q_lower in str(row.get("Short Title", "")).lower() or
            q_lower in str(row.get("Full Title", "")).lower() or
            q_lower in str(row.get("Republic Act Number", "")).lower()
        ):
            results.append(row_to_act(row.to_dict(), i))
            seen_ids.add(act_id)

    return {"results": results}

@app.get("/api/analyze/{ra_number}")
def analyze(ra_number: str):
    rows = df[df["Republic Act Number"] == ra_number]
    if rows.empty:
        return {"error": "Act not found."}
    row = rows.iloc[0]

    # Fallback keyword — strip legal stopwords from short title
    fallback = (
        row["Short Title"]
        .replace("An Act", "")
        .replace("Act", "")
        .replace("Law", "")
        .split("(")[0]
        .strip()
    )

    try:
        prompt = f"""
        Analyze this Philippine legislation:
        Republic Act: {row['Republic Act Number']}
        Short Title: {row['Short Title']}
        Full Title: {row['Full Title']}

        Provide your output strictly in the following JSON format with no extra text:
        {{
            "keyword": "A single, conversational 1-to-3 word topic that regular people actually type into Google when looking up the news or controversy surrounding this law. DO NOT include legal terms like 'Act', 'Law', 'Bill', or 'RA'. Examples: instead of 'Eddie Garcia Act' use 'Eddie Garcia'; instead of 'SIM Registration Act' use 'SIM registration'."
        }}
        """
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        clean = response.text.strip().strip("```json").strip("```").strip()
        data = json.loads(clean)
        keyword = data["keyword"].strip()
        return {"keyword": keyword, "fallbackUsed": False}
    
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg:
            print("Gemini: Quota reached.")
            status = "quota"
        else:
            print("Gemini: Unavailable.")
            status = "unavailable"
        return {"keyword": fallback, "fallbackUsed": True, "geminiStatus": status}


# To Load Script: uvicorn scripts.main:app --reload --port 8000