import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Search and acts are now handled by the FastAPI Python server on port 8000.
// This Express server is kept for any future Node-specific routes.

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(3001, () => console.log("Express server running on http://localhost:3001"));