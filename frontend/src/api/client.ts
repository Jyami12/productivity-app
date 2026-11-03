// Typed wrappers for the backend API. Requests go to /api on the same origin;
// in development Vite proxies them to the backend (see vite.config.ts).

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

/** Error returned by the API, with field messages for form validation. */
export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string[] | undefined>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string[] | undefined> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Can't reach the server. Is the backend running?",
    );
  }
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    const error = (
      data as {
        error?: {
          code?: string;
          message?: string;
          fields?: ApiError["fields"];
        };
      }
    )?.error;
    throw new ApiError(
      res.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ?? `Request failed (${res.status}).`,
      error?.fields,
    );
  }
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean; database: string }>("GET", "/health"),

  register: (email: string, password: string) =>
    request<{ user: User }>("POST", "/auth/register", { email, password }).then(
      (r) => r.user,
    ),

  login: (email: string, password: string) =>
    request<{ user: User }>("POST", "/auth/login", { email, password }).then(
      (r) => r.user,
    ),

  logout: () => request<void>("POST", "/auth/logout"),

  /** The logged-in user, or null when nobody is logged in. */
  me: () =>
    request<{ user: User }>("GET", "/auth/me").then(
      (r) => r.user,
      (error) => {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      },
    ),
};
