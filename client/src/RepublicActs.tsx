import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./RepublicActs.css";

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

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
const ActCard: React.FC<{ act: RepublicAct }> = ({ act }) => {
  return (
    <article className="act-card" tabIndex={0} aria-label={act.shortTitle}>
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
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const RepublicActs: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [allActs, setAllActs] = useState<RepublicAct[]>([]);
  const [results, setResults] = useState<RepublicAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill query from URL param (e.g. ?q=education)
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState("All");
  const [committee, setCommittee] = useState("All");
  const [sort, setSort] = useState<"newest" | "oldest" | "number">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── Load all acts on mount ── */
  useEffect(() => {
    fetch("http://localhost:3001/api/acts")
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
        setError("Could not connect to the server on port 3001.");
        setLoading(false);
      });
  }, []);

  /* ── Sync query changes back to URL ── */
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
        const params = new URLSearchParams({ q: query });
        const res = await fetch(`http://localhost:3001/api/search?${params}`);
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

  /* ── Client-side filter + sort on top of results ── */
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

      <main className="ra-main">
        <section className="ra-hero">
          <h1 className="ra-title">
            Search<span className="accent"> Republic Acts</span>
          </h1>
          <p className="ra-description">
            A real-time searchable index tracking legislative records from the
            19th Congress.
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
                    <ActCard key={act.id} act={act} />
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
