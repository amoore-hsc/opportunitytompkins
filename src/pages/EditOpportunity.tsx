import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Handshake, ArrowLeft, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const addressSchema = z.string().min(1, "Address is required").refine(val => {
  const parts = val.split(',').map(p => p.trim()).filter(p => p.length > 0);
  return parts.length >= 2;
}, {
  message: "Please enter a complete address with street, city, and state (e.g., 123 Main St, Ithaca, NY)"
});

type DaySchedule = {
  [key: string]: {
    selected: boolean;
    startTime: number;
    endTime: number;
  };
};

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" }
];

const formatTimeFromHour = (hour: number): string => {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
};

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const parseScheduleString = (scheduleStr: string): DaySchedule => {
  const schedule: DaySchedule = DAYS_OF_WEEK.reduce((acc, day) => ({
    ...acc,
    [day.key]: { selected: false, startTime: 9, endTime: 17 }
  }), {});

  if (!scheduleStr) return schedule;

  const dayEntries = scheduleStr.split(", ");
  dayEntries.forEach(entry => {
    const match = entry.match(/^(\w+): (\d+):00 (AM|PM) - (\d+):00 (AM|PM)$/);
    if (match) {
      const [, dayLabel, startHourStr, startPeriod, endHourStr, endPeriod] = match;
      const dayKey = DAYS_OF_WEEK.find(d => d.label === dayLabel)?.key;
      if (dayKey) {
        let startHour = parseInt(startHourStr);
        let endHour = parseInt(endHourStr);
        if (startPeriod === "PM" && startHour !== 12) startHour += 12;
        if (startPeriod === "AM" && startHour === 12) startHour = 0;
        if (endPeriod === "PM" && endHour !== 12) endHour += 12;
        if (endPeriod === "AM" && endHour === 12) endHour = 0;
        schedule[dayKey] = { selected: true, startTime: startHour, endTime: endHour };
      }
    }
  });

  return schedule;
};

