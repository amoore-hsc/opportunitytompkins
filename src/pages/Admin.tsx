import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { Handshake, ArrowLeft, Pencil, Trash2, LogOut, AlertTriangle, Mail, Eye, EyeOff, Send, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { User, Session } from "@supabase/supabase-js";
import { UserSubmittedJobsSection } from "@/components/UserSubmittedJobsSection";

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
  { key: "sunday", label: "Sunday" },
];

const formatTimeFromHour = (hour: number): string => {
  const wholeHour = Math.floor(hour);
  const minutes = hour % 1 === 0.5 ? "30" : "00";
  const period = wholeHour >= 12 ? "PM" : "AM";
  const displayHour = wholeHour === 0 ? 12 : wholeHour > 12 ? wholeHour - 12 : wholeHour;
  return `${displayHour}:${minutes} ${period}`;
};

const parseTimeToHour = (timeStr: string): number => {
  const match = timeStr.match(/(\d+):00\s*(AM|PM)/i);
  if (!match) return 9;
  let hour = parseInt(match[1]);
  const period = match[2].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour;
};

const parseDaysTimesAvailable = (daysTimesStr: string): { schedule: DaySchedule; isFlexible: boolean } => {
  const schedule: DaySchedule = DAYS_OF_WEEK.reduce((acc, day) => ({
    ...acc,
    [day.key]: { selected: false, startTime: 9, endTime: 17 }
  }), {});

  if (!daysTimesStr) return { schedule, isFlexible: false };

  let isFlexible = false;
  const entries = daysTimesStr.split(", ");
  entries.forEach(entry => {
    // Handle "Day: Flexible" format
    const flexMatch = entry.match(/^(\w+):\s*Flexible$/i);
    if (flexMatch) {
      const dayLabel = flexMatch[1];
      const dayKey = DAYS_OF_WEEK.find(d => d.label.toLowerCase() === dayLabel.toLowerCase())?.key;
      if (dayKey) {
        schedule[dayKey] = { selected: true, startTime: 9, endTime: 17 };
        isFlexible = true;
      }
      return;
    }
    const match = entry.match(/^(\w+):\s*(.+)\s*-\s*(.+)$/);
    if (match) {
      const dayLabel = match[1];
      const startTime = parseTimeToHour(match[2].trim());
      const endTime = parseTimeToHour(match[3].trim());
      const dayKey = DAYS_OF_WEEK.find(d => d.label.toLowerCase() === dayLabel.toLowerCase())?.key;
      if (dayKey) {
        schedule[dayKey] = { selected: true, startTime, endTime };
      }
    }
  });

  return { schedule, isFlexible };
};

const formatDayScheduleToString = (schedule: DaySchedule, flexible: boolean = false): string => {
  return Object.entries(schedule)
    .filter(([_, s]) => s.selected)
    .map(([day, s]) => {
      const dayLabel = DAYS_OF_WEEK.find(d => d.key === day)?.label;
      if (flexible) {
        return `${dayLabel}: Flexible`;
      }
      return `${dayLabel}: ${formatTimeFromHour(s.startTime)} - ${formatTimeFromHour(s.endTime)}`;
    })
    .join(", ");
};

const PROGRAM_COMPONENTS = [
  { value: "GED", label: "GED" },
  { value: "English as a Second Language (ESL)", label: "English as a Second Language (ESL)" },
  { value: "Work-Based Learning", label: "Work-Based Learning" },
  { value: "Job Search", label: "Job Search" },
  { value: "Adult Basic Education", label: "Adult Basic Education" },
  { value: "Vocational or Technical Training", label: "Vocational or Technical Training" },
  { value: "Job Readiness Training", label: "Job Readiness Training" },
  { value: "Other", label: "Other" },
];

