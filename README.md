# O Stress Kalaana — Fullstack

> Killing the stress, one laugh at a time. A humor, meme & satire platform
> engineered to melt your worries into uncontrollable joy.

Monorepo containing both the **frontend** (React + Vite + Tailwind) and the
**backend** (Express + MongoDB) for the **Wall of Confession** feature.

## Repo layout

```
Stress/                       ← you are here (frontend at the root)
├── src/                      ← React frontend
│   ├── components/sections/  ← Hero, BentoGrid, ConfessionWall, ConfessionComposer, …
│   ├── lib/confessionsApi.ts ← API client (talks to server/)
│   ├── hooks/                ← useHashRoute, useMousePosition
│   └── assets/               ← brickBg.ts (realistic brick SVG)
├── server/                   ← Express + MongoDB backend
│   ├── src/
│   │   ├── server.js         ← Express entry — listens on PORT (default 5000)
│   │   ├── confessionModel.js← Mongoose schema
│   │   ├── confessionRoutes.js ← GET/POST endpoints + rate limit + wall cap
│   │   └── seed.js           ← Optional seed script (npm run seed)
│   ├── package.json
│   ├── .env.example          ← MONGODB_URI, CORS_ORIGIN, PORT
│   └── README.md             ← Backend-only docs
├── package.json              ← Frontend deps + concurrently scripts (root)
├── vite.config.ts            ← Dev proxy /api → server/
└── README.md                 ← This file
```

## Quickstart (local dev)

You need **Node 18+** and a **MongoDB** instance (local or Atlas).

### 1. Configure the backend

```bash
cd server
cp .env.example .env
# Edit .env and set MONGODB_URI to your MongoDB connection string.
# Leave CORS_ORIGIN blank for local dev (Vite proxy handles CORS).
npm install
```

### 2. Configure the frontend (optional)

The frontend defaults to relative `/api` calls, which Vite proxies to
`http://localhost:5000` in dev. If your backend runs on a different port,
set `VITE_BACKEND_URL` in a `.env` file at the repo root:

```bash
# .env (root, frontend)
VITE_BACKEND_URL=http://localhost:5001
```

### 3. Run both together

From the repo root:

```bash
npm install         # installs frontend deps + concurrently
npm run dev         # starts BOTH frontend (5173) + backend (5000) concurrently
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:5000
- Health check: http://localhost:5000/api/health

Open http://localhost:5173/#/wall to see the Wall of Confession.
Scroll down past the wall to find the composer → write a confession →
click "Stick it on the wall →" → see it appear with a "★ yours" badge.

### Alternative: run them separately

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
npm run dev:frontend
```

### 4. (Optional) Seed the backend with example confessions

```bash
cd server
npm run seed
```

## How it works

1. **Frontend** (`src/components/sections/ConfessionWall.tsx`) fetches
   user confessions from `GET /api/walls/:wallIdx/confessions` whenever
   the user swipes to a new wall, and merges them with the seed notes.
2. **Composer** (`src/components/sections/ConfessionComposer.tsx`)
   runs client-side profanity filtering (bad-words), then POSTs to
   `/api/confessions`.
3. **Backend** (`server/src/confessionRoutes.js`) validates the body,
   enforces a 1-per-30s-per-IP rate limit, saves to MongoDB, and
   auto-archives the oldest confession on the wall if it now has more
   than 20 active user notes.
4. **Persistence**: the user's own confession IDs are tracked in
   `localStorage` (`osk.confessions.mine.v1`) so the "★ yours" badge
   survives refreshes.

## Production deploy

This monorepo can be deployed in two ways:

### Option A — Single deploy (recommended)

Run the Express backend as the sole HTTP server. It serves:
- `/api/*` → JSON API
- `/*` → the built frontend (static files from `dist/`)

Steps:
1. Build the frontend: `npm run build` (produces `dist/index.html`)
2. On the backend, add `app.use(express.static("../dist"))` + a
   catch-all that serves `dist/index.html` for non-API routes
3. Deploy the `server/` folder to Render / Railway / Fly.io / etc.
4. Set env vars: `MONGODB_URI`, `CORS_ORIGIN` (can be `*` or your domain),
   `PORT`

### Option B — Split deploy

- Frontend → Vercel / Netlify / Cloudflare Pages (build command
  `npm run build`, output dir `dist`)
- Backend → Render / Railway / Fly.io (root dir `server/`)
- Set `VITE_API_URL` on the frontend to the backend's public URL
- Set `CORS_ORIGIN` on the backend to the frontend's public URL

## Tech stack

**Frontend**
- React 19 + TypeScript 5
- Vite 7 (single-file build via `vite-plugin-singlefile`)
- Tailwind CSS v4
- Framer Motion 12 (animations)
- GSAP 3 + ScrollTrigger (scroll reveals)
- Lenis (smooth scroll)
- bad-words (client-side profanity filter)

**Backend**
- Express 4
- Mongoose 8 (MongoDB ODM)
- express-rate-limit (1 confession / 30s / IP)
- cors + dotenv

## License

MIT — do whatever, just don't blame me.