const EditOpportunity = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [locationError, setLocationError] = useState("");
  const [descriptionWordCount, setDescriptionWordCount] = useState(0);
  
  const [daySchedule, setDaySchedule] = useState<DaySchedule>(
    DAYS_OF_WEEK.reduce((acc, day) => ({
      ...acc,
      [day.key]: { selected: false, startTime: 9, endTime: 17 }
    }), {})
  );
  
  const [additionalRequirements, setAdditionalRequirements] = useState<string[]>([]);
  const [currentRequirement, setCurrentRequirement] = useState("");
  
  const [formData, setFormData] = useState({
    type: "",
    roleClassification: "",
    positionTitle: "",
    description: "",
    location: "",
    onBusRoute: false,
    hoursAvailable: "",
    orgName: "",
    contactName: "",
    orgEmail: "",
    orgPhone: ""
  });

  useEffect(() => {
    const fetchOpportunity = async () => {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("get-opportunity-by-token", {
          body: { token }
        });

        if (error || !data || data.error) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const opp = data.opportunity;
        setOpportunityId(opp.id);
        setFormData({
          type: opp.type || "",
          roleClassification: opp.role_classification || "",
          positionTitle: opp.position_title || "",
          description: opp.description || "",
          location: opp.location || "",
          onBusRoute: opp.on_bus_route || false,
          hoursAvailable: opp.hours_available || "",
          orgName: opp.org_name || "",
          contactName: "",
          orgEmail: opp.org_email || "",
          orgPhone: opp.org_phone || ""
        });
        setDescriptionWordCount(countWords(opp.description || ""));
        setDaySchedule(parseScheduleString(opp.days_times_available || ""));
        
        if (opp.additional_requirements) {
          setAdditionalRequirements(opp.additional_requirements.split("; "));
        }
      } catch (err) {
        console.error("Error fetching opportunity:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunity();
  }, [token]);

  const handleAddRequirement = () => {
    if (currentRequirement.trim()) {
      setAdditionalRequirements([...additionalRequirements, currentRequirement.trim()]);
      setCurrentRequirement("");
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setAdditionalRequirements(additionalRequirements.filter((_, i) => i !== index));
  };

  const formatPhoneNumber = (value: string): string => {
    const phoneNumber = value.replace(/\D/g, "");
    const limitedNumber = phoneNumber.slice(0, 10);
    if (limitedNumber.length <= 3) return limitedNumber;
    if (limitedNumber.length <= 6) return `${limitedNumber.slice(0, 3)}-${limitedNumber.slice(3)}`;
    return `${limitedNumber.slice(0, 3)}-${limitedNumber.slice(3, 6)}-${limitedNumber.slice(6)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (descriptionWordCount > 25) {
      toast({
        title: "Description too long",
        description: "Please limit the description to 25 words or less.",
        variant: "destructive"
      });
      return;
    }

    const selectedDays = Object.entries(daySchedule).filter(([_, schedule]) => schedule.selected);
    if (selectedDays.length === 0) {
      toast({
        title: "Days required",
        description: "Please select at least one day of availability.",
        variant: "destructive"
      });
      return;
    }

    const addressValidation = addressSchema.safeParse(formData.location);
    if (!addressValidation.success) {
      setLocationError(addressValidation.error.errors[0].message);
      toast({
        title: "Invalid address",
        description: addressValidation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    const daysTimesAvailable = selectedDays.map(([day, schedule]) => {
      const dayLabel = DAYS_OF_WEEK.find(d => d.key === day)?.label;
      return `${dayLabel}: ${formatTimeFromHour(schedule.startTime)} - ${formatTimeFromHour(schedule.endTime)}`;
    }).join(", ");

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-opportunity-by-token", {
        body: {
          token,
          updates: {
            type: formData.type,
            role_classification: formData.roleClassification,
            position_title: formData.positionTitle || null,
            description: formData.description,
            location: formData.location,
            on_bus_route: formData.onBusRoute,
            hours_available: formData.hoursAvailable,
            days_times_available: daysTimesAvailable,
            additional_requirements: additionalRequirements.length > 0 ? additionalRequirements.join("; ") : null,
            org_name: formData.orgName,
            org_email: formData.orgEmail,
            org_phone: formData.orgPhone
          }
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Failed to update");
      }

      toast({
        title: "Success!",
        description: "Your opportunity has been updated."
      });
      navigate("/opportunities");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-[#eeeeee]">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-2">
              <Handshake className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Tompkins Opportunity</h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Opportunity Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This edit link is invalid or has expired. Please contact us if you need assistance.
          </p>
          <Link to="/">
            <Button>Return Home</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[#eeeeee]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Tompkins Opportunity</h1>
            </div>
            <Link to="/opportunities">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Opportunities
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h2 className="mb-2 text-3xl font-bold text-foreground">Edit Your Opportunity</h2>
          <p className="text-muted-foreground">Update your listing details below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-card p-8 shadow-sm border border-border">
          <div className="space-y-2">
            <Label htmlFor="type">Type of Opportunity *</Label>
            <Select required value={formData.type} onValueChange={value => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="education">Education & Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleClassification">Role Classification *</Label>
            <Select required value={formData.roleClassification} onValueChange={value => setFormData({ ...formData, roleClassification: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Administrative & Office Support">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Administrative & Office Support</span>
                    <span className="text-xs text-muted-foreground">Clerical tasks, data entry, reception, scheduling</span>
                  </div>
                </SelectItem>
                <SelectItem value="Community Engagement & Public Service">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Community Engagement & Public Service</span>
                    <span className="text-xs text-muted-foreground">Food distribution, neighborhood events, resource navigation</span>
                  </div>
                </SelectItem>
                <SelectItem value="Education & Mentoring">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Education & Mentoring</span>
                    <span className="text-xs text-muted-foreground">Tutoring, coaching, skill-building, youth programs</span>
                  </div>
                </SelectItem>
                <SelectItem value="Human & Social Support Services">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Human & Social Support Services</span>
                    <span className="text-xs text-muted-foreground">Crisis support, companionship, housing/resource advocacy</span>
                  </div>
                </SelectItem>
                <SelectItem value="Physical, Outdoor & Environmental Work">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Physical, Outdoor & Environmental Work</span>
                    <span className="text-xs text-muted-foreground">Cleanup, gardening, construction, sustainability projects</span>
                  </div>
                </SelectItem>
                <SelectItem value="Creative, Media & Communications">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Creative, Media & Communications</span>
                    <span className="text-xs text-muted-foreground">Social media, design, storytelling, performing arts support</span>
                  </div>
                </SelectItem>
                <SelectItem value="Technology & Digital Support">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Technology & Digital Support</span>
                    <span className="text-xs text-muted-foreground">Tech troubleshooting, website/app help, data management</span>
                  </div>
                </SelectItem>
                <SelectItem value="Fundraising & Development">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Fundraising & Development</span>
                    <span className="text-xs text-muted-foreground">Donor outreach, event support, grant support</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="positionTitle">Position Title</Label>
            <Input
              id="positionTitle"
              value={formData.positionTitle}
              onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
              placeholder="e.g., Kitchen Assistant, Office Volunteer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Short Description (25 words max) *</Label>
            <Textarea
              id="description"
              required
              value={formData.description}
              onChange={e => {
                const text = e.target.value;
                setDescriptionWordCount(countWords(text));
                setFormData({ ...formData, description: text });
              }}
              placeholder="Describe the opportunity..."
              rows={4}
            />
            <p className={`text-sm ${descriptionWordCount > 25 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {descriptionWordCount}/25 words
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Service Location(s) *</Label>
            <Input
              id="location"
              required
              value={formData.location}
              onChange={e => {
                setFormData({ ...formData, location: e.target.value });
                setLocationError("");
              }}
              onBlur={e => {
                const result = addressSchema.safeParse(e.target.value);
                if (!result.success && e.target.value) {
                  setLocationError(result.error.errors[0].message);
                }
              }}
              placeholder="e.g., 123 Main St, Ithaca, NY"
              className={locationError ? "border-destructive" : ""}
            />
            {locationError && <p className="text-sm text-destructive">{locationError}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="busRoute"
              checked={formData.onBusRoute}
              onCheckedChange={checked => setFormData({ ...formData, onBusRoute: checked === true })}
            />
            <Label htmlFor="busRoute" className="cursor-pointer">On Bus Route</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Hours Available per Week *</Label>
            <Input
              id="hours"
              type="number"
              required
              min="1"
              value={formData.hoursAvailable}
              onChange={e => setFormData({ ...formData, hoursAvailable: e.target.value })}
              placeholder="e.g., 20"
            />
          </div>

          <div className="space-y-4">
            <Label>Days & Times Available *</Label>
            <p className="text-sm text-muted-foreground">Select days and set available hours for each day</p>
            
            {DAYS_OF_WEEK.map(day => (
              <div key={day.key} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={day.key}
                    checked={daySchedule[day.key].selected}
                    onCheckedChange={checked => setDaySchedule({
                      ...daySchedule,
                      [day.key]: { ...daySchedule[day.key], selected: checked === true }
                    })}
                  />
                  <Label htmlFor={day.key} className="cursor-pointer font-medium">{day.label}</Label>
                </div>
                
                {daySchedule[day.key].selected && (
                  <div className="space-y-3 pl-6 animate-fade-in">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground">Start: </span>
                          <span className="font-medium">{formatTimeFromHour(daySchedule[day.key].startTime)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">End: </span>
                          <span className="font-medium">{formatTimeFromHour(daySchedule[day.key].endTime)}</span>
                        </div>
                      </div>
                      <Slider
                        value={[daySchedule[day.key].startTime, daySchedule[day.key].endTime]}
                        onValueChange={([start, end]) => setDaySchedule({
                          ...daySchedule,
                          [day.key]: { ...daySchedule[day.key], startTime: start, endTime: end }
                        })}
                        min={0}
                        max={23}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Label>Additional Requirements</Label>
            <div className="flex gap-2">
              <Input
                value={currentRequirement}
                onChange={e => setCurrentRequirement(e.target.value)}
                placeholder="e.g., Must be 18+ years old"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRequirement();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddRequirement}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {additionalRequirements.length > 0 && (
              <div className="space-y-2">
                {additionalRequirements.map((req, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg bg-muted p-3">
                    <span className="text-sm">{req}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRequirement(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <h3 className="text-lg font-semibold">Organization Contact Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name *</Label>
              <Input
                id="orgName"
                required
                value={formData.orgName}
                onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                placeholder="e.g., Tompkins County Food Bank"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgEmail">Organization Email *</Label>
              <Input
                id="orgEmail"
                type="email"
                required
                value={formData.orgEmail}
                onChange={e => setFormData({ ...formData, orgEmail: e.target.value })}
                placeholder="e.g., volunteer@organization.org"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgPhone">Organization Phone *</Label>
              <Input
                id="orgPhone"
                type="tel"
                required
                value={formData.orgPhone}
                onChange={e => setFormData({ ...formData, orgPhone: formatPhoneNumber(e.target.value) })}
                placeholder="e.g., 607-555-1234"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </main>

      <footer className="border-t border-border bg-muted/50 py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Questions? Contact Tompkins County DSS at (607) 274-5680</p>
        </div>
      </footer>
    </div>
  );
};

export default EditOpportunity;
