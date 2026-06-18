import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createRequire } from "module";

// Portal backend is ESM and exports its app via `export default`
import portalApp from "./SQAC_Portal/Backend/server.js";

// Member-form backend is ESM too
import memberFormApp from "./SQAC-Member-Form/backend/index.js";

// Website backend is CommonJS — load it with createRequire
const require = createRequire(import.meta.url);
const websiteApp = require("./sqac-website/backend/server.js");

const app = express();

// Gateway health check
app.get("/health", (req, res) => res.json({ status: "ok", gateway: "sqac-api-gateway" }));

// --- Routing ---
// Requests are dispatched to the right backend WITHOUT stripping the URL,
// so each sub-app keeps its own routes, CORS and body parsing intact.
// Anything not matched below falls through to the Portal backend.
const WEBSITE_PREFIXES = ["/api/data", "/api/contact", "/api/upload", "/api/health"];
const MEMBERFORM_PREFIXES = ["/api/form", "/api/getdata"];

const matches = (prefixes, path) =>
  prefixes.some((p) => path === p || path.startsWith(p + "/"));

app.use((req, res, next) => {
  if (matches(WEBSITE_PREFIXES, req.path)) return websiteApp(req, res, next);
  if (matches(MEMBERFORM_PREFIXES, req.path)) return memberFormApp(req, res, next);
  return portalApp(req, res, next);
});

// Export the combined app so it can run as a Vercel serverless function
// (see api/index.js). Vercel sets process.env.VERCEL automatically.
export default app;

// Only start a long-running HTTP server when NOT on Vercel
// (i.e. local dev or a persistent host like Koyeb/Render).
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 SQAC API Gateway running on port ${PORT}`);

    // Optional keep-alive for free-tier hosts that sleep on inactivity.
    if (process.env.KEEPALIVE_URL) {
      setInterval(() => {
        fetch(`${process.env.KEEPALIVE_URL}/health`)
          .then((r) => console.log(`[KeepAlive] ${r.status}`))
          .catch((e) => console.error("[KeepAlive] failed:", e.message));
      }, 14 * 60 * 1000);
    }
  });
}
