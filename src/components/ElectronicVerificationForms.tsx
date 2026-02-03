import { Button } from "@/components/ui/button";
import { Briefcase, GraduationCap, Stethoscope, Search, Heart, Send } from "lucide-react";
import { VisuallyHidden } from "@/components/VisuallyHidden";

export const ElectronicVerificationForms = () => {
  return (
    <div className="mt-16 rounded-xl bg-card border border-border p-8">
      <h3 className="mb-8 text-2xl font-semibold text-foreground text-center">Electronic Forms</h3>
      
      {/* Row 1 */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        <a 
          href="https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:ae18dfb4-4586-4ba4-a26d-1fb6e34f3b15" 
          target="_blank"
          rel="noopener noreferrer" 
          className="h-full"
        >
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Briefcase className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Volunteer Work Experience Verification Form
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
        <a 
          href="https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:babb6df6-e4f0-41cc-8fcb-ef2fa685a6a9" 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-full"
        >
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <GraduationCap className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Training/ Educational Program Verification Form
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
      </div>
      
      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch mt-6">
        <a 
          href="https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:8805a8c0-45ae-4b41-923f-7ce1259fcc67" 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-full"
        >
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Stethoscope className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            ABAWD Medical Statement
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
        <a 
          href="https://docs.google.com/document/d/1__P8F3DkuJWpo-C4206thP1Ix3JyitZY/edit" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="h-full"
        >
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Search className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Monthly WIOA Job Search Activity Record
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
        <a 
          href="https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:8fe26071-4bad-49e1-aaea-71184206bdca"
          target="_blank" 
          rel="noopener noreferrer" 
          className="h-full"
        >
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Heart className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Caregiver Verification
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
      </div>
      
      {/* Row 4 - Submit */}
      <div className="flex flex-col items-center mt-6 gap-2">
        <a 
          href="https://otda.ny.gov/programs/nydocsubmit" 
          target="_blank"
          rel="noopener noreferrer" 
          className="w-full"
        >
          <Button variant="success" className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Send className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Submit Documentation to DSS via NYDocSubmit
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
        <p className="text-sm text-muted-foreground text-center">
          If the link doesn't open, right-click the button and select "Open link in new tab"
        </p>
      </div>
    </div>
  );
};
