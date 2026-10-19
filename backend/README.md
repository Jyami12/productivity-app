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

All routes are under `/api`. Errors use `{ "error": { "code", "message", "fields"? } }`.

| Route | Result |
| --- | --- |
| `GET /health` | `{ ok, database }`; 503 if the database is unreachable |
| `POST /auth/register` `{ email, password }` | 201 `{ user }` and a login cookie; 400 invalid input; 409 email taken |
| `POST /auth/login` `{ email, password }` | 200 `{ user }` and a login cookie; 401 wrong email or password |
| `POST /auth/logout` | 204, ends the session |
| `GET /auth/me` | 200 `{ user }`; 401 when logged out |

`user` is `{ id, email, createdAt }`. Emails are stored lowercase. Passwords must be 8 to 72 bytes and are stored as bcrypt hashes.

Login uses an `HttpOnly`, `SameSite=Lax` cookie (`dinofocus_session`, 30 days). The database stores only a SHA-256 hash of the cookie token (`AuthSession` table).
