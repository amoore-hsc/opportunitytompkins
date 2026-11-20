import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { telHref } from "@/lib/siteSettings";

/**
 * Medicaid link-out card shown beside every SNAP screener result.
 * Medicaid questions go to the Medicaid contact (Human Services Coalition)
 * and NY State of Health only. This card must never mention DSS.
 */
export const MedicaidCard = () => {
  const { medicaidContact, medicaidTool, nysohPhone } = useSiteSettings();

  return (
    <section aria-labelledby="medicaid-card-heading" className="rounded-xl border-2 border-highlight bg-card p-6 sm:p-8">
      <h2 id="medicaid-card-heading" className="mb-3 text-2xl font-bold text-foreground">
        Check Medicaid work requirements here
      </h2>
      <p className="mb-6 text-lg text-muted-foreground">
        The Medicaid work rule starts January 1, 2027. Use the screener from NY State of Health to determine if work
        requirements apply to you.
      </p>
      <Button
        asChild
        size="lg"
        className="h-auto min-h-12 w-full whitespace-normal bg-highlight py-3 text-base text-highlight-foreground hover:bg-highlight hover:brightness-90"
      >
        <a href={medicaidTool.url} target="_blank" rel="noopener noreferrer">
          Open the NY State of Health tool
          <ExternalLink aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </Button>
      <p className="mt-4 text-muted-foreground">
        Questions?{" "}
        <a
          href={medicaidContact.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-highlight underline hover:no-underline"
        >
          {medicaidContact.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        :{" "}
        <a href={telHref(medicaidContact.phone)} className="whitespace-nowrap hover:underline">
          {medicaidContact.phone}
        </a>
        <br />
        <span className="whitespace-nowrap">
          {nysohPhone.label}:{" "}
          <a href={telHref(nysohPhone.phone)} className="hover:underline">
            {nysohPhone.phone}
          </a>
        </span>
      </p>
    </section>
  );
};
