import { MapPin, Clock, Calendar, Bus, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationDialog } from "./ApplicationDialog";
import { Opportunity } from "@/pages/Opportunities";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export const OpportunityCard = ({ opportunity }: OpportunityCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <Badge variant={opportunity.type === "volunteer" ? "default" : "secondary"} className="mb-2">
            {opportunity.type === "volunteer" ? "Volunteer" : "Education & Training"}
          </Badge>
          {opportunity.on_bus_route && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Bus className="h-3 w-3" />
              Bus Route
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl">{opportunity.org_name}</CardTitle>
        <CardDescription className="line-clamp-2">{opportunity.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{opportunity.location}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>{opportunity.hours_available}</span>
        </div>
        
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{opportunity.days_times_available}</span>
        </div>
        
        {opportunity.additional_requirements && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{opportunity.additional_requirements}</span>
          </div>
        )}
        
        <ApplicationDialog opportunity={opportunity}>
          <Button className="w-full mt-4">Apply for this Opportunity</Button>
        </ApplicationDialog>
      </CardContent>
    </Card>
  );
};