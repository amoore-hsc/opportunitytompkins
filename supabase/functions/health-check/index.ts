import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_RECIPIENTS = ["rhinton@uwtc.org"];
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://tompkins-opportunity.org";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

/**
 * Queries the public Data API exactly like an anonymous visitor's browser would,
 * so grant/RLS regressions surface here instead of silently breaking the site.
 */
async function checkPublicRead(
  supabaseUrl: string,
  anonKey: string,
  path: string,
  name: string,
): Promise<CheckResult> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      return { name, ok: false, detail: `HTTP ${res.status}: ${body.slice(0, 300)}` };
    }

    const contentRange = res.headers.get("content-range") ?? "";
    const total = Number(contentRange.split("/")[1] ?? "0");

    if (!Number.isFinite(total) || total <= 0) {
      return { name, ok: false, detail: "Query succeeded but returned 0 rows" };
    }

    return { name, ok: true, detail: `${total} rows readable` };
  } catch (e) {
    return { name, ok: false, detail: `Request failed: ${(e as Error).message}` };
  }
}

async function checkPage(url: string, name: string): Promise<CheckResult> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      return { name, ok: false, detail: `HTTP ${res.status}` };
    }
    return { name, ok: true, detail: "Page reachable" };
  } catch (e) {
    return { name, ok: false, detail: `Request failed: ${(e as Error).message}` };
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const internalSecret = Deno.env.get("INTERNAL_TASK_SECRET");
  const providedSecret = req.headers.get("x-internal-task-secret");
  if (!internalSecret || providedSecret !== internalSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const checks: CheckResult[] = await Promise.all([
    checkPublicRead(
      supabaseUrl,
      anonKey,
      "public_opportunities?select=id&limit=1",
      "Volunteer & education listings (anonymous read)",
    ),
    checkPublicRead(
      supabaseUrl,
      anonKey,
      "employment_opportunities?select=id&active=eq.true&limit=1",
      "Employment listings (anonymous read)",
    ),
    checkPage(`${SITE_URL}/opportunities`, "Opportunities page"),
    checkPage(`${SITE_URL}/employment`, "Employment page"),
  ]);

  const failures = checks.filter((c) => !c.ok);

  if (failures.length > 0) {
    const rows = checks
      .map(
        (c) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${c.ok ? "✅" : "❌"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(c.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;">${escapeHtml(c.detail)}</td>
        </tr>`,
      )
      .join("");

    try {
      await resend.emails.send({
        from: "Tompkins Opportunity <hello@tompkins-opportunity.org>",
        to: ALERT_RECIPIENTS,
        subject: `⚠️ Site health check failed (${failures.length} issue${failures.length === 1 ? "" : "s"})`,
        html: `
          <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:640px;">
            <tr>
              <td style="background:#1e3a5f;padding:20px 24px;">
                <span style="color:#ffffff;font-size:20px;font-weight:bold;">Site Health Alert</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 16px;color:#111827;">
                  The automated health check found ${failures.length} problem${failures.length === 1 ? "" : "s"} with
                  <a href="${SITE_URL}">${escapeHtml(SITE_URL)}</a>. Visitors may be unable to see listings.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
                  ${rows}
                </table>
                <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">
                  Checked at ${new Date().toISOString()}
                </p>
              </td>
            </tr>
          </table>
        `,
      });
    } catch (e) {
      console.error("Failed to send health alert email:", e);
    }
  }

  console.log("Health check results:", JSON.stringify(checks));

  return new Response(JSON.stringify({ healthy: failures.length === 0, checks }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
