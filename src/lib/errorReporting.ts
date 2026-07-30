import { supabase } from "@/integrations/supabase/client";

const MAX_REPORTS_PER_SESSION = 5;
const recentMessages = new Set<string>();
let reportCount = 0;

const truncate = (value: string | undefined | null, max: number) =>
  (value ?? "").slice(0, max);

export async function reportClientError(
  message: string,
  stack?: string | null,
): Promise<void> {
  if (!message) return;
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;

  const key = message.slice(0, 200);
  if (recentMessages.has(key)) return;
  recentMessages.add(key);
  reportCount += 1;

  try {
    await supabase.from("client_errors").insert({
      message: truncate(message, 2000),
      stack: truncate(stack, 8000) || null,
      path: truncate(window.location.pathname + window.location.search, 500),
      user_agent: truncate(navigator.userAgent, 500),
    });
  } catch {
    // Reporting must never break the app.
  }
}

let installed = false;

export function installClientErrorReporting(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const err = event.error as Error | undefined;
    void reportClientError(err?.message || event.message, err?.stack);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection");
    void reportClientError(
      `Unhandled promise rejection: ${message}`,
      reason instanceof Error ? reason.stack : undefined,
    );
  });
}
