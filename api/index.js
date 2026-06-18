// Vercel serverless entry point.
// All requests are rewritten here (see vercel.json) and handled by the
// combined Express app, which routes to the Portal or Website backend.
import app from "../gateway.js";

export default app;
