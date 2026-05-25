from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer, util
from pytrends.request import TrendReq
import google.generativeai as genai
import pandas as pd
import datetime
import json
import os
from dotenv import load_dotenv

load_dotenv()

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
print("Model loaded.")

CSV_PATH = os.path.join(os.path.dirname(__file__), "../client/public/19thcongress_first100.csv")
df = pd.read_csv(CSV_PATH)
df = df.fillna("")

print(f"Loaded {len(df)} acts. Embedding corpus...")
corpus = (
    df["Short Title"].astype(str) + " " +
    df["Full Title"].astype(str) + " " +
    df["Macro-Category"].astype(str) + " " +
    df["Primary Committee"].astype(str)
).tolist()
corpus_embeddings = model.encode(corpus, convert_to_tensor=True, show_progress_bar=True)
print("Corpus embedded. Server ready.")

# ── Gemini setup ──────────────────────────────────────────────────────────────
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ── Helper: build act dict from dataframe row ─────────────────────────────────
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
    return {"results": [row_to_act(df.iloc[i], i) for i in range(len(df))]}


@app.get("/api/search")
def search(q: str = Query(...), top_k: int = 15):
    query_embedding = model.encode(q, convert_to_tensor=True)
    hits = util.semantic_search(query_embedding, corpus_embeddings, top_k=top_k)[0]

    results = []
    for hit in hits:
        idx = hit["corpus_id"]
        results.append(row_to_act(df.iloc[idx], idx, score=hit["score"]))

    return {"results": results}


@app.get("/api/analyze/{ra_number}")
def analyze(ra_number: str):
    rows = df[df["Republic Act Number"] == ra_number]
    if rows.empty:
        return {"error": "Act not found."}
    row = rows.iloc[0]

    # ── PHASE 2: Gemini keyword + summary ────────────────────────────────────
    ai_model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = f"""
    Analyze this Philippine legislation:
    Republic Act: {row['Republic Act Number']}
    Short Title: {row['Short Title']}
    Full Title: {row['Full Title']}

    Provide your output strictly in the following JSON format:
    {{
        "keyword": "A single, conversational 1-to-3 word topic that regular people actually type into Google when looking up the news or controversy surrounding this event. DO NOT include legal terms like 'Act', 'Law', 'Bill', or 'RA'. (Examples: instead of 'Eddie Garcia Act' use 'Eddie Garcia'; instead of 'SIM Registration Act' use 'SIM registration'; instead of 'Maharlika Investment Fund Act' use 'Maharlika Fund').",
        "summary": "A concise, clear 2-3 sentence summary explaining what this law establishes and its main objective."
    }}
    """

    try:
        response = ai_model.generate_content(prompt)
        clean = response.text.strip().strip("```json").strip("```").strip()
        ai_data = json.loads(clean)
        extracted_keyword = ai_data["keyword"].strip()
        ai_summary = ai_data["summary"]
    except Exception as e:
        print(f"Gemini error: {e}")
        extracted_keyword = row["Short Title"].split("(")[0].replace("Act", "").replace("Law", "").strip()
        ai_summary = "Summary generation failed."

    # ── PHASE 3: Google Trends ────────────────────────────────────────────────
    pytrends = TrendReq(hl="en-US", tz=360)
    trends_data = []
    used_keyword = extracted_keyword

    # Stage A: AI keyword
    try:
        pytrends.build_payload([extracted_keyword], cat=0, timeframe="today 5-y", geo="PH", gprop="")
        trends_df = pytrends.interest_over_time()
        if not trends_df.empty and extracted_keyword in trends_df.columns and trends_df[extracted_keyword].sum() > 0:
            trends_data = [
                {"date": str(date.date()), "value": int(val)}
                for date, val in zip(trends_df.index, trends_df[extracted_keyword])
            ]
    except Exception as e:
        print(f"Trends Stage A error: {e}")

    # Stage B: Fallback keyword
    if not trends_data:
        fallback_keyword = row["Short Title"].split("(")[0].replace("Act", "").replace("Law", "").strip()
        used_keyword = fallback_keyword
        try:
            pytrends.build_payload([fallback_keyword], cat=0, timeframe="today 5-y", geo="PH", gprop="")
            trends_df = pytrends.interest_over_time()
            if not trends_df.empty and fallback_keyword in trends_df.columns:
                trends_data = [
                    {"date": str(date.date()), "value": int(val)}
                    for date, val in zip(trends_df.index, trends_df[fallback_keyword])
                ]
        except Exception as e:
            print(f"Trends Stage B error: {e}")

    # ── PHASE 4: Timeline classification ─────────────────────────────────────
    timeline = None
    try:
        leg_date_str = str(row["Date Signed"]).strip().strip('"')
        leg_date = datetime.datetime.strptime(leg_date_str, "%B %d, %Y").date()

        if trends_data:
            peak_entry = max(trends_data, key=lambda x: x["value"])
            peak_date = datetime.datetime.strptime(peak_entry["date"], "%Y-%m-%d").date()
            days_diff = (peak_date - leg_date).days

            if peak_date < leg_date:
                classification = "REACTIVE"
                explanation = f"Public interest peaked {abs(days_diff)} days BEFORE the law was signed. Lawmakers were likely reacting to an escalating public issue or social movement."
            else:
                classification = "PROACTIVE"
                explanation = f"Public interest peaked {days_diff} days AFTER the law was signed. The law itself triggered public discourse."

            timeline = {
                "legislationDate": str(leg_date),
                "peakDate": peak_entry["date"],
                "peakValue": peak_entry["value"],
                "daysDifference": days_diff,
                "classification": classification,
                "explanation": explanation,
            }
    except Exception as e:
        print(f"Timeline error: {e}")

    return {
        "raNumber": row["Republic Act Number"],
        "shortTitle": row["Short Title"],
        "dateSigned": row.get("Date Signed", ""),
        "extractedKeyword": used_keyword,
        "summary": ai_summary,
        "trendsData": trends_data,
        "timeline": timeline,
    }