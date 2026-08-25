import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeWage } from "../_shared/wage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LIMIT = 25;
const CONCURRENCY = 3;

async function enrichWageFromPostingUrl(
  url: string,
  firecrawlKey: string
): Promise<string | null> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: [
          {
            type: "json",
            schema: {
              type: "object",
              properties: {
                wage: {
                  type: ["string", "null"],
                  description:
                    "The salary, wage, hourly rate, or pay range exactly as shown on the page (e.g. '$18.99/hr', '$50,000 - $60,000/year', '$25 per hour'). Return null if no pay information is listed.",
                },
              },
              required: ["wage"],
            },
            prompt:
              "Extract the salary, wage, hourly rate, or pay range from this job posting exactly as shown on the page. Examples: '$18.99/hr', '$50,000 - $60,000/year', '$25 per hour'. If no pay information is listed anywhere, return null.",
          },
        ],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!res.ok) {
      console.warn(`Wage enrich HTTP ${res.status} for ${url}`);
      return null;
    }
    const data = await res.json();
    const json = data?.data?.json || data?.json;
    return normalizeWage(json?.wage);
  } catch (err) {
    console.warn(`Wage enrich error for ${url}:`, err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Restrict to trusted internal callers (cron / admin)
  const internalSecret = Deno.env.get("INTERNAL_TASK_SECRET");
  const providedSecret = req.headers.get("x-internal-task-secret");
  if (!internalSecret || providedSecret !== internalSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }


  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }

    const sourceSite = body?.source_site as string | undefined;
    const limit = Math.min(
      Number(body?.limit) || DEFAULT_LIMIT,
      100
    );

    // Target rows with no wage OR a placeholder value ("Null", "Not listed", ...)
    let q = supabase
      .from("employment_opportunities")
      .select("id, posting_url, source_site")
      .eq("active", true)
      .or(
        "wage.is.null,wage.eq.,wage.ilike.null,wage.ilike.n/a,wage.ilike.na,wage.ilike.none,wage.ilike.not listed,wage.ilike.not specified,wage.ilike.not provided,wage.ilike.not available,wage.ilike.unspecified,wage.ilike.unknown,wage.ilike.tbd"
      )
      .not("posting_url", "is", null)
      .limit(limit);
    if (sourceSite) q = q.eq("source_site", sourceSite);

    const { data: rows, error } = await q;
    if (error) throw error;

    const targets = (rows || []).filter(
      (r) =>
        typeof r.posting_url === "string" &&
        r.posting_url.startsWith("http")
    );

    let enriched = 0;
    let attempted = 0;
    const perSource: Record<string, { attempted: number; enriched: number }> = {};

    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const batch = targets.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (row) => ({
          id: row.id as string,
          source_site: row.source_site as string,
          wage: await enrichWageFromPostingUrl(
            row.posting_url as string,
            FIRECRAWL_API_KEY
          ),
        }))
      );
      for (const r of results) {
        attempted++;
        if (!perSource[r.source_site]) perSource[r.source_site] = { attempted: 0, enriched: 0 };
        perSource[r.source_site].attempted++;
        if (r.wage) {
          await supabase
            .from("employment_opportunities")
            .update({ wage: r.wage })
            .eq("id", r.id);
          enriched++;
          perSource[r.source_site].enriched++;
        }
      }
    }

    console.log(
      `enrich-job-wages: ${enriched}/${attempted} updated`,
      perSource
    );

    return new Response(
      JSON.stringify({ success: true, attempted, enriched, perSource }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("enrich-job-wages error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