interface Opportunity {
  id: string;
  type: string;
  role_classification: string | null;
  position_title: string | null;
  description: string;
  location: string;
  on_bus_route: boolean;
  hours_available: string;
  days_times_available: string;
  additional_requirements: string | null;
  org_name: string;
  contact_name: string | null;
  org_email: string;
  org_phone: string;
  admin_contact_name: string | null;
  admin_email: string | null;
  active: boolean;
  updated_at: string;
  edit_token: string;
  program_name: string | null;
  website: string | null;
  program_components: string | null;
  manual_reminder_count?: number | null;
  last_manual_reminder_at?: string | null;
  reminder_sent_at?: string | null;
}


const StaleListingsAlert = ({
  opportunities,
  onReminderSent,
}: {
  opportunities: Opportunity[];
  onReminderSent: () => void;
}) => {
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const staleListings = useMemo(() => {
    const now = new Date();
    return opportunities.filter(opp =>
      opp.active && differenceInDays(now, new Date(opp.updated_at)) >= 90
    );
  }, [opportunities]);

  if (staleListings.length === 0) return null;

  const handleResend = async (listing: Opportunity) => {
    setSendingId(listing.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-listing-reminder", {
        body: { opportunityId: listing.id },
      });
      if (error) throw error;
      toast({
        title: "Reminder sent",
        description: `"Your Listing Needs Attention" email resent${data?.recipient ? ` to ${data.recipient}` : ""}.`,
      });
      onReminderSent();
    } catch (err: any) {
      toast({
        title: "Failed to send reminder",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-destructive">
            {staleListings.length} {staleListings.length === 1 ? 'listing has' : 'listings have'} not been updated in 60+ days
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-destructive/80">
            {staleListings.map(listing => {
              const count = listing.manual_reminder_count || 0;
              return (
                <li key={listing.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-destructive/20 bg-background/40 p-2">
                  <div className="min-w-0">
                    <span className="font-medium">{listing.position_title || listing.org_name}</span>
                    {listing.position_title && <span className="text-destructive/60"> — {listing.org_name}</span>}
                    <div className="text-xs text-destructive/60">
                      Updated {formatDistanceToNow(new Date(listing.updated_at), { addSuffix: true })}
                      {" · "}
                      Reminder sent {count} {count === 1 ? 'time' : 'times'}
                      {listing.last_manual_reminder_at && (
                        <> · last {formatDistanceToNow(new Date(listing.last_manual_reminder_at), { addSuffix: true })}</>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResend(listing)}
                      disabled={sendingId !== null}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {sendingId === listing.id ? "Sending…" : count > 0 ? "Resend reminder" : "Send reminder"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};


const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [previewingEmailOpp, setPreviewingEmailOpp] = useState<Opportunity | null>(null);
  const [editFlexibleTime, setEditFlexibleTime] = useState(false);
  const [editLocationType, setEditLocationType] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // If we arrived via a password recovery email link, establish a session and show the
    // "Set new password" UI.
    // NOTE: Some recovery links put params in the URL hash (e.g. #access_token=...&type=recovery)
    // rather than the query string.
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

    const type = url.searchParams.get("type") ?? hashParams.get("type");
    const code = url.searchParams.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    const clearAuthParamsFromUrl = () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    const establishRecoverySession = async () => {
      if (type !== "recovery") return;

      setIsResetPassword(true);

      // PKCE flow (code in query string)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          toast({
            title: "Password reset link error",
            description: error.message,
            variant: "destructive",
          });
        }
        clearAuthParamsFromUrl();
        return;
      }

      // Implicit flow (tokens in hash)
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          toast({
            title: "Password reset link error",
            description: error.message,
            variant: "destructive",
          });
        }
        clearAuthParamsFromUrl();
      }
    };

    // Don't block the rest of auth initialization.
    void establishRecoverySession();

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "PASSWORD_RECOVERY") {
          setIsResetPassword(true);
        }
        
        // Check admin role after auth state changes
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking admin role:", error);
      }
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAllOpportunities();
    }
  }, [isAdmin]);

  const fetchAllOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("active", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`
          }
        });

        if (error) {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
          setLoading(false);
        } else {
          toast({
            title: "Account Created",
            description: "You can now sign in. Note: You won't have admin access until an administrator grants it.",
          });
          setIsSignUp(false);
          setLoading(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
          setLoading(false);
        }
        // Don't set loading to false on success - let checkAdminRole handle it via onAuthStateChange
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: "Password Reset Email Sent",
          description: "Check your inbox for a link to reset your password.",
        });
      }
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      toast({
        title: "Missing password",
        description: "Please enter a new password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });

      setIsResetPassword(false);
      setNewPassword("");
      setConfirmNewPassword("");
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  const handleResendEmail = async (opp: Opportunity) => {
    setSendingEmailId(opp.id);

    try {
      const siteUrl = window.location.origin;

      const { error } = await supabase.functions.invoke("send-confirmation-email", {
        body: {
          orgName: opp.org_name,
          contactName: opp.admin_contact_name || opp.contact_name || opp.org_name,
          orgEmail: opp.admin_email || opp.org_email,
          opportunityType: opp.type,
          roleClassification: opp.role_classification,
          positionTitle: opp.position_title,
          additionalRequirements: opp.additional_requirements,
          description: opp.description,
          location: opp.location,
          onBusRoute: opp.on_bus_route,
          hoursAvailable: opp.hours_available,
          daysTimesAvailable: opp.days_times_available,
          editToken: opp.edit_token,
          siteUrl,
        },
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Confirmation email resent to ${opp.admin_email || opp.org_email}`,
      });
    } catch (error: any) {
      console.error("Error resending email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend email",
        variant: "destructive",
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  const generateEmailPreviewHtml = (opp: Opportunity): string => {
    const siteUrl = window.location.origin;
    const editUrl = `${siteUrl}/edit-opportunity/${opp.edit_token}`;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Listing Confirmation</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#333333; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
<tr>
<td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; max-width:600px; border-radius:8px; overflow:hidden;">

<!-- Header -->
<tr>
<td style="background-color:#1e3a5f; padding:30px; text-align:center;">
<h1 style="margin:0; font-size:28px; color:#ffffff;">⭐ Thank You for Supporting<br>Our Community ⭐</h1>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding:30px;">

<p style="margin:0 0 25px 0;">Your opportunity has been successfully published. Use this email to review your post and edit the listing with any corrections OR to remove the posting when the opportunity is filled.</p>

<!-- Your Listing Details Card -->
<div style="background-color:#f0f7ff; border-left:4px solid #1e3a5f; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#1e3a5f;">Your Listing Details</h2>
<p style="margin:0 0 8px 0;"><strong>Type:</strong> ${opp.type}</p>
<p style="margin:0 0 8px 0;"><strong>Role Classification:</strong> ${opp.role_classification || "Not specified"}</p>
${opp.position_title ? `<p style="margin:0 0 8px 0;"><strong>Position Title:</strong> ${opp.position_title}</p>` : ""}
<p style="margin:0 0 8px 0;"><strong>Description:</strong> ${opp.description}</p>
<p style="margin:0 0 8px 0;"><strong>Location:</strong> ${opp.location}</p>
<p style="margin:0 0 8px 0;"><strong>On Bus Route:</strong> ${opp.on_bus_route ? "Yes" : "No"}</p>
<p style="margin:0 0 8px 0;"><strong>Hours Available:</strong> ${opp.hours_available}</p>
<p style="margin:0 0 8px 0;"><strong>Days/Times Available:</strong> ${opp.days_times_available}</p>
${opp.additional_requirements ? `<p style="margin:0 0 0 0;"><strong>Standard Requirements:</strong> ${opp.additional_requirements}</p>` : ""}
</div>

<!-- What Happens Next Card -->
<div style="background-color:#e6f7e6; border-left:4px solid #2e7d32; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#2e7d32;">What Happens Next?</h2>
<p style="margin:0 0 8px 0;">1. Clients can apply directly through the platform</p>
<p style="margin:0 0 8px 0;">2. You will receive a notification to this email when someone applies</p>
<p style="margin:0 0 8px 0;">3. Contact applicants to confirm availability and interest</p>
<p style="margin:0 0 8px 0;">4. Remove your posting when the position has been filled</p>
<p style="margin:0 0 0 0;">5. Complete monthly documentation on behalf of the volunteer</p>
</div>

<!-- Update or Remove Card -->
<div style="background-color:#fff0e6; border-left:4px solid #e67e22; padding:20px; margin:0 0 25px 0; border-radius:0 8px 8px 0;">
<h2 style="margin:0 0 15px 0; font-size:18px; color:#e67e22;">Update or Remove Your Listing</h2>
<p style="margin:0 0 15px 0;">Need to make changes or remove your listing? You can use the edit button below to update available hours or remove the listing when the position is filled.</p>
<p style="margin:0 0 15px 0; text-align:center;">
<a href="${editUrl}" style="display:inline-block; padding:14px 28px; background-color:#e67e22; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:6px;">Edit Your Listing</a>
</p>
<p style="margin:0; font-size:13px; color:#666666; text-align:center;">This link is unique to your listing. Please keep it safe and do not share it publicly.</p>
</div>


</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#1e3a5f; padding:25px; text-align:center;">
<p style="margin:0 0 5px 0; color:#ffffff; font-size:16px;">Need Help?</p>
<p style="margin:0; color:#a0c4e8; font-size:14px;">Contact us at <a href="mailto:rhinton@uwtc.org" style="color:#ffffff; font-weight:bold;">rhinton@uwtc.org</a></p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
  };

  const handleConfirmSendEmail = async () => {
    if (!previewingEmailOpp) return;
    setPreviewingEmailOpp(null);
    await handleResendEmail(previewingEmailOpp);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;

    try {
      const { error } = await supabase
        .from("opportunities")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity deleted successfully",
      });
      fetchAllOpportunities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingOpportunity) return;

    const isEducation = editingOpportunity.type === "education";

    try {
      const { error } = await supabase
        .from("opportunities")
        .update({
          description: editingOpportunity.description,
          hours_available: editingOpportunity.hours_available,
          days_times_available: editingOpportunity.days_times_available,
          additional_requirements: editingOpportunity.additional_requirements,
          org_name: editingOpportunity.org_name,
          org_email: editingOpportunity.org_email,
          active: editingOpportunity.active,
          // Volunteer-only fields (clear for education)
          role_classification: isEducation ? null : editingOpportunity.role_classification,
          position_title: isEducation ? null : editingOpportunity.position_title,
          location: isEducation ? "N/A" : editingOpportunity.location,
          on_bus_route: isEducation ? false : editingOpportunity.on_bus_route,
          contact_name: isEducation ? null : editingOpportunity.contact_name,
          org_phone: isEducation ? "N/A" : editingOpportunity.org_phone,
          admin_contact_name: isEducation ? null : editingOpportunity.admin_contact_name,
          admin_email: isEducation ? null : editingOpportunity.admin_email,
          // Education-only fields (clear for volunteer)
          program_name: isEducation ? editingOpportunity.program_name : null,
          website: isEducation ? editingOpportunity.website : null,
          program_components: isEducation ? editingOpportunity.program_components : null,
        })
        .eq("id", editingOpportunity.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity updated successfully",
      });
      setEditingOpportunity(null);
      fetchAllOpportunities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading && !isResetPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Password reset (set new password) view
  if (isResetPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-card rounded-xl border border-border shadow-sm">
          <div className="mb-6 text-center">
            <Handshake className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Choose a new password for your admin account
            </p>
          </div>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter the new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut();
                setIsResetPassword(false);
                setNewPassword("");
                setConfirmNewPassword("");
              }}
            >
              Cancel
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    // Forgot password view
    if (isForgotPassword) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-full max-w-md p-8 bg-card rounded-xl border border-border shadow-sm">
            <div className="mb-6 text-center">
              <Handshake className="mx-auto h-12 w-12 text-primary mb-4" />
              <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your email to receive a password reset link
              </p>
            </div>
            {resetEmailSent ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-muted border border-border rounded-lg">
                  <p className="text-foreground">
                    Password reset email sent! Check your inbox for the reset link.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetEmailSent(false);
                  }}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsForgotPassword(false)}
                >
                  Back to Sign In
                </Button>
              </form>
            )}
          </div>
        </div>
      );
    }

    // Regular login/signup view
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-card rounded-xl border border-border shadow-sm">
          <div className="mb-6 text-center">
            <Handshake className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground">
              {isSignUp ? "Create Admin Account" : "Admin Login"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isSignUp ? "Sign up for an admin account" : "Sign in with your admin account"}
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Sign Up" : "Sign In")}
            </Button>
            {!isSignUp && (
              <Button
                type="button"
                variant="link"
                className="w-full text-sm"
                onClick={() => setIsForgotPassword(true)}
              >
                Forgot your password?
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </Button>
            <Link to="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </form>
        </div>
      </div>
    );
  }

  // Show access denied if authenticated but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-card rounded-xl border border-border shadow-sm text-center">
          <Handshake className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have admin privileges. Please contact an administrator if you need access.
          </p>
          <div className="space-y-2">
            <Button onClick={handleLogout} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            <Link to="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
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
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              <Link to="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="mb-6 text-2xl font-bold text-foreground">Manage Opportunities</h2>

        <StaleListingsAlert opportunities={opportunities} onReminderSent={fetchAllOpportunities} />

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Position / Program</TableHead>
                <TableHead>Admin Contact</TableHead>
                
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => (
                <TableRow key={opp.id}>
                  <TableCell className="font-medium capitalize">{opp.type}</TableCell>
                  <TableCell>{opp.org_name}</TableCell>
                  <TableCell>{opp.type === "education" ? (opp.program_name || "—") : (opp.position_title || "—")}</TableCell>
                  <TableCell className="text-sm">{opp.admin_contact_name || opp.contact_name || "—"}</TableCell>
                  
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(opp.updated_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      opp.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {opp.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingOpportunity(opp);
                            const { isFlexible } = parseDaysTimesAvailable(opp.days_times_available);
                            setEditFlexibleTime(isFlexible);
                            const loc = opp.location.toLowerCase();
                            if (loc === "remote") setEditLocationType("remote");
                            else if (loc === "tompkins county") setEditLocationType("general");
                            else setEditLocationType("specific");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Opportunity</DialogTitle>
                          <DialogDescription>
                            Make changes to the opportunity details
                          </DialogDescription>
                        </DialogHeader>
                        {editingOpportunity && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Type</Label>
                              <Input
                                value={editingOpportunity.type === "education" ? "Education & Training" : "Volunteer"}
                                disabled
                                className="bg-muted"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Organization Name</Label>
                              <Input
                                value={editingOpportunity.org_name}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, org_name: e.target.value })
                                }
                              />
                            </div>

                            {/* ===== VOLUNTEER-ONLY FIELDS ===== */}
                            {editingOpportunity.type === "volunteer" && (
                              <>
                                <div className="space-y-2">
                                  <Label>Role Classification</Label>
                                  <Select
                                    value={editingOpportunity.role_classification || ""}
                                    onValueChange={(value) =>
                                      setEditingOpportunity({ ...editingOpportunity, role_classification: value || null })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select classification" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Administrative & Office Support">Administrative & Office Support</SelectItem>
                                      <SelectItem value="Community Engagement & Public Service">Community Engagement & Public Service</SelectItem>
                                      <SelectItem value="Education & Mentoring">Education & Mentoring</SelectItem>
                                      <SelectItem value="Human & Social Support Services">Human & Social Support Services</SelectItem>
                                      <SelectItem value="Physical, Outdoor & Environmental Work">Physical, Outdoor & Environmental Work</SelectItem>
                                      <SelectItem value="Creative, Media & Communications">Creative, Media & Communications</SelectItem>
                                      <SelectItem value="Technology & Digital Support">Technology & Digital Support</SelectItem>
                                      <SelectItem value="Fundraising & Development">Fundraising & Development</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Position Title</Label>
                                  <Input
                                    value={editingOpportunity.position_title || ""}
                                    onChange={(e) =>
                                      setEditingOpportunity({ ...editingOpportunity, position_title: e.target.value || null })
                                    }
                                    placeholder="e.g., Kitchen Assistant, Office Volunteer"
                                  />
                                </div>
                              </>
                            )}

                            {/* ===== EDUCATION-ONLY FIELDS ===== */}
                            {editingOpportunity.type === "education" && (
                              <>
                                <div className="space-y-2">
                                  <Label>Program Name</Label>
                                  <Input
                                    value={editingOpportunity.program_name || ""}
                                    onChange={(e) =>
                                      setEditingOpportunity({ ...editingOpportunity, program_name: e.target.value || null })
                                    }
                                    placeholder="e.g., GED Preparation Program"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Website <span className="text-destructive">*</span></Label>
                                  <Input
                                    type="url"
                                    value={editingOpportunity.website || ""}
                                    onChange={(e) =>
                                      setEditingOpportunity({ ...editingOpportunity, website: e.target.value || null })
                                    }
                                    placeholder="https://example.org/program"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Program Components</Label>
                                  <div className="space-y-2">
                                    {PROGRAM_COMPONENTS.map((component) => {
                                      const currentComponents = editingOpportunity.program_components
                                        ? editingOpportunity.program_components.split(", ")
                                        : [];
                                      const isChecked = currentComponents.includes(component.value);
                                      return (
                                        <div key={component.value} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`edit-component-${component.value}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              let updated: string[];
                                              if (checked) {
                                                updated = [...currentComponents, component.value];
                                              } else {
                                                updated = currentComponents.filter(c => c !== component.value);
                                              }
                                              setEditingOpportunity({
                                                ...editingOpportunity,
                                                program_components: updated.length > 0 ? updated.join(", ") : null
                                              });
                                            }}
                                          />
                                          <Label htmlFor={`edit-component-${component.value}`} className="cursor-pointer text-sm">
                                            {component.label}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            )}

                            {/* ===== SHARED FIELDS ===== */}
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                value={editingOpportunity.description}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, description: e.target.value })
                                }
                              />
                            </div>

                            {/* Service Location - Volunteer only */}
                            {editingOpportunity.type === "volunteer" && (
                              <>
                                <div className="space-y-2">
                                  <Label>Service Location</Label>
                                  <Select
                                    value={editLocationType}
                                    onValueChange={value => {
                                      setEditLocationType(value);
                                      if (value === "general") {
                                        setEditingOpportunity({ ...editingOpportunity, location: "Tompkins County", on_bus_route: false });
                                      } else if (value === "remote") {
                                        setEditingOpportunity({ ...editingOpportunity, location: "Remote", on_bus_route: false });
                                      }
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select location type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="specific">Specific Address</SelectItem>
                                      <SelectItem value="general">Tompkins County</SelectItem>
                                      <SelectItem value="remote">Remote</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {editLocationType === "specific" && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Address</Label>
                                      <Input
                                        value={editingOpportunity.location}
                                        onChange={(e) =>
                                          setEditingOpportunity({ ...editingOpportunity, location: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={editingOpportunity.on_bus_route}
                                        onCheckedChange={(checked) =>
                                          setEditingOpportunity({ ...editingOpportunity, on_bus_route: checked === true })
                                        }
                                      />
                                      <Label>On Bus Route</Label>
                                    </div>
                                  </>
                                )}
                              </>
                            )}

                            <div className="space-y-2">
                              <Label>Hours Available</Label>
                              <Input
                                value={editingOpportunity.hours_available}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, hours_available: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-4">
                              <Label>Days & Times Available</Label>
                              <p className="text-sm text-muted-foreground">Select days and set available hours for each day</p>
                              
                              <div className="flex items-center space-x-2 mb-3">
                                <Checkbox
                                  id="edit-flexible-time"
                                  checked={editFlexibleTime}
                                  onCheckedChange={checked => {
                                    const flexible = checked === true;
                                    setEditFlexibleTime(flexible);
                                    const { schedule } = parseDaysTimesAvailable(editingOpportunity.days_times_available);
                                    setEditingOpportunity({
                                      ...editingOpportunity,
                                      days_times_available: formatDayScheduleToString(schedule, flexible)
                                    });
                                  }}
                                />
                                <Label htmlFor="edit-flexible-time" className="cursor-pointer text-sm">
                                  Flexible Hours
                                </Label>
                              </div>

                              <div className={editFlexibleTime ? "flex flex-wrap gap-2" : "space-y-3"}>
                              {DAYS_OF_WEEK.map(day => {
                                const { schedule: currentSchedule } = parseDaysTimesAvailable(editingOpportunity.days_times_available);
                                return editFlexibleTime ? (
                                  <label
                                    key={day.key}
                                    htmlFor={`edit-${day.key}`}
                                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors ${
                                      currentSchedule[day.key].selected ? 'border-primary bg-primary/10 font-medium' : 'border-border bg-background'
                                    }`}
                                  >
                                    <Checkbox
                                      id={`edit-${day.key}`}
                                      checked={currentSchedule[day.key].selected}
                                      onCheckedChange={(checked) => {
                                        const updated = { ...currentSchedule };
                                        updated[day.key] = { ...updated[day.key], selected: checked === true };
                                        setEditingOpportunity({
                                          ...editingOpportunity,
                                          days_times_available: formatDayScheduleToString(updated, editFlexibleTime)
                                        });
                                      }}
                                    />
                                    {day.label}
                                  </label>
                                ) : (
                                  <div key={day.key} className="space-y-3 rounded-lg border border-border p-4">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`edit-${day.key}`}
                                        checked={currentSchedule[day.key].selected}
                                        onCheckedChange={(checked) => {
                                          const updated = { ...currentSchedule };
                                          updated[day.key] = { ...updated[day.key], selected: checked === true };
                                          setEditingOpportunity({
                                            ...editingOpportunity,
                                            days_times_available: formatDayScheduleToString(updated, editFlexibleTime)
                                          });
                                        }}
                                      />
                                      <Label htmlFor={`edit-${day.key}`} className="cursor-pointer font-medium">
                                        {day.label}
                                      </Label>
                                    </div>
                                    
                                    {currentSchedule[day.key].selected && !editFlexibleTime && (
                                      <div className="space-y-3 pl-6 animate-fade-in">
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between text-sm">
                                            <div>
                                              <span className="text-muted-foreground">Start: </span>
                                              <span className="font-medium">{formatTimeFromHour(currentSchedule[day.key].startTime)}</span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">End: </span>
                                              <span className="font-medium">{formatTimeFromHour(currentSchedule[day.key].endTime)}</span>
                                            </div>
                                          </div>
                                          <Slider
                                            value={[currentSchedule[day.key].startTime, currentSchedule[day.key].endTime]}
                                            min={0}
                                            max={23.5}
                                            step={0.5}
                                            onValueChange={(values) => {
                                              const updated = { ...currentSchedule };
                                              updated[day.key] = {
                                                ...updated[day.key],
                                                startTime: values[0],
                                                endTime: values[1]
                                              };
                                              setEditingOpportunity({
                                                ...editingOpportunity,
                                                days_times_available: formatDayScheduleToString(updated, editFlexibleTime)
                                              });
                                            }}
                                            className="w-full"
                                          />
                                          <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>12 AM</span>
                                            <span>6 AM</span>
                                            <span>12 PM</span>
                                            <span>6 PM</span>
                                            <span>11 PM</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>{editingOpportunity.type === "education" ? "Minimum Requirements" : "Additional Requirements"}</Label>
                              <Textarea
                                value={editingOpportunity.additional_requirements || ""}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, additional_requirements: e.target.value || null })
                                }
                              />
                            </div>
                            {editingOpportunity.type === "education" && (
                              <div className="space-y-2">
                                <Label>Contact Name</Label>
                                <Input
                                  value={editingOpportunity.contact_name || ""}
                                  onChange={(e) =>
                                    setEditingOpportunity({ ...editingOpportunity, contact_name: e.target.value || null })
                                  }
                                  placeholder="Name of the contact person"
                                />
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label>Contact Email</Label>
                              <Input
                                type="email"
                                value={editingOpportunity.org_email}
                                onChange={(e) =>
                                  setEditingOpportunity({ ...editingOpportunity, org_email: e.target.value })
                                }
                                placeholder="contact@organization.org"
                              />
                            </div>

                            {/* Volunteer-only: Contact, Phone, Admin Contact */}
                            {editingOpportunity.type === "volunteer" && (
                              <>
                                <div className="space-y-2">
                                  <Label>Contact Name</Label>
                                  <Input
                                    value={editingOpportunity.contact_name || ""}
                                    onChange={(e) =>
                                      setEditingOpportunity({ ...editingOpportunity, contact_name: e.target.value })
                                    }
                                    placeholder="Name of the contact person"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Organization Phone</Label>
                                  <Input
                                    type="tel"
                                    value={editingOpportunity.org_phone}
                                    onChange={(e) =>
                                      setEditingOpportunity({ ...editingOpportunity, org_phone: e.target.value })
                                    }
                                    placeholder="(607) 555-1234"
                                  />
                                </div>
                                <div className="border-t border-border pt-4 mt-4">
                                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Admin Contact (receives emails)</h4>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Admin Contact Name</Label>
                                      <Input
                                        value={editingOpportunity.admin_contact_name || ""}
                                        onChange={(e) =>
                                          setEditingOpportunity({ ...editingOpportunity, admin_contact_name: e.target.value || null })
                                        }
                                        placeholder="Leave empty to use public contact"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Admin Email</Label>
                                      <Input
                                        type="email"
                                        value={editingOpportunity.admin_email || ""}
                                        onChange={(e) =>
                                          setEditingOpportunity({ ...editingOpportunity, admin_email: e.target.value || null })
                                        }
                                        placeholder="Leave empty to use public email"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={editingOpportunity.active}
                                onCheckedChange={(checked) =>
                                  setEditingOpportunity({ ...editingOpportunity, active: checked === true })
                                }
                                className={editingOpportunity.active ? "border-success bg-success data-[state=checked]:bg-success data-[state=checked]:border-success" : ""}
                              />
                              <Label className={editingOpportunity.active ? "text-success font-medium" : ""}>Active</Label>
                            </div>
                            <Button onClick={handleUpdate} className="w-full">
                              Save Changes
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewingEmailOpp(opp)}
                      disabled={sendingEmailId === opp.id}
                      title="Preview and resend confirmation email"
                    >
                      <Mail className={`h-4 w-4 ${sendingEmailId === opp.id ? "animate-pulse" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const editUrl = `${window.location.origin}/edit-opportunity/${opp.edit_token}`;
                        navigator.clipboard.writeText(editUrl);
                        toast({ title: "Edit link copied to clipboard" });
                      }}
                      title="Copy magic edit link"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(opp.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Email Preview Dialog */}
        <Dialog open={!!previewingEmailOpp} onOpenChange={(open) => !open && setPreviewingEmailOpp(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
              <DialogDescription>
                Review the confirmation email before sending to{" "}
                <span className="font-medium text-foreground">{previewingEmailOpp?.admin_email || previewingEmailOpp?.org_email}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-muted">
              {previewingEmailOpp && (
                <iframe
                  srcDoc={generateEmailPreviewHtml(previewingEmailOpp)}
                  title="Email Preview"
                  className="w-full h-[500px] bg-white"
                  sandbox=""
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setPreviewingEmailOpp(null)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSendEmail} disabled={sendingEmailId !== null}>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <UserSubmittedJobsSection />
      </main>
    </div>
  );
};

export default Admin;
