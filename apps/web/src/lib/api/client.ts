const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:18000"
).replace(/\/$/, "");

export type User = {
  id: number;
  name: string;
  email: string;
};

export type ValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  validationErrors: ValidationErrors;

  constructor(
    message: string,
    status: number,
    validationErrors: ValidationErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

function xsrfToken(): string | undefined {
  const cookie = document.cookie
    .split("; ")
    .find((value) => value.startsWith("XSRF-TOKEN="));

  return cookie ? decodeURIComponent(cookie.substring("XSRF-TOKEN=".length)) : undefined;
}

async function initializeCsrf(): Promise<void> {
  const response = await fetch(`${API_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new ApiError("Unable to initialize the secure session.", response.status);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresCsrf = false,
): Promise<T> {
  if (requiresCsrf) {
    await initializeCsrf();
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = xsrfToken();
  if (token) {
    headers.set("X-XSRF-TOKEN", token);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  const body = response.status === 204 ? undefined : await response.json();

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? "The request could not be completed.",
      response.status,
      body?.errors ?? {},
    );
  }

  return (body?.data ?? body) as T;
}

export const api = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) =>
    request<User>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  login: (payload: { email: string; password: string }) =>
    request<User>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }, true),
  me: () => request<User>("/api/me"),
};
