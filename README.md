# SQL & Python Exam Portal

A free, self-hosted assessment platform for screening candidates (2–5 yrs experience)
on **SQL** (joins, subqueries, CTEs, aggregation, window functions) and **Python**
(ETL, EDA) — with **real code execution**, a candidate exam room with basic
proctoring ("violations"), and an admin console. Built to be reachable from any
location/network once deployed (see Deployment below).

## What's included

```
exam-portal/
├── database/
│   ├── schema.sql       PostgreSQL schema
│   └── seed.sql         Topics + ~18 starter questions (joins/subqueries/CTE/ETL/EDA)
├── server/              Node.js + Express + PostgreSQL API
│   └── src/
│       ├── services/sqlRunner.js     sandboxed SQL execution (SQLite, per-submission, isolated process)
│       ├── services/pythonRunner.js  sandboxed Python execution (subprocess, timeout, stripped env)
│       ├── controllers/              auth / admin / candidate logic
│       └── routes/
├── admin-client/        React admin site (question bank, exam builder, results, violations)
└── candidate-client/    React candidate site (exam list, exam room with timer + proctoring)
```

### How code execution & grading works

- **SQL**: each question stores a `schema_setup` (CREATE TABLE + INSERT, SQLite dialect).
  When a candidate runs their query, it's executed in a **brand-new in-memory SQLite
  database, in its own child process, with a hard timeout**. Only a single `SELECT`/`WITH`
  statement is allowed — multi-statement injection and destructive keywords
  (`DROP`, `ATTACH`, `PRAGMA`, etc.) are rejected before execution. Results are compared
  to the stored `expected_output` (order-sensitive or not, per test case).
- **Python**: candidate code is written to a temp file and run with `python3 -I` in a
  **subprocess with a stripped environment** (no access to `DATABASE_URL`, `JWT_SECRET`,
  etc.) and a hard timeout. stdin is fed from the test case's `input`; stdout is compared
  to `expected_output`.
- Both engines were smoke-tested for: correct submissions, syntax/runtime errors,
  infinite loops (killed at timeout), and environment-variable isolation.

### Violations (browser-based proctoring)

The candidate app watches for and logs: tab switch / window blur, copy, paste,
right-click, fullscreen exit, and dev-tools shortcuts. Each event is sent to the
backend and stored against the attempt. When the count reaches the exam's configured
`max_violations`, the attempt is **auto-terminated and auto-graded** server-side.

This is honesty-nudging, not forensic proctoring — there's no webcam/AI monitoring,
which is intentional given the "completely free" requirement.

---

## 1. Local setup

### Prerequisites
- Node.js 18+
- Python 3.8+ (must be on the server's PATH as `python3`)
- A PostgreSQL database (local install, or a free hosted one — see Deployment)

### Backend

```bash
cd server
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string
npm install
npm run seed      # creates tables + seeds topics/questions + creates default admin
npm run dev        # starts API on http://localhost:4000
```

Default admin login after seeding: **admin@examportal.com / Admin@123**
(change this — see `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars, or just
change the password directly in the database after first login since there's no
"change password" UI yet).

### Admin client

```bash
cd admin-client
npm install
echo "VITE_API_URL=http://localhost:4000" > .env
npm run dev   # http://localhost:5174
```

### Candidate client

```bash
cd candidate-client
npm install
echo "VITE_API_URL=http://localhost:4000" > .env
npm run dev   # http://localhost:5173
```

Log into the admin site, create a few questions (or use the seeded bank), build an
exam by picking questions, activate it — then register a candidate account on the
candidate site and take it.

---

## 2. Making it reachable from different locations/networks (free hosting)

Since this needs to be accessed from outside your machine, you need to **deploy**
all three pieces. Free tiers exist for all of them:

| Piece | Free option | Notes |
|---|---|---|
| PostgreSQL | [Neon](https://neon.tech) or [Supabase](https://supabase.com) | Both have generous free tiers; copy the connection string into `DATABASE_URL` |
| Backend (Node API) | [Render](https://render.com) (Web Service, free tier) or [Railway](https://railway.app) | Must support running `python3` — Render's default Node runtime image includes Python; verify with a shell/build log, or use a Docker deploy that installs `python3` explicitly |
| Admin client | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) | Deploy `admin-client/`, set build command `npm run build`, output dir `dist`, and env var `VITE_API_URL` to your deployed backend URL |
| Candidate client | Vercel or Netlify | Same as above, deploy `candidate-client/` separately (or as a second Vercel project) |

Steps:
1. Create the free Postgres database, run `schema.sql` then `seed.sql` against it
   (or just run `npm run seed` locally pointed at the remote `DATABASE_URL`).
2. Deploy `server/` to Render/Railway. Set env vars from `.env.example`
   (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` — put your two frontend URLs here
   once you know them, comma-separated).
3. Deploy `admin-client/` and `candidate-client/` to Vercel/Netlify, each with
   `VITE_API_URL` pointing at your backend's public URL.
4. Once all three have public URLs, go back and set `CORS_ORIGINS` on the backend
   to those two frontend URLs, and redeploy the backend.

That's it — the admin and candidate sites will now be reachable from any device,
any network, anywhere.

### A note on the Python sandbox in production

Running arbitrary candidate code is only ever "pretty safe," not bulletproof.
The current sandbox (`-I` isolated mode, stripped env, timeout, temp-file cleanup)
is reasonable for a low-stakes internal hiring tool, but if you want stronger
isolation before exposing this publicly at scale, consider running the
Python/SQL runners inside a locked-down container (e.g., gVisor, Firecracker, or
a disposable Docker container per submission with `--network none` and CPU/memory
limits) rather than a bare subprocess.

---

## 3. Extending this

- **More questions**: add rows to `questions` via the admin UI, or extend `database/seed.sql`.
- **Code editor**: the current editor is a styled `<textarea>`. Swap in
  [Monaco Editor](https://github.com/microsoft/monaco-editor) or CodeMirror for syntax
  highlighting if desired — it's a drop-in replacement for the `<textarea>` in
  `candidate-client/src/pages/ExamRoom.jsx`.
- **Password reset / email verification**: not included — add as needed.
- **Per-attempt IP/network logging**: already captured (`ip_address`, `user_agent`
  on `exam_attempts`) for basic auditing.
