import { MapPin, Clock, Calendar, Bus, FileText, Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationDialog } from "./ApplicationDialog";
import { Opportunity } from "@/pages/Opportunities";
interface OpportunityCardProps {
  opportunity: Opportunity;
}
export const OpportunityCard = ({
  opportunity
}: OpportunityCardProps) => {
  return <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <Badge variant={opportunity.type === "volunteer" ? "default" : "secondary"} className="mb-2">
            {opportunity.type === "volunteer" ? "Volunteer" : "Education & Training"}
          </Badge>
          {opportunity.on_bus_route && <Badge variant="outline" className="flex items-center gap-1">
              <Bus className="h-3 w-3" />
              On Bus Route
            </Badge>}
        </div>
        {opportunity.role_classification && <Badge variant="outline" className="flex items-center gap-1 w-fit mb-2">
            <Briefcase className="h-3 w-3" />
            {opportunity.role_classification}
          </Badge>}
        <CardTitle className="text-xl">{opportunity.org_name}</CardTitle>
        <CardDescription>
          {opportunity.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{opportunity.location}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span className="font-normal"><strong>Hours Available:</strong> {opportunity.hours_available} per week</span>
        </div>
        
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-1">
            {opportunity.days_times_available.split(',').map((day, index) => <span key={index}>{day.trim()}</span>)}
          </div>
        </div>
        
        {opportunity.additional_requirements && <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="font-normal"><strong>Additional Requirements:</strong> {opportunity.additional_requirements}</span>
          </div>}
        
        <ApplicationDialog opportunity={opportunity}>
          <Button className="w-full mt-4 bg-success">Apply</Button>
        </ApplicationDialog>
      </CardContent>
    </Card>;
};