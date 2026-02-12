import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw, Bus, Wifi } from "lucide-react";
import { Opportunity } from "@/pages/Opportunities";
interface OpportunityFiltersProps {
  opportunities: Opportunity[];
  onFilterChange: (filtered: Opportunity[]) => void;
}
export const OpportunityFilters = ({
  opportunities,
  onFilterChange
}: OpportunityFiltersProps) => {
  const [filters, setFilters] = useState({
    type: "all",
    busRoute: false,
    remote: false,
    location: "all",
    minHours: 0,
    daysOfWeek: [] as string[],
    roleClassification: "all"
  });
  useEffect(() => {
    applyFilters();
  }, [filters, opportunities]);
  const extractCity = (location: string): string => {
    const statePattern = /,?\s*NY(?:\s*\d{5})?(?:-\d{4})?$/i;
    const newYorkPattern = /,?\s*New York(?:\s*\d{5})?(?:-\d{4})?$/i;
    let beforeState = location;
    if (statePattern.test(location)) {
      beforeState = location.replace(statePattern, '').trim();
    } else if (newYorkPattern.test(location)) {
      beforeState = location.replace(newYorkPattern, '').trim();
    }
    const parts = beforeState.split(',').map(part => part.trim());
    if (parts.length >= 1) {
      const lastPart = parts[parts.length - 1];
      const words = lastPart.split(/\s+/);
      const streetIndicators = ['st', 'st.', 'ave', 'ave.', 'rd', 'rd.', 'dr', 'dr.', 'ln', 'ln.', 'blvd', 'street', 'avenue', 'road', 'drive', 'lane', 'boulevard', 'way', 'court', 'ct', 'ct.', 'place', 'pl', 'pl.'];
      let cityStartIndex = 0;
      for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase();
        if (streetIndicators.includes(word) || /^\d+$/.test(word)) {
          cityStartIndex = i + 1;
        }
      }
      if (cityStartIndex > 0 && cityStartIndex < words.length) {
        return words.slice(cityStartIndex).join(' ');
      }
      return lastPart;
    }
    return location;
  };
  const applyFilters = () => {
    let filtered = [...opportunities];
    if (filters.type !== "all") {
      filtered = filtered.filter(opp => opp.type === filters.type);
    }
    if (filters.busRoute) {
      filtered = filtered.filter(opp => opp.on_bus_route);
    }
    if (filters.remote) {
      filtered = filtered.filter(opp => opp.location.toLowerCase() === "remote");
    }
    if (filters.location !== "all") {
      filtered = filtered.filter(opp => extractCity(opp.location).toLowerCase() === filters.location.toLowerCase());
    }
    if (filters.minHours > 0) {
      filtered = filtered.filter(opp => {
        const hours = parseInt(opp.hours_available) || 0;
        return hours >= filters.minHours;
      });
    }
    if (filters.daysOfWeek.length > 0) {
      filtered = filtered.filter(opp => {
        const daysAvailable = opp.days_times_available.toLowerCase();
        return filters.daysOfWeek.some(day => daysAvailable.includes(day.toLowerCase()));
      });
    }
    if (filters.roleClassification !== "all") {
      filtered = filtered.filter(opp => opp.role_classification === filters.roleClassification);
    }
    onFilterChange(filtered);
  };
  const normalizeCity = (city: string): string => {
    // Capitalize first letter of each word
    return city.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  const uniqueCities = Array.from(new Set(opportunities.map(opp => normalizeCity(extractCity(opp.location))))).sort();
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const toggleDay = (day: string) => {
    setFilters(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter(d => d !== day) : [...prev.daysOfWeek, day]
    }));
  };
  const clearAllFilters = () => {
    setFilters({
      type: "all",
      busRoute: false,
      remote: false,
      location: "all",
      minHours: 0,
      daysOfWeek: [],
      roleClassification: "all"
    });
  };
  const roleClassifications = ["Administrative & Office Support", "Community Engagement & Public Service", "Education & Mentoring", "Human & Social Support Services", "Physical, Outdoor & Environmental Work", "Creative, Media & Communications", "Technology & Digital Support", "Fundraising & Development"];
  return <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="type">Opportunity Type</Label>
            <Select value={filters.type} onValueChange={value => setFilters({
            ...filters,
            type: value
          })}>
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
            <Select value={filters.location} onValueChange={value => setFilters({
            ...filters,
            location: value
          })}>
              <SelectTrigger id="location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueCities.map(city => <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>)}
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
                onValueChange={value => setFilters({
                  ...filters,
                  minHours: value[0]
                })} 
                className="mt-2"
                aria-valuetext={`${filters.minHours} hours per week`}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="busRoute" checked={filters.busRoute} onCheckedChange={checked => setFilters({
              ...filters,
              busRoute: checked === true
            })} />
            <Label htmlFor="busRoute" className="cursor-pointer flex items-center gap-2">
              <Bus className="h-4 w-4" aria-hidden="true" />
              On Bus Route Only
            </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="remote" checked={filters.remote} onCheckedChange={checked => setFilters({
              ...filters,
              remote: checked === true
            })} />
            <Label htmlFor="remote" className="cursor-pointer flex items-center gap-2">
              <Wifi className="h-4 w-4" aria-hidden="true" />
              Remote Only
            </Label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col lg:flex-row lg:items-end gap-6">
          <div className="space-y-2 w-full lg:w-[calc(33.333%-1rem)] lg:shrink-0">
            <Label htmlFor="roleClassification">Role Classification</Label>
            <Select value={filters.roleClassification} onValueChange={value => setFilters({
            ...filters,
            roleClassification: value
          })}>
              <SelectTrigger id="roleClassification">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                {roleClassifications.map(role => <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-2" role="group" aria-labelledby="days-label">
            <Label id="days-label">Days Available</Label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by days of the week">
                {daysOfWeek.map(day => <Button 
                  key={day} 
                  variant={filters.daysOfWeek.includes(day) ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => toggleDay(day)} 
                  className="transition-all"
                  aria-pressed={filters.daysOfWeek.includes(day)}
                  aria-label={`Filter by ${day}`}
                >
                    {day}
                  </Button>)}
              </div>
              <Button variant="secondary" size="sm" onClick={clearAllFilters} className="gap-2 bg-success">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
};