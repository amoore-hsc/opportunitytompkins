import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, ListPlus, Share2 } from "lucide-react";
import workforceNYLogo from "@/assets/workforce-ny-logo.png";
import chrnLogo from "@/assets/chrn-logo.jpg";
import foodbankLogo from "@/assets/foodbank-logo.png";
const Index = () => {
  return <div className="min-h-screen bg-background">
      {/* Exemption Status Banner */}
      <div className="bg-accent text-accent-foreground py-3 px-4 text-center font-medium hover:bg-accent/90 transition-colors cursor-pointer">You may be exempt from new work requirements.<br />Click Here to Check your Exemption Status.<br />Questions? Contact <a href="https://www.tompkinscountyny.gov/All-Departments/Social-Services" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Tompkins County DSS</a> (607) 274-5680</div>

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2">
            <Share2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Tompkins County 
Opportunity Finder</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-foreground sm:text-5xl">Connect to Opportunities that Count</h2>
          <p className="mb-12 text-lg text-muted-foreground sm:text-xl">Find volunteer, training or educational opportunities that count toward the federally mandated SNAP ABAWD work requirement — or post one if you're a community organization.</p>

          {/* Main CTAs */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Link to="/opportunities" className="group">
              <div className="rounded-xl border-2 border-primary bg-card p-8 transition-all hover:scale-105 hover:shadow-lg">
                <Search className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-xl font-semibold text-foreground">Find an Opportunity</h3>
                <p className="text-muted-foreground">Search for volunteer, training, and educational  opportunities in your area</p>
                <Button className="mt-6 w-full" size="lg">
                  Browse Opportunities
                </Button>
              </div>
            </Link>

            <Link to="/list-opportunity" className="group">
              <div className="rounded-xl border-2 border-accent bg-card p-8 transition-all hover:scale-105 hover:shadow-lg">
                <ListPlus className="mx-auto mb-4 h-12 w-12 text-accent" />
                <h3 className="mb-2 text-xl font-semibold text-foreground">List an Opportunity</h3>
                <p className="text-muted-foreground">Organizations: Post volunteer or training/ educational positions</p>
                <Button variant="default" className="mt-6 w-full bg-accent hover:bg-accent/90" size="lg">
                  Post Opportunity
                </Button>
              </div>
            </Link>
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
        </div>
      </main>

      {/* Additional Resources Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">Looking For Additional Support?</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {/* Workforce Development */}
            <div className="flex flex-col items-center gap-6">
              <a href="https://www.tompkinscountyny.gov/All-Departments/Workforce-Development" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img src={workforceNYLogo} alt="Tompkins Workforce New York Logo" className="h-48 w-auto object-contain rounded-lg shadow-md" />
              </a>
              <p className="text-lg text-foreground">
                Career Center: <a href="tel:607-272-7570" className="text-primary hover:underline">(607) 272-7570</a>
              </p>
            </div>

            {/* Community Health & Resource Network */}
            <div className="flex flex-col items-center gap-6">
              <a href="https://hsctc.org/network/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img src={chrnLogo} alt="Community Health & Resource Network Logo" className="h-48 w-auto object-contain rounded-lg shadow-md" />
              </a>
              <p className="text-lg text-foreground">Dial 211: <a href="tel:1-877-211-8667" className="text-primary hover:underline">877-211-8667</a>
              </p>
            </div>

            {/* Food Bank of the Southern Tier */}
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
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            Need help? Email{" "}
            <a href="mailto:amoore@hsctc.org" className="text-primary hover:underline">
              amoore@hsctc.org
            </a>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Powered by Tompkins  CountyOpportunity Finder</p>
        </div>
      </footer>
    </div>;
};
export default Index;