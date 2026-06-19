// Express server entry point.
// Wires up CORS, JSON parsing, rate-limit headers, and the confession routes.

import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import confessionRoutes from "./confessionRoutes.js";

const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/stress_kalaana?retryWrites=true&w=majority";

// Comma-separated list of allowed origins. Defaults to localhost:5173 (Vite)
// and localhost:4173 (Vite preview) for dev.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Allow same-origin / curl / no-origin requests (e.g. server-to-server)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0) {
      // Dev default — allow anything
      return cb(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
};

const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: "32kb" }));

// Tiny request logger — handy in dev
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "stress-backend",
    mongoState: mongoose.connection.readyState,
    mongoStates: {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    }[mongoose.connection.readyState],
    time: new Date().toISOString(),
  });
});

// Routes
app.use("/api", confessionRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

// Central error handler — return JSON instead of HTML
app.use((err, _req, res, _next) => {
  console.error("[server] unhandled error:", err);
  if (err && err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: "internal server error" });
});

// Connect to MongoDB, then start listening
async function start() {
  try {
    console.log("[mongo] connecting to:", MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@"));
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("[mongo] connected");

    app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
      console.log(`[server] CORS origins: ${ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS.join(", ") : "(dev — allow all)"}`);
    });
  } catch (err) {
    console.error("[mongo] connection failed:", err.message);
    console.error("");
    console.error("Set MONGODB_URI in your .env file. Example:");
    console.error('  MONGODB_URI="mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/stress_kalaana?retryWrites=true&w=majority"');
    process.exit(1);
  }
}

start();

export { app };
