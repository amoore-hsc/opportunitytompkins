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
  job_category?: string | null;
}

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

async function classifyJobs(
  jobs: { job_title: string; employer: string }[]
): Promise<Record<number, string>> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || jobs.length === 0) return {};

  const jobList = jobs
    .map((j, i) => `${i}: "${j.job_title}" at "${j.employer}"`)
    .join("\n");

  try {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
              content: `You classify job listings into exactly one category. Categories: ${JOB_CATEGORIES.join(", ")}. Respond using the provided tool.`,
            },
            {
              role: "user",
              content: `Classify each job:\n${jobList}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "classify_jobs",
                description: "Return category for each job by index",
                parameters: {
                  type: "object",
                  properties: {
                    classifications: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          index: { type: "number" },
                          category: {
                            type: "string",
                            enum: JOB_CATEGORIES,
                          },
                        },
                        required: ["index", "category"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["classifications"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "classify_jobs" },
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("AI classification error:", response.status, await response.text());
      return {};
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return {};

    const parsed = JSON.parse(toolCall.function.arguments);
    const result: Record<number, string> = {};
    for (const c of parsed.classifications || []) {
      if (JOB_CATEGORIES.includes(c.category)) {
        result[c.index] = c.category;
      }
    }
    return result;
  } catch (err) {
    console.error("AI classification failed:", err);
    return {};
  }
}

const MAX_WAGE_ENRICHMENTS_PER_RUN = 25;

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
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }
    const sourceId = body?.source_id as string | undefined;

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

        const cfg0 = (source.scrape_config ?? {}) as Record<string, unknown>;
        const apiType = typeof cfg0.api_type === "string" ? cfg0.api_type : null;

        // Special path: Oracle HCM Cloud (e.g. Ithaca College).
        // The candidate site is a SPA — Firecrawl can't reliably extract per-job
        // links. Instead, hit the public REST API directly to get clean,
        // canonical job records and posting URLs.
        if (apiType === "oracle_hcm") {
          const apiBase = typeof cfg0.api_base === "string" ? cfg0.api_base : "";
          const siteNumber = typeof cfg0.site_number === "string" ? cfg0.site_number : "CX_1";
          const employerName = typeof cfg0.employer === "string" ? cfg0.employer : source.name;
          const urlBase = typeof cfg0.posting_url_base === "string" ? cfg0.posting_url_base : "";

          if (!apiBase || !urlBase) {
            sourceResult.errors.push("oracle_hcm config missing api_base or posting_url_base");
            continue;
          }

          const oracleJobs: JobListing[] = [];
          let offset = 0;
          const pageLimit = 25;
          let total = Infinity;
          let safety = 0;

          while (offset < total && safety++ < 20) {
            const apiUrl = `${apiBase}?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber=${siteNumber},facetsList=LOCATIONS,limit=${pageLimit},offset=${offset},sortBy=POSTING_DATES_DESC`;
            const apiRes = await fetch(apiUrl, { headers: { Accept: "application/json" } });
            if (!apiRes.ok) {
              sourceResult.errors.push(`Oracle API error: ${apiRes.status}`);
              break;
            }
            const apiData = await apiRes.json();
            const item = apiData?.items?.[0];
            if (!item) break;
            total = typeof item.TotalJobsCount === "number" ? item.TotalJobsCount : 0;
            const list = Array.isArray(item.requisitionList) ? item.requisitionList : [];
            if (list.length === 0) break;

            for (const req of list) {
              const id = req?.Id ? String(req.Id) : null;
              const title = req?.Title ? String(req.Title).trim() : null;
              if (!id || !title) continue;
              oracleJobs.push({
                job_title: title,
                employer: employerName,
                employment_type: req?.WorkerType?.trim?.() || null,
                wage: null,
                location: req?.PrimaryLocation?.trim?.() || null,
                posting_url: `${urlBase}${id}`,
                source_site: source.name,
                source_id: id,
              });
            }
            offset += list.length;
          }

          console.log(`Found ${oracleJobs.length} jobs from ${source.name} via Oracle API`);

          // Classify
          const classifications = await classifyJobs(
            oracleJobs.map((j) => ({ job_title: j.job_title, employer: j.employer }))
          );
          for (let i = 0; i < oracleJobs.length; i++) {
            oracleJobs[i].job_category = classifications[i] || null;
          }

          // Upsert (mirrors the generic path below)
          for (const job of oracleJobs) {
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
                  job_category: job.job_category,
                })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("employment_opportunities")
                .insert({ ...job, active: true, is_manual: false });
            }
            sourceResult.scraped++;
          }

          // Deactivate any rows for this source that weren't seen this run
          const seenIds = oracleJobs.map((j) => j.source_id).filter(Boolean) as string[];
          if (seenIds.length > 0) {
            await supabase
              .from("employment_opportunities")
              .update({ active: false })
              .eq("source_site", source.name)
              .eq("is_manual", false)
              .not("source_id", "in", `(${seenIds.map((s) => `"${s}"`).join(",")})`);
          }

          await supabase
            .from("scrape_sources")
            .update({ last_scraped_at: new Date().toISOString() })
            .eq("id", source.id);

          continue;
        }

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
                    "Extract all job listings from this page. For each job, get the title, employer/organization, employment type (full-time/part-time if shown), wage/salary (if shown), location, a direct link to the full posting, and any unique ID. The unique ID (source_id) is critical — look for a requisition number, job ID, or alphanumeric identifier shown on the listing card (e.g. 'REQ-12345', 'Job ID: 56789', or embedded in the posting link). If the employer is the same for all jobs (like a single organization's career page), use that organization name for all.",
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

        const jobs: JobListing[] = [];
        const jsonData = scrapeData?.data?.json || scrapeData?.json;

        if (jsonData?.jobs && Array.isArray(jsonData.jobs)) {
          for (const job of jsonData.jobs) {
            if (!job.job_title || !job.employer) continue;

            const titleLower = job.job_title.toLowerCase();
            if (
              titleLower.includes("lateral transfer") ||
              titleLower.includes("transfer/reinstatement") ||
              titleLower.includes("reinstatement opportunity")
            ) continue;

            let postingUrl = job.posting_url || source.url;
            if (postingUrl && !postingUrl.startsWith("http")) {
              try {
                postingUrl = new URL(postingUrl, source.url).href;
              } catch {
                postingUrl = source.url;
              }
            }

            // If the extractor fell back to the source listings URL (common on
            // SPA careers sites like Oracle HCM), reconstruct the canonical
            // posting URL from a per-source template + source_id.
            const cfg = (source.scrape_config ?? {}) as Record<string, unknown>;
            const tpl = typeof cfg.posting_url_template === "string"
              ? cfg.posting_url_template
              : null;
            const sid = job.source_id ? String(job.source_id).trim() : "";
            if (tpl && sid && (postingUrl === source.url || !job.posting_url)) {
              postingUrl = tpl.replace("{source_id}", encodeURIComponent(sid));
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

        // AI classify all jobs from this source in one batch
        const classifications = await classifyJobs(
          jobs.map((j) => ({ job_title: j.job_title, employer: j.employer }))
        );
        for (let i = 0; i < jobs.length; i++) {
          jobs[i].job_category = classifications[i] || null;
        }

        // Upsert jobs
        for (const job of jobs) {
          if (job.source_id) {
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
                  job_category: job.job_category,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("employment_opportunities")
                .insert({ ...job, active: true, is_manual: false });
            }
          } else {
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
                  job_category: job.job_category,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            }
          }

          sourceResult.scraped++;
        }

        // Deactivate stale rows: any active non-manual row for this source
        // that hasn't been touched by a scrape in 7+ days is treated as
        // removed. This is safer than "deactivate anything not seen this
        // run" because many sources (Cornell Workday, Chamber, etc.) only
        // return a partial page per scrape. Each successful scrape refreshes
        // updated_at on the rows it saw, so anything left behind for 1 week
        // is genuinely gone.
        if (jobs.length >= 5) {
          const staleCutoff = new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
          await supabase
            .from("employment_opportunities")
            .update({ active: false })
            .eq("source_site", source.name)
            .eq("is_manual", false)
            .eq("active", true)
            .lt("updated_at", staleCutoff);
        }





        // Wage enrichment runs as a separate, fire-and-forget edge function
        // call so the long-running detail-page scrapes don't block this
        // function's wall-clock budget. It will pick up any active jobs from
        // this source that still have wage = null.
        try {
          const enrichUrl = `${supabaseUrl}/functions/v1/enrich-job-wages`;
          // Don't await — let it run independently.
          fetch(enrichUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
              "x-internal-task-secret": Deno.env.get("INTERNAL_TASK_SECRET") ?? "",
            },
            body: JSON.stringify({
              source_site: source.name,
              limit: MAX_WAGE_ENRICHMENTS_PER_RUN,
            }),
          }).catch((e) =>
            console.warn(`enrich-job-wages trigger failed: ${e}`)
          );
        } catch (enrichErr) {
          console.warn("enrich-job-wages trigger error:", enrichErr);
        }

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
