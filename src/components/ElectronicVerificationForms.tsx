import { Button } from "@/components/ui/button";
import { FileCheck, ClipboardCheck, Stethoscope, Search } from "lucide-react";
export const ElectronicVerificationForms = () => {
  return <div className="mt-16 rounded-xl bg-card border border-border p-8">
      <h3 className="mb-8 text-2xl font-semibold text-foreground text-center">
        Send Forms Electronically
      </h3>
      <div className="grid gap-6 md:grid-cols-5 items-stretch">
        <a href="https://hipaa.jotform.com/sign/253434861321049/invite/01kc4jf96z3caf7c048e46ea9f" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <FileCheck className="mr-2 h-5 w-5 shrink-0" />
            Volunteer Work Experience Verification Form
          </Button>
        </a>
        <a href="https://hipaa.jotform.com/sign/253434861321049/invite/01kc4jf96z3caf7c048e46ea9f" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <ClipboardCheck className="mr-2 h-5 w-5 shrink-0" />
            Training/ Educational Program Verification Form
          </Button>
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Stethoscope className="mr-2 h-5 w-5 shrink-0" />
            ABAWD Medical Statement
          </Button>
        </a>
        <a href="https://docs.google.com/document/d/1__P8F3DkuJWpo-C4206thP1Ix3JyitZY/edit" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <Search className="mr-2 h-5 w-5 shrink-0" />
            Monthly WIOA Job Search Activity Record
          </Button>
        </a>
        <a href="https://otda.ny.gov/programs/nydocsubmit/" target="_blank" rel="noopener noreferrer" className="h-full">
          <Button className="w-full text-base h-full py-4 px-6 whitespace-normal text-center flex items-center justify-center" size="lg">
            <FileCheck className="mr-2 h-5 w-5 shrink-0" />
            Submit Documentation to DSS via NYDocSubmit
          </Button>
        </a>
      </div>
    </div>;
};