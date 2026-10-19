import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type User } from "../api/client.ts";
import { isSampleWorkspace } from "../data/demoStore.ts";
import { AuthContext } from "./AuthContext.ts";
import AuthScreen from "./AuthScreen.tsx";
import WelcomeScreen from "./WelcomeScreen.tsx";
import "./Auth.css";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "signed-out" }
  | { status: "signed-in"; user: User; isNew?: boolean };

/** Shows the login screen until someone is logged in, then the app. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  // Asks the server who is logged in. State starts as "loading".
  const load = useCallback(() => {
    api.me().then(
      (user) =>
        setState(
          user ? { status: "signed-in", user } : { status: "signed-out" },
        ),
      (error) =>
        setState({
          status: "error",
          message:
            error instanceof ApiError ? error.message : "Something went wrong.",
        }),
    );
  }, []);

  useEffect(() => {
    if (!isSampleWorkspace) load();
  }, [load]);

  function retry() {
    setState({ status: "loading" });
    load();
  }

  const logout = useCallback(async () => {
    await api.logout();
    setState({ status: "signed-out" });
  }, []);

  // The sample workspace is a no-login frontend demo.
  if (isSampleWorkspace) return children;

  if (state.status === "signed-in" && state.isNew) {
    return (
      <WelcomeScreen
        user={state.user}
        onContinue={() => setState({ status: "signed-in", user: state.user })}
      />
    );
  }

  if (state.status === "signed-in") {
    return (
      <AuthContext.Provider value={{ user: state.user, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <main className="auth-page">
      {state.status === "loading" && (
        <p className="auth-status" role="status">
          Loading…
        </p>
      )}
      {state.status === "error" && (
        <section className="card auth-card" role="alert">
          <h1>Can't connect</h1>
          <p className="auth-subtitle">{state.message}</p>
          <button className="primary auth-submit" onClick={retry}>
            Try again
          </button>
        </section>
      )}
      {state.status === "signed-out" && (
        <AuthScreen
          onSignedIn={(user, isNew) =>
            setState({ status: "signed-in", user, isNew })
          }
        />
      )}
    </main>
  );
}
