import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

const App: React.FC = () => {
  const [keyword, setKeyword] = useState<string>("");
  const navigate = useNavigate();

  const handleAnalyze = () => {
    if (!keyword.trim()) return;
    navigate(`/republic-acts?q=${encodeURIComponent(keyword.trim())}`);
  };

  return (
    <div className="home-page">
      <div className="noise-overlay" aria-hidden="true" />

      <main className="main-content">
        <section className="hero">
          <div className="hero-eyebrow">
            <span className="pulse-dot" aria-hidden="true" />
            <span>Data-driven · Empirical · Nonpartisan</span>
          </div>

          <h1 className="hero-title">
            Legis<span className="accent">Latency</span>
          </h1>

          <p className="hero-description">
            LegisLatency is a search engine that maps the timeline relationship
            between online public discourse and official state policy. Search
            Philippine Republic Acts to overlay historical Google Trends peaks,
            filter laws by category, and access AI-generated summaries and
            keyword analytics that explain the public interest spikes tied to
            each law.
          </p>
        </section>

        <section className="search-section" aria-label="Bill keyword analysis">
          <label htmlFor="keyword-input" className="search-label">
            Enter a policy keyword or bill topic
          </label>

          <div className="search-field-wrapper">
            <div className="search-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
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
              id="keyword-input"
              type="text"
              className="search-input"
              placeholder="e.g. universal healthcare, anti-discrimination, data privacy..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              autoComplete="off"
              spellCheck={false}
            />

            {keyword && (
              <button
                className="clear-btn"
                onClick={() => setKeyword("")}
                aria-label="Clear input"
              >
                ×
              </button>
            )}
          </div>

          <div className="keyword-suggestions" aria-label="Suggested keywords">
            <span className="suggestions-label">Try:</span>
            {[
              "SIM Registration",
              "Education",
              "RA 12023",
              "Laguna",
              "Nationalism",
            ].map((tag) => (
              <button
                key={tag}
                className="suggestion-chip"
                onClick={() => setKeyword(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <button
            className={`analyze-btn ${!keyword.trim() ? "disabled" : ""}`}
            onClick={handleAnalyze}
            disabled={!keyword.trim()}
            aria-label="Analyze legislative latency"
          >
            <span className="analyze-btn-text">Begin Search</span>
          </button>
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

export default App;
