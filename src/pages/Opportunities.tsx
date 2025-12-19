import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OpportunityCard } from "@/components/OpportunityCard";
import { OpportunityFilters } from "@/components/OpportunityFilters";
import { ShareOpportunitiesDialog } from "@/components/ShareOpportunitiesDialog";
import { PrintableOpportunities } from "@/components/PrintableOpportunities";
import { ElectronicVerificationForms } from "@/components/ElectronicVerificationForms";
import { SkipNavigation } from "@/components/SkipNavigation";
import { useToast } from "@/hooks/use-toast";

export interface Opportunity {
  id: string;
  type: string;
  position_title: string | null;
  description: string;
  location: string;
  on_bus_route: boolean;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
  org_name: string;
  contact_name: string | null;
  org_email: string;
  org_phone: string;
  role_classification: string | null;
  updated_at: string;
}

const Opportunities = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    fetchOpportunities();
  }, []);

  // Handle scrolling to specific opportunity when id param is present
  useEffect(() => {
    const targetId = searchParams.get("id");
    if (targetId && !loading && filteredOpportunities.length > 0) {
      const cardElement = cardRefs.current.get(targetId);
      if (cardElement) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedId(targetId);
          // Remove highlight after animation
          setTimeout(() => setHighlightedId(null), 3000);
        }, 100);
      }
    }
  }, [searchParams, loading, filteredOpportunities]);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("active", true)
        .order("updated_at", { ascending: false });
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

  return (
    <div className="min-h-screen bg-background">
      <SkipNavigation />
      
      {/* Exemption Status Banner */}
      <div className="py-3 px-4 text-center font-medium transition-colors text-primary-foreground bg-[#2a5f99]">
        You may be exempt from new work requirements.<br />
        <a 
          href="https://docs.google.com/forms/d/e/1FAIpQLSfXDths0eQwRcWRMrqVdjjhILjLpi5qz7lMyn27VyhdKTt6nw/viewform" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="underline hover:no-underline"
        >
          Click Here to Check your Exemption Status.
        </a>
        <br />
        Questions? Contact{" "}
        <a 
          href="https://www.tompkinscountyny.gov/All-Departments/Social-Services" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="underline hover:no-underline"
        >
          Tompkins County DSS
        </a>{" "}
        (607) 274-5680
      </div>

      <header className="border-b border-border bg-[#eeeeee]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="h-8 w-8 text-primary" aria-hidden="true" />
              <h1 className="text-2xl font-bold text-foreground">Tompkins Opportunity</h1>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="mb-2 text-3xl font-bold text-foreground">Available Opportunities</h2>
              <p className="text-muted-foreground">Browse and apply for opportunities that fulfill work requirements</p>
            </div>
            {filteredOpportunities.length > 0 && <ShareOpportunitiesDialog opportunities={filteredOpportunities} />}
          </div>
        </div>

        <OpportunityFilters opportunities={opportunities} onFilterChange={setFilteredOpportunities} />
        
        <PrintableOpportunities opportunities={filteredOpportunities} />

        <div aria-live="polite" aria-atomic="true">
          {loading ? (
            <div className="text-center py-12" role="status">
              <p className="text-muted-foreground">Loading opportunities...</p>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No opportunities found matching your filters.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOpportunities.map(opportunity => (
                <OpportunityCard 
                  key={opportunity.id} 
                  opportunity={opportunity} 
                  isHighlighted={highlightedId === opportunity.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(opportunity.id, el);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <ElectronicVerificationForms />
      </main>
    </div>
  );
};

export default Opportunities;
