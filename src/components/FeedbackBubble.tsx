import { useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bug, Lightbulb, MessageSquarePlus, X } from "lucide-react";

type FeedbackType = "bug" | "feature";

export function FeedbackBubble() {
  const location = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);

  // Hide the bubble on the admin console.
  if (location.pathname.startsWith("/admin")) return null;

  const reset = () => {
    setType("bug");
    setMessage("");
    setName("");
    setEmail("");
    setWebsite("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      toast({
        title: "Please add a bit more detail",
        description: "Tell us what happened or what you'd like to see.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-feedback", {
        body: {
          feedback_type: type,
          message: message.trim(),
          submitter_name: name.trim() || null,
          submitter_email: email.trim() || null,
          page_path: location.pathname + location.search,
          user_agent: navigator.userAgent.slice(0, 500),
          website,
        },
      });

      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error || error?.message);
      }

      toast({
        title: type === "bug" ? "Bug report sent" : "Feature request sent",
        description: "Thank you — the team has been notified.",
      });
      reset();
      setOpen(false);
    } catch (err) {
      toast({
        title: "Something went wrong",
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Report a bug or request a feature"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full p-0 shadow-lg transition-transform hover:scale-105 focus-visible:ring-4 print:hidden md:h-auto md:w-auto md:rounded-full md:px-5 md:py-3"
      >
        <MessageSquarePlus className="h-6 w-6 md:mr-2 md:h-5 md:w-5" aria-hidden="true" />
        <span className="sr-only md:not-sr-only md:text-sm md:font-semibold">
          Feedback
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share feedback</DialogTitle>
            <DialogDescription>
              Found something broken or have an idea? Let us know and we'll take a look.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">What kind of feedback?</legend>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "bug", label: "Bug report", icon: Bug },
                  { value: "feature", label: "Feature request", icon: Lightbulb },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    aria-pressed={type === value}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                      type === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">
                {type === "bug" ? "What went wrong?" : "What would you like to see?"}
              </Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={4000}
                required
                placeholder={
                  type === "bug"
                    ? "Describe what you were doing and what happened…"
                    : "Describe the feature or improvement you have in mind…"
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feedback-name">Your name (optional)</Label>
                <Input
                  id="feedback-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-email">Email (optional)</Label>
                <Input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={320}
                  placeholder="So we can follow up"
                />
              </div>
            </div>

            {/* Honeypot — hidden from real users */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="feedback-website">Website</label>
              <input
                id="feedback-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send feedback"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
