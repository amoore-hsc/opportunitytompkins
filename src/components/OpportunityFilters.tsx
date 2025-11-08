import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
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
    minHours: 0,
    daysOfWeek: [] as string[],
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

    if (filters.minHours > 0) {
      filtered = filtered.filter((opp) => {
        const hours = parseInt(opp.hours_available) || 0;
        return hours >= filters.minHours;
      });
    }

    if (filters.daysOfWeek.length > 0) {
      filtered = filtered.filter((opp) => {
        const daysAvailable = opp.days_times_available.toLowerCase();
        return filters.daysOfWeek.some(day => daysAvailable.includes(day.toLowerCase()));
      });
    }

    onFilterChange(filtered);
  };

  const uniqueCities = Array.from(new Set(opportunities.map((opp) => extractCity(opp.location))));
  
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const toggleDay = (day: string) => {
    setFilters(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      type: "all",
      busRoute: false,
      location: "all",
      minHours: 0,
      daysOfWeek: [],
    });
  };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <Label htmlFor="location">Location</Label>
            <Select
              value={filters.location}
              onValueChange={(value) => setFilters({ ...filters, location: value })}
            >
              <SelectTrigger id="location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours per Week: {filters.minHours}</Label>
              <Slider
                id="hours"
                min={0}
                max={40}
                step={1}
                value={[filters.minHours]}
                onValueChange={(value) => setFilters({ ...filters, minHours: value[0] })}
                className="mt-2"
              />
            </div>

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

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Days of the Week</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear All Filters
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <Button
                key={day}
                variant={filters.daysOfWeek.includes(day) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDay(day)}
                className="transition-all"
              >
                {day}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};