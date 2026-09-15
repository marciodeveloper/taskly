const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:18000"
).replace(/\/$/, "");

export type User = {
  id: number;
  name: string;
  email: string;
};

export type Project = {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "cancelled";

export type Task = {
  id: number;
  project_id: number;
  title: string;
  short_description: string | null;
  description: string | null;
  status: TaskStatus;
  due_at: string | null;
  position: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskPayload = {
  title: string;
  short_description?: string | null;
  description?: string | null;
  status: TaskStatus;
  due_at?: string | null;
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

let unauthorizedHandler: (() => void) | undefined;

export function setUnauthorizedHandler(handler: () => void): () => void {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = undefined;
  };
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
  initializeCsrfBeforeRequest = false,
): Promise<T> {
  if (initializeCsrfBeforeRequest) {
    await initializeCsrf();
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
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

    if (response.status === 419 && attempt === 0) {
      await initializeCsrf();
      continue;
    }

    if (!response.ok) {
      if (response.status === 401) unauthorizedHandler?.();

      throw new ApiError(
        body?.message ?? "The request could not be completed.",
        response.status,
        body?.errors ?? {},
      );
    }

    return (body?.data ?? body) as T;
  }

  throw new ApiError("The request could not be completed.", 419);
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
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/me"),
  getProjects: () => request<Project[]>("/api/projects"),
  getProject: (id: number) => request<Project>(`/api/projects/${id}`),
  createProject: (payload: {
    name: string;
    description?: string;
    color?: string;
  }) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateProject: (
    id: number,
    payload: { name?: string; description?: string | null; color?: string | null },
  ) =>
    request<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteProject: (id: number) =>
    request<void>(`/api/projects/${id}`, { method: "DELETE" }),
  reorderProjects: (project_ids: number[]) =>
    request<void>("/api/projects/reorder", {
      method: "PATCH",
      body: JSON.stringify({ project_ids }),
    }),
  getTasks: (projectId: number) =>
    request<Task[]>(`/api/projects/${projectId}/tasks`),
  getTask: (taskId: number) => request<Task>(`/api/tasks/${taskId}`),
  createTask: (projectId: number, payload: TaskPayload) =>
    request<Task>(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTask: (taskId: number, payload: Partial<TaskPayload>) =>
    request<Task>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteTask: (taskId: number) =>
    request<void>(`/api/tasks/${taskId}`, { method: "DELETE" }),
};
