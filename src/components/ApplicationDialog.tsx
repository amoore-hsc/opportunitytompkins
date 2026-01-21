import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Opportunity } from "@/pages/Opportunities";

interface ApplicationDialogProps {
  opportunity: Opportunity;
  children?: React.ReactNode;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export const ApplicationDialog = ({ 
  opportunity, 
  children, 
  externalOpen, 
  onExternalOpenChange 
}: ApplicationDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (onExternalOpenChange || (() => {})) : setInternalOpen;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    hoursRequested: "",
    availabilityConfirmed: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.availabilityConfirmed) {
      toast({
        title: "Confirmation required",
        description: "Please confirm your availability.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("send-application-email", {
        body: {
          clientName: formData.name,
          clientEmail: formData.email,
          clientPhone: formData.phone,
          hoursRequested: formData.hoursRequested,
          orgEmail: opportunity.org_email,
          orgName: opportunity.org_name,
          orgPhone: opportunity.org_phone,
          contactName: opportunity.contact_name || opportunity.org_name,
          opportunityDescription: opportunity.description,
          opportunityType: opportunity.type === "volunteer" ? "Volunteer" : "Education & Training",
          positionTitle: opportunity.position_title || "",
          opportunityId: opportunity.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Application sent!",
        description: "The organization will contact you soon.",
      });

      setOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        hoursRequested: "",
        availabilityConfirmed: false,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for Opportunity</DialogTitle>
          <DialogDescription>
            Fill out your information and we'll send it to {opportunity.org_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Hours Requested *</Label>
            <Input
              id="hours"
              required
              value={formData.hoursRequested}
              onChange={(e) => setFormData({ ...formData, hoursRequested: e.target.value })}
              placeholder="e.g., 20 hours/week"
            />
          </div>

          <div className="flex items-start space-x-2 rounded-lg bg-muted p-3">
            <Checkbox
              id="availability"
              checked={formData.availabilityConfirmed}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, availabilityConfirmed: checked === true })
              }
            />
            <Label htmlFor="availability" className="cursor-pointer text-sm">
              I confirm that I can be available during the listed days and times. *
            </Label>
          </div>

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
            {loading ? "Sending..." : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};