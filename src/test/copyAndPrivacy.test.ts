/**
 * Grep-style guards on the source code:
 * - Medicaid copy never sends people to DSS.
 * - SNAP copy never sends people to the Medicaid contact for SNAP questions.
 * - No "I don't know" / "Not sure" options.
 * - The screener has no way to save or send answers.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { localConfig } from "@/config/site.config.local";

const root = path.resolve(__dirname, "..");
/** Source with comments removed, so explanatory comments don't trip the checks. */
const read = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:"'])\/\/.*$/gm, "$1");

const sourceFiles = (dir: string): string[] =>
  readdirSync(path.join(root, dir)).flatMap((name) => {
    const rel = path.join(dir, name);
    if (statSync(path.join(root, rel)).isDirectory()) return rel.includes("test") ? [] : sourceFiles(rel);
    return /\.(tsx?|json)$/.test(name) ? [rel] : [];
  });

const DSS = /\bDSS\b|Social Services|tompkinscountyny|dssPhone|dssUrl|dssName|snapContact/i;
const MEDICAID_CONTACT = /Human Services Coalition|hsctc|medicaidContact/i;

describe("Medicaid copy never mentions DSS", () => {
  it("Medicaid card", () => {
    expect(read("components/benefits/MedicaidCard.tsx")).not.toMatch(DSS);
  });

  it("Medicaid contact settings", () => {
    for (const value of [localConfig.medicaidContactName, localConfig.medicaidContactUrl, localConfig.medicaidToolUrl]) {
      expect(value).not.toMatch(DSS);
    }
  });

  it("Medicaid line of the header strip", () => {
    const strip = read("components/benefits/ContactStrip.tsx");
    const medicaidLine = strip.slice(strip.indexOf("Medicaid questions:"));
    expect(medicaidLine).not.toMatch(DSS);
  });

  it("Medicaid line of the homepage popup", () => {
    const index = read("pages/Index.tsx");
    const medicaidLine = index.slice(index.indexOf("Medicaid questions?"), index.indexOf("</DialogContent>"));
    expect(medicaidLine).not.toMatch(DSS);
  });
});

describe("SNAP copy never sends SNAP questions to the Medicaid contact", () => {
  it("SNAP screener page (Medicaid card is a separate component)", () => {
    expect(read("pages/SnapScreener.tsx")).not.toMatch(MEDICAID_CONTACT);
  });

  it("SNAP line of the header strip", () => {
    const strip = read("components/benefits/ContactStrip.tsx");
    const snapLine = strip.slice(strip.indexOf("SNAP questions:"), strip.indexOf("Medicaid questions:"));
    expect(snapLine).not.toMatch(MEDICAID_CONTACT);
  });

  it("SNAP line of the homepage popup", () => {
    const index = read("pages/Index.tsx");
    const snapLine = index.slice(index.indexOf("SNAP questions?"), index.indexOf("Medicaid questions?"));
    expect(snapLine).not.toMatch(MEDICAID_CONTACT);
  });
});

describe("No 'I don't know' or 'Not sure' options", () => {
  it.each(["pages/Index.tsx", "pages/SnapScreener.tsx", "components/benefits/BenefitChooser.tsx", "config/snapScreener.ts"])(
    "%s",
    (file) => {
      expect(read(file)).not.toMatch(/I don['’]t know|not sure|I['’]m not sure/i);
    },
  );
});

describe("Screener cannot store or send answers", () => {
  const screenerFiles = [
    "pages/SnapScreener.tsx",
    "lib/snapScreener.ts",
    "config/snapScreener.ts",
    "components/benefits/MedicaidCard.tsx",
  ];

  it.each(screenerFiles)("%s has no storage, network, logging or URL state", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
    expect(src).not.toMatch(/supabase|fetch\(|XMLHttpRequest|sendBeacon/);
    expect(src).not.toMatch(/console\.|reportClientError/);
    expect(src).not.toMatch(/useSearchParams|navigate\(|history\.(push|replace)State|location\.(hash|search)/);
    expect(src).not.toMatch(/gtag|dataLayer|analytics/i);
  });

  it("the only Supabase call for this feature is a read of site_settings", () => {
    const hook = read("hooks/useSiteSettings.ts");
    expect(hook).toMatch(/\.from\("site_settings"\)\s*\.select\(/);
    expect(hook).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
  });

  it("no source file writes to site_settings", () => {
    for (const file of sourceFiles(".")) {
      const src = read(file);
      if (!src.includes("site_settings")) continue;
      expect(src, file).not.toMatch(/from\("site_settings"\)\s*\.(insert|update|upsert|delete)/);
    }
  });
});
