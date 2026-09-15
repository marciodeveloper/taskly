/**
 * Transient inline feedback. The tone is explicit so styling never depends on
 * parsing the message text.
 */
export type Feedback = { text: string; tone: "success" | "error" };
