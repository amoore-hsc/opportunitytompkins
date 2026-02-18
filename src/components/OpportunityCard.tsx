import { forwardRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MapPin, Clock, Calendar, Bus, FileText, Briefcase, CalendarPlus, GraduationCap, Globe } from "lucide-react";
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

const REQUIREMENTS_TRUNCATE_LENGTH = 120;

const ExpandableRequirements = ({ text, label }: { text: string; label: string }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > REQUIREMENTS_TRUNCATE_LENGTH;

  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <span className="font-normal">
          <strong>{label}</strong>{" "}
          {isLong && !expanded ? `${text.slice(0, REQUIREMENTS_TRUNCATE_LENGTH)}…` : text}
        </span>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline text-xs font-medium"
            aria-expanded={expanded}
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-3 w-3" aria-hidden="true" /></>
            ) : (
              <>Show more <ChevronDown className="h-3 w-3" aria-hidden="true" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export const OpportunityCard = forwardRef<HTMLDivElement, OpportunityCardProps>(
  ({ opportunity, isHighlighted = false }, ref) => {
    const isEducation = opportunity.type === "education";

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
            <Badge variant={isEducation ? "secondary" : "default"} className="mb-2">
              {isEducation ? "Education & Training" : "Volunteer"}
            </Badge>
            {!isEducation && opportunity.on_bus_route && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Bus className="h-3 w-3" aria-hidden="true" />
                On Bus Route
              </Badge>
            )}
          </div>
          {/* Volunteer: Role Classification badge */}
          {!isEducation && opportunity.role_classification && (
            <Badge variant="outline" className="flex items-center gap-1 w-fit mb-2">
             <Briefcase className="h-3 w-3" aria-hidden="true" />
              {opportunity.role_classification}
            </Badge>
          )}
          {/* Education: Program Components badges */}
          {isEducation && opportunity.program_components && (
            <div className="flex flex-wrap gap-1 mb-2">
              {opportunity.program_components.split(", ").map(component => (
                <Badge key={component} variant="outline" className="flex items-center gap-1 w-fit">
                  <GraduationCap className="h-3 w-3" aria-hidden="true" />
                  {component}
                </Badge>
              ))}
            </div>
          )}
          <CardTitle className="text-xl">{opportunity.org_name}</CardTitle>
          {/* Volunteer: position title */}
          {!isEducation && opportunity.position_title && (
            <p className="text-base font-medium text-foreground">{opportunity.position_title}</p>
          )}
          {/* Education: program name */}
          {isEducation && opportunity.program_name && (
            <p className="text-base font-medium text-foreground">{opportunity.program_name}</p>
          )}
          <CardDescription>{opportunity.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Location - only show for volunteer or if meaningful */}
          {!isEducation && opportunity.location && opportunity.location !== "N/A" && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{opportunity.location}</span>
            </div>
          )}

          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="font-normal">
              <strong>Hours Available:</strong> {opportunity.hours_available}{/week|per week/i.test(opportunity.hours_available) ? "" : " per week"}
            </span>
          </div>
          
          {/* Schedule - show if not N/A */}
          {opportunity.days_times_available && opportunity.days_times_available !== "N/A" && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              {(() => {
                const parts = opportunity.days_times_available.split(',').map(s => s.trim());
                const allFlexible = parts.every(p => p.toLowerCase().includes('flexible'));
                if (allFlexible) {
                  const dayNames = parts.map(p => p.split(':')[0].trim());
                  return (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Flexible Hours</span>
                      <span>{dayNames.join(', ')}</span>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col gap-1">
                    {parts.map((day, index) => (
                      <span key={index}>{day}</span>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
          
          {opportunity.additional_requirements && (
            <ExpandableRequirements
              text={opportunity.additional_requirements}
              label={isEducation ? "Minimum Requirements:" : "Additional Requirements:"}
            />
          )}
          
          {/* Apply button - volunteer only */}
          {!isEducation && (
            <ApplicationDialog opportunity={opportunity}>
              <Button className="w-full mt-4 bg-success">Apply</Button>
            </ApplicationDialog>
          )}

          {/* Learn More button - education only */}
          {isEducation && opportunity.website && (
            <a
              href={opportunity.website.startsWith("http") ? opportunity.website : `https://${opportunity.website}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full mt-4 bg-success">Learn More</Button>
            </a>
          )}

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
