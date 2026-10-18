import type { Session } from "../data/demoStore";
import { dateKey, addDays, formatDuration } from "../data/timeAnalytics";

export default function FocusWeek({
  sessions,
  now,
  onOpen,
}: {
  sessions: Session[];
  now: number;
  onOpen: () => void;
}) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, -6 + i);
    const seconds = sessions
      .filter(
        (s) => s.completedAt <= now && dateKey(s.completedAt) === dateKey(date),
      )
      .reduce((n, s) => n + s.seconds, 0);
    return { date, seconds };
  });
  const max = Math.max(3600, ...days.map((d) => d.seconds));
  const total = days.reduce((n, d) => n + d.seconds, 0);
  return (
    <section className="week-note" aria-label="Last seven days">
      <div className="section-title">
        <h2>A week of showing up</h2>
        <span className="week-note-mark" aria-hidden="true">
          ↗
        </span>
      </div>
      <p>
        <strong>{formatDuration(total)}</strong>
        <span>over the last 7 days</span>
      </p>
      <div className="week-spark">
        {days.map(({ date, seconds }, i) => (
          <div
            key={dateKey(date)}
            className={i === 6 ? "spark-today" : ""}
            aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}: ${formatDuration(seconds)}`}
          >
            <div className="spark-track">
              <span
                style={{
                  height: `${seconds ? Math.max(6, (seconds / max) * 100) : 3}%`,
                }}
                className={seconds ? "" : "spark-empty"}
              />
            </div>
            <span aria-hidden="true">
              {date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
          </div>
        ))}
      </div>
      <button className="text-button" onClick={onOpen}>
        Explore your activity <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
