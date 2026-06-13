# ToastUp — agent notes

ToastUp is an npm-workspaces monorepo: `apps/web` (React+Vite Mini App), `apps/server`
(Express + Socket.IO + Prisma), `apps/bot` (grammY Telegram bot), `packages/shared` (types).
Standard commands live in the root `package.json` scripts and `README.md` — read those first.

## Cursor Cloud specific instructions

Services & how to run them (all run from the repo root):

| Service | Dev command | Port | Notes |
| ------- | ----------- | ---- | ----- |
| Backend API + Socket.IO | `npm run dev:server` | 4000 | Needs Postgres + `.env`. |
| Web Mini App | `npm run dev:web` | 5173 | Opens in a normal browser too (see dev-auth). |
| Telegram bot | `npm run dev:bot` | — | Only runs with a real `BOT_TOKEN`; otherwise it prints a notice and idles. |
| All together | `npm run dev` | — | Parallel; bot idles without a token, server/web still run. |

- Lint/typecheck: `npm run typecheck` (per-workspace `tsc --noEmit`). There is no separate ESLint config in this repo — `typecheck` is the type/lint gate. Build: `npm run build`.

PostgreSQL is **required** and is NOT provided by the base image or the update script (system deps
are intentionally excluded). Provision it once per fresh VM, e.g.:

```bash
sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE toastup;"
```

(or `docker compose up -d db` if Docker is available.)

`.env` is gitignored, so create it on a fresh VM: `cp .env.example .env`. The example already points
`DATABASE_URL` at `postgresql://postgres:postgres@localhost:5432/toastup` and sets
`ALLOW_DEV_AUTH=true`.

Prisma client + schema (run after `.env` exists and Postgres is up):

```bash
npm run prisma:generate          # regenerate client (do this after schema changes / fresh clone)
npm run prisma:migrate           # apply migrations (creates the DB schema)
```

Non-obvious gotchas:
- All server/bot/prisma scripts are wrapped with `dotenv -e ../../.env --` so they read the single
  root `.env`. If `.env` is missing, those commands fail with "Environment variable not found:
  DATABASE_URL" — create `.env` first.
- `ALLOW_DEV_AUTH=true` lets the Mini App authenticate in a plain browser without Telegram: the web
  app sends a per-browser `devUser` (stored in `localStorage` as `toastup_dev_id`). Use this to test
  the full UI locally. Different browser profiles / `localStorage` = different users (useful for
  multi-user realtime testing). It must stay disabled in production.
- The Telegram bot needs `BOT_TOKEN` (and `TELEGRAM_BOT_USERNAME` for invite links). Telegram only
  opens Mini Apps over HTTPS, so testing the *bot's* WebApp button requires a public HTTPS tunnel to
  port 5173; the web app itself is fully testable over plain `http://localhost:5173`.
- Prisma client generates into the root `node_modules/@prisma/client` (hoisted by workspaces).
