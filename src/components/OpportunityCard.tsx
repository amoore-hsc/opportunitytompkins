import { forwardRef } from "react";
import { MapPin, Clock, Calendar, Bus, FileText, Briefcase, CalendarPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationDialog } from "./ApplicationDialog";
import { Opportunity } from "@/pages/Opportunities";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface OpportunityCardProps {
  opportunity: Opportunity;
  isHighlighted?: boolean;
}

export const OpportunityCard = forwardRef<HTMLDivElement, OpportunityCardProps>(
  ({ opportunity, isHighlighted = false }, ref) => {
    return (
      <Card 
        ref={ref}
        className={cn(
          "hover:shadow-lg transition-all duration-300",
          isHighlighted && "ring-2 ring-primary ring-offset-2 shadow-lg animate-pulse"
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <Badge variant={opportunity.type === "volunteer" ? "default" : "secondary"} className="mb-2">
              {opportunity.type === "volunteer" ? "Volunteer" : "Education & Training"}
            </Badge>
            {opportunity.on_bus_route && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Bus className="h-3 w-3" aria-hidden="true" />
                On Bus Route
              </Badge>
            )}
          </div>
          {opportunity.role_classification && (
            <Badge variant="outline" className="flex items-center gap-1 w-fit mb-2">
              <Briefcase className="h-3 w-3" aria-hidden="true" />
              {opportunity.role_classification}
            </Badge>
          )}
          <CardTitle className="text-xl">{opportunity.org_name}</CardTitle>
          {opportunity.position_title && (
            <p className="text-base font-medium text-foreground">{opportunity.position_title}</p>
          )}
          <CardDescription>{opportunity.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{opportunity.location}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="font-normal">
              <strong>Hours Available:</strong> {opportunity.hours_available} per week
            </span>
          </div>
          
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              {opportunity.days_times_available.split(',').map((day, index) => (
                <span key={index}>{day.trim()}</span>
              ))}
            </div>
          </div>
          
          {opportunity.additional_requirements && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span className="font-normal">
                <strong>Additional Requirements:</strong> {opportunity.additional_requirements}
              </span>
            </div>
          )}
          
          <ApplicationDialog opportunity={opportunity}>
            <Button className="w-full mt-4 bg-success">Apply</Button>
          </ApplicationDialog>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
            <CalendarPlus className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span>Updated {formatDistanceToNow(new Date(opportunity.updated_at), { addSuffix: true })}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
);

OpportunityCard.displayName = "OpportunityCard";
