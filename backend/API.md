# DinoFocus API

Reference for the frontend. Everything lives under `/api` on the same origin as the frontend. In development, Vite proxies `/api` to the backend on port 3000 (`frontend/vite.config.ts`), so call `/api/...` with no host.

- Request and response bodies are JSON.
- Login is a cookie (`dinofocus_session`, HTTP-only). The browser sends it automatically with `credentials: "same-origin"`, which `frontend/src/api/client.ts` already does. Page JavaScript can't read it.
- Dates are ISO 8601 strings in UTC, for example `"2026-11-03T18:25:00.000Z"`.
- All durations are in **seconds**.

## Errors

Every error has the same shape:

```json
{ "error": { "code": "SESSION_TOO_SHORT", "message": "This session can be completed in 42 more seconds." } }
```

`message` is written for users and can be shown as-is. Validation errors (400) also include `fields`, with the messages for each invalid input:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Please fix the highlighted fields.",
             "fields": { "plannedSeconds": ["Duration must be at least 1 minute."] } } }
```

The existing `ApiError` class in `client.ts` already exposes `status`, `code`, `message` and `fields`.

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad input; see `fields`. |
| 400 | `INVALID_JSON` | The body isn't valid JSON. |
| 400 | `INVALID_CURSOR` | Unknown history page cursor. |
| 401 | `UNAUTHENTICATED` | Not logged in, or the login expired. Send the user to the login screen. |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password on login. |
| 404 | `SESSION_NOT_FOUND` | No such session for this user. Another user's session also gives 404. |
| 404 | `NOT_FOUND` | Unknown API route. |
| 409 | `EMAIL_TAKEN` | Register: an account with this email already exists. |
| 409 | `ACTIVE_SESSION_EXISTS` | Start: the user already has a running session. Load it with `GET /api/sessions/active`. |
| 409 | `SESSION_TOO_SHORT` | Complete: not enough focused time yet. The message says how long is left. |
| 409 | `SESSION_ALREADY_PAUSED` | Pause: already paused. |
| 409 | `SESSION_NOT_PAUSED` | Resume: not paused. |
| 409 | `SESSION_NOT_ACTIVE` | The session already ended (completed or cancelled). |
| 409 | `SESSION_CONFLICT` | Rare: the session was changed by another request at the same moment. Retry. |
| 500 | `INTERNAL` | Server error. |

---

## Auth

These are already wired up in `client.ts` (`api.register`, `api.login`, `api.logout`, `api.me`).

```ts
interface User { id: string; email: string; createdAt: string }
```

| Route | Body | Success |
|---|---|---|
| `POST /api/auth/register` | `{ email, password }` (password at least 8 characters) | `201 { user }`, and the user is logged in |
| `POST /api/auth/login` | `{ email, password }` | `200 { user }` |
| `POST /api/auth/logout` | none | `204`, no body |
| `GET /api/auth/me` | none | `200 { user }`, or `401` if logged out |

---

## Focus sessions

**Every route below requires login** and returns `401 UNAUTHENTICATED` otherwise. A user only ever sees their own sessions.

### The session object

```ts
interface FocusSession {
  id: string;
  tag: string;                       // e.g. "Deep work"
  mode: "countdown" | "stopwatch";
  status: "active" | "completed" | "cancelled";
  plannedSeconds: number | null;     // countdown length; null for stopwatch
  startedAt: string;                 // set by the server
  pausedAt: string | null;           // set while paused, otherwise null
  pausedSeconds: number;             // total time spent paused in finished pauses
  endedAt: string | null;            // set when completed or cancelled
  creditedSeconds: number;           // focus time earned; 0 unless completed
  elapsedSeconds: number;            // focused time so far (excludes pauses), computed by the server
  requiredSeconds: number;           // elapsedSeconds needed before complete is allowed
}
```

`creditedSeconds` is the number fossils and analytics should use. It is decided by the server and can't be set by the frontend.

### Timing rules (enforced by the server)

- **Countdown:** `plannedSeconds` from 60 to 86400 (1 minute to 24 hours). It can be completed once `elapsedSeconds >= plannedSeconds`, and is credited exactly `plannedSeconds`, even if completed late.
- **Stopwatch:** can be completed after 60 seconds and is credited `elapsedSeconds`, capped at 12 hours.
- Paused time never counts. Complete and cancel are both allowed while paused.
- A user can have **only one active session at a time.**
- Cancelling credits nothing.

### Routes

#### `POST /api/sessions`: start a session
```jsonc
// countdown (send minutes × 60)
{ "mode": "countdown", "tag": "Deep work", "plannedSeconds": 1500 }
// stopwatch
{ "mode": "stopwatch", "tag": "Reading" }
```
- `tag`: 1–40 characters; surrounding spaces are trimmed.
- Any other fields are ignored.
- `201 { session }`
- Errors: `400 VALIDATION_ERROR`, `409 ACTIVE_SESSION_EXISTS`.

#### `GET /api/sessions/active`: the running session
- `200 { session: FocusSession | null, serverTime: string }`
- Call this when the app opens to restore a running timer after a reload or on another device.

#### `POST /api/sessions/:id/pause` and `POST /api/sessions/:id/resume`
- No body. `200 { session }`
- Errors: `404`, `409 SESSION_ALREADY_PAUSED`, `409 SESSION_NOT_PAUSED`, `409 SESSION_NOT_ACTIVE`.

#### `POST /api/sessions/:id/complete`
- No body. The server works out the time; don't send a duration.
- `200 { session }`, with `status: "completed"` and the final `creditedSeconds`.
- Calling it again on a completed session returns the same session, so it's safe to retry.
- Errors: `404`, `409 SESSION_TOO_SHORT`, `409 SESSION_NOT_ACTIVE` (it was cancelled).

#### `POST /api/sessions/:id/cancel`
- No body. `200 { session }`, with `status: "cancelled"` and `creditedSeconds: 0`.
- Safe to retry.
- Errors: `404`, `409 SESSION_NOT_ACTIVE` (it was already completed).

#### `GET /api/sessions`: history
Query parameters, all optional:

| Param | Values | Default |
|---|---|---|
| `status` | `completed`, `cancelled`, `all` (`all` means completed and cancelled) | `completed` |
| `limit` | 1–100 | 50 |
| `cursor` | the `nextCursor` from the previous page | none |

- `200 { sessions: FocusSession[], nextCursor: string | null }`
- Newest first, by `endedAt`. Active sessions are never included.
- `nextCursor` is `null` on the last page. To load everything (for analytics), keep requesting with `cursor=nextCursor` until it's `null`.

#### `GET /api/sessions/:id`: one session
- `200 { session }`, or `404 SESSION_NOT_FOUND`.

---

## Using this from the frontend

### Suggested `client.ts` additions

```ts
export interface FocusSession { /* as above */ }

