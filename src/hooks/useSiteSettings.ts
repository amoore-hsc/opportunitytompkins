import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultSiteSettings,
  mergeSiteSettings,
  SETTING_KEYS,
  type SiteSettingRow,
  type SiteSettings,
} from "@/lib/siteSettings";

/** Give up on Supabase after this long and keep showing the defaults. */
const FETCH_TIMEOUT_MS = 3000;

const DEFAULTS = defaultSiteSettings();

async function fetchSiteSettings(): Promise<SiteSettings> {
  const request = supabase
    .from("site_settings")
    .select("key,label,phone,url")
    .in("key", Object.keys(SETTING_KEYS))
    .abortSignal(AbortSignal.timeout(FETCH_TIMEOUT_MS));

  const { data, error } = await request;
  if (error) throw error;
  return mergeSiteSettings(DEFAULTS, data satisfies SiteSettingRow[]);
}

/**
 * Contact details and outside links. Renders the code defaults immediately,
 * then swaps in the Supabase values once (fetched once per page load and
 * shared by every component). On any error the defaults stay.
 */
export function useSiteSettings(): SiteSettings {
  const { data } = useQuery({
    queryKey: ["site_settings"],
    queryFn: fetchSiteSettings,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return data ?? DEFAULTS;
}
