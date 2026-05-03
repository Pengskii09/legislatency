import React, { useState } from "react";
import "./App.css";

const App: React.FC = () => {
  const [keyword, setKeyword] = useState<string>("");

  const handleAnalyze = () => {
    // Placeholder — AI prediction logic to be wired here
  };

  return (
    <div className="app">
      <div className="noise-overlay" aria-hidden="true" />

      <header className="site-header">
        <div className="header-badge">PH LEGISLATIVE TRACKER</div>
      </header>

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
            How long does it really take a bill to become law in the
            Philippines? Not anecdote — <em>math.</em> Enter a policy keyword
            and we compute an evidence-based forecast of when similar
            legislation has historically cleared Congress, down to the median,
            the variance, and the outliers that skew the average.
          </p>

          <div className="stat-strip" aria-label="Sample metrics">
            <div className="stat-item">
              <span className="stat-number">18.4</span>
              <span className="stat-label">Avg. years to passage</span>
            </div>
            <div className="stat-divider" aria-hidden="true" />
            <div className="stat-item">
              <span className="stat-number">73%</span>
              <span className="stat-label">Bills never passed</span>
            </div>
            <div className="stat-divider" aria-hidden="true" />
            <div className="stat-item">
              <span className="stat-number">19th</span>
              <span className="stat-label">Current Congress</span>
            </div>
          </div>
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
              "Divorce bill",
              "Death penalty",
              "FOI Act",
              "Mental health",
              "SOGIE",
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
            <span className="analyze-btn-text">Compute Latency</span>
            <span className="analyze-btn-icon" aria-hidden="true">
              →
            </span>
          </button>

          <p className="search-disclaimer">
            Predictions are statistical estimates based on historical
            legislative data. Not a guarantee of any legislative outcome.
          </p>
        </section>

        <section className="methodology-strip" aria-label="How it works">
          <div className="method-card">
            <div className="method-number">01</div>
            <div className="method-text">
              <strong>Corpus</strong>
              <span>
                All bills filed in the Philippine Congress since the 8th
                Congress
              </span>
            </div>
          </div>
          <div className="method-card">
            <div className="method-number">02</div>
            <div className="method-text">
              <strong>Classification</strong>
              <span>
                Keyword-matched against topic clusters using semantic similarity
              </span>
            </div>
          </div>
          <div className="method-card">
            <div className="method-number">03</div>
            <div className="method-text">
              <strong>Forecast</strong>
              <span>
                Median, P10/P90 confidence intervals, and political pressure
                signals
              </span>
            </div>
          </div>
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
