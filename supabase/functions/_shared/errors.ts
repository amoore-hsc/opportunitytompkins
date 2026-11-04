/**
 * Extracts a readable message from anything that was thrown. Supabase query
 * errors are plain objects with a `message` field, not `Error` instances.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string") return message;
  }
  return String(error);
}
