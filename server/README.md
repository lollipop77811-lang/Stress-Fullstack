# Stress Backend

Express + MongoDB backend for the **O Stress Kalaana — Wall of Confession** feature.

Powers the "pin your own confession" composer on the frontend: visitors write
a confession, it gets saved here, and other visitors see it on the wall.

## Stack

- **Express 4** — HTTP server
- **Mongoose 8** — MongoDB ODM
- **express-rate-limit** — 1 confession per 30s per IP
- **cors** — configurable allowed origins
- **dotenv** — env vars

## Endpoints

| Method | Path                                  | Description                                                              |
| ------ | ------------------------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/health`                         | Health check + Mongo connection state                                    |
| GET    | `/api/walls/:wallIdx/confessions`     | List non-archived user confessions for wall `0..4` (newest first)        |
| POST   | `/api/confessions`                    | Create a new confession. Rate-limited 1 per 30s/IP. Auto-archives oldest at 20 per wall. |

### POST `/api/confessions` body

```json
{
  "text": "I've been pretending to understand my job for 3 years.",
  "author": "anon",            // optional, defaults to "anon", max 30 chars
  "color": "yellow",           // yellow | pink | blue | green | orange | purple
  "aging": "fresh",            // fresh | faded | torn | crumpled | old
  "wallIdx": 0                 // 0..4 — which wall to stick it on
}
```

### Response (201 Created)

```json
{
  "confession": {
    "id": "65f8c1a2b3c4d5e6f7a8b9c0",
    "text": "I've been pretending to understand my job for 3 years.",
    "author": "anon",
    "color": "yellow",
    "aging": "fresh",
    "wallIdx": 0,
    "createdAt": "2026-06-19T10:42:13.000Z"
  },
  "archivedOldest": null,      // { id: "..." } if the oldest was archived
  "wallCount": 1,              // active user confessions on this wall now
  "wallCap": 20
}
```

## Wall cap behavior

Each wall can hold up to **20 user confessions**. When the 21st is pinned,
the oldest active confession on that wall is automatically archived
(`isArchived: true`) — it stays in the database but no longer shows up in
`GET /api/walls/:wallIdx/confessions` responses.

## Setup

### 1. Install dependencies

```bash
cd Stress-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

- **`MONGODB_URI`** — get this from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas):
  1. Create a free cluster
  2. Add a database user (username + password)
  3. Click **Connect → Drivers → Node.js**
  4. Copy the connection string and replace `<user>`, `<password>`, `<cluster>`
  5. Add your current IP to the Atlas IP access list

- **`CORS_ORIGIN`** — leave blank in dev. In production, set to your frontend URL
  (e.g. `https://your-frontend.vercel.app`).

- **`PORT`** — defaults to 5000.

### 3. (Optional) Seed the DB with a few example confessions

```bash
npm run seed
```

### 4. Run the server

```bash
npm run dev    # development with auto-reload (nodemon)
# or
npm start      # production
```

Server starts on `http://localhost:5000`. Visit `http://localhost:5000/api/health`
to verify it's alive.

## Connecting the frontend

On the **Stress** frontend repo, set:

```bash
# .env.local (or .env)
VITE_API_URL=http://localhost:5000/api
```

For production, set `VITE_API_URL` to your deployed backend URL.

## Deploying

This Express app will run on any Node host. Recommended options:

- **Render** (free tier) — connects to your GitHub repo, runs `npm install && npm start`
- **Railway** — similar, slightly better free tier
- **Fly.io** — needs Dockerfile (not included yet)

Don't forget to set `MONGODB_URI`, `CORS_ORIGIN`, and `PORT` as environment
variables on whichever host you choose.

## License

MIT — do whatever, just don't blame me.
