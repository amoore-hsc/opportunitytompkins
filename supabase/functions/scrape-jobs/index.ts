import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScrapeSource {
  id: string;
  name: string;
  url: string;
  scrape_config: Record<string, unknown> | null;
  active: boolean;
}

interface JobListing {
  job_title: string;
  employer: string;
  employment_type: string | null;
  wage: string | null;
  location: string | null;
  posting_url: string;
  source_site: string;
  source_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Support scraping a single source by ID (for staggered cron)
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }
    const sourceId = body?.source_id as string | undefined;

    // Get active scrape sources
    let query = supabase.from("scrape_sources").select("*").eq("active", true);
    if (sourceId) {
      query = query.eq("id", sourceId);
    }
    const { data: sources, error: sourcesError } = await query;

    if (sourcesError) throw sourcesError;
    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active scrape sources" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, { scraped: number; errors: string[] }> = {};

    for (const source of sources as ScrapeSource[]) {
      const sourceResult = { scraped: 0, errors: [] as string[] };
      results[source.name] = sourceResult;

      try {
        console.log(`Scraping: ${source.name} (${source.url})`);

        // Use Firecrawl to scrape the page
        const scrapeResponse = await fetch(
          "https://api.firecrawl.dev/v2/scrape",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: source.url,
              formats: [
                {
                  type: "json",
                  schema: {
                    type: "object",
                    properties: {
                      jobs: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            job_title: {
                              type: "string",
                              description: "The job title or position name",
                            },
                            employer: {
                              type: "string",
                              description:
                                "The employer or company name. Use the organization name if not explicitly listed.",
                            },
                            employment_type: {
                              type: "string",
                              description:
                                "Full-time, Part-time, Temporary, etc. Null if not specified.",
                            },
                            wage: {
                              type: "string",
                              description:
                                "Salary or wage info like '$15/hr' or '$45,000/year'. Null if not listed.",
                            },
                            location: {
                              type: "string",
                              description:
                                "Job location or city. Null if not specified.",
                            },
                            posting_url: {
                              type: "string",
                              description:
                                "Direct URL to the full job posting. Use the link from the listing if available.",
                            },
                            source_id: {
                              type: "string",
                              description:
                                "A unique identifier for deduplication — the job ID, requisition number, or a slug from the URL.",
                            },
                          },
                          required: ["job_title", "employer", "posting_url"],
                        },
                      },
                    },
                    required: ["jobs"],
                  },
                  prompt:
                    "Extract all job listings from this page. For each job, get the title, employer/organization, employment type (full-time/part-time if shown), wage/salary (if shown), location, a direct link to the full posting, and any unique ID. If the employer is the same for all jobs (like a single organization's career page), use that organization name for all.",
                },
              ],
              onlyMainContent: true,
              waitFor: 3000,
            }),
          }
        );

        const scrapeData = await scrapeResponse.json();

        if (!scrapeResponse.ok) {
          sourceResult.errors.push(
            `Firecrawl error: ${scrapeData.error || scrapeResponse.statusText}`
          );
          continue;
        }

        // Extract jobs from the response
        const jobs: JobListing[] = [];
        const jsonData = scrapeData?.data?.json || scrapeData?.json;

        if (jsonData?.jobs && Array.isArray(jsonData.jobs)) {
          for (const job of jsonData.jobs) {
            if (!job.job_title || !job.employer) continue;

            // Resolve relative URLs
            let postingUrl = job.posting_url || source.url;
            if (postingUrl && !postingUrl.startsWith("http")) {
              try {
                postingUrl = new URL(postingUrl, source.url).href;
              } catch {
                postingUrl = source.url;
              }
            }

            jobs.push({
              job_title: job.job_title.trim(),
              employer: job.employer.trim(),
              employment_type: job.employment_type?.trim() || null,
              wage: job.wage?.trim() || null,
              location: job.location?.trim() || null,
              posting_url: postingUrl,
              source_site: source.name,
              source_id: job.source_id?.toString() || null,
            });
          }
        }

        console.log(`Found ${jobs.length} jobs from ${source.name}`);

        // Upsert jobs - dedup by source_site + source_id where possible
        for (const job of jobs) {
          if (job.source_id) {
            // Try to find existing by source_site + source_id
            const { data: existing } = await supabase
              .from("employment_opportunities")
              .select("id")
              .eq("source_site", job.source_site)
              .eq("source_id", job.source_id)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("employment_opportunities")
                .update({
                  job_title: job.job_title,
                  employer: job.employer,
                  employment_type: job.employment_type,
                  wage: job.wage,
                  location: job.location,
                  posting_url: job.posting_url,
                  active: true,
                })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("employment_opportunities")
                .insert({ ...job, active: true, is_manual: false });
            }
          } else {
            // No source_id — check by posting_url to avoid duplicates
            const { data: existing } = await supabase
              .from("employment_opportunities")
              .select("id")
              .eq("posting_url", job.posting_url)
              .maybeSingle();

            if (!existing) {
              await supabase
                .from("employment_opportunities")
                .insert({ ...job, active: true, is_manual: false });
            } else {
              await supabase
                .from("employment_opportunities")
                .update({
                  job_title: job.job_title,
                  employer: job.employer,
                  employment_type: job.employment_type,
                  wage: job.wage,
                  location: job.location,
                  active: true,
                })
                .eq("id", existing.id);
            }
          }
          sourceResult.scraped++;
        }

        // Update last_scraped_at
        await supabase
          .from("scrape_sources")
          .update({ last_scraped_at: new Date().toISOString() })
          .eq("id", source.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sourceResult.errors.push(msg);
        console.error(`Error scraping ${source.name}:`, msg);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("scrape-jobs error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
