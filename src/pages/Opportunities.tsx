import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ArrowLeft, FileCheck, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OpportunityCard } from "@/components/OpportunityCard";
import { OpportunityFilters } from "@/components/OpportunityFilters";
import { ShareOpportunitiesDialog } from "@/components/ShareOpportunitiesDialog";
import { PrintableOpportunities } from "@/components/PrintableOpportunities";
import { useToast } from "@/hooks/use-toast";
export interface Opportunity {
  id: string;
  type: string;
  description: string;
  location: string;
  on_bus_route: boolean;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
  org_name: string;
  org_email: string;
  org_phone: string;
}
const Opportunities = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchOpportunities();
  }, []);
  const fetchOpportunities = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("opportunities").select("*").eq("active", true).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setOpportunities(data || []);
      setFilteredOpportunities(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading opportunities",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-background">
      {/* Exemption Status Banner */}
      <div className="bg-accent text-accent-foreground py-3 px-4 text-center font-medium hover:bg-accent/90 transition-colors cursor-pointer">You may be exempt from new work requirements.<br />Click Here to Check your Exemption Status.<br />Questions? Contact <a href="https://www.tompkinscountyny.gov/All-Departments/Social-Services" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Tompkins County DSS</a> (607) 274-5680</div>

      <header className="border-b border-border bg-[#eeeeee]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Tompkins County Opportunity Finder</h1>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="mb-2 text-3xl font-bold text-foreground">Available Opportunities</h2>
              <p className="text-muted-foreground">Browse and apply for opportunities that fulfill work requirements</p>
            </div>
            {filteredOpportunities.length > 0 && (
              <ShareOpportunitiesDialog opportunities={filteredOpportunities} />
            )}
          </div>
        </div>

        <OpportunityFilters opportunities={opportunities} onFilterChange={setFilteredOpportunities} />
        
        <PrintableOpportunities opportunities={filteredOpportunities} />

        {loading ? <div className="text-center py-12">
            <p className="text-muted-foreground">Loading opportunities...</p>
          </div> : filteredOpportunities.length === 0 ? <div className="text-center py-12">
            <p className="text-muted-foreground">No opportunities found matching your filters.</p>
          </div> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOpportunities.map(opportunity => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}
          </div>}

        {/* Electronic Verification Forms Section */}
        <div className="mt-16 rounded-xl bg-card border border-border p-8 max-w-6xl mx-auto">
          <h3 className="mb-8 text-2xl font-semibold text-foreground text-center">Electronic Verification Forms</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center">
              <Button className="w-full max-w-md text-base" size="lg">
                <FileCheck className="mr-2 h-5 w-5" />
                Volunteer Work Experience Verification Form
              </Button>
            </div>
            <div className="flex flex-col items-center">
              <Button className="w-full max-w-md text-base" size="lg">
                <ClipboardCheck className="mr-2 h-5 w-5" />
                Training/ Educational Program Verification Form
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            Need help? Email{" "}
            <a href="mailto:amoore@hsctc.org" className="text-primary hover:underline">
              amoore@hsctc.org
            </a>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Powered by Tompkins County Opportunity Finder</p>
        </div>
      </footer>
    </div>;
};
export default Opportunities;