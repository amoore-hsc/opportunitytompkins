import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, X } from "lucide-react";
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
import { triggerConfetti } from "@/lib/confetti";
import { z } from "zod";
import { siteConfig } from "@/config";

const isValidAddressPattern = (address: string): boolean => {
  const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);
  if (parts.length >= 2) {
    return true;
  }
  const streetIndicators = /\b(st|ave|rd|dr|ln|blvd|street|avenue|road|drive|lane|boulevard|way|court|ct|place|pl|pkwy|parkway|cir|circle|ter|terrace|hwy|highway)\.?\s+/i;
  if (streetIndicators.test(address)) {
    const afterStreet = address.split(streetIndicators).pop()?.trim();
    return !!afterStreet && afterStreet.length > 0;
  }
  return false;
};

const addressSchema = z.string().min(1, "Address is required").refine(val => {
  return isValidAddressPattern(val);
}, {
  message: "Please enter a complete address with street and city (e.g., 123 Main St, Ithaca or 123 Main St Ithaca)"
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
  const wholeHour = Math.floor(hour);
  const minutes = hour % 1 === 0.5 ? "30" : "00";
  const period = wholeHour >= 12 ? "PM" : "AM";
  const displayHour = wholeHour === 0 ? 12 : wholeHour > 12 ? wholeHour - 12 : wholeHour;
  return `${displayHour}:${minutes} ${period}`;
};

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const PROGRAM_COMPONENTS = [
  { value: "GED", label: "GED", description: "General Educational Development preparation and testing" },
  { value: "English as a Second Language (ESL)", label: "English as a Second Language (ESL)", description: "Language courses for non-native English speakers" },
  { value: "Work-Based Learning", label: "Work-Based Learning", description: "Internships, apprenticeships, on-the-job training, etc." },
  { value: "Job Search", label: "Job Search", description: "Resume building, interview prep, job placement assistance" },
  { value: "Adult Basic Education", label: "Adult Basic Education", description: "Foundational literacy, numeracy, and academic skills" },
  { value: "Vocational or Technical Training", label: "Vocational or Technical Training", description: "Trade-specific skills and certification programs" },
  { value: "Job Readiness Training", label: "Job Readiness Training", description: "Workplace skills, professional development, soft skills" },
  { value: "Other", label: "Other", description: "Other education and training programs" }
];

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
  const [flexibleTime, setFlexibleTime] = useState(false);
  const [additionalRequirements, setAdditionalRequirements] = useState<string[]>([]);
  const [currentRequirement, setCurrentRequirement] = useState("");
  const [locationType, setLocationType] = useState("");
  const [sameContact, setSameContact] = useState(true);
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
    adminContactName: "",
    adminEmail: "",
    acknowledged: false,
    programName: "",
    website: "",
    programComponents: [] as string[]
  });

  const isEducation = formData.type === "education";

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

    // Schedule validation - required for volunteer, optional for education
    const selectedDays = Object.entries(daySchedule).filter(([_, schedule]) => schedule.selected);
    if (!isEducation && selectedDays.length === 0) {
      setFormError("Please select at least one day of availability.");
      toast({
        title: "Days required",
        description: "Please select at least one day of availability.",
        variant: "destructive"
      });
      return;
    }

    if (!isEducation && locationType === "specific") {
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
    }

    const daysTimesAvailable = selectedDays.length > 0
      ? selectedDays.map(([day, schedule]) => {
          const dayLabel = DAYS_OF_WEEK.find(d => d.key === day)?.label;
          if (flexibleTime) {
            return `${dayLabel}: Flexible`;
          }
          return `${dayLabel}: ${formatTimeFromHour(schedule.startTime)} - ${formatTimeFromHour(schedule.endTime)}`;
        }).join(", ")
      : "N/A";

    setLoading(true);
    try {
      const baseData = {
        type: formData.type,
        description: formData.description,
        hours_available: formData.hoursAvailable,
        days_times_available: daysTimesAvailable,
        additional_requirements: additionalRequirements.length > 0 ? additionalRequirements.join("; ") : null,
        org_name: formData.orgName,
        org_email: formData.orgEmail,
      };

      const insertData = isEducation
        ? {
            ...baseData,
            program_name: formData.programName || null,
            website: formData.website,
            program_components: formData.programComponents.length > 0 ? formData.programComponents.join(", ") : null,
            location: "N/A",
            on_bus_route: false,
            org_phone: "N/A",
            contact_name: formData.contactName || null,
          }
        : {
            ...baseData,
            role_classification: formData.roleClassification,
            position_title: formData.positionTitle || null,
            location: formData.location,
            on_bus_route: formData.onBusRoute,
            contact_name: formData.contactName,
            org_phone: formData.orgPhone,
            admin_contact_name: sameContact ? null : formData.adminContactName,
            admin_email: sameContact ? null : formData.adminEmail,
          };

      const { data, error } = await supabase.from("opportunities").insert(insertData).select().single();

      if (error) throw error;

      // Send confirmation email for all listing types
      const adminEmail = !isEducation && !sameContact ? formData.adminEmail : null;
      const adminContactName = !isEducation && !sameContact ? formData.adminContactName : null;
      const confirmationEmail = adminEmail || formData.orgEmail;
      const confirmationName = adminContactName || formData.contactName || formData.orgName;

      const emailBody: Record<string, any> = {
        orgName: formData.orgName,
        contactName: confirmationName,
        orgEmail: confirmationEmail,
        opportunityType: isEducation ? "Education & Training" : "Volunteer",
        roleClassification: formData.roleClassification,
        positionTitle: formData.positionTitle || null,
        additionalRequirements: additionalRequirements.length > 0 ? additionalRequirements.join("; ") : null,
        description: formData.description,
        location: formData.location,
        onBusRoute: formData.onBusRoute,
        hoursAvailable: formData.hoursAvailable,
        daysTimesAvailable: daysTimesAvailable,
        editToken: data.edit_token,
        siteUrl: window.location.origin,
      };

      if (isEducation) {
        emailBody.programName = formData.programName || null;
        emailBody.website = formData.website || null;
        emailBody.programComponents = formData.programComponents.length > 0 ? formData.programComponents.join(", ") : null;
      }

      const { error: emailError } = await supabase.functions.invoke("send-confirmation-email", {
        body: emailBody,
      });

      if (emailError) {
        console.error("Email error:", emailError);
      }

      triggerConfetti();
      
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
    <div className="min-h-dvh bg-background">
      <SkipNavigation />
      
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="" aria-hidden="true" className="h-8 w-8" />
              <h1 className="text-2xl font-bold text-foreground">{siteConfig.siteName}</h1>
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
              Type of Opportunity <span aria-hidden="true" className="text-destructive">*</span>
              <VisuallyHidden>(required)</VisuallyHidden>
            </Label>
            <Select required value={formData.type} onValueChange={value => {
              setFormData({ ...formData, type: value });
              setFormError("");
            }}>
              <SelectTrigger id="type" aria-required="true">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="education">Education & Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ===== VOLUNTEER-ONLY FIELDS ===== */}
          {!isEducation && formData.type && (
            <>
              <div className="space-y-2">
                <Label htmlFor="roleClassification">
                  Role Classification <span aria-hidden="true" className="text-destructive">*</span>
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
                <Label htmlFor="orgName">
                  Organization Name <span aria-hidden="true" className="text-destructive">*</span>
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
                <Label htmlFor="positionTitle">
                  Position Title <span aria-hidden="true" className="text-destructive">*</span>
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
            </>
          )}

          {/* ===== SHARED FIELDS ===== */}
          {formData.type && (
            <>

          {/* ===== EDUCATION-ONLY FIELDS ===== */}
          {isEducation && (
            <>
              <div className="space-y-2">
                <Label htmlFor="orgName">
                  Organization Name <span aria-hidden="true" className="text-destructive">*</span>
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
                <Label htmlFor="programName">
                  Program Name <span aria-hidden="true" className="text-destructive">*</span>
                  <VisuallyHidden>(required)</VisuallyHidden>
                </Label>
                <Input
                  id="programName"
                  required
                  aria-required="true"
                  value={formData.programName}
                  onChange={(e) => setFormData({ ...formData, programName: e.target.value })}
                  placeholder="e.g., GED Preparation Program"
                />
              </div>

              <div className="space-y-2" role="group" aria-labelledby="programComponents-label">
                <Label id="programComponents-label">
                  Program Components <span aria-hidden="true" className="text-destructive">*</span>
                  <VisuallyHidden>(required, select one or more)</VisuallyHidden>
                </Label>
                <div className="space-y-3 rounded-md border border-border p-4">
                  {PROGRAM_COMPONENTS.map(pc => (
                    <div key={pc.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={`pc-${pc.value}`}
                        checked={formData.programComponents.includes(pc.value)}
                        onCheckedChange={(checked) => {
                          setFormData(prev => ({
                            ...prev,
                            programComponents: checked
                              ? [...prev.programComponents, pc.value]
                              : prev.programComponents.filter(v => v !== pc.value)
                          }));
                        }}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <Label htmlFor={`pc-${pc.value}`} className="cursor-pointer font-medium">
                          {pc.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{pc.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website *</Label>
                <Input
                  id="website"
                  type="url"
                  required
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="e.g., https://www.example.org/program"
                />
              </div>
            </>
          )}

              <div className="space-y-2">
                <Label htmlFor="description">
                  {isEducation ? "Program Description" : "Short Description"} (25 words max) <span aria-hidden="true" className="text-destructive">*</span>
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
                  placeholder={isEducation ? "Describe the program..." : "Describe the opportunity..."}
                  rows={4}
                />
                <p id="description-count" className={`text-sm ${descriptionWordCount > 25 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {descriptionWordCount}/25 words
                </p>
              </div>

              {/* Location - volunteer only */}
              {!isEducation && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="locationType">
                      Service Location <span aria-hidden="true" className="text-destructive">*</span>
                      <VisuallyHidden>(required)</VisuallyHidden>
                    </Label>
                    <Select
                      required
                      value={locationType}
                      onValueChange={value => {
                        setLocationType(value);
                        setLocationError("");
                        if (value === "general") {
                          setFormData({ ...formData, location: siteConfig.countyName, onBusRoute: false });
                        } else if (value === "remote") {
                          setFormData({ ...formData, location: "Remote", onBusRoute: false });
                        } else {
                          setFormData({ ...formData, location: "" });
                        }
                      }}
                    >
                      <SelectTrigger id="locationType" aria-required="true">
                        <SelectValue placeholder="Select location type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="specific">Specific Address</SelectItem>
                        <SelectItem value="general">{siteConfig.countyName}</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {locationType === "specific" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="location">
                          Address <span aria-hidden="true" className="text-destructive">*</span>
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
                          placeholder="e.g., 123 Main St Ithaca"
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
                    </>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="hours">
                  Hours Available per Week <span aria-hidden="true" className="text-destructive">*</span>
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
                  {isEducation ? "Schedule" : "Days & Times Available"} {!isEducation && <span aria-hidden="true" className="text-destructive">*</span>}
                  {isEducation && <span className="text-sm font-normal text-muted-foreground ml-1">(optional)</span>}
                  {!isEducation && <VisuallyHidden>(required)</VisuallyHidden>}
                </Label>
                <p className="text-sm text-muted-foreground">Select days and set available hours for each day</p>
                
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="flexible-time"
                    checked={flexibleTime}
                    onCheckedChange={checked => setFlexibleTime(checked === true)}
                  />
                  <Label htmlFor="flexible-time" className="cursor-pointer text-sm">
                    Flexible Hours
                  </Label>
                </div>

                <div role="group" aria-labelledby="days-times-label" className={flexibleTime ? "flex flex-wrap gap-2" : "space-y-3"}>
                  {DAYS_OF_WEEK.map(day => (
                    flexibleTime ? (
                      <label
                        key={day.key}
                        htmlFor={day.key}
                        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors ${
                          daySchedule[day.key].selected ? 'border-primary bg-primary/10 font-medium' : 'border-border bg-background'
                        }`}
                      >
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
                        {day.label}
                      </label>
                    ) : (
                      <div key={day.key} className="space-y-3 rounded-lg border border-border p-4">
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
                          <div className="space-y-2 pl-6 animate-fade-in">
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
                              max={23.5}
                              step={0.5}
                              className="w-full [&_.slider-range]:bg-green-500 [&_.slider-track]:bg-muted [&_.slider-track]:h-3"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>12 AM</span>
                              <span>6 AM</span>
                              <span>12 PM</span>
                              <span>6 PM</span>
                              <span>11 PM</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="standardRequirements">{isEducation ? "Minimum Requirements" : "Standard Requirements"}</Label>
                <p className="text-sm text-muted-foreground">
                  {isEducation
                    ? "Add any minimum requirements for this program (optional)"
                    : "Add any requirements for workers or volunteers in your organization (e.g., Driver's license)"}
                </p>
                
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
                    placeholder={isEducation ? "e.g., Must be 18 or older" : "e.g., Driver's license required"}
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

              {/* Contact info - volunteer only */}
              {!isEducation && (
                <div className="border-t border-border pt-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Organization Contact Information</h3>
                  
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-foreground pt-2">Public Contact (shown to applicants)</h4>

                    <div className="space-y-2">
                      <Label htmlFor="contactName">
                        Contact Name <span aria-hidden="true" className="text-destructive">*</span>
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
                        Email <span aria-hidden="true" className="text-destructive">*</span>
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
                        Phone <span aria-hidden="true" className="text-destructive">*</span>
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

                    <h4 className="text-md font-medium text-foreground pt-4">Admin Contact (receives confirmation emails & edit link)</h4>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sameContact"
                        checked={sameContact}
                        onCheckedChange={checked => setSameContact(checked === true)}
                      />
                      <Label htmlFor="sameContact" className="cursor-pointer">
                        Same as public contact
                      </Label>
                    </div>

                    {!sameContact && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="space-y-2">
                          <Label htmlFor="adminContactName">
                            Admin Contact Name <span aria-hidden="true" className="text-destructive">*</span>
                            <VisuallyHidden>(required)</VisuallyHidden>
                          </Label>
                          <Input
                            id="adminContactName"
                            required
                            aria-required="true"
                            value={formData.adminContactName}
                            onChange={e => setFormData({ ...formData, adminContactName: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adminEmail">
                            Admin Email <span aria-hidden="true" className="text-destructive">*</span>
                            <VisuallyHidden>(required)</VisuallyHidden>
                          </Label>
                          <Input
                            id="adminEmail"
                            type="email"
                            required
                            aria-required="true"
                            value={formData.adminEmail}
                            onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Education contact - just email for edit link */}
              {isEducation && (
                <div className="border-t border-border pt-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">Contact Information</h3>
                  <p className="text-sm text-muted-foreground mb-4">This information will not be displayed publicly, it will only be available to platform administrators. The provided email will receive a confirmation email enabling you to modify and remove your posting.</p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">
                        Contact Name <span aria-hidden="true" className="text-destructive">*</span>
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
                        Contact Email <span aria-hidden="true" className="text-destructive">*</span>
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
                  </div>
                </div>
              )}

              {/* Acknowledgement */}
              {formData.type && (
                <div className="flex items-start space-x-2 rounded-lg bg-muted p-4">
                  <Checkbox
                    id="acknowledged"
                    checked={formData.acknowledged}
                    onCheckedChange={checked => setFormData({ ...formData, acknowledged: checked === true })}
                    aria-required="true"
                  />
                  <Label htmlFor="acknowledged" className="cursor-pointer text-sm">
                    {isEducation
                      ? "I confirm I will complete the required documentation on behalf of the beneficiary."
                      : "I confirm that I am a non-profit or public organization and will complete the required documentation on behalf of the beneficiary."
                    } <span aria-hidden="true" className="text-destructive">*</span>
                    <VisuallyHidden>(required)</VisuallyHidden>
                  </Label>
                </div>
              )}

              <Button type="submit" size="lg" disabled={loading} className="w-full bg-success">
                {loading ? "Submitting..." : isEducation ? "Submit Program" : "Submit Opportunity"}
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-3">
                Once an opportunity has been submitted, you will receive a confirmation email from <span className="whitespace-nowrap">{siteConfig.fromEmail}</span>. Please check your spam folder if you did not receive an email.
              </p>
            </>
          )}
        </form>
      </main>
    </div>
  );
};

export default ListOpportunity;
