# DinoFocus

DinoFocus combines tagged focus sessions, collectible fossils, and personal time
analytics. This repository contains the integrated React frontend and Express API
for CSE 416, Fall 2026. Current documentation updated November 4, 2026 for M4.

## Implemented workflow

Sign in → choose a preset or custom tag → start a countdown or stopwatch →
pause/resume or recover after reload → complete the session → review account-backed
history, analytics, and fossil progress.

| Area | Current behavior |
| --- | --- |
| Accounts | Register, log in/out, and retain account-owned sessions and custom tags in PostgreSQL |
| Focus sessions | Countdown and stopwatch, custom duration, pause/resume, reload recovery, server-validated completion and cancellation |
| Tags | Four presets plus account-owned custom tag creation; names deduplicated ignoring case |
| History | Completed sessions loaded from the backend, including all history pages |
| Analytics | Day/week totals, trends, activity breakdowns, streaks, personal goals, and CSV export derived from saved completed sessions |
| Fossils | Twelve original SVG fossils, cumulative progress, unlock feedback, and animated museum artwork |
| Museum | Search, filters, favorites, and specimen details |

The backend uses **PostgreSQL hosted on Neon**. **Prisma** defines the database
models, applies migrations, and supplies the TypeScript query client. React/Vite
renders the app; Express validates authenticated API requests.

## Scope and trade-off

Groups, invitations, memberships, and shared weekly goals are **cut from the
semester release**. We prioritized the individual focus → saved history → analytics
→ fossil/museum workflow, including account ownership and server-validated timing.
See [M4 scope and trade-off](docs/M4-scope.md).

Some original requirements remain limitations rather than completed features:
tag renaming/deletion, history editing, a separate failed-session status, monthly
analytics, repeated fossil copies, and a reward configuration UI are not implemented.
Museum favorites and analytics goal preferences are stored per account in the
browser, rather than synchronized across devices. Deployment and broader release
checks remain to be verified. See the [current design](docs/design.md) for details.

## Run locally

Use Node.js 22.18+; Node 24 is recommended. In one terminal, configure and start the API:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
# Fill DATABASE_URL and DIRECT_URL in .env with your Neon connection strings.
npx prisma migrate deploy
npm run dev
```

Copy the environment file only for initial setup; retain an existing configured
`.env`. `npm ci` also generates the Prisma client. When pulling schema-only changes
without reinstalling dependencies, run `npx prisma generate` from `backend`.
Migrations apply to the configured database; they do not need to be reapplied by
each teammate if the team shares the same already-migrated database.

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173/`). The frontend
proxies `/api` to the backend on port 3000. The normal workspace requires both
services and a reachable database. See the [backend setup guide](backend/README.md)
for environment/deployment details and the [frontend guide](frontend/README.md)
for app behavior.

## Presentation demo

Use the normal account workspace for the live demo. The dedicated account
`demo@dinofocus.example` has fictional history saved in the real backend. Its
presentation baseline is 12 sessions, 149 focused minutes, three custom tags,
and five collected fossils. A real one-minute countdown reaches 150 minutes and
unlocks Tyrannosaurus rex. Completing rehearsal sessions changes that baseline;
check it before presenting. Credentials are not stored in this repository.

Suggested sequence: sign in, show populated analytics, create a tag, start a
one-minute countdown, reload to demonstrate recovery, save, then show History,
Dashboard, and Museum. Clearly identify the preloaded history as fictional.

For a separate no-login backup, open `/?demo=sample`. That workspace uses browser
storage, starts with 120 fictional minutes, and does not modify account history.
Old local history is not automatically imported into accounts. Page navigation
and tab focus do not automatically refetch account history; reload to pick up
external database changes.

## Checks

Frontend:

```powershell
cd frontend
npm run build
npm run lint
npm test
```

Backend:

```powershell
cd backend
npm run typecheck
npm run build
```

Backend database tests use an isolated `test` schema. The GitHub Actions backend
job runs `npm test` against a disposable PostgreSQL service. See the
[backend guide](backend/README.md) for test setup. Local verification passed for
24 frontend tests, 44 session API tests, and three tag API tests, plus both builds,
frontend lint, and backend type-check. This does not claim the full backend suite
or the latest remote CI run was checked.

## Documentation

- [Current architecture and behavior](docs/design.md)
- [M4 scope, cuts, and presentation trade-off](docs/M4-scope.md)
- [API contracts](backend/API.md)
- [Frontend setup and demo guide](frontend/README.md)
- [Backend setup and deployment guide](backend/README.md)
- [Historical M1 proposal](docs/M1-proposal.md)
- [Historical M2 design](docs/M2-design.md)
- [M2 presentation](https://docs.google.com/presentation/d/17L2GNyLpSZcMxiYsAS0L3EEwgHxMsKHtzlHXeILIKUI/edit?usp=sharing)

Historical documents record earlier plans; the current design and M4 scope decision
supersede their architecture and group-related promises. AI assisted with code,
tests, and documentation; the team owns review and verification.
