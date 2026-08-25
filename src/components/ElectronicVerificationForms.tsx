import { Button } from "@/components/ui/button";
import { Briefcase, GraduationCap, Stethoscope, Search, Heart, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { VisuallyHidden } from "@/components/VisuallyHidden";
import { siteConfig, type VerificationForm } from "@/config";

const ICON_MAP: Record<VerificationForm["icon"], LucideIcon> = {
  Briefcase,
  GraduationCap,
  Stethoscope,
  Search,
  Heart,
  Send,
};

// First form = "primary submit" action (full-width, success variant).
// Forms before it = two-column row. Remaining forms = three-column row.
export const ElectronicVerificationForms = () => {
  const forms = siteConfig.verificationForms;
  if (!forms.length) return null;

  const submitForm = forms[forms.length - 1]; // last entry is the NYDocSubmit-style action
  const row1 = forms.slice(0, 2);
  const row2 = forms.slice(2, forms.length - 1);

  const FormButton = ({ form, full = false }: { form: VerificationForm; full?: boolean }) => {
    const Icon = ICON_MAP[form.icon];
    return (
      <a href={form.url} target="_blank" rel="noopener noreferrer" className={full ? "w-full" : "h-full"}>
        <Button
          variant={full ? "success" : "default"}
          className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center"
          size="lg"
        >
          <Icon className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
          {form.label}
          <VisuallyHidden>(opens in new tab)</VisuallyHidden>
        </Button>
      </a>
    );
  };

  return (
    <div className="mt-16 rounded-xl bg-card border border-border p-8">
      <h3 className="mb-2 text-2xl font-semibold text-foreground text-center">Electronic Forms</h3>
      <p className="mb-8 text-center text-muted-foreground">
        Forms can be completed electronically or printed and sent to DSS
      </p>

      {row1.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 items-stretch">
          {row1.map((form) => (
            <FormButton key={form.label} form={form} />
          ))}
        </div>
      )}

      {row2.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch mt-6">
          {row2.map((form) => (
            <FormButton key={form.label} form={form} />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center mt-6 gap-2">
        <FormButton form={submitForm} full />
      </div>
    </div>
  );
};
