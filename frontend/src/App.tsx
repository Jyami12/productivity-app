import { useEffect, useState } from "react";
import {
  demoStore,
  elapsedSeconds,
  type Session,
  type ActiveSession,
} from "./data/demoStore";
import "./App.css";
const pages = ["Focus", "Dashboard", "Museum", "History", "Groups"] as const;
const tags = ["Deep work", "Studying", "Reading", "Creative work"];
function Fossil() {
  return (
    <svg
      className="fossil"
      viewBox="0 0 460 260"
      role="img"
      aria-label="Illustrated dinosaur skeleton"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M65 174 Q122 165 152 116 Q182 83 251 112 L303 91 L332 54 M324 48 L370 43 L392 62 L382 86 L346 83 Z M350 84 L378 96 L386 87 M158 113 Q155 152 184 160 M182 107 Q173 157 207 170 M206 109 Q200 154 230 163 M232 111 Q230 144 249 146 M178 151 L157 192 L181 227 L206 228 M237 149 L265 179 L249 216 L278 220 M287 100 L288 129 L309 139 M304 101 L317 124 L329 127" />
      </g>
      <circle cx="366" cy="62" r="6" fill="#254b39" />
    </svg>
  );
}
function App() {
  const [page, setPage] = useState<(typeof pages)[number]>("Focus");
  const [sessions, setSessions] = useState<Session[]>(demoStore.getSessions);
  const [active, setActive] = useState<ActiveSession | null>(
    demoStore.getActive,
  );
  const [mode, setMode] = useState<"countdown" | "stopwatch">("countdown");
  const [duration, setDuration] = useState(25),
    [tag, setTag] = useState(tags[0]),
    [now, setNow] = useState(() => Date.now()),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = active ? elapsedSeconds(active, now) : 0;
  const display =
    (active?.mode ?? mode) === "stopwatch"
      ? elapsed
      : Math.max(0, (active?.duration ?? duration) * 60 - elapsed);
  const total = sessions.reduce((sum, s) => sum + s.seconds / 60, 0),
    progress = Math.min(100, Math.floor((total / 150) * 100));
  const ready =
    !!active && (active.mode === "stopwatch" ? elapsed >= 60 : display === 0);
  function start() {
    const next = { startedAt: Date.now(), mode, duration, tag };
    demoStore.setActive(next);
    setActive(next);
    setNow(Date.now());
    setNotice("Your excavation has begun. One thing at a time.");
  }
  function finish(cancel = false) {
    if (!active || (!cancel && !ready)) return;
    if (!cancel) {
      setSessions(demoStore.complete(active, Date.now()));
      setNotice("Session saved. A little more history, uncovered.");
    } else setNotice("Session cancelled. No time or fossil progress added.");
    demoStore.setActive(null);
    setActive(null);
  }
  const list = (
    <div className="session-list">
      {sessions.length ? (
        sessions.map((s) => (
          <div className="session-row" key={s.id}>
            <span className="session-dot">✓</span>
            <div>
              <strong>{s.tag}</strong>
              <small>
                {new Date(s.completedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {s.mode === "countdown" ? "Focus timer" : "Stopwatch"}
              </small>
            </div>
            <b>{Math.floor(s.seconds / 60)} min</b>
          </div>
        ))
      ) : (
        <div className="empty">
          <span>↗</span>
          <h3>Your story starts with one session.</h3>
          <p>Completed focus sessions will appear here.</p>
          <button className="text-button" onClick={() => setPage("Focus")}>
            Find your focus →
          </button>
        </div>
      )}
    </div>
  );
  const specimen = (
    <section className="dig-card">
      <div className="card-label">
        <span>YOUR CURRENT EXCAVATION</span>
        <span>02 / THE DISCOVERY</span>
      </div>
      <div className="dig-art">
        <div className="orbit" />
        <div className="orbit second" />
        <span className="coordinate">SITE 001 · 46° N / 108° W</span>
        <Fossil />
        <span className="specimen-label">SPECIMEN / T. REX</span>
        <span className="art-star">✧</span>
      </div>
      <div className="dig-info">
        <span className="pill">LATE CRETACEOUS</span>
        <h2>Tyrannosaurus rex</h2>
        <p>A legendary discovery, one focused minute at a time.</p>
        <div className="progress-label">
          <span>Excavation progress</span>
          <strong>{progress}%</strong>
        </div>
        <progress
          value={progress}
          max="100"
          aria-label="Fossil excavation progress"
        />
        <div className="dig-bottom">
          <span>
            {Math.max(0, 150 - Math.floor(total))} focused minutes to uncover
          </span>
          <button onClick={() => setPage("Museum")}>View museum ↗</button>
        </div>
        <small className="art-note">
          Skeleton illustration preview · demo reward pacing
        </small>
      </div>
    </section>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#focus"
          onClick={() => setPage("Focus")}
          aria-label="DinoFocus home"
        >
          <span className="brand-mark">✳</span>
          <span className="brand-name">DinoFocus.</span>
        </a>
        <div className="workspace-label">YOUR FIELD STATION</div>
        <nav aria-label="Main navigation">
          {pages.map((p, i) => (
            <button
              key={p}
              className={"nav-item " + (page === p ? "selected" : "")}
              aria-label={p}
              aria-current={page === p ? "page" : undefined}
              onClick={() => setPage(p)}
            >
              <span>{["◷", "▥", "◇", "≡", "◎"][i]}</span>
              <span className="nav-name">{p}</span>
              {p === "Groups" && <small>Soon</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✧</span>
          <p>
            Big discoveries.
            <br />
            Small, focused steps.
          </p>
          <small>Make a little progress today.</small>
        </div>
        <div className="profile">
          <span>EX</span>
          <div>
            <strong>Explorer</strong>
            <small>Local demo workspace</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Your workspace <span className="slash">/</span>
            <strong>{page}</strong>
          </span>
          <span className="demo-badge">
            <i />
            Frontend demo
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div className="eyebrow">SLOW DOWN. DIG DEEP.</div>
            <h1>
              {page === "Focus"
                ? "A little focus. A big discovery."
                : page === "Dashboard"
                  ? "See your effort take shape."
                  : page === "Museum"
                    ? "Your discoveries live here."
                    : page === "History"
                      ? "Every session is a small step."
                      : "Good focus finds company."}
            </h1>
            <p>
              {page === "Focus"
                ? "Settle into your work. There’s something waiting beneath the surface."
                : "A field journal of the time you’ve made for what matters."}
            </p>
          </div>
          {page === "Focus" && (
            <>
              <div className="focus-grid">
                <section className="card timer-card">
                  <div className="card-label">
                    <span>● FOCUS SESSION</span>
                    <span>01 / THE WORK</span>
                  </div>
                  <div className="segmented" aria-label="Timer mode">
                    {(["countdown", "stopwatch"] as const).map((m) => (
                      <button
                        key={m}
                        disabled={!!active}
                        className={(active?.mode ?? mode) === m ? "active" : ""}
                        onClick={() => setMode(m)}
                      >
                        {m === "countdown" ? "Focus timer" : "Stopwatch"}
                      </button>
                    ))}
                  </div>
                  <div className="timer-face">
                    <span className="timer-caption">
                      {active
                        ? ready
                          ? "NICELY DONE"
                          : "STAY WITH IT"
                        : "TIME TO FOCUS"}
                    </span>
                    <div className="timer-digits" role="timer">
                      {String(Math.floor(display / 60)).padStart(2, "0")}
                      <span>:</span>
                      {String(display % 60).padStart(2, "0")}
                    </div>
                    <span className="timer-subtitle">
                      {active
                        ? ready
                          ? "Save your session below"
                          : "Your next discovery is getting closer"
                        : "One session. One step forward."}
                    </span>
                  </div>
                  <div className="session-options">
                    <label>
                      Working on
                      <select
                        value={active?.tag ?? tag}
                        disabled={!!active}
                        onChange={(e) => setTag(e.target.value)}
                      >
                        {tags.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Duration
                      <select
                        value={active?.duration ?? duration}
                        disabled={!!active || mode === "stopwatch"}
                        onChange={(e) => setDuration(Number(e.target.value))}
                      >
                        {[1, 15, 25, 45, 60].map((d) => (
                          <option value={d} key={d}>
                            {d} minutes{d === 1 ? " · demo" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {!active ? (
                    <button className="primary start" onClick={start}>
                      ▶ <span>Start focusing</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <div className="active-actions">
                      <button
                        className="primary"
                        disabled={!ready}
                        onClick={() => finish()}
                      >
                        Save completed session
                      </button>
                      <button
                        className="text-button"
                        onClick={() => finish(true)}
                      >
                        Cancel session
                      </button>
                    </div>
                  )}
                  <p className="timer-footnote">
                    {(active?.mode ?? mode) === "stopwatch"
                      ? "Focus for at least one minute before saving."
                      : "Finish your timer to uncover a little more."}
                  </p>
                </section>
                {specimen}
              </div>
              <div className="bottom-grid">
                <section className="card recent">
                  <div className="section-title">
                    <h2>Recent sessions</h2>
                    <button
                      className="text-button"
                      onClick={() => setPage("History")}
                    >
                      View all ↗
                    </button>
                  </div>
                  {list}
                </section>
                <section className="quote-card">
                  <span>THE FIELD NOTES</span>
                  <blockquote>
                    Make room for one thing.
                    <br />
                    The rest can wait.
                  </blockquote>
                  <small>A little encouragement for your next session.</small>
                  <span className="quote-flower">✳</span>
                </section>
              </div>
            </>
          )}
          {page === "Dashboard" && (
            <>
              <div className="stat-grid">
                {[
                  ["Total focus", `${Math.floor(total)} min`],
                  ["Sessions completed", String(sessions.length)],
                  ["Fossil revealed", `${progress}%`],
                ].map(([label, value]) => (
                  <section className="card stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>All time · this browser</small>
                  </section>
                ))}
              </div>
              <section className="card">
                <h2>Time by activity</h2>
                <p className="muted">
                  Built from your completed demo sessions.
                </p>
                {tags.map((t) => {
                  const mins = sessions
                    .filter((s) => s.tag === t)
                    .reduce((sum, s) => sum + s.seconds / 60, 0);
                  return (
                    <div className="activity" key={t}>
                      <div>
                        <span>{t}</span>
                        <strong>{Math.floor(mins)} min</strong>
                      </div>
                      <progress
                        max={Math.max(1, total)}
                        value={mins}
                        aria-label={`${t} focus time`}
                      />
                    </div>
                  );
                })}
              </section>
            </>
          )}
          {page === "Museum" && (
            <div className="museum-grid">
              {specimen}
              <section className="card empty">
                <span>◇</span>
                <h2>There’s more to discover.</h2>
                <p>
                  More fossil species and collectible artwork are planned for a
                  future milestone.
                </p>
                <button className="primary" onClick={() => setPage("Focus")}>
                  Continue your excavation →
                </button>
              </section>
            </div>
          )}
          {page === "History" && (
            <section className="card">
              <div className="section-title">
                <h2>Completed sessions</h2>
                <span className="pill">{sessions.length} SESSIONS</span>
              </div>
              {list}
            </section>
          )}
          {page === "Groups" && (
            <section className="card group-preview">
              <span className="eyebrow">ON THE EXPEDITION MAP</span>
              <div className="group-icon">◎</div>
              <h2>Better, together.</h2>
              <p>
                Invite-only groups will let your crew work toward a weekly focus
                goal while keeping personal session details private.
              </p>
              <div className="group-features">
                <span>01 · Invite your crew</span>
                <span>02 · Set a weekly goal</span>
                <span>03 · Grow together</span>
              </div>
              <span className="pill">
                PLANNED · BACKEND CONNECTION REQUIRED
              </span>
            </section>
          )}
          <p className="notice" role="status">
            {notice}
          </p>
          <footer>
            <span>Made for meaningful minutes.</span>
            <span>Demo data stays in this browser · No account required</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
export default App;
