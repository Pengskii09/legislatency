import React, { useState, useMemo } from "react";
import "./RepublicActs.css";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface RepublicAct {
  id: string;
  number: string;
  title: string;
  shortTitle?: string;
  category: string;
  congress: number;
  yearSigned: number;
  status: "signed" | "lapsed" | "vetoed";
  tags: string[];
}

/* ─── Sample Data ────────────────────────────────────────────────────────────── */
const SAMPLE_ACTS: RepublicAct[] = [
  {
    id: "ra-11223",
    number: "RA 11223",
    title: "An Act Instituting Universal Health Care for All Filipinos",
    shortTitle: "Universal Health Care Act",
    category: "Health",
    congress: 17,
    yearSigned: 2019,
    status: "signed",
    tags: ["PhilHealth", "healthcare", "insurance"],
  },
  {
    id: "ra-10173",
    number: "RA 10173",
    title:
      "An Act Protecting Individual Personal Information in Information and Communications Systems",
    shortTitle: "Data Privacy Act",
    category: "Technology",
    congress: 15,
    yearSigned: 2012,
    status: "signed",
    tags: ["data", "privacy", "NPC"],
  },
  {
    id: "ra-11293",
    number: "RA 11293",
    title: "An Act Instituting the Philippine Innovation Act",
    shortTitle: "Philippine Innovation Act",
    category: "Technology",
    congress: 17,
    yearSigned: 2019,
    status: "signed",
    tags: ["innovation", "startup", "R&D"],
  },
  {
    id: "ra-9262",
    number: "RA 9262",
    title: "An Act Defining Violence Against Women and Their Children",
    shortTitle: "VAWC Act",
    category: "Women & Children",
    congress: 12,
    yearSigned: 2004,
    status: "signed",
    tags: ["women", "violence", "protection"],
  },
  {
    id: "ra-10667",
    number: "RA 10667",
    title: "An Act Providing for a Philippine Competition Policy",
    shortTitle: "Philippine Competition Act",
    category: "Economy",
    congress: 16,
    yearSigned: 2015,
    status: "signed",
    tags: ["antitrust", "competition", "PCC"],
  },
  {
    id: "ra-11036",
    number: "RA 11036",
    title:
      "An Act Establishing a National Mental Health Policy for the Purpose of Enhancing the Delivery of Integrated Mental Health Services",
    shortTitle: "Mental Health Act",
    category: "Health",
    congress: 17,
    yearSigned: 2018,
    status: "signed",
    tags: ["mental health", "psychiatry", "wellbeing"],
  },
  {
    id: "ra-11313",
    number: "RA 11313",
    title:
      "An Act Defining Gender-Based Sexual Harassment in Streets, Public Spaces, Online, Workplaces, and Educational or Training Institutions",
    shortTitle: "Safe Spaces Act",
    category: "Women & Children",
    congress: 17,
    yearSigned: 2019,
    status: "signed",
    tags: ["harassment", "gender", "bawal bastos"],
  },
  {
    id: "ra-10951",
    number: "RA 10951",
    title:
      "An Act Adjusting the Amount or the Value of Property and Damage on Which a Penalty is Based, and the Fines Imposed Under the Revised Penal Code",
    shortTitle: "Revised Penal Code Adjustment Act",
    category: "Justice & Law",
    congress: 17,
    yearSigned: 2017,
    status: "signed",
    tags: ["RPC", "penalty", "criminal law"],
  },
  {
    id: "ra-11479",
    number: "RA 11479",
    title:
      "An Act to Prevent, Prohibit, and Penalize Terrorism in the Philippines",
    shortTitle: "Anti-Terrorism Act",
    category: "Security",
    congress: 18,
    yearSigned: 2020,
    status: "signed",
    tags: ["terrorism", "ATA", "national security"],
  },
  {
    id: "ra-11054",
    number: "RA 11054",
    title:
      "An Act Providing for the Organic Law for the Bangsamoro Autonomous Region in Muslim Mindanao",
    shortTitle: "Bangsamoro Organic Law",
    category: "Governance",
    congress: 17,
    yearSigned: 2018,
    status: "signed",
    tags: ["BARMM", "Mindanao", "autonomy"],
  },
  {
    id: "ra-11494",
    number: "RA 11494",
    title: "An Act Providing for Bayanihan to Recover as One",
    shortTitle: "Bayanihan II",
    category: "Economy",
    congress: 18,
    yearSigned: 2020,
    status: "signed",
    tags: ["COVID-19", "recovery", "pandemic"],
  },
  {
    id: "ra-11469",
    number: "RA 11469",
    title:
      "An Act Declaring the Existence of a National Emergency Arising from the COVID-19 Pandemic",
    shortTitle: "Bayanihan I",
    category: "Health",
    congress: 18,
    yearSigned: 2020,
    status: "signed",
    tags: ["COVID-19", "pandemic", "emergency"],
  },
];

