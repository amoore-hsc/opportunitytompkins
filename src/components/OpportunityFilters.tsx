import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Opportunity } from "@/pages/Opportunities";

interface OpportunityFiltersProps {
  opportunities: Opportunity[];
  onFilterChange: (filtered: Opportunity[]) => void;
}

export const OpportunityFilters = ({ opportunities, onFilterChange }: OpportunityFiltersProps) => {
  const [filters, setFilters] = useState({
    type: "all",
    busRoute: false,
    location: "all",
  });

  useEffect(() => {
    applyFilters();
  }, [filters, opportunities]);

  const extractCity = (location: string): string => {
    // Extract city from various address formats:
    // "324 W Buffalo St, Ithaca, NY 14850" -> "Ithaca"
    // "Ithaca, NY" -> "Ithaca"
    // "Ithaca" -> "Ithaca"
    const parts = location.split(',').map(part => part.trim());
    
    if (parts.length >= 3) {
      // Full address format: Street, City, State ZIP
      return parts[1];
    } else if (parts.length === 2) {
      // City, State format
      return parts[0];
    } else {
      // Just city name
      return parts[0];
    }
  };

  const applyFilters = () => {
    let filtered = [...opportunities];

    if (filters.type !== "all") {
      filtered = filtered.filter((opp) => opp.type === filters.type);
    }

    if (filters.busRoute) {
      filtered = filtered.filter((opp) => opp.on_bus_route);
    }

    if (filters.location !== "all") {
      filtered = filtered.filter((opp) => extractCity(opp.location) === filters.location);
    }

    onFilterChange(filtered);
  };

  const uniqueCities = Array.from(new Set(opportunities.map((opp) => extractCity(opp.location))));

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="type">Opportunity Type</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({ ...filters, type: value })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="education">Education & Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">City</Label>
            <Select
              value={filters.location}
              onValueChange={(value) => setFilters({ ...filters, location: value })}
            >
              <SelectTrigger id="location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="busRoute"
                checked={filters.busRoute}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, busRoute: checked === true })
                }
              />
              <Label htmlFor="busRoute" className="cursor-pointer">
                On Bus Route Only
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};