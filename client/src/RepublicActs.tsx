import React, { useState, useMemo, useEffect } from "react";
// import { Link } from "react-router-dom";
import "./RepublicActs.css";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface RepublicAct {
  id: string;
  number: string; // Maps to "Republic Act Number"
  shortTitle: string; // Maps to "Short Title"
  title: string; // Maps to "Full Title"
  dateSigned: string; // Maps to "Date Signed"
  yearSigned: number; // Extracted safely for sorting purposes
  primaryCommittee: string; // Maps to "Primary Committee"
  category: string; // Maps to "Macro-Category"
}

/* ─── Helper: Commas-In-Quotes Safe CSV Parser ─────────────────────────────── */
const parseCSV = (text: string): RepublicAct[] => {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Match columns while ignoring commas that are hidden inside quotation marks
  const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

  // Clean headers to map exactly to the data layout
  const headers = lines[0]
    .split(csvRegex)
    .map((h) => h.replace(/^"|"$/g, "").trim());

  const idxNum = headers.indexOf("Republic Act Number");
  const idxShort = headers.indexOf("Short Title");
  const idxFull = headers.indexOf("Full Title");
  const idxDate = headers.indexOf("Date Signed");
  const idxComm = headers.indexOf("Primary Committee");
  const idxCat = headers.indexOf("Macro-Category");

  const parsedActs: RepublicAct[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const columns = lines[i]
      .split(csvRegex)
      .map((c) => c.replace(/^"|"$/g, "").trim());

    const dateStr = columns[idxDate] || "";
    // Extract the last 4 digits for sorting the year properly
    const yearMatch = dateStr.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : 0;

    parsedActs.push({
      id: `ra-${i}-${Date.now()}`,
      number: columns[idxNum] || "N/A",
      shortTitle: columns[idxShort] || columns[idxFull] || "Untitled",
      title: columns[idxFull] || "No full description provided.",
      dateSigned: dateStr || "Unknown Date",
      yearSigned: year,
      primaryCommittee: columns[idxComm] || "N/A",
      category: columns[idxCat] || "Uncategorized",
    });
  }

  return parsedActs;
};

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
const ActCard: React.FC<{ act: RepublicAct; query: string }> = ({
  act,
  query,
}) => {
  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="highlight">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <article className="act-card" tabIndex={0} aria-label={act.shortTitle}>
      <div className="act-card-header">
        <span className="act-number">{act.number}</span>
      </div>

      <h2 className="act-short-title">{highlight(act.shortTitle)}</h2>
      <p className="act-full-title">{highlight(act.title)}</p>

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
  const [acts, setActs] = useState<RepublicAct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [committee, setCommittee] = useState("All");
  const [sort, setSort] = useState<"newest" | "oldest" | "number">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Automatically fetch file from public directory on mount
  useEffect(() => {
    fetch("/19thcongress_first100.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load CSV source file.");
        return response.text();
      })
      .then((text) => {
        setActs(parseCSV(text));
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error reading congress database file:", error);
        setLoading(false);
      });
  }, []);

  // Compute dynamic filters based on current data contents
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(acts.map((a) => a.category))).sort()],
    [acts],
  );
  const committees = useMemo(
    () => [
      "All",
      ...Array.from(new Set(acts.map((a) => a.primaryCommittee))).sort(),
    ],
    [acts],
  );

  const filtered = useMemo(() => {
    let result = [...acts];

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.shortTitle.toLowerCase().includes(q) ||
          a.number.toLowerCase().includes(q) ||
          a.primaryCommittee.toLowerCase().includes(q),
      );
    }
    if (category !== "All")
      result = result.filter((a) => a.category === category);
    if (committee !== "All")
      result = result.filter((a) => a.primaryCommittee === committee);

    result.sort((a, b) => {
      if (sort === "newest") return b.yearSigned - a.yearSigned;
      if (sort === "oldest") return a.yearSigned - b.yearSigned;
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });

    return result;
  }, [acts, query, category, committee, sort]);

  const hasFilters = category !== "All" || committee !== "All";

  const clearFilters = () => {
    setCategory("All");
    setCommittee("All");
  };

  return (
    <div className="ra-page">
      <div className="noise-overlay" aria-hidden="true" />

      {/* <header className="site-header">
        <Link to="/" className="header-badge">
          Home Page
        </Link>
        <Link to="/republic-acts" className="header-badge">
          Search list
        </Link>
      </header> */}

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
        ) : acts.length > 0 ? (
          <>
            {/* ── Search & Controls ── */}
            <section
              className="ra-controls"
              aria-label="Search configuration panels"
            >
              {/* Search */}
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

              {/* Controls row */}
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

            {/* ── Results Container ── */}
            <section className="ra-results" aria-live="polite">
              <div className="results-meta">
                <span className="results-count">
                  {filtered.length} act{filtered.length !== 1 ? "s" : ""}{" "}
                  located
                </span>
              </div>

              {filtered.length > 0 ? (
                <div className="acts-grid">
                  {filtered.map((act) => (
                    <ActCard key={act.id} act={act} query={query} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-title">Zero records match criteria</p>
                </div>
              )}
            </section>
          </>
        ) : (
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
            <p className="empty-title">Database Core Offline</p>
            <p className="empty-sub">
              Unable to map entries from 19thcongress_first100.csv. Verify
              structural attributes inside your public file repository.
            </p>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p>LegisLatency · Operational System Environment</p>
      </footer>
    </div>
  );
};

export default RepublicActs;
