export const LOCALE = "pt-BR";

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Formats an ISO timestamp for display. API payloads keep their ISO format. */
export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

/** Converts an ISO timestamp into the local value a datetime-local input expects. */
export function toLocalDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
