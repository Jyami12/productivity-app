# DinoFocus backend

Express + TypeScript API with PostgreSQL (Neon) via Prisma. Currently provides user accounts: register, log in, log out, and the current user.

## Setup

Requires Node.js 22.18+ (Node 24 recommended, see `.nvmrc`).

```sh
cd backend
npm ci                 # also generates the Prisma client
cp .env.example .env   # then fill in the Neon connection strings
npm run db:migrate     # creates/updates tables in the database
npm run dev            # http://localhost:3000
```

`.env` needs two Neon connection strings from the Neon dashboard (**Connect**):

- `DATABASE_URL`: the **pooled** URL (host contains `-pooler`), used by the running app.
- `DIRECT_URL`: the same URL **without** `-pooler`, used by Prisma migrations.

Never commit `.env`; it contains the database password.

Run the frontend at the same time (`cd frontend && npm run dev`). Vite forwards `/api` requests to port 3000, so open http://localhost:5173 and you will see the login screen. `?demo=sample` still opens the no-login sample workspace.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API with auto-reload |
| `npm test` | Run the tests (uses an isolated `test` schema, never the real tables) |
| `npm run typecheck` | Type-check source, tests, and scripts |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run db:migrate` | Create a migration from `prisma/schema.prisma` changes and apply it |
| `npm run db:studio` | Browse the database in Prisma Studio |

## API

See [API.md](API.md) for every route (auth and focus sessions), request and response shapes, error codes, and how to call them from the frontend.

Login uses an `HttpOnly`, `SameSite=Lax` cookie (`dinofocus_session`, 30 days). The database stores only a SHA-256 hash of the cookie token (`AuthSession` table). Failed logins and sign-ups are limited to 10 per IP address per 15 minutes.

## Deploying

The server checks its settings at startup and exits with a list of anything missing or invalid. A `.env` file is optional; hosts usually provide settings as environment variables instead.

| Setting | Required | Value |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon **pooled** URL |
| `DIRECT_URL` | For migrations | Neon direct URL (used by `prisma migrate deploy`) |
| `NODE_ENV` | Recommended | `production` (makes the login cookie HTTPS-only) |
| `TRUST_PROXY` | Behind a proxy | `1` on hosts like Render or Railway, so rate limits see real visitor IPs |
| `PORT` | No | Defaults to 3000; most hosts set it automatically |

```sh
npm ci && npm run build      # build
npx prisma migrate deploy    # apply new migrations to the database
npm start                    # run dist/server.js
```

The server shuts down cleanly on `SIGTERM` (sent by hosts when redeploying): it finishes requests in progress, then closes database connections.
