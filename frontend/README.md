# DinoFocus frontend

Frontend-only M2 prototype. Backend, authentication, database, and API choices remain open.

## Run locally

Use Node.js 22.18+ (Node 24 LTS recommended). From this repository:

```sh
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite. No environment variables or backend services are needed.

```sh
npm run lint
npm test
npm run build
npm run preview
```

## Included

- Responsive focus workspace with countdown and stopwatch modes, activity selection, and cancellation.
- Active-session recovery after reload, using timestamps instead of counting interval ticks.
- Browser-local completed history, activity totals, and a sample fossil progress meter.
- Museum preview and a clearly labeled future Groups screen.
- Original inline SVG skeleton illustration. It is a placeholder preview, not a completed fossil-reveal implementation.

For a short demo, choose the one-minute duration, start, reload to show recovery, then save when the timer reaches zero. Open History, Dashboard, and Museum to see the result. Cancelled sessions do not count. Stopwatch sessions require at least one minute. Countdown credit is capped at the selected duration even if you return later.

## Structure and backend boundary

- `src/App.tsx`: application shell, navigation, and prototype views.
- `src/App.css` / `src/index.css`: responsive styles and shared visual tokens.
- `src/data/demoStore.ts`: typed local storage adapter and demo completion rules.
- `tests/demoStore.test.mjs`: timer, recovery, completion, duplication, and corrupt-storage checks.

React and TypeScript provide typed, reusable UI. Vite runs a standalone frontend without selecting a server framework. The eventual API client should replace the local adapter; loading/error states and authentication will need to be added when its asynchronous contracts are known.

Browser data is demo-only, device-local, user-editable, and not trusted. Server-side session validation, authoritative timing, exactly-once rewards, account ownership, and group permissions remain backend work. The 150-minute fossil target is illustrative, not a finalized product rule. No membership, invitation, or login actions are simulated as real functionality.

Google Fonts is optional; system fonts provide a fallback offline. All illustrations are local. Browser storage can be cleared through browser site settings. Multiple simultaneous tabs are not synchronized. If storage is unavailable, persistence is not guaranteed.

## M2 status

This covers the frontend prototype and frontend lint/test/build CI. The complete system architecture, backend stack, persistent data design, and team-approved design decisions remain open. The existing root README preserves the M1 proposal.

AI assisted with frontend implementation, styling, and tests. The team should review and own the design and integration decisions before presenting.
