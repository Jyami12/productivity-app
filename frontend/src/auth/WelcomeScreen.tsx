import type { User } from "../api/client.ts";

const steps = [
  [
    "◷",
    "Start a focus session",
    "Pick a tag and a duration, then get to work.",
  ],
  [
    "◇",
    "Uncover fossils",
    "Every focused minute digs deeper toward your next specimen.",
  ],
  [
    "▥",
    "See where your time went",
    "Your dashboard breaks down focus time by activity.",
  ],
] as const;

/** Shown once, right after someone creates an account. */
export default function WelcomeScreen({
  user,
  onContinue,
}: {
  user: User;
  onContinue: () => void;
}) {
  return (
    <main className="auth-page">
      <section
        className="card auth-card welcome-card"
        aria-labelledby="welcome-title"
      >
        <div className="auth-brand">
          <img
            src={`${import.meta.env.BASE_URL}dinofocus-logo.png`}
            alt=""
            width="42"
            height="42"
          />
          <span>DinoFocus</span>
        </div>
        <span className="receipt-label">ACCOUNT CREATED</span>
        <h1 id="welcome-title">Welcome to the dig site!</h1>
        <p className="auth-subtitle">
          You're signed in as <strong>{user.email}</strong>. Here's how it
          works:
        </p>
        <ol className="welcome-steps">
          {steps.map(([icon, title, text]) => (
            <li key={title}>
              <span aria-hidden="true">{icon}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <button className="primary auth-submit" onClick={onContinue} autoFocus>
          Start my first session →
        </button>
      </section>
    </main>
  );
}