const CATEGORIES = [
  "All",
  ...Array.from(new Set(SAMPLE_ACTS.map((a) => a.category))).sort(),
];
const CONGRESSES = [
  "All",
  ...Array.from(new Set(SAMPLE_ACTS.map((a) => a.congress)))
    .sort((a, b) => b - a)
    .map(String),
];
const STATUSES = ["All", "signed", "lapsed", "vetoed"];

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
const StatusBadge: React.FC<{ status: RepublicAct["status"] }> = ({
  status,
}) => <span className={`status-badge status-${status}`}>{status}</span>;

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
    <article
      className="act-card"
      tabIndex={0}
      aria-label={act.shortTitle ?? act.number}
    >
      <div className="act-card-header">
        <span className="act-number">{act.number}</span>
        <StatusBadge status={act.status} />
      </div>

      <h2 className="act-short-title">
        {highlight(act.shortTitle ?? act.title)}
      </h2>
      <p className="act-full-title">{highlight(act.title)}</p>

      <div className="act-meta">
        <span className="meta-item">
          <span className="meta-icon">◈</span>
          {act.category}
        </span>
        <span className="meta-item">
          <span className="meta-icon">◎</span>
          {act.congress}th Congress
        </span>
        <span className="meta-item">
          <span className="meta-icon">◷</span>
          {act.yearSigned}
        </span>
      </div>

      <div className="act-tags">
        {act.tags.map((tag) => (
          <span key={tag} className="act-tag">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
const RepublicActs: React.FC = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [congress, setCongress] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState<"newest" | "oldest" | "number">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = [...SAMPLE_ACTS];

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.shortTitle?.toLowerCase().includes(q) ?? false) ||
          a.number.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (category !== "All")
      result = result.filter((a) => a.category === category);
    if (congress !== "All")
      result = result.filter((a) => String(a.congress) === congress);
    if (status !== "All") result = result.filter((a) => a.status === status);

    result.sort((a, b) => {
      if (sort === "newest") return b.yearSigned - a.yearSigned;
      if (sort === "oldest") return a.yearSigned - b.yearSigned;
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });

    return result;
  }, [query, category, congress, status, sort]);

  const hasFilters =
    category !== "All" || congress !== "All" || status !== "All";

  const clearFilters = () => {
    setCategory("All");
    setCongress("All");
    setStatus("All");
  };

  return (
    <div className="ra-page">
      <div className="noise-overlay" aria-hidden="true" />

      {/* ── Header ── */}
      <header className="site-header">
        <div className="header-badge">Home Page</div>
        <div className="header-badge">Search list</div>
      </header>

      <main className="ra-main">
        {/* ── Page Title ── */}
        <section className="ra-hero">
          {/* <div className="ra-hero-eyebrow">
            <span className="pulse-dot" aria-hidden="true" />
            <span>Republic Acts · Philippine Congress</span>
          </div> */}
          <h1 className="ra-title">
            Search<span className="accent"> Republic Acts</span>
          </h1>
          <p className="ra-description">
            A searchable index of enacted Philippine legislation. Filter by
            category, Congress, or status — then trace the history of a law from
            filing to signature.
          </p>
        </section>

        {/* ── Search & Controls ── */}
        <section
          className="ra-controls"
          aria-label="Search and filter controls"
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
                <button className="clear-filters-btn" onClick={clearFilters}>
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

          {/* Filter panel */}
          {filtersOpen && (
            <div
              className="filter-panel"
              role="group"
              aria-label="Filter options"
            >
              <div className="filter-group">
                <span className="filter-group-label">Category</span>
                <div className="filter-chips">
                  {CATEGORIES.map((c) => (
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
                <span className="filter-group-label">Congress</span>
                <div className="filter-chips">
                  {CONGRESSES.map((c) => (
                    <button
                      key={c}
                      className={`filter-chip ${congress === c ? "active" : ""}`}
                      onClick={() => setCongress(c)}
                    >
                      {c === "All" ? "All" : `${c}th`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-group-label">Status</span>
                <div className="filter-chips">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      className={`filter-chip ${status === s ? "active" : ""}`}
                      onClick={() => setStatus(s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Results ── */}
        <section
          className="ra-results"
          aria-label="Republic acts list"
          aria-live="polite"
        >
          <div className="results-meta">
            <span className="results-count">
              {filtered.length} act{filtered.length !== 1 ? "s" : ""}
            </span>
            {query && (
              <span className="results-query">
                matching <em>"{query}"</em>
              </span>
            )}
          </div>

          {filtered.length > 0 ? (
            <div className="acts-grid">
              {filtered.map((act) => (
                <ActCard key={act.id} act={act} query={query} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">∅</div>
              <p className="empty-title">No acts found</p>
              <p className="empty-sub">
                Try adjusting your search or clearing filters.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p>
          LegisLatency · An open-data project · Not affiliated with the
          Philippine Congress
        </p>
      </footer>
    </div>
  );
};

export default RepublicActs;
