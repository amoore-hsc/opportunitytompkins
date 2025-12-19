import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Handshake, ArrowLeft, Plus, X } from "lucide-react";
import { ElectronicVerificationForms } from "@/components/ElectronicVerificationForms";
import { SkipNavigation } from "@/components/SkipNavigation";
import { VisuallyHidden } from "@/components/VisuallyHidden";
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

const ListOpportunity = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [formError, setFormError] = useState("");
  const [descriptionWordCount, setDescriptionWordCount] = useState(0);
  const [daySchedule, setDaySchedule] = useState<DaySchedule>(
    DAYS_OF_WEEK.reduce((acc, day) => ({
      ...acc,
      [day.key]: {
        selected: false,
        startTime: 9,
        endTime: 17
      }
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
    orgPhone: "",
    acknowledged: false
  });

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
    if (limitedNumber.length <= 3) {
      return limitedNumber;
    } else if (limitedNumber.length <= 6) {
      return `${limitedNumber.slice(0, 3)}-${limitedNumber.slice(3)}`;
    } else {
      return `${limitedNumber.slice(0, 3)}-${limitedNumber.slice(3, 6)}-${limitedNumber.slice(6)}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.acknowledged) {
      setFormError("Please confirm that you will complete the required documentation.");
      toast({
        title: "Acknowledgement required",
        description: "Please confirm that you will complete the required documentation.",
        variant: "destructive"
      });
      return;
    }

    if (descriptionWordCount > 25) {
      setFormError("Please limit the description to 25 words or less.");
      toast({
        title: "Description too long",
        description: "Please limit the description to 25 words or less.",
        variant: "destructive"
      });
      return;
    }

    const selectedDays = Object.entries(daySchedule).filter(([_, schedule]) => schedule.selected);
    if (selectedDays.length === 0) {
      setFormError("Please select at least one day of availability.");
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
      setFormError(addressValidation.error.errors[0].message);
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

    setLoading(true);
    try {
      const { data, error } = await supabase.from("opportunities").insert({
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
      }).select().single();

      if (error) throw error;

      const { error: emailError } = await supabase.functions.invoke("send-confirmation-email", {
        body: {
          orgName: formData.orgName,
          orgEmail: formData.orgEmail,
          opportunityType: formData.type === "volunteer" ? "Volunteer" : "Education & Training",
          roleClassification: formData.roleClassification,
          positionTitle: formData.positionTitle || null,
          additionalRequirements: additionalRequirements.length > 0 ? additionalRequirements.join("; ") : null,
          description: formData.description,
          location: formData.location,
          onBusRoute: formData.onBusRoute,
          hoursAvailable: formData.hoursAvailable,
          daysTimesAvailable: daysTimesAvailable,
          editToken: data.edit_token,
          siteUrl: window.location.origin
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
      }

      toast({
        title: "Success!",
        description: "Your opportunity has been listed. Check your email for confirmation."
      });
      navigate("/opportunities");
    } catch (error: any) {
      setFormError(error.message);
      toast({
        title: "Error",
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
      
      <header className="border-b border-border bg-[#eeeeee]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="h-8 w-8 text-primary" aria-hidden="true" />
              <h1 className="text-2xl font-bold text-foreground">Tompkins County Opportunity Finder</h1>
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

      <main id="main-content" className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h2 className="mb-2 text-3xl font-bold text-foreground">List an Opportunity</h2>
        </div>

        {/* Form error announcement for screen readers */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {formError && <p role="alert">{formError}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-card p-8 shadow-sm border border-border">
          <div className="space-y-2">
            <Label htmlFor="type">
              Type of Opportunity <span aria-hidden="true">*</span>
              <VisuallyHidden>(required)</VisuallyHidden>
            </Label>
            <Select required value={formData.type} onValueChange={value => setFormData({ ...formData, type: value })}>
              <SelectTrigger id="type" aria-required="true">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="education">Education & Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleClassification">
              Role Classification <span aria-hidden="true">*</span>
              <VisuallyHidden>(required)</VisuallyHidden>
            </Label>
            <Select required value={formData.roleClassification} onValueChange={value => setFormData({ ...formData, roleClassification: value })}>
              <SelectTrigger id="roleClassification" aria-required="true">
                <SelectValue placeholder="Select classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Administrative & Office Support">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Administrative & Office Support</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground group-data-[highlighted]:text-foreground">Clerical tasks, data entry, reception, scheduling</span>
                  </div>
                </SelectItem>
                <SelectItem value="Community Engagement & Public Service">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Community Engagement & Public Service</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground group-data-[highlighted]:text-foreground">Food distribution, neighborhood events, resource navigation</span>
                  </div>
                </SelectItem>
                <SelectItem value="Education & Mentoring">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Education & Mentoring</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground group-data-[highlighted]:text-foreground">Tutoring, coaching, skill-building, youth programs</span>
                  </div>
                </SelectItem>
                <SelectItem value="Human & Social Support Services">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Human & Social Support Services</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground group-data-[highlighted]:text-foreground">Crisis support, companionship, housing/resource advocacy</span>
                  </div>
                </SelectItem>
                <SelectItem value="Physical, Outdoor & Environmental Work">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Physical, Outdoor & Environmental Work</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground group-data-[highlighted]:text-foreground">Cleanup, gardening, construction, sustainability projects</span>
                  </div>
                </SelectItem>
                <SelectItem value="Creative, Media & Communications">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Creative, Media & Communications</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground group-data-[highlighted]:text-foreground">Social media, design, storytelling, performing arts support</span>
                  </div>
                </SelectItem>
                <SelectItem value="Technology & Digital Support">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Technology & Digital Support</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground group-data-[highlighted]:text-foreground">Tech troubleshooting, website/app help, data management</span>
                  </div>
                </SelectItem>
                <SelectItem value="Fundraising & Development">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">Fundraising & Development</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground group-data-[highlighted]:text-foreground">Donor outreach, event support, grant support</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="positionTitle">
              Position Title <span aria-hidden="true">*</span>
              <VisuallyHidden>(required)</VisuallyHidden>
            </Label>
            <Input
              id="positionTitle"
              required
              aria-required="true"
              value={formData.positionTitle}
              onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
              placeholder="e.g., Kitchen Assistant, Office Volunteer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Short Description (25 words max) <span aria-hidden="true">*</span>
              <VisuallyHidden>(required)</VisuallyHidden>
            </Label>
            <Textarea
              id="description"
              required
              aria-required="true"
              aria-invalid={descriptionWordCount > 25}
              aria-describedby="description-count"
              value={formData.description}
              onChange={e => {
                const text = e.target.value;
                const wordCount = countWords(text);
                setDescriptionWordCount(wordCount);
                setFormData({ ...formData, description: text });
              }}
              placeholder="Describe the opportunity..."
              rows={4}
            />
            <p id="description-count" className={`text-sm ${descriptionWordCount > 25 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {descriptionWordCount}/25 words
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">
              Service Location(s) <span aria-hidden="true">*</span>
              <VisuallyHidden>(required)</VisuallyHidden>
            </Label>
            <Input
              id="location"
              required
              aria-required="true"
              aria-invalid={!!locationError}
              aria-describedby={locationError ? "location-error" : undefined}
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
            {locationError && (
              <p id="location-error" className="text-sm text-destructive" role="alert">
                {locationError}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="busRoute"
              checked={formData.onBusRoute}
              onCheckedChange={checked => setFormData({ ...formData, onBusRoute: checked === true })}
            />
            <Label htmlFor="busRoute" className="cursor-pointer">
              On Bus Route
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">
              Hours Available per Week <span aria-hidden="true">*</span>
              <VisuallyHidden>(required)</VisuallyHidden>
            </Label>
            <Input
              id="hours"
              type="number"
              required
              aria-required="true"
              min="1"
              value={formData.hoursAvailable}
              onChange={e => setFormData({ ...formData, hoursAvailable: e.target.value })}
              placeholder="e.g., 20"
            />
          </div>

          <div className="space-y-4">
            <Label id="days-times-label">
              Days & Times Available <span aria-hidden="true">*</span>
              <VisuallyHidden>(required)</VisuallyHidden>
            </Label>
            <p className="text-sm text-muted-foreground">Select days and set available hours for each day</p>
            
            <div role="group" aria-labelledby="days-times-label">
              {DAYS_OF_WEEK.map(day => (
                <div key={day.key} className="space-y-3 rounded-lg border border-border p-4 mb-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={day.key}
                      checked={daySchedule[day.key].selected}
                      onCheckedChange={checked => setDaySchedule({
                        ...daySchedule,
                        [day.key]: {
                          ...daySchedule[day.key],
                          selected: checked === true
                        }
                      })}
                    />
                    <Label htmlFor={day.key} className="cursor-pointer font-medium">
                      {day.label}
                    </Label>
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
                          aria-label={`${day.label} time range, from ${formatTimeFromHour(daySchedule[day.key].startTime)} to ${formatTimeFromHour(daySchedule[day.key].endTime)}`}
                          value={[daySchedule[day.key].startTime, daySchedule[day.key].endTime]}
                          onValueChange={([start, end]) => setDaySchedule({
                            ...daySchedule,
                            [day.key]: {
                              ...daySchedule[day.key],
                              startTime: start,
                              endTime: end
                            }
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
          </div>

          <div className="space-y-4">
            <Label htmlFor="standardRequirements">Standard Requirements</Label>
            <p className="text-sm text-muted-foreground">Add any requirements for workers or volunteers in your organization (e.g., Driver's license)</p>
            
            <div className="flex gap-2">
              <Input
                id="standardRequirements"
                value={currentRequirement}
                onChange={e => setCurrentRequirement(e.target.value)}
                onKeyPress={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddRequirement();
                  }
                }}
                placeholder="e.g., Driver's license required"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddRequirement}
                size="icon"
                variant="outline"
                disabled={!currentRequirement.trim()}
                aria-label="Add requirement"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {additionalRequirements.length > 0 && (
              <div className="space-y-2 animate-fade-in">
                {additionalRequirements.map((requirement, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2">
                    <span className="text-sm">{requirement}</span>
                    <Button
                      type="button"
                      onClick={() => handleRemoveRequirement(index)}
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      aria-label={`Remove requirement: ${requirement}`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Organization Contact Information</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">
                  Organization Name <span aria-hidden="true">*</span>
                  <VisuallyHidden>(required)</VisuallyHidden>
                </Label>
                <Input
                  id="orgName"
                  required
                  aria-required="true"
                  value={formData.orgName}
                  onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">
                  Contact Name <span aria-hidden="true">*</span>
                  <VisuallyHidden>(required)</VisuallyHidden>
                </Label>
                <Input
                  id="contactName"
                  required
                  aria-required="true"
                  value={formData.contactName}
                  onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgEmail">
                  Email <span aria-hidden="true">*</span>
                  <VisuallyHidden>(required)</VisuallyHidden>
                </Label>
                <Input
                  id="orgEmail"
                  type="email"
                  required
                  aria-required="true"
                  value={formData.orgEmail}
                  onChange={e => setFormData({ ...formData, orgEmail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgPhone">
                  Phone <span aria-hidden="true">*</span>
                  <VisuallyHidden>(required)</VisuallyHidden>
                </Label>
                <Input
                  id="orgPhone"
                  type="tel"
                  required
                  aria-required="true"
                  value={formData.orgPhone}
                  onChange={e => setFormData({ ...formData, orgPhone: formatPhoneNumber(e.target.value) })}
                  placeholder="555-555-5555"
                  maxLength={12}
                />
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2 rounded-lg bg-muted p-4">
            <Checkbox
              id="acknowledged"
              checked={formData.acknowledged}
              onCheckedChange={checked => setFormData({ ...formData, acknowledged: checked === true })}
              aria-required="true"
            />
            <Label htmlFor="acknowledged" className="cursor-pointer text-sm">
              I confirm that I am a non-profit or public organization and will complete the required 
              documentation on behalf of the beneficiary. <span aria-hidden="true">*</span>
              <VisuallyHidden>(required)</VisuallyHidden>
            </Label>
          </div>

          <Button type="submit" size="lg" disabled={loading} className="w-full bg-success">
            {loading ? "Submitting..." : "Submit Opportunity"}
          </Button>
        </form>
      </main>

      <footer className="border-t border-border bg-card py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            Need help with your listing? Email{" "}
            <a href="mailto:rhinton@uwtc.org" className="text-primary hover:underline">
              rhinton@uwtc.org
            </a>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Powered by Tompkins County Opportunity Finder</p>
        </div>
      </footer>
    </div>
  );
};

export default ListOpportunity;
