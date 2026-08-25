/**
 * Shared email/site configuration for edge functions.
 *
 * Reads from environment variables with neutral fallbacks so the template
 * repo works out-of-the-box with placeholder values. Deployments override
 * via Supabase Edge Function secrets.
 *
 *   FROM_EMAIL        — sender address (e.g. hello@your-site.org)
 *   FROM_NAME         — sender display name (e.g. "Opportunity Board")
 *   SUPPORT_EMAIL     — general support address shown in email footers
 *   ALERT_RECIPIENTS  — comma-separated list for admin alerts/reports
 *   SITE_NAME         — site display name
 *   SITE_URL          — public site URL (no trailing slash)
 */

export function getFromEmail(): string {
  const name = Deno.env.get("FROM_NAME") || "Opportunity Board";
  const email = Deno.env.get("FROM_EMAIL") || "noreply@example.com";
  return `${name} <${email}>`;
}

export function getSupportEmail(): string {
  return Deno.env.get("SUPPORT_EMAIL") || "support@example.com";
}

export function getAlertRecipients(): string[] {
  const raw = Deno.env.get("ALERT_RECIPIENTS") || "";
  const recipients = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return recipients.length > 0 ? recipients : ["admin@example.com"];
}

export function getSiteName(): string {
  return Deno.env.get("SITE_NAME") || "Opportunity Board";
}

export function getSiteUrl(): string {
  return (Deno.env.get("SITE_URL") || "https://example.com").trim().replace(/\/+$/, "");
}
