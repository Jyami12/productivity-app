import { useEffect, useRef, useState } from "react";
import {
  demoStore,
  elapsedSeconds,
  toggleSessionPause,
  isSampleWorkspace,
  resetSampleWorkspace,
  type Session,
  type ActiveSession,
} from "./data/demoStore";
import FossilMuseum from "./components/FossilMuseum";
import FossilSketch from "./components/FossilSketch";
import FossilReveal from "./components/FossilReveal";
import "./App.css";
import TimeAnalytics from "./components/TimeAnalytics";
import FocusWeek from "./components/FocusWeek";
import { FOSSILS, type FossilDefinition } from "./data/fossils";
import { dateKey, formatDuration } from "./data/timeAnalytics";
import "./Refinements.css";
const pages = ["Focus", "Dashboard", "Museum", "History", "Groups"] as const;
const tags = ["Deep work", "Studying", "Reading", "Creative work"];
function App() {
  const [page, setPage] = useState<(typeof pages)[number]>(
    isSampleWorkspace ? "Dashboard" : "Focus",
  );
  const [sessions, setSessions] = useState<Session[]>(demoStore.getSessions);
  const [active, setActive] = useState<ActiveSession | null>(
    demoStore.getActive,
  );
  const [mode, setMode] = useState<"countdown" | "stopwatch">("countdown");
  const [duration, setDuration] = useState(25),
    [tag, setTag] = useState(tags[0]),
    [now, setNow] = useState(() => Date.now()),
    [notice, setNotice] = useState("");
  const [customDuration, setCustomDuration] = useState<string | null>(null);
  const durationValid =
    customDuration === null ||
    (Number.isInteger(Number(customDuration)) &&
      Number(customDuration) >= 1 &&
      Number(customDuration) <= 1440);
  const [receipt, setReceipt] = useState<{
    seconds: number;
    tag: string;
    unlocked: FossilDefinition[];
  } | null>(null);
  const receiptDialog = useRef<HTMLDialogElement>(null);
  const activityDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (receipt && receiptDialog.current && !receiptDialog.current.open)
      receiptDialog.current.showModal();
  }, [receipt]);
  function closeReceipt() {
    receiptDialog.current?.close();
    setReceipt(null);
  }
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = active ? elapsedSeconds(active, now) : 0;
  const display =
    (active?.mode ?? mode) === "stopwatch"
      ? elapsed
      : Math.max(0, (active?.duration ?? duration) * 60 - elapsed);
  const total = sessions.reduce((sum, s) => sum + s.seconds / 60, 0);
  const nextFossil = FOSSILS.find((f) => total < f.target);
  const featured = nextFossil ?? FOSSILS[FOSSILS.length - 1];
  const collected = FOSSILS.filter((f) => total >= f.target).length;
  const progress = Math.min(100, Math.floor((total / featured.target) * 100));
  const todaySessions = sessions.filter(
    (s) => s.completedAt <= now && dateKey(s.completedAt) === dateKey(now),
  );
  const todaySeconds = todaySessions.reduce((sum, s) => sum + s.seconds, 0);
  const timerProgress =
    active?.mode === "countdown"
      ? Math.min(100, (elapsed / (active.duration * 60)) * 100)
      : 0;
  const ready =
    !!active && (active.mode === "stopwatch" ? elapsed >= 60 : display === 0);
  const paused = active?.pausedAt !== undefined;
  function togglePause() {
    if (!active) return;
    const timestamp = Date.now();
    const next = toggleSessionPause(active, timestamp);
    demoStore.setActive(next);
    setActive(next);
    setNow(timestamp);
    setNotice(
      next.pausedAt !== undefined
        ? "Session paused. Take your time."
        : "Session resumed. Welcome back.",
    );
  }
  function start() {
    if (mode === "countdown" && !durationValid) return;
    const next = { startedAt: Date.now(), mode, duration, tag };
    demoStore.setActive(next);
    setActive(next);
    setNow(Date.now());
    setNotice(`${tag} session started.`);
  }
  function finish(cancel = false) {
    if (!active || (!cancel && !ready)) return;
    if (!cancel) {
      const completed = demoStore.complete(active, Date.now());
      const saved = completed.find((s) => s.id === String(active.startedAt));
      setSessions(completed);
      if (saved && !sessions.some((s) => s.id === saved.id)) {
        const newTotal = completed.reduce((sum, s) => sum + s.seconds / 60, 0);
        setReceipt({
          seconds: saved.seconds,
          tag: saved.tag,
          unlocked: FOSSILS.filter(
            (f) => f.target > total && f.target <= newTotal,
          ),
        });
      }
      setNotice("Session saved to your history.");
    } else setNotice("Session cancelled. No time or fossil progress added.");
    demoStore.setActive(null);
    setActive(null);
  }
  const sessionList = (limit?: number) => (
    <div className="session-list">
      {sessions.length ? (
        [...sessions]
          .sort((a, b) => b.completedAt - a.completedAt)
          .slice(0, limit)
          .map((s) => (
            <div className="session-row" key={s.id}>
              <span className="session-dot">✓</span>
              <div>
                <strong>{s.tag}</strong>
                {s.id.startsWith("m2-sample-") && <small>Sample session</small>}
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
  const list = sessionList();
  const specimen = (
    <section className="dig-card">
      <div className="card-label">
        <span>{nextFossil ? "UP NEXT" : "COLLECTION COMPLETE"}</span>
        <span>
          {String(FOSSILS.indexOf(featured) + 1).padStart(3, "0")} / FIELD
          COLLECTION
        </span>
      </div>
      <div className="dig-art">
        <div className="orbit" />
        <div className="orbit second" />
        <span className="coordinate">{featured.group.toUpperCase()}</span>
        <div
          className="desk-fossil"
          role="img"
          aria-label={`${featured.name}, ${progress}% uncovered`}
        >
          <FossilReveal
            id={featured.id}
            percent={progress}
            className="fossil"
            centered
          />
        </div>
        <span className="specimen-label">
          {nextFossil
            ? `${Math.ceil(featured.target - total)} MIN TO DISCOVER`
            : "ALL 12 SPECIMENS COLLECTED"}
        </span>
        <span className="art-star">✧</span>
      </div>
      <div className="dig-info">
        <span className="pill">
          {nextFossil ? "YOUR NEXT FIND" : "IN YOUR MUSEUM"}
        </span>
        <h2>{featured.name}</h2>
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
            {nextFossil
              ? `${Math.ceil(featured.target - total)} minutes to go`
              : "12 / 12 collected"}
          </span>
          <button onClick={() => setPage("Museum")}>View museum ↗</button>
        </div>
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
          <img
            className="brand-mark brand-logo"
            src={`${import.meta.env.BASE_URL}dinofocus-logo.png`}
            alt=""
            width="42"
            height="42"
          />
          <span className="brand-name">DinoFocus</span>
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
            {collected} of 12
            <br />
            specimens found.
          </p>
          <progress
            value={collected}
            max={12}
            aria-label="Collection completion"
          />
          <small>
            {nextFossil
              ? `Next: ${nextFossil.name}`
              : "Your collection is complete."}
          </small>
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
          {active && (
            <button className="running-pill" onClick={() => setPage("Focus")}>
              <i aria-hidden="true" />
              {String(Math.floor(display / 60)).padStart(2, "0")}:
              {String(display % 60).padStart(2, "0")}{" "}
              <span>{ready ? "Ready to save" : "Focusing"} ↗</span>
            </button>
          )}
          <div className="demo-controls">
            {isSampleWorkspace && (
              <section
                className="sample-banner"
                aria-label="Sample data workspace"
              >
                <p>
                  <strong>Sample dashboard</strong> 120 fictional minutes. Reset
                  to refresh the dates.
                </p>
                <button
                  className="text-button"
                  disabled={!!active}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Reset to 120 fictional minutes and five collected fossils? This removes sessions added during this demo. Your ordinary workspace is unchanged.",
                      )
                    )
                      return;
                    try {
                      resetSampleWorkspace();
                      setSessions(demoStore.getSessions());
                      setNotice(
                        "Sample history refreshed. Dashboard and museum now use the new sample sessions.",
                      );
                    } catch {
                      setNotice(
                        "Unable to reset. Allow browser storage and try again.",
                      );
                    }
                  }}
                >
                  Reset sample data
                </button>
              </section>
            )}
            <a
              className="demo-badge"
              href={isSampleWorkspace ? "?" : "?demo=sample"}
            >
              <i />
              {isSampleWorkspace ? "Exit sample" : "Frontend demo ↗"}
            </a>
          </div>
        </header>
        <div
          className={`content ${page === "Focus" ? "focus-content" : page === "Dashboard" ? "dashboard-content" : page === "Museum" ? "museum-content" : ""}`}
        >
          <div className="page-heading">
            <div className="eyebrow">
              {new Date(now).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <h1>
              {page === "Focus"
                ? "Focus"
                : page === "Dashboard"
                  ? "Focus analytics"
                  : page === "Museum"
                    ? "Fossil collection"
                    : page === "History"
                      ? "Your session log."
                      : "Focus with your people."}
            </h1>
            {page === "Focus" && (
              <div className="today-strip" aria-label="Today's progress">
                <span>
                  <strong>{formatDuration(todaySeconds)}</strong> focused today
                </span>
                <span>
                  <strong>{todaySessions.length}</strong>{" "}
                  {todaySessions.length === 1 ? "session" : "sessions"} saved
                </span>
                <button onClick={() => setPage("Museum")}>
                  <strong>{collected}/12</strong> fossils{" "}
                  <span aria-hidden="true">↗</span>
                </button>
                <button
                  className="activity-trigger"
                  aria-label="Open activity side panel"
                  title="Open activity side panel"
                  aria-haspopup="dialog"
                  aria-controls="activity-panel"
                  onClick={() => activityDialog.current?.showModal()}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M15 4v16M18 8v8" />
                  </svg>
                  <span>Activity</span>
                </button>
              </div>
            )}
          </div>
          {page === "Focus" && (
            <>
              <div className="focus-grid">
                <section className="card timer-card">
                  <div className="card-label">
                    <span>YOUR SESSION</span>
                    {active && <span>{paused ? "PAUSED" : "IN PROGRESS"}</span>}
                  </div>
                  <div className="segmented" aria-label="Timer mode">
                    {(["countdown", "stopwatch"] as const).map((m) => (
                      <button
                        key={m}
                        disabled={!!active}
                        aria-pressed={(active?.mode ?? mode) === m}
                        className={(active?.mode ?? mode) === m ? "active" : ""}
                        onClick={() => setMode(m)}
                      >
                        {m === "countdown" ? "Focus timer" : "Stopwatch"}
                      </button>
                    ))}
                  </div>
                  <div
                    className={`timer-face ${active ? "timer-running" : ""} ${ready ? "timer-ready" : ""}`}
                  >
                    <svg
                      className="timer-ring"
                      viewBox="0 0 280 280"
                      aria-hidden="true"
                    >
                      <circle cx="140" cy="140" r="132" />
                      <circle
                        cx="140"
                        cy="140"
                        r="132"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - timerProgress}
                      />
                    </svg>
                    <span className="timer-caption">
                      {paused
                        ? "PAUSED"
                        : active
                          ? ready
                            ? active.mode === "stopwatch"
                              ? "KEEP GOING OR SAVE"
                              : "SESSION COMPLETE"
                            : active.tag.toUpperCase()
                          : "YOUR NEXT SESSION"}
                    </span>
                    <div className="timer-digits" role="timer">
                      {String(Math.floor(display / 60)).padStart(2, "0")}
                      <span>:</span>
                      {String(display % 60).padStart(2, "0")}
                    </div>
                    <span className="timer-subtitle">
                      {paused
                        ? "Resume whenever you are ready"
                        : active
                          ? ready
                            ? "Your time is ready to save"
                            : active.mode === "countdown"
                              ? `${Math.floor(timerProgress)}% of your session`
                              : "Counting up. Take your time."
                          : ""}
                    </span>
                  </div>
                  {(active?.mode ?? mode) === "countdown" && (
                    <div
                      className="duration-picks"
                      role="group"
                      aria-label="Quick duration"
                    >
                      {[15, 25, 45, 60].map((d) => (
                        <button
                          key={d}
                          disabled={!!active}
                          aria-pressed={(active?.duration ?? duration) === d}
                          onClick={() => {
                            setDuration(d);
                            setCustomDuration(null);
                          }}
                        >
                          {d}
                          <span> min</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="session-options">
                    <label>
                      Working on
                      <select
                        aria-label="Working on"
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
                      Duration (minutes)
                      <input
                        type="number"
                        aria-label="Duration in minutes"
                        min={1}
                        max={1440}
                        step={1}
                        value={active?.duration ?? customDuration ?? duration}
                        disabled={!!active || mode === "stopwatch"}
                        aria-invalid={mode === "countdown" && !durationValid}
                        aria-describedby={
                          !durationValid && mode === "countdown"
                            ? "duration-error"
                            : undefined
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setCustomDuration(value);
                          const minutes = Number(value);
                          if (
                            Number.isInteger(minutes) &&
                            minutes >= 1 &&
                            minutes <= 1440
                          )
                            setDuration(minutes);
                        }}
                      />
                      {!durationValid && mode === "countdown" && (
                        <small id="duration-error">
                          Enter 1–1440 whole minutes.
                        </small>
                      )}
                    </label>
                  </div>
                  {!active ? (
                    <button
                      className="primary start"
                      onClick={start}
                      disabled={mode === "countdown" && !durationValid}
                    >
                      ▶ <span>Start focusing</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <div className="active-actions">
                      <button
                        className="primary"
                        onClick={ready ? () => finish() : togglePause}
                      >
                        {ready
                          ? "Save completed session"
                          : paused
                            ? "Resume timer"
                            : "Pause timer"}
                      </button>
                      {ready && active.mode === "stopwatch" && (
                        <button className="text-button" onClick={togglePause}>
                          {paused ? "Resume timer" : "Pause timer"}
                        </button>
                      )}
                      <button
                        className="text-button"
                        onClick={() => finish(true)}
                      >
                        Cancel session
                      </button>
                    </div>
                  )}
                  {(active?.mode ?? mode) === "stopwatch" && (
                    <p className="timer-footnote">
                      Focus for at least one minute before saving.
                    </p>
                  )}
                </section>
                {specimen}
              </div>
              <dialog
                className="activity-drawer"
                id="activity-panel"
                ref={activityDialog}
                aria-labelledby="activity-title"
                onClick={(event) => {
                  if (event.target === event.currentTarget)
                    activityDialog.current?.close();
                }}
              >
                <div className="activity-drawer-heading">
                  <h2 id="activity-title">Activity</h2>
                  <button
                    className="text-button"
                    onClick={() => activityDialog.current?.close()}
                    autoFocus
                  >
                    Close ✕
                  </button>
                </div>
                <div className="activity-panels">
                  <section className="card recent">
                    <div className="section-title">
                      <h2>Recent sessions</h2>
                      <button
                        className="text-button"
                        onClick={() => {
                          activityDialog.current?.close();
                          setPage("History");
                        }}
                      >
                        View all ↗
                      </button>
                    </div>
                    {sessionList(3)}
                  </section>
                  <FocusWeek
                    sessions={sessions}
                    now={now}
                    onOpen={() => {
                      activityDialog.current?.close();
                      setPage("Dashboard");
                    }}
                  />
                </div>
              </dialog>
            </>
          )}
          {page === "Dashboard" && (
            <TimeAnalytics
              sessions={sessions}
              now={now}
              storageScope={isSampleWorkspace ? "sample" : "default"}
              onStartFocus={() => setPage("Focus")}
            />
          )}
          {page === "Museum" && (
            <FossilMuseum
              totalMinutes={total}
              storageScope={
                new URLSearchParams(window.location.search).get("demo") ===
                "sample"
                  ? "sample"
                  : "default"
              }
              onFocus={() => setPage("Focus")}
            />
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
      <dialog
        ref={receiptDialog}
        className="session-receipt"
        aria-labelledby="receipt-title"
        onClose={() => setReceipt(null)}
      >
        {receipt && (
          <div>
            <span className="receipt-check" aria-hidden="true">
              ✓
            </span>
            <span className="receipt-label">SESSION SAVED</span>
            <h2 id="receipt-title">That’s time well spent.</h2>
            <p className="receipt-total">+{formatDuration(receipt.seconds)}</p>
            <p>{receipt.tag} · added to your history</p>
            {receipt.unlocked.length > 0 ? (
              <div className="receipt-unlocks">
                <strong>
                  {receipt.unlocked.length === 1
                    ? "New fossil uncovered"
                    : `${receipt.unlocked.length} fossils uncovered`}
                </strong>
                {receipt.unlocked.map((f) => (
                  <div key={f.id}>
                    <FossilSketch id={f.id} />
                    <span>{f.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="receipt-next">
                {nextFossil
                  ? `${Math.ceil(nextFossil.target - total)} more minutes to ${nextFossil.name}.`
                  : "Your full collection is waiting in the museum."}
              </p>
            )}
            <button
              className="primary"
              onClick={() => {
                closeReceipt();
                setPage("Museum");
              }}
            >
              View collection →
            </button>
            <button className="text-button" onClick={closeReceipt}>
              Done for now
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
export default App;
