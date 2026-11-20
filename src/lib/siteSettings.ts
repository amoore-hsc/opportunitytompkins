/**
 * Contact details and outside links shown in the header strip, the homepage
 * popup and the SNAP screener results.
 *
 * Values come from the public, read-only `site_settings` table in Supabase so
 * the owner can change a phone number without a code deploy. The same values
 * ship in code (site config) as defaults: if Supabase is slow or unreachable,
 * or a row is missing or malformed, the default is shown instead. The contact
 * strip is never blank.
 *
 * This module only ever READS from Supabase. Nothing a visitor types or
 * clicks is written anywhere.
 */

import { siteConfig, type SiteConfig } from "@/config";

export interface ContactSetting {
  label: string;
  phone: string;
  url: string;
}

export interface SiteSettings {
  /** SNAP questions: county DSS */
  snapContact: ContactSetting;
  /** Medicaid questions: never DSS */
  medicaidContact: ContactSetting;
  /** NY State of Health phone for work-requirement questions */
  nysohPhone: ContactSetting;
  /** NY State of Health Medicaid work requirements tool */
  medicaidTool: ContactSetting;
  /** NYDocSubmit information page */
  nyDocSubmit: ContactSetting;
  /** NYS myBenefits (apply for SNAP) */
  myBenefits: ContactSetting;
}

/** Row keys in the `site_settings` table, mapped to the fields above. */
export const SETTING_KEYS = {
  snap_contact: "snapContact",
  medicaid_contact: "medicaidContact",
  nysoh_phone: "nysohPhone",
  medicaid_tool: "medicaidTool",
  nydocsubmit_info: "nyDocSubmit",
  mybenefits: "myBenefits",
} as const satisfies Record<string, keyof SiteSettings>;

export type SettingKey = keyof typeof SETTING_KEYS;

export interface SiteSettingRow {
  key: string;
  label: string | null;
  phone: string | null;
  url: string | null;
}

export function defaultSiteSettings(config: SiteConfig = siteConfig): SiteSettings {
  return {
    snapContact: { label: config.dssName, phone: config.dssPhone, url: config.dssUrl },
    medicaidContact: {
      label: config.medicaidContactName,
      phone: config.medicaidContactPhone,
      url: config.medicaidContactUrl,
    },
    nysohPhone: { label: "NY State of Health", phone: config.nysohPhone, url: "" },
    medicaidTool: { label: "NY State of Health tool", phone: "", url: config.medicaidToolUrl },
    nyDocSubmit: { label: "NYDocSubmit information", phone: "", url: config.nyDocSubmitUrl },
    myBenefits: { label: "NYS myBenefits", phone: "", url: config.snapApplyUrl },
  };
}

const MAX_TEXT = 200;

const cleanText = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TEXT) return null;
  return trimmed;
};

const cleanUrl = (value: string | null | undefined): string | null => {
  const text = cleanText(value);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
};

/**
 * Overlays Supabase rows on the defaults, field by field. A blank, overlong
 * or non-https value keeps the default, so one bad edit can't blank the strip.
 */
export function mergeSiteSettings(
  defaults: SiteSettings,
  rows: SiteSettingRow[] | null | undefined,
): SiteSettings {
  const merged: SiteSettings = structuredClone(defaults);
  for (const row of rows ?? []) {
    const field = SETTING_KEYS[row.key as SettingKey];
    if (!field) continue;
    const target = merged[field];
    target.label = cleanText(row.label) ?? target.label;
    target.phone = cleanText(row.phone) ?? target.phone;
    target.url = cleanUrl(row.url) ?? target.url;
  }
  return merged;
}

/** Turns "(607) 274-5680" or "1-855-355-5777" into a tel: href. */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}
