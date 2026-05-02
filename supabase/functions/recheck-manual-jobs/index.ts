import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface JobRow {
  id: string;
  posting_url: string;
  job_title: string;
  employer: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* ok */ }
    const onlyId = body?.id as string | undefined;

    let q = supabase
      .from("employment_opportunities")
      .select("id, posting_url, job_title, employer")
      .eq("is_manual", true)
      .eq("source_site", "user-submitted")
      .eq("active", true);
    if (onlyId) q = q.eq("id", onlyId);

    const { data: jobs, error } = await q;
    if (error) throw error;

    const results: Array<{ id: string; status: string; reason?: string }> = [];

    for (const job of (jobs || []) as JobRow[]) {
      try {
        const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: job.posting_url,
            formats: [
              {
                type: "json",
                schema: {
                  type: "object",
                  properties: {
                    job_title: { type: "string" },
                    employer: { type: "string" },
                    employment_type: { type: "string" },
                    wage: { type: "string" },
                    location: { type: "string" },
                    is_taken_down: {
                      type: "boolean",
                      description: "true if the page indicates the job is no longer available, expired, or filled.",
                    },
                  },
                },
                prompt:
                  "Extract the job posting details. Set is_taken_down=true if the page shows the job is closed, expired, no longer accepting applications, or the page is now a generic careers index instead of a single job posting.",
              },
            ],
            onlyMainContent: true,
            waitFor: 1500,
          }),
        });

        const data = await res.json();
        const httpStatus = data?.data?.metadata?.statusCode || data?.metadata?.statusCode;

        // Page completely gone
        if (!res.ok || httpStatus === 404 || httpStatus === 410) {
          await supabase
            .from("employment_opportunities")
            .update({ active: false })
            .eq("id", job.id);
          results.push({ id: job.id, status: "removed", reason: "page_unavailable" });
          continue;
        }

        const j = data?.data?.json || data?.json;
        const stillJobTitle = j?.job_title?.trim();
        const takenDown = j?.is_taken_down === true;

        if (!stillJobTitle || takenDown) {
          await supabase
            .from("employment_opportunities")
            .update({ active: false })
            .eq("id", job.id);
          results.push({ id: job.id, status: "removed", reason: takenDown ? "taken_down" : "no_job_extracted" });
          continue;
        }

        // Refresh details
        await supabase
          .from("employment_opportunities")
          .update({
            job_title: stillJobTitle,
            employer: j?.employer?.trim() || job.employer,
            employment_type: j?.employment_type?.trim() || null,
            wage: j?.wage?.trim() || null,
            location: j?.location?.trim() || null,
          })
          .eq("id", job.id);
        results.push({ id: job.id, status: "active" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`recheck failed for ${job.id}:`, msg);
        results.push({ id: job.id, status: "error", reason: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: (jobs || []).length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("recheck-manual-jobs error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
