import { FunctionsHttpError } from "@supabase/supabase-js";

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

/**
 * For errors from `supabase.functions.invoke`: returns the `error` message the
 * edge function put in its JSON response (e.g. "Up to 500 jobs…"), falling
 * back to the generic message.
 */
export async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body && typeof body.error === "string") return body.error;
  }
  return getErrorMessage(error);
}
