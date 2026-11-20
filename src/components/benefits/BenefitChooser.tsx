import { useId } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

interface BenefitChooserProps {
  /** "band": side by side on the homepage. "popup": stacked in the dialog. */
  layout: "band" | "popup";
  /** Called when the visitor picks the on-site SNAP screener (e.g. to close the popup). */
  onSnapNavigate?: () => void;
}

const buttonClass = "h-auto min-h-12 w-full whitespace-normal py-3 text-base";

/**
 * The two "check work requirements" buttons: SNAP (on this site, or the old
 * Google Form until the screener flag is on) and Medicaid (NY State of
 * Health tool in a new tab). There is deliberately no "not sure" option.
 */
export const BenefitChooser = ({ layout, onSnapNavigate }: BenefitChooserProps) => {
  const { medicaidTool } = useSiteSettings();
  const snapHelpId = useId();
  const medicaidHelpId = useId();
  const popup = layout === "popup";

  const snapLabel = popup ? "SNAP Work Requirements" : "SNAP work requirements";
  const medicaidLabel = popup ? "Medicaid Work Requirements" : "Medicaid work rule";

  return (
    <div className={cn("grid gap-4", !popup && "sm:grid-cols-2 sm:gap-6")}>
      <div className="flex flex-col gap-2">
        {siteConfig.snapScreenerEnabled ? (
          <Button asChild size="lg" className={buttonClass}>
            <Link to="/snap-screener" aria-describedby={snapHelpId} onClick={onSnapNavigate}>
              {snapLabel}
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" className={buttonClass}>
            <a href={siteConfig.exemptionFormUrl} target="_blank" rel="noopener noreferrer" aria-describedby={snapHelpId}>
              {snapLabel}
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        )}
        <p id={snapHelpId} className="text-sm text-muted-foreground">
          {siteConfig.snapScreenerEnabled ? "Answer a few questions on this site" : "Opens the SNAP screener in a new tab"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          asChild
          size="lg"
          className={cn(buttonClass, "bg-highlight text-highlight-foreground hover:bg-highlight hover:brightness-90")}
        >
          <a href={medicaidTool.url} target="_blank" rel="noopener noreferrer" aria-describedby={medicaidHelpId}>
            {medicaidLabel}
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
        <p id={medicaidHelpId} className="text-sm text-muted-foreground">
          Opens the NY State of Health tool in a new tab
        </p>
      </div>
    </div>
  );
};
