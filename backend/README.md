# DinoFocus backend

Express + TypeScript API with PostgreSQL (Neon) via Prisma. Provides accounts, account-owned focus sessions and history, and custom tags.

## Setup

Requires Node.js 22.18+ (Node 24 recommended, see `.nvmrc`).

```sh
cd backend
npm ci                 # also generates the Prisma client
cp .env.example .env   # then fill in the Neon connection strings
npx prisma migrate deploy  # applies the migrations checked into the repo
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

## Test database

Use a development or disposable database with both connection URLs configured
as above. The tests write to the isolated `test` schema. On Linux, `npm test`
applies migrations to that schema and runs the suite. GitHub Actions runs the
same command against a disposable PostgreSQL service.

In PowerShell, run these commands from `backend`. The first command applies
migrations using the direct URL with its schema set to `test`.

```powershell
@'
const { execFileSync } = require('node:child_process');
const url = new URL(process.env.DIRECT_URL);
url.searchParams.set('schema', 'test');
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: { ...process.env, DIRECT_URL: url.toString() },
  stdio: 'inherit',
});
'@ | node --env-file-if-exists=.env

if ($LASTEXITCODE -eq 0) {
    $env:DATABASE_SCHEMA = 'test'
    try {
        node --env-file-if-exists=.env --import tsx --test --test-concurrency=1 'tests/*.test.ts'
    } finally {
        Remove-Item Env:DATABASE_SCHEMA
    }
}
```

## Presentation account

`node --env-file-if-exists=.env --import tsx scripts/create-demo-account.ts` creates
`demo@dinofocus.example` with 12 fictional completed sessions totaling 149 minutes,
three custom tags, and a generated password printed once. It refuses to modify an
existing account. This is an explicit presentation fixture, not a public way to
award time. Describe the preloaded history as fictional during the demo.

Sign in through the ordinary frontend URL. Five fossils start collected; completing
a real one-minute countdown reaches 150 minutes and unlocks Tyrannosaurus rex.
Rehearsal sessions change this account's totals, so reserve that last minute for
the presentation. The script is separate from normal app startup and migrations.

## API

Custom tags are saved per account. Apply the latest migrations with `npx prisma migrate deploy`
before using **Create tag** in the focus workspace. The four preset tags remain available;
new names are trimmed, limited to 40 characters, and deduplicated ignoring case per account.
Custom tag creation is available in the signed-in workspace, not the no-login sample. Session APIs still accept tag names,
and the frontend session/history integration uses this field.

See the [current design](../docs/design.md) for the implemented schema and derived
analytics/rewards. PostgreSQL stores accounts, login sessions, focus sessions, and
tags. Fossil definitions and progress calculations are frontend code; there are
no separate fossil/reward/group tables or analytics endpoints.

See [API.md](API.md) for every route (auth and focus sessions), request and response shapes, error codes, and how to call them from the frontend.

Login uses an `HttpOnly`, `SameSite=Lax` cookie (`dinofocus_session`, 30 days). The database stores only a SHA-256 hash of the cookie token (`AuthSession` table). Failed logins and sign-ups are limited to 10 per IP address per 15 minutes.

## Deploying

The root [Render Blueprint](../render.yaml) builds both apps from `jason-branch`
and runs Express as one web service. Express serves the built frontend at `/`
and the API at `/api`, so the browser can use the login cookie on the same origin.

Before creating the Blueprint in Render, push the branch and run
`npx prisma migrate deploy` from `backend` with the target Neon database's
`DIRECT_URL` in your environment or `backend/.env`. Repeat this before deploying
commits with new migrations. In Render, select **New → Blueprint**, connect the
repository and select `jason-branch`. Enter both Neon connection strings when
prompted. The Blueprint uses the Free plan with automatic deploys disabled.
Use **Manual Deploy** for updates after checking CI and applying any
new migrations.

To check the production build locally from the repository root in PowerShell:

```powershell
npm ci --prefix frontend --include=dev
npm run build --prefix frontend
npm ci --prefix backend --include=dev
npm run build --prefix backend
$env:NODE_ENV = 'production'
npm start --prefix backend
```

With a configured, migrated database, open `http://localhost:3000/` and check
`http://localhost:3000/api/health` for `database: "connected"`. Stop the
server and run `Remove-Item Env:NODE_ENV` to clear the shell setting.

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

Render Free services may need time to wake after sitting idle. Open the public
URL and check `/api/health` before the demo.

The server shuts down cleanly on `SIGTERM` (sent by hosts when redeploying): it finishes requests in progress, then closes database connections.
