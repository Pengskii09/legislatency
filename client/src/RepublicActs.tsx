import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./RepublicActs.css";

const PYTHON_API = "http://localhost:8000";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface RepublicAct {
  id: string;
  number: string;
  shortTitle: string;
  title: string;
  dateSigned: string;
  yearSigned: number;
  primaryCommittee: string;
  category: string;
}

interface Analysis {
  keyword: string;
  fallbackUsed: boolean;
  geminiStatus?: string;
}

/* ─── Act Detail Panel ───────────────────────────────────────────────────────── */
const ActDetail: React.FC<{ act: RepublicAct; onClose: () => void }> = ({
  act,
  onClose,
}) => {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${PYTHON_API}/api/analyze/${encodeURIComponent(act.number)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Analysis failed.");
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAnalysis(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [act.number]);

  return (
    <div className="act-detail-overlay" onClick={onClose}>
      <div className="act-detail-panel" onClick={(e) => e.stopPropagation()}>
        <button
          className="detail-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="detail-header">
          <span className="act-number">{act.number}</span>
          <span className="detail-date">{act.dateSigned}</span>
        </div>

        <h2 className="detail-short-title">{act.shortTitle}</h2>
        <p className="detail-full-title">{act.title}</p>

        <div className="act-meta" style={{ marginBottom: "1.5rem" }}>
          <span className="meta-item">
            <span className="meta-icon">◈</span>
            {act.category}
          </span>
          <span className="meta-item">
            <span className="meta-icon">⚙</span>
            {act.primaryCommittee}
          </span>
        </div>

        <div className="detail-analysis">
          {loading && (
            <div className="detail-loading">
              <div className="detail-loading-steps">
                <span>Querying Gemini...</span>
              </div>
            </div>
          )}

          {error && <p className="detail-error">⚠ Unable to Reach Gemini</p>}

          {analysis && (
            <div className="detail-section">
              <h3 className="detail-section-title">
                <span className="section-number">01</span> Generated Trends
                Keyword
              </h3>
              <div className="keyword-row">
                <span className="keyword-pill">{analysis.keyword}</span>
                {analysis.fallbackUsed && (
                  <span className="fallback-notice">
                    {analysis.geminiStatus === "quota"
                      ? "⚠ Gemini Quota Exceeded"
                      : "⚠ Gemini Unavailable"}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Act Card ───────────────────────────────────────────────────────────────── */
const ActCard: React.FC<{ act: RepublicAct; onClick: () => void }> = ({
  act,
  onClick,
}) => (
  <article
    className="act-card"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => e.key === "Enter" && onClick()}
    aria-label={act.shortTitle}
  >
    <div className="act-card-header">
      <span className="act-number">{act.number}</span>
    </div>
    <h2 className="act-short-title">{act.shortTitle}</h2>
    <p className="act-full-title">{act.title}</p>
    <div className="act-meta">
      <span className="meta-item">
        <span className="meta-icon">◈</span>
        {act.category}
      </span>
      <span className="meta-item">
        <span className="meta-icon">⚙</span>
        {act.primaryCommittee}
      </span>
      <span className="meta-item">
        <span className="meta-icon">◷</span>
        {act.dateSigned}
      </span>
    </div>
  </article>
);

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const RepublicActs: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [allActs, setAllActs] = useState<RepublicAct[]>([]);
  const [results, setResults] = useState<RepublicAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAct, setSelectedAct] = useState<RepublicAct | null>(null);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState("All");
  const [committee, setCommittee] = useState("All");
  const [sort, setSort] = useState<"newest" | "oldest" | "number">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── Load all acts on mount ── */
  useEffect(() => {
    fetch(`${PYTHON_API}/api/acts`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load acts.");
        return r.json();
      })
      .then((data) => {
        setAllActs(data.results);
        setResults(data.results);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not connect to the Python server on port 8000.");
        setLoading(false);
      });
  }, []);

  /* ── Sync query to URL ── */
  useEffect(() => {
    const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    navigate(`/republic-acts${params}`, { replace: true });
  }, [query]);

  /* ── Semantic search — debounced 300ms ── */
  useEffect(() => {
    if (!query.trim()) {
      setResults(allActs);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${PYTHON_API}/api/search?q=${encodeURIComponent(query)}`,
        );
        if (!res.ok) throw new Error("Search failed.");
        const data = await res.json();
        setResults(data.results);
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, allActs]);

  /* ── Client-side filter + sort ── */
  const filtered = useMemo(() => {
    let r = [...results];
    if (category !== "All") r = r.filter((a) => a.category === category);
    if (committee !== "All")
      r = r.filter((a) => a.primaryCommittee === committee);
    if (!query.trim()) {
      if (sort === "newest") r.sort((a, b) => b.yearSigned - a.yearSigned);
      if (sort === "oldest") r.sort((a, b) => a.yearSigned - b.yearSigned);
      if (sort === "number")
        r.sort((a, b) =>
          a.number.localeCompare(b.number, undefined, { numeric: true }),
        );
    }
    return r;
  }, [results, category, committee, sort, query]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(allActs.map((a) => a.category))).sort(),
    ],
    [allActs],
  );
  const committees = useMemo(
    () => [
      "All",
      ...Array.from(new Set(allActs.map((a) => a.primaryCommittee))).sort(),
    ],
    [allActs],
  );

  const hasFilters = category !== "All" || committee !== "All";
  const clearFilters = () => {
    setCategory("All");
    setCommittee("All");
  };

  return (
    <div className="ra-page">
      <div className="noise-overlay" aria-hidden="true" />

      {selectedAct && (
        <ActDetail act={selectedAct} onClose={() => setSelectedAct(null)} />
      )}

      <main className="ra-main">
        <section className="ra-hero">
          <h1 className="ra-title">
            Search<span className="accent"> Republic Acts</span>
          </h1>
          <p className="ra-description">
            A real-time searchable index tracking legislative records from the
            19th Congress. Click any act for AI analysis.
          </p>
        </section>

        {loading ? (
          <div className="empty-state">
            <p className="empty-title">Loading Congressional Registry...</p>
          </div>
        ) : error ? (
          <div
            className="empty-state"
            style={{
              border: "2px dashed var(--paper-border)",
              padding: "4rem 2rem",
            }}
          >
            <div
              className="empty-icon"
              style={{ fontSize: "3rem", color: "var(--accent)" }}
            >
              ⚠️
            </div>
            <p className="empty-title">Server Unreachable</p>
            <p className="empty-sub">{error}</p>
          </div>
        ) : (
          <>
            <section
              className="ra-controls"
              aria-label="Search configuration panels"
            >
              <div className="search-field-wrapper">
                <div className="search-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle
                      cx="7.5"
                      cy="7.5"
                      r="5.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M12.5 12.5L16 16"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by title, number, or keyword..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Search republic acts"
                />
                {query && (
                  <button
                    className="clear-btn"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="controls-row">
                <div className="controls-left">
                  <button
                    className={`filter-toggle ${filtersOpen ? "active" : ""} ${hasFilters ? "has-filters" : ""}`}
                    onClick={() => setFiltersOpen((v) => !v)}
                    aria-expanded={filtersOpen}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 3h12M3 7h8M5 11h4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Filters
                    {hasFilters && (
                      <span className="filter-dot" aria-hidden="true" />
                    )}
                  </button>
                  {hasFilters && (
                    <button
                      className="clear-filters-btn"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="sort-wrapper">
                  <label htmlFor="sort-select" className="sr-only">
                    Sort by
                  </label>
                  <select
                    id="sort-select"
                    className="sort-select"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="number">By RA number</option>
                  </select>
                </div>
              </div>

              {filtersOpen && (
                <div className="filter-panel" role="group">
                  <div className="filter-group">
                    <span className="filter-group-label">Macro-Category</span>
                    <div className="filter-chips">
                      {categories.map((c) => (
                        <button
                          key={c}
                          className={`filter-chip ${category === c ? "active" : ""}`}
                          onClick={() => setCategory(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-group">
                    <span className="filter-group-label">
                      Primary Committee
                    </span>
                    <div className="filter-chips">
                      {committees.map((comm) => (
                        <button
                          key={comm}
                          className={`filter-chip ${committee === comm ? "active" : ""}`}
                          onClick={() => setCommittee(comm)}
                        >
                          {comm}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="ra-results" aria-live="polite">
              <div className="results-meta">
                <span className="results-count">
                  {searching
                    ? "Searching..."
                    : `${filtered.length} act${filtered.length !== 1 ? "s" : ""} located`}
                </span>
              </div>

              {filtered.length > 0 ? (
                <div className="acts-grid">
                  {filtered.map((act) => (
                    <ActCard
                      key={act.id}
                      act={act}
                      onClick={() => setSelectedAct(act)}
                    />
                  ))}
                </div>
              ) : (
                !searching && (
                  <div className="empty-state">
                    <p className="empty-title">Zero records match criteria</p>
                  </div>
                )
              )}
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <p>LegisLatency · Operational System Environment</p>
      </footer>
    </div>
  );
};

export default RepublicActs;
