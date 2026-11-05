import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractWageFromText, normalizeWage } from "../_shared/wage.ts";
import { categorizeJob } from "../_shared/jobCategory.ts";
import { isOutsideCounty } from "../_shared/jobLocation.ts";
import { fingerprintViaPlainFetch, fingerprintWithFirecrawl } from "../_shared/pageFingerprint.ts";

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
  /** Fingerprint of the listings page at the last full (AI) scrape. */
  content_fingerprint: string | null;
  /** When the last full (AI) scrape started. */
  last_full_scrape_at: string | null;
}

interface SourceResult {
  scraped: number;
  errors: string[];
  /** True when the page hadn't changed, so the paid extraction was skipped. */
  unchanged?: boolean;
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

// Rule-based job categorization (see _shared/jobCategory.ts). No AI service needed.
function classifyJobs(
  jobs: { job_title: string; employer: string }[]
): Record<number, string> {
  const out: Record<number, string> = {};
  jobs.forEach((j, i) => (out[i] = categorizeJob(j.job_title, j.employer)));
  return out;
}

// Firecrawl free plan = 1,000 credits/month, so paid work is rationed:
// - wage lookups are capped per run (enrich-job-wages also checks the balance);
// - an unchanged listings page skips the 5-credit AI extraction, but a full
//   extraction still runs at least this often as a safety net.
const MAX_WAGE_ENRICHMENTS_PER_RUN = 10;
const FULL_SCRAPE_MAX_AGE_MS = 6.5 * 24 * 60 * 60 * 1000;

// Free detail-page reads per run (Workday / Oracle job descriptions).
const MAX_WORKDAY_DETAILS_PER_RUN = 300;
const MAX_ORACLE_DETAILS_PER_RUN = 60;
const DETAIL_CONCURRENCY = 6;

/** Runs `fn` over `items` with at most `limit` in flight. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Starts wage enrichment for a source without delaying this response.
 * EdgeRuntime.waitUntil keeps the request alive after we return.
 */
function triggerWageEnrichment(supabaseUrl: string, serviceKey: string, sourceName: string) {
  const request = fetch(`${supabaseUrl}/functions/v1/enrich-job-wages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "x-internal-task-secret": Deno.env.get("INTERNAL_TASK_SECRET") ?? "",
    },
    body: JSON.stringify({ source_site: sourceName, limit: MAX_WAGE_ENRICHMENTS_PER_RUN }),
  }).catch((e) => console.warn(`enrich-job-wages trigger failed: ${e}`));
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
    .EdgeRuntime;
  runtime?.waitUntil(request);
}

// ── Workday (e.g. Cornell) ────────────────────────────────────────────────
// Workday career sites are JavaScript apps, but they're backed by a public
// JSON API: one endpoint lists every posting, another returns a posting's
// full description (which includes pay). Reading it directly is free and
// returns the complete list, unlike a page scrape.

const WORKDAY_TIME_TYPES: Record<string, string> = {
  "full time": "Full-Time",
  "part time": "Part-Time",
};

interface WorkdayPosting {
  sourceId: string;
  title: string;
  path: string;
  locationsText: string | null;
}

interface WorkdayDetail {
  locations: string[];
  employmentType: string | null;
  wage: string | null;
}

async function scrapeWorkdaySource(
  supabase: SupabaseClient,
  source: ScrapeSource,
  result: SourceResult,
): Promise<void> {
  const cfg = (source.scrape_config ?? {}) as Record<string, unknown>;
  let host = typeof cfg.host === "string" ? cfg.host : "";
  let site = typeof cfg.site === "string" ? cfg.site : "";
  try {
    const u = new URL(source.url);
    host ||= u.host;
    site ||= u.pathname.split("/").filter(Boolean).pop() ?? "";
  } catch { /* fall through to the check below */ }
  const tenant = typeof cfg.tenant === "string" ? cfg.tenant : host.split(".")[0];
  const employer = typeof cfg.employer === "string" ? cfg.employer : source.name;
  // Optional allow-list of in-county place names (lowercase). Health systems
  // and other multi-county employers label some sites without a town (e.g.
  // "L.D. Clute Building"), so for them we only keep locations that name a
  // listed place, instead of excluding only known out-of-county places.
  const allowPlaces = Array.isArray(cfg.location_allow)
    ? (cfg.location_allow as unknown[])
      .filter((x): x is string => typeof x === "string" && x.trim() !== "")
      .map((x) => x.trim().toLowerCase())
    : null;
  const inArea = (loc: string | null | undefined): boolean => {
    if (!allowPlaces) return !isOutsideCounty(loc);
    const l = (loc ?? "").toLowerCase();
    return allowPlaces.some((place) => l.includes(place));
  };
  if (!host || !site || !tenant) {
    result.errors.push("workday config needs host, tenant and site");
    return;
  }
  const api = `https://${host}/wday/cxs/${tenant}/${site}`;
  const jsonHeaders = { "Content-Type": "application/json", Accept: "application/json" };

  // 1. List every posting (Workday pages are 20 at a time; `total` is only
  //    reported on the first page).
  const postings: WorkdayPosting[] = [];
  let total = -1;
  let fetched = 0;
  for (let page = 0; page < 60 && (total < 0 || fetched < total); page++) {
    const res = await fetch(`${api}/jobs`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: fetched, searchText: "" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      result.errors.push(`Workday list error: ${res.status}`);
      break;
    }
    const data = await res.json();
    if (total < 0) total = Number(data?.total) || 0;
    const list = Array.isArray(data?.jobPostings) ? data.jobPostings : [];
    if (list.length === 0) break;
    fetched += list.length;
    for (const p of list) {
      const path = typeof p?.externalPath === "string" ? p.externalPath : "";
      const title = typeof p?.title === "string" ? p.title.trim() : "";
      const bullets: unknown[] = Array.isArray(p?.bulletFields) ? p.bulletFields : [];
      const sourceId =
        // Requisition IDs look like "WDR-00062116" (Cornell) or "R348879" (Cayuga).
        (bullets.find((b) => typeof b === "string" && /^[A-Z]{1,5}-?\d+$/.test(b)) as string | undefined) ??
        path.match(/_([A-Z]{1,5}-?\d+)(?:-\d+)?$/)?.[1];
      if (!path || !title || !sourceId) continue;
      postings.push({
        sourceId,
        title,
        path,
        locationsText: typeof p?.locationsText === "string" ? p.locationsText.trim() : null,
      });
    }
  }
  const complete = total >= 0 && fetched >= total && result.errors.length === 0;
  console.log(`Workday ${source.name}: ${postings.length} postings (total ${total}, complete=${complete})`);

  // 2. What we already have for this source.
  const { data: existingRows, error: existingErr } = await supabase
    .from("employment_opportunities")
    .select("id, source_id, wage, wage_checked_at, employment_type, location")
    .eq("source_site", source.name);
  if (existingErr) throw existingErr;
  const bySourceId = new Map(
    (existingRows ?? []).map((r) => [String(r.source_id), r]),
  );

  // 3. Read the full posting for new jobs (and any never checked for pay),
  //    skipping ones whose single listed location is already out of area.
  const isMultiple = (p: WorkdayPosting) => /^\d+\s+locations?$/i.test(p.locationsText ?? ""); // "2 Locations"
  const needDetail = postings
    .filter((p) => {
      if (!isMultiple(p) && !inArea(p.locationsText)) return false;
      const row = bySourceId.get(p.sourceId);
      return !row || (!row.wage && !row.wage_checked_at);
    })
    .slice(0, MAX_WORKDAY_DETAILS_PER_RUN);
  const details = new Map<string, WorkdayDetail>();
  await mapWithConcurrency(needDetail, DETAIL_CONCURRENCY, async (p) => {
    try {
      const res = await fetch(`${api}${p.path}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return;
      const info = (await res.json())?.jobPostingInfo;
      if (!info) return;
      const locations = [info.location, ...(Array.isArray(info.additionalLocations) ? info.additionalLocations : [])]
        .filter((l): l is string => typeof l === "string" && l.trim() !== "")
        .map((l) => l.trim());
      const timeType = typeof info.timeType === "string" ? info.timeType.trim() : "";
      details.set(p.sourceId, {
        locations,
        employmentType: WORKDAY_TIME_TYPES[timeType.toLowerCase()] ?? (timeType || null),
        wage: extractWageFromText(typeof info.jobDescription === "string" ? info.jobDescription : ""),
      });
    } catch (e) {
      console.warn(`Workday detail failed for ${p.path}: ${e}`);
    }
  });
  console.log(`Workday ${source.name}: read ${details.size}/${needDetail.length} posting details`);

  // 4. Keep in-county (or remote/unknown) jobs and save them.
  const nowIso = new Date().toISOString();
  const keptIds: string[] = [];
  let skippedOutOfCounty = 0;
  for (const p of postings) {
    const detail = details.get(p.sourceId);
    const row = bySourceId.get(p.sourceId);
    const multiple = isMultiple(p);
    let location: string | null;
    if (detail && detail.locations.length > 0) {
      location = detail.locations.find((l) => inArea(l)) ?? null;
      if (!location) {
        skippedOutOfCounty++;
        continue;
      }
    } else if (multiple) {
      location = row?.location ?? null; // keep what we knew; can't tell from the list
    } else {
      location = p.locationsText;
      if (!inArea(location)) {
        skippedOutOfCounty++;
        continue;
      }
    }

    const job = {
      job_title: p.title,
      employer,
      employment_type: detail?.employmentType ?? row?.employment_type ?? null,
      wage: detail?.wage ?? null,
      location,
      posting_url: `https://${host}/en-US/${site}${p.path}`,
      source_site: source.name,
      source_id: p.sourceId,
      job_category: categorizeJob(p.title, employer),
    };
    if (row) {
      await supabase
        .from("employment_opportunities")
        .update({
          job_title: job.job_title,
          employer: job.employer,
          employment_type: job.employment_type,
          ...(job.wage ? { wage: job.wage } : {}),
          ...(job.location ? { location: job.location } : {}),
          posting_url: job.posting_url,
          active: true,
          job_category: job.job_category,
          updated_at: nowIso,
          // We read the full posting, so a paid wage lookup can't add anything.
          ...(detail ? { wage_checked_at: nowIso } : {}),
        })
        .eq("id", row.id);
    } else {
      await supabase
        .from("employment_opportunities")
        .insert({ ...job, active: true, is_manual: false, ...(detail ? { wage_checked_at: nowIso } : {}) });
    }
    keptIds.push(p.sourceId);
    result.scraped++;
  }
  if (skippedOutOfCounty > 0) {
    console.log(`Skipped ${skippedOutOfCounty} out-of-county jobs from ${source.name}`);
  }

  // 5. The list is complete, so anything not in it has been filled or removed.
  if (complete && keptIds.length > 0) {
    await supabase
      .from("employment_opportunities")
      .update({ active: false })
      .eq("source_site", source.name)
      .eq("is_manual", false)
      .eq("active", true)
      .not("source_id", "in", `(${keptIds.map((s) => `"${s}"`).join(",")})`);
  }
}

// ── Oracle HCM (e.g. Ithaca College): free pay lookup ─────────────────────
// The listing API has no pay, but each requisition's details endpoint
// includes the full description, which states compensation.

async function fillOracleWages(
  supabase: SupabaseClient,
  source: ScrapeSource,
  apiBase: string,
  siteNumber: string,
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("employment_opportunities")
    .select("id, source_id")
    .eq("source_site", source.name)
    .eq("active", true)
    .is("wage", null)
    .is("wage_checked_at", null)
    .not("source_id", "is", null)
    .limit(MAX_ORACLE_DETAILS_PER_RUN);
  if (error) throw error;
  if (!rows || rows.length === 0) return;

  const detailsBase = apiBase.replace(/recruitingCEJobRequisitions\b/, "recruitingCEJobRequisitionDetails");
  let found = 0;
  await mapWithConcurrency(rows, DETAIL_CONCURRENCY, async (row) => {
    try {
      const url = `${detailsBase}?expand=all&onlyData=true&finder=ById;Id=%22${encodeURIComponent(String(row.source_id))}%22,siteNumber=${encodeURIComponent(siteNumber)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return; // try again next run
      const item = (await res.json())?.items?.[0] ?? {};
      const text = [
        item.ExternalDescriptionStr,
        item.ExternalResponsibilitiesStr,
        item.ExternalQualificationsStr,
        item.ShortDescriptionStr,
      ].filter((s) => typeof s === "string").join("\n");
      const wage = extractWageFromText(text);
      if (wage) found++;
      await supabase
        .from("employment_opportunities")
        .update({ ...(wage ? { wage } : {}), wage_checked_at: new Date().toISOString() })
        .eq("id", row.id);
    } catch (e) {
      console.warn(`Oracle detail failed for ${row.source_id}: ${e}`);
    }
  });
  console.log(`Oracle ${source.name}: found pay for ${found}/${rows.length} postings`);
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contract",
  TEMPORARY: "Temporary",
  INTERN: "Internship",
  VOLUNTEER: "Volunteer",
  PER_DIEM: "Per Diem",
  OTHER: "Other",
};

/** Format a schema.org JobPosting baseSalary into display text. */
function formatBaseSalary(baseSalary: unknown): string | null {
  const bs = baseSalary as
    | { value?: { unitText?: string; minValue?: unknown; maxValue?: unknown; value?: unknown } }
    | undefined;
  const v = bs?.value;
  if (!v) return null;
  const num = (x: unknown) => {
    const n = Number(x);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const min = num(v.minValue) ?? num(v.value);
  const max = num(v.maxValue);
  if (!min && !max) return null;
  const unit = String(v.unitText || "").toUpperCase();
  const suffix = unit === "HOUR" ? "/hr" : unit === "YEAR" ? "/year" : unit === "MONTH" ? "/month" : "";
  const fmt = (n: number) =>
    unit === "HOUR" ? `$${n.toFixed(2)}` : `$${Math.round(n).toLocaleString("en-US")}`;
  if (min && max && max > min) return `${fmt(min)} - ${fmt(max)}${suffix}`;
  return `${fmt(min ?? max!)}${suffix}`;
}

/**
 * ApplicantPro-hosted career sites (e.g. Cayuga Health) are Vue SPAs that
 * Firecrawl can't read. Their sitemap lists every job detail page, and each
 * detail page embeds a clean schema.org JobPosting JSON-LD block — so we read
 * the sitemap and parse the structured data directly.
 */
async function fetchApplicantProJobs(
  baseUrl: string,
  employer: string,
  sourceName: string,
  errors: string[],
): Promise<JobListing[]> {
  const origin = new URL(baseUrl).origin;
  const sitemapRes = await fetch(`${origin}/sitemap.xml`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OpportunityBoardBot)" },
  });
  if (!sitemapRes.ok) {
    errors.push(`ApplicantPro sitemap error: ${sitemapRes.status}`);
    return [];
  }
  const xml = await sitemapRes.text();
  const host = new URL(baseUrl).host;
  const urlPattern = new RegExp(
    `https://${host.replace(/\./g, "\\.")}/jobs/\\d+\\.html`,
    "g",
  );
  const jobUrls = Array.from(new Set(xml.match(urlPattern) ?? []));
  console.log(`ApplicantPro sitemap: ${jobUrls.length} job pages for ${sourceName}`);

  const jobs: JobListing[] = [];
  const concurrency = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < jobUrls.length) {
      const url = jobUrls[cursor++];
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; OpportunityBoardBot)" },
        });
        if (!res.ok) continue;
        const html = await res.text();
        const match = html.match(
          /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i,
        );
        if (!match) continue;
        let ld: Record<string, unknown>;
        try {
          ld = JSON.parse(match[1]);
        } catch {
          continue;
        }
        if (ld["@type"] !== "JobPosting") continue;
        const title = typeof ld.title === "string" ? ld.title.trim() : "";
        if (!title) continue;

        const address = (ld.jobLocation as { address?: Record<string, string> } | undefined)?.address;
        const city = address?.addressLocality?.trim() || "";
        const region = address?.addressRegion?.trim() || "";
        const location = [city, region].filter(Boolean).join(", ") || null;

        const rawType = typeof ld.employmentType === "string" ? ld.employmentType : "";
        const employmentType = EMPLOYMENT_TYPE_LABELS[rawType.toUpperCase()] ?? (rawType || null);

        const idObj = ld.identifier as { sameAs?: string } | undefined;
        const sourceId =
          (idObj?.sameAs && String(idObj.sameAs).trim()) ||
          url.match(/(\d+)\.html$/)?.[1] ||
          null;

        jobs.push({
          job_title: title,
          employer,
          employment_type: employmentType === "Other" ? null : employmentType,
          wage: normalizeWage(formatBaseSalary(ld.baseSalary)),
          location,
          posting_url: url,
          source_site: sourceName,
          source_id: sourceId,
        });
      } catch (e) {
        console.warn(`ApplicantPro fetch failed for ${url}: ${e}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return jobs;
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
    // Only the page-scrape sources need Firecrawl; API-based sources (Workday,
    // Oracle, ApplicantPro) keep working without it.
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") ?? "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }
    const sourceId = body?.source_id as string | undefined;
    // {"force": true} runs the full extraction even if the page looks unchanged.
    const force = body?.force === true;

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

    const results: Record<string, SourceResult> = {};

    for (const source of sources as ScrapeSource[]) {
      const sourceResult: SourceResult = { scraped: 0, errors: [] };
      results[source.name] = sourceResult;

      try {
        console.log(`Scraping: ${source.name} (${source.url})`);

        const cfg0 = (source.scrape_config ?? {}) as Record<string, unknown>;
        const apiType = typeof cfg0.api_type === "string" ? cfg0.api_type : null;
        // Special path: ApplicantPro-hosted career sites (e.g. Cayuga Health).
        // SPA listings page, but each job detail page carries schema.org JSON-LD.
        if (apiType === "applicantpro") {
          const employerName = typeof cfg0.employer === "string" ? cfg0.employer : source.name;
          const boardUrl = typeof cfg0.board_url === "string" ? cfg0.board_url : source.url;

          const apJobs = await fetchApplicantProJobs(
            boardUrl,
            employerName,
            source.name,
            sourceResult.errors,
          );
          console.log(`Found ${apJobs.length} jobs from ${source.name} via ApplicantPro`);

          // Only in-county (or remote) roles belong on this board.
          const apKept = apJobs.filter((j) => !isOutsideCounty(j.location));
          const apDropped = apJobs.length - apKept.length;
          if (apDropped > 0) {
            console.log(`Skipped ${apDropped} out-of-county jobs from ${source.name}`);
          }
          apJobs.length = 0;
          apJobs.push(...apKept);

          const apClassifications = classifyJobs(
            apJobs.map((j) => ({ job_title: j.job_title, employer: j.employer })),
          );
          for (let i = 0; i < apJobs.length; i++) {
            apJobs[i].job_category = apClassifications[i] || null;
          }

          for (const job of apJobs) {
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
                  ...(job.wage ? { wage: job.wage } : {}),
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
            sourceResult.scraped++;
          }

          // Sitemap is authoritative: anything not listed is gone.
          const apSeen = apJobs.map((j) => j.source_id).filter(Boolean) as string[];
          if (apSeen.length > 0) {
            await supabase
              .from("employment_opportunities")
              .update({ active: false })
              .eq("source_site", source.name)
              .eq("is_manual", false)
              .eq("active", true)
              .not("source_id", "in", `(${apSeen.map((s) => `"${s}"`).join(",")})`);
          }

          await supabase
            .from("scrape_sources")
            .update({ last_scraped_at: new Date().toISOString() })
            .eq("id", source.id);

          continue;
        }

        // Special path: Workday career sites (e.g. Cornell) — public JSON API.
        if (apiType === "workday") {
          await scrapeWorkdaySource(supabase, source, sourceResult);
          await supabase
            .from("scrape_sources")
            .update({ last_scraped_at: new Date().toISOString() })
            .eq("id", source.id);
          continue;
        }

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

          const oracleKept = oracleJobs.filter((j) => !isOutsideCounty(j.location));
          const oracleDropped = oracleJobs.length - oracleKept.length;
          if (oracleDropped > 0) {
            console.log(`Skipped ${oracleDropped} out-of-county jobs from ${source.name}`);
          }
          oracleJobs.length = 0;
          oracleJobs.push(...oracleKept);

          // Classify
          const classifications = classifyJobs(
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
                  // The listing API never has pay; keep any wage found earlier.
                  ...(job.wage ? { wage: job.wage } : {}),
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

          await fillOracleWages(supabase, source, apiBase, siteNumber);

          await supabase
            .from("scrape_sources")
            .update({ last_scraped_at: new Date().toISOString() })
            .eq("id", source.id);

          continue;
        }

        // ── Page scrape via Firecrawl AI extraction (5 credits) ──
        if (!FIRECRAWL_API_KEY) {
          sourceResult.errors.push("FIRECRAWL_API_KEY is not configured");
          continue;
        }

        // Check whether the page changed since the last full scrape: free
        // when the page loads with a plain request, otherwise 1 credit.
        const runStartedAt = new Date().toISOString();
        const fingerprint =
          (await fingerprintViaPlainFetch(source.url)) ??
          (await fingerprintWithFirecrawl(source.url, FIRECRAWL_API_KEY));
        const lastFullMs = source.last_full_scrape_at ? Date.parse(source.last_full_scrape_at) : 0;
        const fullScrapeDue = Date.now() - lastFullMs > FULL_SCRAPE_MAX_AGE_MS;
        if (
          !force && !fullScrapeDue && fingerprint &&
          fingerprint === source.content_fingerprint && source.last_full_scrape_at
        ) {
          // Unchanged: the jobs seen in the last full scrape are still listed,
          // so mark them as seen today (this keeps the 7-day stale rule below
          // from retiring them) and skip the paid extraction.
          await supabase
            .from("employment_opportunities")
            .update({ updated_at: runStartedAt })
            .eq("source_site", source.name)
            .eq("is_manual", false)
            .eq("active", true)
            .gte("updated_at", source.last_full_scrape_at);
          await supabase
            .from("scrape_sources")
            .update({ last_scraped_at: runStartedAt })
            .eq("id", source.id);
          sourceResult.unchanged = true;
          console.log(`${source.name}: page unchanged since last full scrape; skipped AI extraction`);
          triggerWageEnrichment(supabaseUrl, supabaseServiceKey, source.name);
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
              wage: normalizeWage(job.wage),
              location: job.location?.trim() || null,
              posting_url: postingUrl,
              source_site: source.name,
              source_id: job.source_id?.toString() || null,
            });
          }
        }

        console.log(`Found ${jobs.length} jobs from ${source.name}`);

        const keptJobs = jobs.filter((j) => !isOutsideCounty(j.location));
        const droppedJobs = jobs.length - keptJobs.length;
        if (droppedJobs > 0) {
          console.log(`Skipped ${droppedJobs} out-of-county jobs from ${source.name}`);
        }
        jobs.length = 0;
        jobs.push(...keptJobs);

        // AI classify all jobs from this source in one batch
        const classifications = classifyJobs(
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
                  // Never wipe an existing wage (possibly filled by the
                  // enrichment job) with a missing scrape value.
                  ...(job.wage ? { wage: job.wage } : {}),
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
                  ...(job.wage ? { wage: job.wage } : {}),
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

        // Wage enrichment runs as a separate edge function call so the
        // detail-page scrapes don't block this function's time budget. It
        // picks up active jobs from this source that still have no wage.
        triggerWageEnrichment(supabaseUrl, supabaseServiceKey, source.name);

        // Remember what the page looked like, so tomorrow's run can skip the
        // paid extraction if nothing changed. Only after a scrape that found
        // jobs; an empty result is retried in full next time.
        await supabase
          .from("scrape_sources")
          .update({
            last_scraped_at: new Date().toISOString(),
            ...(jobs.length > 0
              ? { content_fingerprint: fingerprint, last_full_scrape_at: runStartedAt }
              : {}),
          })
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
