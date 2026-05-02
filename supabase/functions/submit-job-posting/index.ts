import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JOB_CATEGORIES = [
  "Education",
  "Healthcare",
  "Hospitality",
  "Government",
  "Technology",
  "Trades/Labor",
  "Administrative",
  "Social Services",
  "Other",
];

const BodySchema = z.object({
  posting_url: z.string().url().max(2048),
  employer: z.string().trim().min(1).max(200).optional().nullable(),
  submitter_email: z.string().email().max(255),
  // Honeypot: must be empty/absent. Bots typically fill every field.
  website: z.string().max(0).optional().nullable(),
});

async function classifyJob(
  job_title: string,
  employer: string,
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You classify a single job listing into exactly one category. Categories: ${JOB_CATEGORIES.join(
              ", ",
            )}.`,
          },
          {
            role: "user",
            content: `Classify this job:\n"${job_title}" at "${employer}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify",
              parameters: {
                type: "object",
                properties: {
                  category: { type: "string", enum: JOB_CATEGORIES },
                },
                required: ["category"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function
      ?.arguments;
    if (!args) return null;
    const parsed = JSON.parse(args);
    return JOB_CATEGORIES.includes(parsed.category) ? parsed.category : null;
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));

    // Honeypot backstop: if the hidden field has any value, fake success.
    if (typeof body?.website === "string" && body.website.trim() !== "") {
      console.log("Honeypot triggered — silently dropping submission");
      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { posting_url, employer: providedEmployer, submitter_email } = parsed.data;

    if (submitter_email) {
      console.log(`Submission from ${submitter_email} for ${posting_url}`);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Reject duplicates
    const { data: existing } = await supabase
      .from("employment_opportunities")
      .select("id, active")
      .eq("posting_url", posting_url)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ error: "This job posting has already been submitted." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Scrape the URL with Firecrawl
    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: posting_url,
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
              },
              required: ["job_title"],
            },
            prompt:
              "Extract the job posting details from this page: job_title (the position name), employer (the hiring company/organization), employment_type (Full-time, Part-time, etc.), wage (e.g. '$15/hr' or '$45,000/year'), and location. If this page is NOT a single job posting, return empty values.",
          },
        ],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ error: "Could not fetch the page. Please verify the URL is publicly accessible." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const j = scrapeData?.data?.json || scrapeData?.json;
    const job_title = j?.job_title?.trim();
    const extractedEmployer = j?.employer?.trim();

    if (!job_title) {
      return new Response(
        JSON.stringify({
          error: "This page doesn't appear to be a job posting. Please link directly to a single job listing.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finalEmployer = (providedEmployer || extractedEmployer || "").trim();
    if (!finalEmployer) {
      return new Response(
        JSON.stringify({ error: "Could not determine the employer. Please provide an employer name." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const job_category = await classifyJob(job_title, finalEmployer);

    const { data: inserted, error: insertErr } = await supabase
      .from("employment_opportunities")
      .insert({
        job_title,
        employer: finalEmployer,
        employment_type: j?.employment_type?.trim() || null,
        wage: j?.wage?.trim() || null,
        location: j?.location?.trim() || null,
        posting_url,
        source_site: "user-submitted",
        source_id: null,
        is_manual: true,
        active: true,
        job_category,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Could not save the job. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: inserted.id,
        job_title,
        employer: finalEmployer,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("submit-job-posting error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
