import { useRef, useState } from "react";
import { useAuth } from "./AuthContext.ts";

const initials = (email: string) => email.slice(0, 2).toUpperCase();

/**
 * The account entry point: the profile block in the sidebar, or a compact
 * button in the top bar on narrow screens. Opens the account dialog.
 */
export default function AccountButton({
  variant,
}: {
  variant: "sidebar" | "topbar";
}) {
  const auth = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // Sample workspace: no account, keep the original placeholder.
  if (!auth) {
    return variant === "sidebar" ? (
      <div className="profile">
        <span>EX</span>
        <div>
          <strong>Explorer</strong>
          <small>Sample workspace</small>
        </div>
      </div>
    ) : null;
  }

  const { user, logout } = auth;
  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function handleLogout() {
    setPending(true);
    setError("");
    try {
      await logout();
    } catch {
      setError("Couldn't log out. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <>
      {variant === "sidebar" ? (
        <button
          className="profile account-trigger"
          onClick={() => dialog.current?.showModal()}
          aria-label={`Account: ${user.email}`}
        >
          <span aria-hidden="true">{initials(user.email)}</span>
          <div>
            <strong>{user.email}</strong>
            <small>View account</small>
          </div>
        </button>
      ) : (
        <button
          className="account-chip"
          onClick={() => dialog.current?.showModal()}
          aria-label={`Account: ${user.email}`}
        >
          {initials(user.email)}
        </button>
      )}

      <dialog
        ref={dialog}
        className="account-dialog"
        aria-labelledby={`account-title-${variant}`}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div>
          <span className="account-avatar" aria-hidden="true">
            {initials(user.email)}
          </span>
          <span className="receipt-label">YOUR ACCOUNT</span>
          <h2 id={`account-title-${variant}`}>Field researcher</h2>
          <dl className="account-details">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{joined}</dd>
            </div>
          </dl>
          {error && (
            <p className="auth-form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary account-logout"
            onClick={handleLogout}
            disabled={pending}
          >
            {pending ? "Logging out…" : "Log out"}
          </button>
          <button
            className="text-button account-close"
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
