import type { TaskStatus } from "@/lib/api/client";

export type TaskStatusOption = { value: TaskStatus; label: string };

/**
 * Visible labels only. The `value` side is the API contract and stays in English.
 */
export const taskStatuses: TaskStatusOption[] = [
  { value: "not_started", label: "Não iniciada" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluída" },
  { value: "cancelled", label: "Cancelada" },
];
