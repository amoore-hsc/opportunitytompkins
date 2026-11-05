// Keeps Firecrawl usage inside the free plan (1,000 credits/month).
//
// The daily job-board scrapes are the priority. Optional work (wage lookups,
// re-checking user-submitted jobs) only spends credits that are left over
// after reserving enough for the main scrapes for the rest of the period.

/** Credits for one Firecrawl scrape that uses AI (JSON) extraction: 1 + 4. */
export const CREDITS_PER_JSON_SCRAPE = 5;

/**
 * Worst-case credits the main daily scrapes need per day: three sources that
 * are checked for free but may need a 5-credit extraction, plus one source
 * checked with a 1-credit Firecrawl read (+5 if it changed) = 21, rounded up.
 */
const DAILY_MAIN_SCRAPE_RESERVE = 25;

/** Credits optional work may use when the balance can't be read. */
const UNKNOWN_BALANCE_ALLOWANCE = 10;

interface CreditUsage {
  remaining: number;
  periodEnd: Date | null;
}

export async function getFirecrawlCredits(apiKey: string): Promise<CreditUsage | null> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/team/credit-usage", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const d = body?.data ?? {};
    const remaining = Number(d.remainingCredits ?? d.remaining_credits);
    if (!Number.isFinite(remaining)) return null;
    const endRaw = d.billingPeriodEnd ?? d.billing_period_end;
    const end = endRaw ? new Date(endRaw) : null;
    return { remaining, periodEnd: end && !isNaN(end.getTime()) ? end : null };
  } catch {
    return null;
  }
}

/**
 * How many credits optional work may spend right now. Reserves
 * DAILY_MAIN_SCRAPE_RESERVE credits for every day left in the billing period
 * (the end of the calendar month when Firecrawl doesn't report one, as on the
 * free plan).
 */
export async function optionalCreditAllowance(apiKey: string): Promise<number> {
  const usage = await getFirecrawlCredits(apiKey);
  if (!usage) {
    console.warn("Could not read Firecrawl credit balance; using a small allowance.");
    return UNKNOWN_BALANCE_ALLOWANCE;
  }

  const now = new Date();
  const end = usage.periodEnd && usage.periodEnd > now
    ? usage.periodEnd
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
  const allowance = Math.max(0, usage.remaining - daysLeft * DAILY_MAIN_SCRAPE_RESERVE);
  console.log(
    `Firecrawl credits: ${usage.remaining} left, ${daysLeft} day(s) in period, ${allowance} available for optional work`,
  );
  return allowance;
}
