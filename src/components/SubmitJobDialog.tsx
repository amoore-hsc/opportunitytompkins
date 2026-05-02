import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const schema = z.object({
  posting_url: z.string().trim().url({ message: "Enter a valid URL (https://...)" }).max(2048),
  employer: z.string().trim().max(200).optional(),
  submitter_email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
});

interface Props {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export const SubmitJobDialog = ({ trigger, onSuccess }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postingUrl, setPostingUrl] = useState("");
  const [employer, setEmployer] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPostingUrl("");
    setEmployer("");
    setEmail("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({
      posting_url: postingUrl,
      employer: employer || undefined,
      submitter_email: email || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.errors[0]?.message || "Please check your input.";
      setError(first);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-job-posting", {
        body: {
          posting_url: parsed.data.posting_url,
          employer: parsed.data.employer || null,
          submitter_email: parsed.data.submitter_email || null,
        },
      });

      if (fnError) {
        // Try to extract response body for friendly error
        let msg = fnError.message || "Could not submit the job posting.";
        try {
          const ctx = (fnError as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        setError(msg);
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      toast({
        title: "Job submitted!",
        description: `"${data?.job_title}" at ${data?.employer} is now live.`,
      });
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit a job posting</DialogTitle>
          <DialogDescription>
            Paste a link to a single job listing. We'll add it to Tompkins Opportunity and automatically remove it once the posting is taken down.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job-url">Job posting URL *</Label>
            <Input
              id="job-url"
              type="url"
              placeholder="https://example.com/jobs/12345"
              value={postingUrl}
              onChange={(e) => setPostingUrl(e.target.value)}
              required
              maxLength={2048}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-employer">Employer (optional)</Label>
            <Input
              id="job-employer"
              type="text"
              placeholder="Tompkins County"
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">Helps us label the listing if we can't detect it automatically.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-email">Your email (optional)</Label>
            <Input
              id="job-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">Only used if we need to follow up about your submission.</p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Checking posting..." : "Submit job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
