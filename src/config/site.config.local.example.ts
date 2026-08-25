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

  siteName: "Tompkins Opportunity",
  countyName: "Tompkins County",
  stateName: "New York",

  dssName: "Tompkins County DSS",
  dssUrl: "https://www.tompkinscountyny.gov/All-Departments/Social-Services",
  dssPhone: "(607) 274-5680",

  exemptionFormUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSfXDths0eQwRcWRMrqVdjjhILjLpi5qz7lMyn27VyhdKTt6nw/viewform",

  fromEmail: "hello@tompkins-opportunity.org",
  fromName: "Tompkins Opportunity",

  supportEmail: "support@example.gov",

  // ...override verificationForms, careerCenter, trainingAndEducation,
  // jobSearchLinks, logos, countyPlaces, outOfCountyBlocklist as needed.
};