export const sessionsApi = {
  start: (body: { mode: "countdown"; tag: string; plannedSeconds: number } | { mode: "stopwatch"; tag: string }) =>
    request<{ session: FocusSession }>("POST", "/sessions", body).then((r) => r.session),
  active: () =>
    request<{ session: FocusSession | null; serverTime: string }>("GET", "/sessions/active"),
  pause: (id: string) => request<{ session: FocusSession }>("POST", `/sessions/${id}/pause`).then((r) => r.session),
  resume: (id: string) => request<{ session: FocusSession }>("POST", `/sessions/${id}/resume`).then((r) => r.session),
  complete: (id: string) => request<{ session: FocusSession }>("POST", `/sessions/${id}/complete`).then((r) => r.session),
  cancel: (id: string) => request<{ session: FocusSession }>("POST", `/sessions/${id}/cancel`).then((r) => r.session),
  history: async (status: "completed" | "cancelled" | "all" = "completed") => {
    const all: FocusSession[] = [];
    let cursor: string | null = null;
    do {
      const query = `?status=${status}&limit=100${cursor ? `&cursor=${cursor}` : ""}`;
      const page = await request<{ sessions: FocusSession[]; nextCursor: string | null }>("GET", `/sessions${query}`);
      all.push(...page.sessions);
      cursor = page.nextCursor;
    } while (cursor);
    return all;
  },
};
```

### Replacing `demoStore` in `App.tsx`

| Today | Replace with |
|---|---|
| `demoStore.getSessions()` | `sessionsApi.history()` |
| `demoStore.getActive()` | `sessionsApi.active()` |
| Start (`demoStore.setActive({...})`) | `sessionsApi.start(...)` |
| `toggleSessionPause()` | `sessionsApi.pause(id)` or `sessionsApi.resume(id)` |
| `demoStore.complete()` | `sessionsApi.complete(id)` |
| Cancel (`demoStore.setActive(null)`) | `sessionsApi.cancel(id)` |

### Keeping fossils and analytics unchanged

The museum and analytics read the existing `Session` type from `demoStore.ts`. Converting each completed API session into that shape keeps them working as they are:

```ts
const toLocalSession = (s: FocusSession): Session => ({
  id: s.id,
  tag: s.tag,
  mode: s.mode,
  seconds: s.creditedSeconds,
  completedAt: new Date(s.endedAt!).getTime(),
});
```

### Showing the running timer

For a smooth display, keep ticking every second in the browser, but start from the server's numbers:
- When a session is loaded, store `elapsedSeconds` and the time it was received.
- While running (`pausedAt === null`), display `elapsedSeconds + seconds since it was received`. While paused, display `elapsedSeconds` as is.
- For a countdown, the time left is `requiredSeconds - displayed elapsed`.
- Enable the Finish button once the displayed elapsed time reaches `requiredSeconds`. If `complete` still returns `SESSION_TOO_SHORT` (for example, the browser's clock is slightly ahead), show the message and let the user try again a moment later.

### Errors to handle in the UI

- `401` on any call: the login expired, so return to the login screen.
- `ACTIVE_SESSION_EXISTS` on start: load and show the running session with `sessionsApi.active()`.
- `SESSION_TOO_SHORT`: show `error.message`.
- `NETWORK_ERROR` (from `client.ts`): the backend isn't reachable.

## Running it locally

```sh
cd backend
npm install
npm run db:migrate   # once, to create the FocusSession table in your database
npm run dev          # API on http://localhost:3000
```
Then run `npm run dev` in `frontend`. Use `GET /api/health` to check that the backend and database are up.
