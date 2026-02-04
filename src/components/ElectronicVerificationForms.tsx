import { Button } from "@/components/ui/button";
import { Briefcase, GraduationCap, Stethoscope, Search, Heart, Send } from "lucide-react";
import { VisuallyHidden } from "@/components/VisuallyHidden";
export const ElectronicVerificationForms = () => {
  return <div className="mt-16 rounded-xl bg-card border border-border p-8">
      <h3 className="mb-8 text-2xl font-semibold text-foreground text-center">Electronic Forms</h3>
      
      {/* Row 1 */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        <a href="https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:e0afda57-43d9-4689-a17f-c67cbfd932ee" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Briefcase className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Volunteer Work Experience Verification Form
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
        <a href="https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:4ac824f4-0900-46e6-8b1f-64f38bb7e621" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <GraduationCap className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Training/ Educational Program Verification Form
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
      </div>
      
      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch mt-6">
        <a href="https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:700e7380-20bf-4309-9061-51a05eef9eaf" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Stethoscope className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            ABAWD Medical Statement
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
        <a href="https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:24e801ef-9093-4b49-aba4-2eb8a4453126" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Search className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Monthly WIOA Job Search Activity Record
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
        <a href="https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:8fe26071-4bad-49e1-aaea-71184206bdca" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Heart className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Caregiver Verification
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
      </div>
      
      {/* Row 4 - Submit */}
      <div className="flex flex-col items-center mt-6 gap-2">
        <a href="https://otda.ny.gov/programs/nydocsubmit" target="_blank" rel="noopener noreferrer" className="w-full">
          <Button variant="success" className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Send className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
            Submit Documentation to DSS via NYDocSubmit
            <VisuallyHidden>(opens in new tab)</VisuallyHidden>
          </Button>
        </a>
        
      </div>
    </div>;
};