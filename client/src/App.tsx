import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import HomePage from "./HomePage";
import RepublicActs from "./RepublicActs";
import "./index.css"; // Ensures your global design system scales across routes

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      {/* Global Application Layout Wrapper */}
      <div className="app">
        {/* Ambient Noise Canvas Layer (Lifted from individual pages) */}
        <div className="noise-overlay" aria-hidden="true" />

        {/* Shared Ink & Paper Minimalist Header Navigation */}
        <header className="site-header">
          <Link to="/" className="header-badge">
            Home Page
          </Link>
          <Link to="/republic-acts" className="header-badge">
            Search List
          </Link>
        </header>

        {/* Dynamic Route Viewports */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/republic-acts" element={<RepublicActs />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
