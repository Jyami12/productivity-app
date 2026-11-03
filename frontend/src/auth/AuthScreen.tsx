import { useState, type FormEvent } from "react";
import { api, ApiError, type User } from "../api/client.ts";

type Mode = "login" | "signup";
type Fields = Partial<Record<"email" | "password" | "confirm", string>>;

export default function AuthScreen({
  onSignedIn,
}: {
  onSignedIn: (user: User, isNew: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fields, setFields] = useState<Fields>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const signup = mode === "signup";

  function switchMode(next: Mode) {
    setMode(next);
    setPassword("");
    setConfirm("");
    setFields({});
    setFormError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    const found: Fields = {};
    if (!email.trim()) found.email = "Enter your email address.";
    if (!password) found.password = "Enter your password.";
    else if (signup && password.length < 8)
      found.password = "Password must be at least 8 characters.";
    if (signup && password && confirm !== password)
      found.confirm = "Passwords don't match.";
    setFields(found);
    if (Object.keys(found).length) return;

    setPending(true);
    try {
      const user = signup
        ? await api.register(email, password)
        : await api.login(email, password);
      onSignedIn(user, signup);
    } catch (error) {
      if (error instanceof ApiError) {
        setFields({
          email: error.fields.email?.[0],
          password: error.fields.password?.[0],
        });
        setFormError(error.code === "VALIDATION_ERROR" ? "" : error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setPending(false);
    }
  }

  const field = (
    name: keyof Fields,
    label: string,
    value: string,
    onChange: (v: string) => void,
    type: string,
    autoComplete: string,
  ) => (
    <label className="auth-field">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={fields[name] ? true : undefined}
        aria-describedby={fields[name] ? `${name}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
      />
      {fields[name] && (
        <small className="auth-field-error" id={`${name}-error`}>
          {fields[name]}
        </small>
      )}
    </label>
  );

  return (
    <section className="card auth-card">
      <div className="auth-brand">
        <img
          src={`${import.meta.env.BASE_URL}dinofocus-logo.png`}
          alt=""
          width="42"
          height="42"
        />
        <span>DinoFocus</span>
      </div>
      <h1>{signup ? "Create your account" : "Welcome back"}</h1>
      <p className="auth-subtitle">
        {signup
          ? "Start focusing and uncover your first fossil."
          : "Log in to continue your excavation."}
      </p>

      <form onSubmit={submit} noValidate>
        {field("email", "Email", email, setEmail, "email", "email")}
        {field(
          "password",
          "Password",
          password,
          setPassword,
          "password",
          signup ? "new-password" : "current-password",
        )}
        {signup &&
          field(
            "confirm",
            "Confirm password",
            confirm,
            setConfirm,
            "password",
            "new-password",
          )}
        {signup && !fields.password && (
          <p className="auth-hint">At least 8 characters.</p>
        )}

        {formError && (
          <p className="auth-form-error" role="alert">
            {formError}
          </p>
        )}

        <button
          className="primary auth-submit"
          type="submit"
          disabled={pending}
        >
          {pending
            ? signup
              ? "Creating account…"
              : "Logging in…"
            : signup
              ? "Create account"
              : "Log in"}
        </button>
      </form>

      <p className="auth-switch">
        {signup ? "Already have an account?" : "New to DinoFocus?"}{" "}
        <button
          type="button"
          className="text-button"
          onClick={() => switchMode(signup ? "login" : "signup")}
          disabled={pending}
        >
          {signup ? "Log in" : "Create an account"}
        </button>
      </p>
      <p className="auth-demo">
        Just looking? <a href="?demo=sample">Try the sample workspace ↗</a>
      </p>
    </section>
  );
}
