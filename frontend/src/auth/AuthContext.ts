import { createContext, useContext } from "react";
import type { User } from "../api/client.ts";

export interface AuthValue {
  user: User;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

/** The logged-in user. Null only in the no-login sample workspace. */
export function useAuth() {
  return useContext(AuthContext);
}
