import { describe, expect, it } from "vitest";
import { defaultSiteSettings, mergeSiteSettings, telHref } from "@/lib/siteSettings";
import { localConfig } from "@/config/site.config.local";

const defaults = defaultSiteSettings(localConfig);

describe("site settings fallback", () => {
  it("ships Tompkins contact defaults in code", () => {
    expect(defaults.snapContact).toEqual({
      label: "Tompkins County DSS",
      phone: "(607) 274-5680",
      url: "https://www.tompkinscountyny.gov/All-Departments/Social-Services",
    });
    expect(defaults.medicaidContact).toEqual({
      label: "Human Services Coalition",
      phone: "(607) 211-8667",
      url: "https://hsctc.org/stayinsured/",
    });
    expect(defaults.nysohPhone.phone).toBe("1-855-355-5777");
    expect(defaults.medicaidTool.url).toBe("https://info.nystateofhealth.ny.gov/medicaid-requirements-tool");
  });

  it("uses defaults when Supabase returns nothing (unreachable or empty)", () => {
    expect(mergeSiteSettings(defaults, null)).toEqual(defaults);
    expect(mergeSiteSettings(defaults, [])).toEqual(defaults);
  });

  it("applies valid Supabase values", () => {
    const merged = mergeSiteSettings(defaults, [
      { key: "snap_contact", label: "County DSS", phone: "(607) 555-0100", url: "https://example.gov/dss" },
    ]);
    expect(merged.snapContact).toEqual({ label: "County DSS", phone: "(607) 555-0100", url: "https://example.gov/dss" });
    expect(merged.medicaidContact).toEqual(defaults.medicaidContact);
  });

  it("keeps defaults for blank, non-https or unknown values", () => {
    const merged = mergeSiteSettings(defaults, [
      { key: "medicaid_contact", label: "  ", phone: null, url: "javascript:alert(1)" },
      { key: "medicaid_tool", label: null, phone: null, url: "http://insecure.example" },
      { key: "something_else", label: "x", phone: "1", url: "https://x.example" },
    ]);
    expect(merged.medicaidContact).toEqual(defaults.medicaidContact);
    expect(merged.medicaidTool).toEqual(defaults.medicaidTool);
  });

  it("does not modify the defaults object", () => {
    const before = structuredClone(defaults);
    mergeSiteSettings(defaults, [{ key: "snap_contact", label: "Changed", phone: "1", url: null }]);
    expect(defaults).toEqual(before);
  });

  it("builds tel: links", () => {
    expect(telHref("(607) 274-5680")).toBe("tel:6072745680");
    expect(telHref("1-855-355-5777")).toBe("tel:18553555777");
  });

  it("still finds the existing medical and caregiver forms", () => {
    const ids = localConfig.verificationForms.map((f) => f.id);
    expect(ids).toContain("abawd_medical");
    expect(ids).toContain("caregiver");
  });
});
