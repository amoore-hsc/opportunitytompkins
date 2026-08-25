/**
 * Resolves the active site configuration.
 *
 * If `site.config.local.ts` exists (gitignored), its values override the
 * neutral defaults from `site.config.ts`. In the public template repo, only
 * the defaults are present. In the live deployment, the local override
 * provides the real county/organization values.
 */

import { defaultConfig, type SiteConfig } from "./site.config";

// import.meta.glob lets Vite include the local override only if the file
// physically exists. In the template repo it won't, so we fall back to
// the neutral defaults. This keeps the build clean for forks.
const localModules = import.meta.glob("./site.config.local.ts", { eager: true }) as Record<
  string,
  { localConfig: SiteConfig } | undefined
>;

const localKey = "./site.config.local.ts";
const localOverride = localModules[localKey]?.localConfig;

export const siteConfig: SiteConfig = localOverride
  ? { ...defaultConfig, ...localOverride }
  : defaultConfig;

export type { SiteConfig } from "./site.config";
