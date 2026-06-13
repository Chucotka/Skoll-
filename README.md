# 🥂 ToastUp

ToastUp is a social **Telegram Mini App + Bot** for online hangouts — virtual toasts, cozy evening
rooms, safe mini-games, and a friendly AI host. It works equally well for wine, beer, tea, coffee,
soft drinks, or completely **alcohol-free** meetings.

> ⚠️ **Please drink responsibly. This app is designed for communication and entertainment.**
> ToastUp is an *online social table*, not a drinking challenge app. There are no “who drank the
> most” rankings, no “drink fast” tasks, and an **18+ age gate** before entering.

## Monorepo structure

```
toastup/
├── apps/
│   ├── web/      # Telegram Mini App frontend (React + TypeScript + Vite + Tailwind)
│   ├── server/   # Backend REST API + Socket.IO (Node + Express + Prisma)
│   └── bot/      # Telegram bot (grammY)
├── packages/
│   └── shared/   # Shared TypeScript types + constants
├── docker-compose.yml
├── .env.example
└── README.md
```

## Tech stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Telegram WebApp API
- **Backend:** Node.js + Express + TypeScript, Socket.IO realtime
- **Bot:** grammY
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Telegram `initData` validation (HMAC), JWT sessions
- **Security:** Helmet, CORS, rate limiting, Zod validation, blocked-words filter

---

## 1. Install dependencies

Requires **Node 20+**. From the repo root:

```bash
npm install
```

This installs all workspaces (`web`, `server`, `bot`, `shared`).

## 2. Create your `.env`

Copy the example and fill in the values:

```bash
cp .env.example .env
```

| Variable                | Description                                                       |
| ----------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                                     |
| `BOT_TOKEN`             | Telegram bot token from @BotFather                               |
| `TELEGRAM_BOT_USERNAME` | Your bot username (without `@`) — used for invite links          |
| `WEB_APP_URL`           | Public URL of the Mini App (https in production)                 |
| `SERVER_URL`            | Public URL of the backend API                                    |
| `JWT_SECRET`            | Long random string for signing sessions                          |
| `CORS_ORIGIN`           | Allowed web origin(s), comma-separated                           |
| `ALLOW_DEV_AUTH`        | `true` to allow browser login without Telegram (local dev only)  |

The web app also reads `VITE_SERVER_URL` and `VITE_BOT_USERNAME` (optional). For local dev the
defaults (`http://localhost:4000`) work out of the box.

## 3. Start PostgreSQL with Docker

```bash
docker compose up -d db
```

This starts Postgres on `localhost:5432` with database `toastup` (user/pass `postgres`/`postgres`).
If you run your own Postgres instead, just point `DATABASE_URL` at it.

## 4. Run Prisma migrations

```bash
npm run prisma:generate      # generate the Prisma client
npm run prisma:migrate       # create & apply the initial migration
# optional:
npm run prisma:seed          # add a demo user
```

## 5. Run web / server / bot

Run everything together:

```bash
npm run dev
```

…or individually:

```bash
npm run dev:server   # http://localhost:4000
npm run dev:web      # http://localhost:5173
npm run dev:bot      # requires BOT_TOKEN
```

Open <http://localhost:5173> in a browser. With `ALLOW_DEV_AUTH=true` you can use the app outside of
Telegram (a per-browser dev user is created automatically), which is handy for development.

## 6. Create a Telegram bot via BotFather

1. Open [@BotFather](https://t.me/BotFather) → `/newbot` → follow the prompts.
2. Copy the **token** into `BOT_TOKEN`, and the **username** into `TELEGRAM_BOT_USERNAME`.
3. (Optional) `/setdescription`, `/setabouttext` to describe ToastUp.

## 7. Set the Mini App (WebApp) URL

Telegram only opens Mini Apps over **HTTPS**. For local testing, expose your Vite dev server with a
tunnel (e.g. `ngrok http 5173` or Cloudflare Tunnel) and:

1. In @BotFather → `/newapp` (or `/myapps`) → select your bot → set the **Web App URL** to the
   public HTTPS tunnel URL.
2. Set the same URL in `WEB_APP_URL` so the bot’s buttons point to it.

Then send `/start` to your bot and tap **Open ToastUp**.

## 8. Test invite links

- In a room, tap **Invite** / **Copy Invite Link**. Links look like:
  `https://t.me/<BOT_USERNAME>?startapp=<INVITE_CODE>`
- Opening that link starts the bot with the code; opening the Mini App reads `start_param` and
  pre-fills **Join by Code**.
- For pure browser testing, `http://localhost:5173?startapp=<INVITE_CODE>` works the same way.

---

## Bot commands

- `/start` — greeting, product intro, **Open ToastUp** / **Create Room** buttons (supports deep
  links with an invite code)
- `/help` — list of commands
- `/create_room` — quick link to create a room
- `/rules` — house rules & safety

## AI Host

For the MVP, toasts are generated locally from curated templates in
`apps/server/src/services/aiToastService.ts` via `generateToastPrompt(mood, occasion)`. The service
is async and provider-agnostic, so it can be swapped for OpenAI or another API later without
changing callers.

## Safety & moderation

18+ age gate · responsible-drinking disclaimer · report button per participant · blocked-words
filter · empty/over-long message protection · API rate limiting · CORS · Helmet · Zod validation ·
Telegram `initData` HMAC validation.

## Production build

```bash
npm run build            # build shared, server and web
npm run prisma:deploy --workspace @toastup/server   # apply migrations in prod
```
