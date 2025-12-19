import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Building2, MapPin, Calendar, Briefcase, Edit, Clock, CalendarDays, ClipboardList } from "lucide-react";

interface OpportunityDetails {
  id: string;
  org_name: string;
  position_title: string | null;
  type: string;
  location: string;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
  created_at: string;
  active: boolean;
}

const ConfirmListing = () => {
  const { token } = useParams<{ token: string }>();
  const [opportunity, setOpportunity] = useState<OpportunityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpportunity = async () => {
      if (!token) {
        setError("No token provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.functions.invoke("get-opportunity-by-token", {
          body: { token },
        });

        if (fetchError) {
          console.error("Error fetching opportunity:", fetchError);
          setError("Failed to load listing details");
          setLoading(false);
          return;
        }

        if (!data || data.error) {
          setError(data?.error || "Listing not found");
          setLoading(false);
          return;
        }

        // Handle the nested opportunity response
        setOpportunity(data.opportunity || data);
      } catch (err) {
        console.error("Error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunity();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;

    setConfirming(true);
    setError(null);

    try {
      const { data, error: confirmError } = await supabase.functions.invoke("confirm-listing-active", {
        body: { token },
      });

      if (confirmError || data?.error) {
        setError(data?.error || "Failed to confirm listing");
        setConfirming(false);
        return;
      }

      setConfirmed(true);
    } catch (err) {
      console.error("Error confirming:", err);
      setError("An unexpected error occurred");
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysSince = (dateString: string) => {
    const created = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (error && !opportunity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Unable to Load Listing</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/opportunities">
              <Button variant="outline">View All Opportunities</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">Listing Confirmed!</CardTitle>
            <CardDescription className="text-base mt-2">
              Thank you for confirming that your listing is still active. It will continue to appear on Tompkins Opportunity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="font-medium">{opportunity?.position_title || opportunity?.type}</p>
              <p className="text-sm text-muted-foreground">{opportunity?.org_name}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link to={`/edit-opportunity/${token}`} className="w-full">
                <Button variant="outline" className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Make Changes to This Listing
                </Button>
              </Link>
              <Link to="/opportunities" className="w-full">
                <Button variant="ghost" className="w-full">
                  View All Opportunities
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Confirm Your Listing</CardTitle>
          <CardDescription className="text-base">
            Please confirm that this listing is still active and accurate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Listing Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">
              {opportunity?.position_title || opportunity?.type}
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span>{opportunity?.org_name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4 flex-shrink-0" />
                <span>{opportunity?.type}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{opportunity?.location}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{opportunity?.hours_available}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4 flex-shrink-0" />
                <span>{opportunity?.days_times_available}</span>
              </div>
              
              {opportunity?.additional_requirements && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <ClipboardList className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{opportunity.additional_requirements}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>
                  Posted {formatDate(opportunity?.created_at || "")} ({getDaysSince(opportunity?.created_at || "")} days ago)
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleConfirm} 
              disabled={confirming}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm - Still Active
                </>
              )}
            </Button>
            
            <Link to={`/edit-opportunity/${token}`} className="block">
              <Button variant="outline" className="w-full" size="lg">
                <Edit className="h-4 w-4 mr-2" />
                Edit This Listing Instead
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If this position has been filled, please use "Edit This Listing" and scroll to the bottom to deactivate it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmListing;
