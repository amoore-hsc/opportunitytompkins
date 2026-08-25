import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, ListPlus, Briefcase } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { ElectronicVerificationForms } from "@/components/ElectronicVerificationForms";
import { SkipNavigation } from "@/components/SkipNavigation";

import workforceNYLogo from "@/assets/workforce-ny-logo.png";
import chrnLogo from "@/assets/chrn-logo.jpg";
import foodbankLogo from "@/assets/foodbank-logo.png";
const Index = () => {
  const [showPopup, setShowPopup] = useState(false);
  useEffect(() => {
    // Show popup after a short delay when page loads
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  return <div className="min-h-dvh bg-background">
      <SkipNavigation />

      {/* Exemption Status Popup */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exemption Status</DialogTitle>
            <DialogDescription>
              Some people are exempt from the new SNAP work requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center space-y-4 py-2">
            <p className="text-lg font-medium text-foreground">
              You may be exempt from new work requirements.
            </p>
            <a href="https://forms.gle/9fBQrPjE7xNZbHQR8" target="_blank" rel="noopener noreferrer" className="inline-block">
              <Button className="text-base">
                Click Here to Check your Exemption Status
              </Button>
            </a>
            <p className="text-muted-foreground text-base">
              Questions?
              <br />
              Contact{" "}
              <a href="https://www.tompkinscountyny.gov/All-Departments/Social-Services" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                Tompkins County DSS
              </a>
              <br />
              <span className="text-primary">(607) 274-5680</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>


      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="" aria-hidden="true" className="h-8 w-8" />
            <h1 className="text-2xl font-bold text-foreground">Tompkins County 
Opportunity Finder</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="main-content" className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-foreground sm:text-5xl">Connect to Opportunities that Count</h2>
          <p className="mb-12 text-lg text-muted-foreground sm:text-xl">Find volunteer, training or educational opportunities that count toward the federally mandated SNAP ABAWD work requirement — or post one if you're a community organization.</p>

          {/* Main CTAs */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Link to="/opportunities" className="group">
              <div className="rounded-xl border-2 border-primary bg-card p-8 transition-all hover:scale-105 hover:shadow-lg">
                <Search className="mx-auto mb-4 h-12 w-12 text-primary" aria-hidden="true" />
                <h3 className="mb-2 text-xl font-semibold text-foreground">Find an Opportunity</h3>
                <p className="text-muted-foreground">Search for volunteer, training, and educational  opportunities in your area</p>
                <Button className="mt-6 w-full" size="lg">
                  Browse Opportunities
                </Button>
              </div>
            </Link>

            <Link to="/list-opportunity" className="group">
              <div className="rounded-xl border-2 bg-card p-8 transition-all hover:scale-105 hover:shadow-lg border-success">
                <ListPlus className="mx-auto mb-4 h-12 w-12 text-success" aria-hidden="true" />
                <h3 className="mb-2 text-xl font-semibold text-foreground">List an Opportunity</h3>
                <p className="text-muted-foreground">Organizations: Post volunteer training and educational positions</p>
                <Button variant="default" size="lg" className="mt-6 w-full bg-success">
                  Post Opportunity
                </Button>
              </div>
            </Link>
          </div>

          {/* Employment CTA */}
          <div className="mt-6">
            <div className="rounded-xl border-2 border-highlight bg-card p-8 transition-all hover:shadow-lg">
              <Briefcase className="mx-auto mb-4 h-12 w-12 text-highlight" aria-hidden="true" />
              <h3 className="mb-2 text-xl font-semibold text-foreground">Find Employment</h3>
              <p className="text-muted-foreground">Browse job openings from local employers in Tompkins County</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link to="/employment">
                  <Button size="lg" className="w-full bg-highlight text-highlight-foreground hover:bg-highlight/90">
                    Browse Jobs
                  </Button>
                </Link>
                <Link to="/employment-resources">
                  <Button size="lg" className="w-full bg-highlight text-highlight-foreground hover:bg-highlight/90">
                    Employment Resources
                  </Button>
                </Link>
              </div>
            </div>
          </div>


          {/* Info Section */}
          <div className="mt-16 rounded-xl bg-muted p-8">
            <h3 className="mb-4 text-2xl font-semibold text-foreground">How It Works</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">1</div>
                <h4 className="mb-2 font-semibold text-foreground">Search</h4>
                <p className="text-sm text-muted-foreground">
                  Browse available opportunities filtered by location, schedule, and type
                </p>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">2</div>
                <h4 className="mb-2 font-semibold text-foreground">Apply</h4>
                <p className="text-sm text-muted-foreground">
                  Submit your information and the organization will contact you directly
                </p>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">3</div>
                <h4 className="mb-2 font-semibold text-foreground">Connect</h4>
                <p className="text-sm text-muted-foreground">Start fulfilling work requirements while helping your community</p>
              </div>
            </div>
          </div>

          <ElectronicVerificationForms />
        </div>
      </main>

      {/* Additional Resources Section - Hidden */}
      {/* <section className="container mx-auto px-4 py-16">
       <div className="mx-auto max-w-6xl text-center">
         <h2 className="text-3xl font-bold text-foreground mb-8">Looking For Additional Support?</h2>
         <div className="grid gap-8 md:grid-cols-3">
           <div className="flex flex-col items-center gap-6">
             <a href="https://www.tompkinscountyny.gov/All-Departments/Workforce-Development" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
               <img src={workforceNYLogo} alt="Tompkins Workforce New York Logo" className="h-48 w-auto object-contain rounded-lg shadow-md" />
             </a>
             <p className="text-lg text-foreground">
               Career Center: <a href="tel:607-272-7570" className="text-primary hover:underline">(607) 272-7570</a>
             </p>
           </div>
            <div className="flex flex-col items-center gap-6">
             <a href="https://hsctc.org/network/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
               <img src={chrnLogo} alt="Community Health & Resource Network Logo" className="h-48 w-auto object-contain rounded-lg shadow-md" />
             </a>
             <p className="text-lg text-foreground">Dial 211: <a href="tel:1-877-211-8667" className="text-primary hover:underline">877-211-8667</a>
             </p>
           </div>
            <div className="flex flex-col items-center gap-6">
             <a href="https://www.foodbankst.org/find-food/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
               <img src={foodbankLogo} alt="Food Bank of the Southern Tier Logo" className="h-48 w-auto object-contain rounded-lg shadow-md" />
             </a>
             <p className="text-lg text-foreground">
               <a href="tel:607-796-6061" className="text-primary hover:underline">(607) 796-6061</a>
             </p>
           </div>
         </div>
       </div>
      </section> */}

    </div>;
};
export default Index;