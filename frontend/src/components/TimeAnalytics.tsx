import { useMemo, useState } from "react";
import type { Session } from "../data/demoStore";
import {
  activityTotals,
  addDays,
  comparableBounds,
  dailyTotals,
  dateKey,
  exactDuration,
  formatDuration,
  parseDate,
  periodBounds,
  sessionsCsv,
  streaks,
  totalSeconds,
  validSessions,
  within,
  type View,
} from "../data/timeAnalytics";
import "./TimeAnalytics.css";

const COLORS = [
  "#527c57",
  "#b79255",
  "#7f99a5",
  "#a18399",
  "#879e69",
  "#bd826d",
];
function colorFor(tag: string) {
  const known: Record<string, string> = {
    "Deep work": COLORS[0],
    Studying: COLORS[1],
    Reading: COLORS[2],
    "Creative work": COLORS[3],
  };
  if (Object.hasOwn(known, tag)) return known[tag];
  let hash = 0;
  for (const char of tag) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}
const dateLabel = (
  time: number,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) => new Date(time).toLocaleDateString(undefined, options);
const timeLabel = (time: number) =>
  new Date(time).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
const modeLabel = (mode: Session["mode"]) =>
  mode === "countdown" ? "Focus timer" : "Stopwatch";
const PAGE_SIZE = 10;
const REPORT_TABS = [
  "Overview",
  "Activities",
  "Goals & streaks",
  "Sessions",
] as const;

export default function TimeAnalytics({
  sessions,
  now,
  storageScope = "default",
  onStartFocus,
}: {
  sessions: Session[];
  now: number;
  storageScope?: string;
  onStartFocus?: () => void;
}) {
  // Changing workspace remounts settings, preventing a goal from crossing accounts/scopes.
  return (
    <AnalyticsWorkspace
      key={storageScope}
      sessions={sessions}
      now={now}
      storageScope={storageScope}
      onStartFocus={onStartFocus}
    />
  );
}

