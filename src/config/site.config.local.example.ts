/**
 * Example local override — copy this to `site.config.local.ts` and fill in
 * your county/organization values. `site.config.local.ts` is gitignored.
 *
 * Usage in app code:
 *   import { siteConfig } from "@/config";
 *   console.log(siteConfig.siteName);
 */

import { defaultConfig, type SiteConfig } from "./site.config";

export const localConfig: SiteConfig = {
  ...defaultConfig,

  siteName: "Your County Opportunity",
  countyName: "Your County",
  stateName: "Your State",

  dssName: "Your County DSS",
  dssUrl: "https://your-county.gov/social-services",
  dssPhone: "(000) 000-0000",

  exemptionFormUrl: "https://forms.example.com/exemption-check",

  fromEmail: "hello@your-site.org",
  fromName: "Your County Opportunity",

  supportEmail: "support@your-site.org",

  // ...override verificationForms, careerCenter, trainingAndEducation,
  // jobSearchLinks, logos, countyPlaces, outOfCountyBlocklist as needed.
};
