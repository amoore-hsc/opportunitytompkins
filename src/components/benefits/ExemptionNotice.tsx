import { Link } from "react-router-dom";
import { siteConfig } from "@/config";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const linkClass = "font-semibold text-primary underline hover:no-underline";

/**
 * Slim notice under the contact strip on listing pages: links to the SNAP
 * screener (or the old Google Form until the flag is on) and the Medicaid tool.
 */
export const ExemptionNotice = () => {
  const { medicaidTool } = useSiteSettings();

  return (
    <aside aria-label="Exemption check" className="border-b border-border bg-muted px-4 py-3 text-center text-foreground">
      <span className="font-medium">You may be exempt from new work requirements.</span>{" "}
      <span className="inline-block">
        {siteConfig.snapScreenerEnabled ? (
          <Link to="/snap-screener" className={linkClass}>
            Check SNAP work requirements
          </Link>
        ) : (
          <a href={siteConfig.exemptionFormUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Check SNAP work requirements
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
        <span aria-hidden="true"> · </span>
        <a href={medicaidTool.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Check the Medicaid work rule
          <span className="sr-only"> (opens the NY State of Health tool in a new tab)</span>
        </a>
      </span>
    </aside>
  );
};
