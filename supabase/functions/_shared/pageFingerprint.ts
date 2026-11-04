// Cheap "has this job page changed?" check.
//
// Reading a page with Firecrawl's AI extraction costs 5 credits. Most days a
// job board hasn't changed, so scrape-jobs first fetches it with a plain
// request (free) and compares a fingerprint of its visible text and links with
// the one saved after the last full scrape. Only a changed page gets the paid
// extraction.

const UA = "Mozilla/5.0 (compatible; OpportunityBoardBot/1.0)";

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Fingerprint of an HTML page's links + visible text (scripts/styles removed). */
export async function fingerprintHtml(html: string): Promise<string | null> {
  const links = Array.from(
    html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"'#][^"']*)["']/gi),
    (m) => m[1].trim(),
  );
  const text = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // A page with almost no text is a JavaScript shell; we can't tell if it changed.
  if (text.length < 200) return null;
  return "html:" + await sha256([...new Set(links)].sort().join("\n") + "\n" + text);
}

/**
 * Free fingerprint via a plain HTTP request. Returns null when the page can't
 * be read this way (blocked, TLS error, JavaScript-only), so the caller can
 * fall back to `fingerprintWithFirecrawl`.
 */
export async function fingerprintViaPlainFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return await fingerprintHtml(await res.text());
  } catch (e) {
    console.warn(`Plain fetch failed for ${url}: ${e}`);
    return null;
  }
}

/** 1-credit fingerprint: Firecrawl markdown only (no AI extraction). */
export async function fingerprintWithFirecrawl(url: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const md = String(body?.data?.markdown ?? body?.markdown ?? "").replace(/\s+/g, " ").trim();
    if (md.length < 200) return null;
    return "md:" + await sha256(md);
  } catch (e) {
    console.warn(`Firecrawl fingerprint failed for ${url}: ${e}`);
    return null;
  }
}
