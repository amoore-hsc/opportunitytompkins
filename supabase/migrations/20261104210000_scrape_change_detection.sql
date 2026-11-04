-- Change detection for Firecrawl page scrapes: scrape-jobs skips the paid AI
-- extraction when a listings page is unchanged since the last full scrape.
ALTER TABLE public.scrape_sources
  ADD COLUMN IF NOT EXISTS content_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS last_full_scrape_at TIMESTAMPTZ;
