import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Mail, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { EmploymentOpportunity } from "@/pages/Employment";

interface ShareJobsDialogProps {
  jobs: EmploymentOpportunity[];
}

export const ShareJobsDialog = ({ jobs }: ShareJobsDialogProps) => {
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
    setIsOpen(false);
  };

  const handleEmail = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-jobs-email", {
        body: { email, jobs },
      });
      if (error) throw error;
      toast({
        title: "Email Sent!",
        description: `Job listings have been sent to ${email}`,
      });
      setEmail("");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Error Sending Email",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Share Results ({jobs.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Job Listings</DialogTitle>
          <DialogDescription>
            Share {jobs.length} filtered {jobs.length === 1 ? "job" : "jobs"} via print or email. The job posting URL is included with each listing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Button onClick={handlePrint} variant="outline" className="w-full justify-center" size="lg">
              <Printer className="mr-2 h-5 w-5" aria-hidden="true" />
              Print List
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="share-jobs-email">Email Address</Label>
            <Input
              id="share-jobs-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmail()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleEmail} disabled={isSending} className="w-full">
            <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
            {isSending ? "Sending..." : "Send via Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
