# DinoFocus frontend

React + TypeScript with Vite. Use Node.js 22.18+ (Node 24 recommended).

## Run locally

Start the backend first using [its setup guide](../backend/README.md), then:

```sh
cd frontend
npm ci
npm run dev
```

Vite forwards `/api` requests to the backend on port 3000. The ordinary URL requires
an account and a working backend/database. Sign in, then start a tagged countdown
or stopwatch session. Custom tags are saved to your account.

## Account-backed sessions and history

Starting, pausing, resuming, completing, and cancelling sessions use the authenticated
session API. Reloading restores the account's active session. Timing and credited
seconds are validated by the server; the timer display advances from the elapsed
time returned by the server. Failed requests show a message and reconcile state
with the backend when possible. Expired logins return to authentication.

History loads all completed-session pages. Dashboard totals, trends, tag breakdowns,
streaks, and fossil progress derive from those saved records. Account history works
across browsers and devices. Museum and analytics display preferences are scoped
by account in browser storage. Groups, invitations, and shared goals have been cut
from the semester scope; see [the M4 scope decision](../docs/M4-scope.md).

Old browser-local history is not uploaded or attributed to an account. Signed-in
sessions never fall back to browser-local storage if the API fails.

## Sample demo

Append `/?demo=sample` for a separate no-login sample workspace with fictional
history. Only this workspace uses `demoStore` and browser-local timer/history data.
Reset sample data affects only the sample workspace. Custom tag creation requires
the ordinary signed-in workspace.

For a short demo, choose a one-minute countdown, start, reload to show recovery,
then complete it at zero. Check History, Dashboard, and Museum. Cancelled sessions
add no credit. Stopwatch completion requires at least one minute. Pause/resume
excludes break time. The backend automatically cancels abandoned sessions according
to the rules in [the API guide](../backend/API.md).

## Checks

```sh
npm run build
npm run lint
npm test
```

Tests cover sample isolation, timer rules, analytics boundaries, session response
mapping, history pagination, and the authenticated session request payloads.
Backend integration tests cover session ownership and state transitions.