function AnalyticsWorkspace({
  sessions,
  now,
  storageScope,
  onStartFocus,
}: {
  sessions: Session[];
  now: number;
  storageScope: string;
  onStartFocus?: () => void;
}) {
  const [view, setView] = useState<View>("week");
  const [tab, setTab] = useState<(typeof REPORT_TABS)[number]>("Overview");
  const [anchor, setAnchor] = useState(() => dateKey(Date.now()));
  const [activity, setActivity] = useState("");
  const [mode, setMode] = useState("");
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState("");
  const goalKey = `dinofocus.analytics.goal.${storageScope}.v1`;
  const [goal, setGoal] = useState(() => {
    try {
      const value = Number(localStorage.getItem(goalKey));
      return Number.isInteger(value) && value >= 1 && value <= 1440
        ? value
        : 60;
    } catch {
      return 60;
    }
  });
  const [goalDraft, setGoalDraft] = useState(String(goal));
  const all = useMemo(() => validSessions(sessions, now), [sessions, now]);
  const tags = useMemo(() => [...new Set(all.map((s) => s.tag))].sort(), [all]);
  // If records disappear after a reset, an unavailable activity falls back to all.
  const selectedActivity = tags.includes(activity) ? activity : "";
  const filtered = useMemo(
    () =>
      all.filter(
        (s) =>
          (!selectedActivity || s.tag === selectedActivity) &&
          (!mode || s.mode === mode),
      ),
    [all, selectedActivity, mode],
  );
  const bounds = periodBounds(anchor, view);
  const rows = within(filtered, bounds);
  const days = dailyTotals(filtered, bounds);
  const elapsedDays = days.filter((d) => d.start <= now);
  const total = totalSeconds(rows);
  const previousBounds = comparableBounds(bounds, view, now);
  const previous = totalSeconds(within(filtered, previousBounds));
  const currentPeriod = bounds.end > now;
  const comparison =
    previous > 0
      ? `${Math.abs(((total - previous) / previous) * 100).toFixed(0)}% ${total >= previous ? "more" : "less"} than ${currentPeriod ? "the same point last" : "the previous"} ${view}`
      : total > 0
        ? `No activity in the comparison ${view}`
        : `No activity in either ${view}`;
  const activities = activityTotals(rows);
  const longest = rows.reduce((max, s) => Math.max(max, s.seconds), 0);
  const activeDays = elapsedDays.filter((d) => d.seconds > 0).length;
  const bestDay = [...elapsedDays]
    .filter((d) => d.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)[0];
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: rows.filter((s) => new Date(s.completedAt).getHours() === hour)
      .length,
  }));
  const busiest = [...hours].sort((a, b) => b.count - a.count)[0];
  const maxHour = Math.max(1, ...hours.map((h) => h.count));
  const maxDay = Math.max(goal * 60, ...days.map((d) => d.seconds), 1);
  const nextStart = addDays(bounds.start, view === "week" ? 7 : 1);
  const canNext = nextStart.getTime() <= now;
  const allDays = dailyTotals(all, bounds).filter((d) => d.start <= now);
  const goalHits = allDays.filter((d) => d.seconds >= goal * 60).length;
  const todayBounds = periodBounds(dateKey(now), "day");
  const todayTotal = totalSeconds(within(all, todayBounds));
  const continuity = streaks(all, now);
  const heatmap = dailyTotals(all, {
    start: addDays(parseDate(dateKey(now)), -27).getTime(),
    end: todayBounds.end,
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const tableRows = rows.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const rangeLabel =
    view === "day"
      ? dateLabel(bounds.start, {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : `${dateLabel(bounds.start)} – ${dateLabel(addDays(bounds.end, -1).getTime(), { month: "short", day: "numeric", year: "numeric" })}`;
  function navigate(amount: number) {
    setAnchor(
      dateKey(addDays(bounds.start, amount * (view === "week" ? 7 : 1))),
    );
    setPage(0);
  }
  function openDay(key: string) {
    setTab("Overview");
    setAnchor(key);
    setView("day");
    setPage(0);
  }
  function clearFilters() {
    setActivity("");
    setMode("");
    setPage(0);
  }
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", sessionsCsv(rows)], {
        type: "text/csv;charset=utf-8;",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `dinofocus-${view}-${dateKey(bounds.start)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      `Exported ${rows.length} completed sessions for the selected period and filters.`,
    );
  }
  function saveGoal() {
    const value = Number(goalDraft);
    if (!Number.isInteger(value) || value < 1 || value > 1440) {
      setNotice("Enter a whole number from 1 to 1,440 minutes.");
      return;
    }
    setGoal(value);
    try {
      localStorage.setItem(goalKey, String(value));
      setNotice(
        "Daily goal saved. Past days are compared with this current goal.",
      );
    } catch {
      setNotice("Goal updated for this visit. Browser storage is unavailable.");
    }
  }
  return (
    <section className="ta" aria-label="Detailed focus analytics">
      <div className="ta-heading">
        <div className="ta-tabs" role="tablist" aria-label="Dashboard views">
          {REPORT_TABS.map((item, index) => (
            <button
              key={item}
              id={`report-tab-${index}`}
              role="tab"
              aria-selected={tab === item}
              aria-controls={`report-panel-${index}`}
              tabIndex={tab === item ? 0 : -1}
              onClick={() => setTab(item)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowRight")
                  next = (index + 1) % REPORT_TABS.length;
                else if (event.key === "ArrowLeft")
                  next = (index + REPORT_TABS.length - 1) % REPORT_TABS.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = REPORT_TABS.length - 1;
                else return;
                event.preventDefault();
                setTab(REPORT_TABS[next]);
                document.getElementById(`report-tab-${next}`)?.focus();
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="ta-export"
          hidden={tab === "Goals & streaks"}
          onClick={exportCsv}
          disabled={!rows.length}
        >
          Export CSV
        </button>
      </div>
      <div className="ta-controls" hidden={tab === "Goals & streaks"}>
        <div className="ta-toolbar">
          <div className="ta-segmented" role="group" aria-label="Time view">
            {(["day", "week"] as const).map((item) => (
              <button
                key={item}
                aria-pressed={view === item}
                onClick={() => {
                  setView(item);
                  setPage(0);
                }}
              >
                {item === "day" ? "Day" : "Week"}
              </button>
            ))}
          </div>
          <div className="ta-date-controls">
            <button aria-label="Previous period" onClick={() => navigate(-1)}>
              ‹
            </button>
            <strong>{rangeLabel}</strong>
            <button
              aria-label="Next period"
              onClick={() => navigate(1)}
              disabled={!canNext}
            >
              ›
            </button>
          </div>
          <button
            className="ta-today"
            onClick={() => {
              setAnchor(dateKey(now));
              setPage(0);
            }}
          >
            Today
          </button>
        </div>
        <div className="ta-filter-row">
          <label>
            Date
            <input
              type="date"
              value={anchor}
              max={dateKey(now)}
              onChange={(e) => {
                try {
                  const d = parseDate(e.target.value);
                  if (d.getTime() <= now) {
                    setAnchor(e.target.value);
                    setPage(0);
                  }
                } catch {
                  /* Keep the last complete valid date while typing. */
                }
              }}
            />
          </label>
          <label>
            Activity
            <select
              aria-label="Activity"
              value={selectedActivity}
              onChange={(e) => {
                setActivity(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All activities</option>
              {tags.map((tag) => (
                <option key={tag}>{tag}</option>
              ))}
            </select>
          </label>
          <label>
            Timer mode
            <select
              aria-label="Timer mode"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Both modes</option>
              <option value="countdown">Focus timer</option>
              <option value="stopwatch">Stopwatch</option>
            </select>
          </label>
          {(selectedActivity || mode) && (
            <button className="ta-text" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div
        role="tabpanel"
        id="report-panel-0"
        aria-labelledby="report-tab-0"
        hidden={tab !== "Overview"}
        tabIndex={0}
      >
        <div className="ta-summary">
          <div className="ta-total">
            <span>Total focus</span>
            <strong title={exactDuration(total)}>
              {formatDuration(total)}
            </strong>
            <p className="ta-comparison">{comparison}</p>
            <small>
              {currentPeriod
                ? "Comparison uses the same elapsed local days and time."
                : "Comparison uses the previous complete period."}
            </small>
          </div>
          <dl className="ta-metrics">
            <div>
              <dt>Daily average</dt>
              <dd>{formatDuration(total / Math.max(1, elapsedDays.length))}</dd>
              <small>Includes zero-activity days</small>
            </div>
            <div>
              <dt>Sessions</dt>
              <dd>{rows.length}</dd>
              <small>Saved completions</small>
            </div>
            <div>
              <dt>Average session</dt>
              <dd>{formatDuration(total / Math.max(1, rows.length))}</dd>
              <small>Selected period</small>
            </div>
            <div>
              <dt>Longest session</dt>
              <dd>{formatDuration(longest)}</dd>
              <small>Selected period</small>
            </div>
          </dl>
        </div>
        <div className="ta-chart-card">
          <div className="ta-section-head">
            <div>
              <h3>
                {view === "week" ? "Daily focus" : "Sessions completed by hour"}
              </h3>
              <p>
                {view === "week"
                  ? "Select a day to see its sessions. Future days stay empty."
                  : "Counts completions, not minutes spent within each hour."}
              </p>
            </div>
            <span className="ta-chart-scale">
              {view === "week"
                ? `Scale: ${formatDuration(maxDay)}`
                : `Scale: ${maxHour} sessions`}
            </span>
          </div>
          {view === "week" ? (
            <div className="ta-week-chart">
              {days.map((day) => (
                <button
                  key={day.key}
                  disabled={day.start > now}
                  aria-label={`${dateLabel(day.start, { weekday: "long", month: "long", day: "numeric" })}: ${exactDuration(day.seconds)}, ${day.count} sessions. View day`}
                  className={
                    day.key === dateKey(now) ? "ta-day ta-is-today" : "ta-day"
                  }
                  onClick={() => openDay(day.key)}
                >
                  <span className="ta-day-value">
                    {day.start > now ? "—" : formatDuration(day.seconds)}
                  </span>
                  <span className="ta-bar-track">
                    <span
                      className="ta-day-bar"
                      style={{ height: `${(day.seconds / maxDay) * 100}%` }}
                    />
                  </span>
                  <span className="ta-day-label">
                    {dateLabel(day.start, { weekday: "short" })}
                    <small>{new Date(day.start).getDate()}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div
              className="ta-hour-chart"
              role="img"
              aria-label={hours
                .map((h) => `${h.hour}:00, ${h.count} completions`)
                .join("; ")}
            >
              {hours.map((h) => (
                <div
                  className="ta-hour"
                  key={h.hour}
                  title={`${h.hour}:00–${h.hour}:59: ${h.count} sessions`}
                >
                  <div className="ta-hour-track">
                    <span style={{ height: `${(h.count / maxHour) * 100}%` }} />
                  </div>
                  <span>{h.hour % 4 === 0 ? `${h.hour}:00` : ""}</span>
                </div>
              ))}
            </div>
          )}
          <div className="ta-chart-insight">
            <span>
              <strong>{activeDays}</strong> active{" "}
              {activeDays === 1 ? "day" : "days"} out of {elapsedDays.length}
            </span>
            <span>
              {bestDay
                ? `Most focus: ${dateLabel(bestDay.start, { weekday: "short", month: "short", day: "numeric" })}, ${formatDuration(bestDay.seconds)}`
                : "Complete a session to start building your report."}
            </span>
          </div>
        </div>
      </div>
      <div
        role="tabpanel"
        id="report-panel-1"
        aria-labelledby="report-tab-1"
        hidden={tab !== "Activities"}
        tabIndex={0}
      >
        <div className="ta-two-column">
          <section className="ta-panel">
            <div className="ta-section-head">
              <div>
                <h3>Time by activity</h3>
                <p>Ranked by completed focus time.</p>
              </div>
            </div>
            {activities.length ? (
              activities.map((a) => (
                <button
                  className="ta-activity"
                  key={a.tag}
                  onClick={() => {
                    setActivity(a.tag);
                    setPage(0);
                  }}
                  aria-label={`Filter by ${a.tag}`}
                >
                  <span className="ta-activity-top">
                    <span>
                      <i style={{ background: colorFor(a.tag) }} />
                      {a.tag}
                    </span>
                    <strong>{formatDuration(a.seconds)}</strong>
                  </span>
                  <span className="ta-activity-track">
                    <span
                      style={{
                        width: `${(a.seconds / total) * 100}%`,
                        background: colorFor(a.tag),
                      }}
                    />
                  </span>
                  <span className="ta-activity-meta">
                    {a.count} {a.count === 1 ? "session" : "sessions"}
                    <span>
                      {((a.seconds / total) * 100).toFixed(1)}% of selected time
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="ta-empty">No saved activity in this period.</p>
            )}
          </section>
          <section className="ta-panel">
            <h3>Session patterns</h3>
            <p className="ta-muted">For the selected period and filters.</p>
            <div className="ta-pattern-stat">
              <span>Most common completion hour</span>
              <strong>
                {busiest.count
                  ? `${String(busiest.hour).padStart(2, "0")}:00–${String(busiest.hour).padStart(2, "0")}:59`
                  : "No sessions"}
              </strong>
              <small>
                {busiest.count
                  ? `${busiest.count} completions; ties show the earliest hour.`
                  : "Finish a session to see a pattern."}
              </small>
            </div>
            {(["countdown", "stopwatch"] as const).map((m) => {
              const matching = rows.filter((s) => s.mode === m),
                seconds = totalSeconds(matching);
              return (
                <div className="ta-mode" key={m}>
                  <div>
                    <span>{modeLabel(m)}</span>
                    <strong>{formatDuration(seconds)}</strong>
                  </div>
                  <progress
                    aria-label={`${modeLabel(m)} share`}
                    max={Math.max(1, total)}
                    value={seconds}
                  />
                  <small>
                    {matching.length} sessions
                    {total > 0
                      ? ` · ${((seconds / total) * 100).toFixed(0)}% of time`
                      : ""}
                  </small>
                </div>
              );
            })}
          </section>
        </div>
      </div>
      <div
        role="tabpanel"
        id="report-panel-2"
        aria-labelledby="report-tab-2"
        hidden={tab !== "Goals & streaks"}
        tabIndex={0}
      >
        <section className="ta-panel ta-habits">
          <div className="ta-section-head">
            <div>
              <h3>Consistency & daily goal</h3>
              <p>
                All activities and modes. Date filters do not change your
                current streak or today's goal.
              </p>
            </div>
          </div>
          <div className="ta-habit-grid">
            <div className="ta-goal">
              <span>TODAY'S FOCUS GOAL</span>
              <strong>
                {formatDuration(todayTotal)} <small>/ {goal}m</small>
              </strong>
              <progress
                aria-label="Today's focus goal"
                value={Math.min(todayTotal, goal * 60)}
                max={goal * 60}
              />
              <p>
                {todayTotal >= goal * 60
                  ? "Daily goal reached."
                  : `${formatDuration(goal * 60 - todayTotal)} to go today.`}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveGoal();
                }}
              >
                <label>
                  Daily goal (minutes)
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                  />
                </label>
                <button type="submit">Save goal</button>
              </form>
            </div>
            <dl className="ta-habit-stats">
              <div>
                <dt>Current streak</dt>
                <dd>{continuity.current} days</dd>
                <small>Today or yesterday onward</small>
              </div>
              <div>
                <dt>Best streak</dt>
                <dd>{continuity.best} days</dd>
                <small>Across saved history</small>
              </div>
              <div>
                <dt>Goal days in this {view}</dt>
                <dd>
                  {goalHits} / {allDays.length}
                </dd>
                <small>Using your current goal</small>
              </div>
            </dl>
          </div>
          <div className="ta-calendar-head">
            <strong>Last 28 days</strong>
            <span>All activities · select a date to explore</span>
          </div>
          <div className="ta-calendar">
            {heatmap.map((day) => {
              const level =
                day.seconds === 0
                  ? 0
                  : day.seconds < goal * 30
                    ? 1
                    : day.seconds < goal * 60
                      ? 2
                      : 3;
              return (
                <button
                  key={day.key}
                  className={`ta-heat ta-heat-${level}`}
                  title={`${dateLabel(day.start, { month: "long", day: "numeric" })}: ${exactDuration(day.seconds)}`}
                  aria-label={`${dateLabel(day.start, { month: "long", day: "numeric" })}, ${formatDuration(day.seconds)}. View day`}
                  onClick={() => {
                    clearFilters();
                    openDay(day.key);
                  }}
                >
                  <span>{new Date(day.start).getDate()}</span>
                  <small>
                    {dateLabel(day.start, { weekday: "short" }).slice(0, 2)}
                  </small>
                </button>
              );
            })}
          </div>
          <p className="ta-legend">
            Shading: none, below half goal, below goal, goal reached.
          </p>
        </section>
      </div>
      <div
        role="tabpanel"
        id="report-panel-3"
        aria-labelledby="report-tab-3"
        hidden={tab !== "Sessions"}
        tabIndex={0}
      >
        <section className="ta-panel ta-session-panel">
          <div className="ta-section-head">
            <div>
              <h3>Session details</h3>
              <p>
                {rows.length} saved {rows.length === 1 ? "session" : "sessions"}{" "}
                in this period
                {selectedActivity ? ` for ${selectedActivity}` : ""}.
              </p>
            </div>
          </div>
          {rows.length ? (
            <>
              <div className="ta-table-scroll">
                <table className="ta-table">
                  <thead>
                    <tr>
                      <th>Completed</th>
                      <th>Activity</th>
                      <th>Mode</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((s) => (
                      <tr key={s.id}>
                        <td>
                          {dateLabel(s.completedAt)}
                          <small>{timeLabel(s.completedAt)}</small>
                        </td>
                        <td>
                          {s.tag}
                          {s.id.startsWith("m2-sample-") && (
                            <small>Sample session</small>
                          )}
                        </td>
                        <td>{modeLabel(s.mode)}</td>
                        <td title={exactDuration(s.seconds)}>
                          {exactDuration(s.seconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ta-pagination">
                <span>
                  Page {currentPage + 1} of {pageCount}
                </span>
                <button
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous sessions
                </button>
                <button
                  disabled={currentPage === pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next sessions
                </button>
              </div>
            </>
          ) : (
            <div className="ta-empty">
              <p>No sessions match this date and these filters.</p>
              {onStartFocus && (
                <button className="ta-primary" onClick={onStartFocus}>
                  Start a focus session
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      <p className="ta-notice" role="status">
        {notice}
      </p>
      <details className="ta-report-notes">
        <summary>How focus time is calculated</summary>
        <p className="ta-footnote">
          Completed focus sessions only. Time is credited to each session's
          local completion date, including sessions that cross midnight.
          Displayed totals use whole minutes; session details and CSV retain
          seconds.
        </p>
      </details>
    </section>
  );
}
