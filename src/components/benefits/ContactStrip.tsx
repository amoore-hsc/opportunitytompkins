import { useSiteSettings } from "@/hooks/useSiteSettings";
import { telHref } from "@/lib/siteSettings";

/**
 * Site-wide navy strip: who to call about SNAP (DSS) and about Medicaid
 * (Human Services Coalition). Values come from Supabase with code defaults,
 * so the strip is never blank.
 */
export const ContactStrip = () => {
  const { snapContact, medicaidContact } = useSiteSettings();

  return (
    <aside aria-label="Who to contact with questions" className="bg-primary px-4 py-2 text-sm text-primary-foreground">
      <ul className="container mx-auto flex flex-wrap justify-center gap-x-8 gap-y-1 text-center">
        <li>
          <strong>SNAP questions:</strong> {snapContact.label}{" "}
          <a href={telHref(snapContact.phone)} className="whitespace-nowrap hover:underline">
            {snapContact.phone}
          </a>
        </li>
        <li>
          <strong>Medicaid questions:</strong>{" "}
          <a href={medicaidContact.url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap underline hover:no-underline">
            {medicaidContact.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          <a href={telHref(medicaidContact.phone)} className="whitespace-nowrap hover:underline">
            {medicaidContact.phone}
          </a>
        </li>
      </ul>
    </aside>
  );
};
