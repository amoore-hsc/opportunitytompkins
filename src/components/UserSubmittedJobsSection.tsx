import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, RefreshCw, Trash2, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface UserJob {
  id: string;
  job_title: string;
  employer: string;
  posting_url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  job_category: string | null;
}

export const UserSubmittedJobsSection = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<UserJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechecking, setRechecking] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employment_opportunities")
      .select("id, job_title, employer, posting_url, active, created_at, updated_at, job_category")
      .eq("is_manual", true)
      .eq("source_site", "user-submitted")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setJobs((data || []) as UserJob[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleRecheckAll = async () => {
    setRechecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("recheck-manual-jobs", { body: {} });
      if (error) throw error;
      toast({
        title: "Re-check complete",
        description: `Checked ${data?.checked ?? 0} job(s).`,
      });
      await fetchJobs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Re-check failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setRechecking(false);
    }
  };

  const handleRecheckOne = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke("recheck-manual-jobs", { body: { id } });
      if (error) throw error;
      toast({ title: "Re-checked", description: "Job status refreshed." });
      await fetchJobs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Re-check failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleToggleActive = async (job: UserJob) => {
    const { error } = await supabase
      .from("employment_opportunities")
      .update({ active: !job.active })
      .eq("id", job.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: job.active ? "Deactivated" : "Reactivated" });
      await fetchJobs();
    }
  };

  const handleDelete = async (job: UserJob) => {
    if (!confirm(`Permanently delete "${job.job_title}"?`)) return;
    const { error } = await supabase
      .from("employment_opportunities")
      .delete()
      .eq("id", job.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      await fetchJobs();
    }
  };

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User-Submitted Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Job postings submitted via the public form on the Employment page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRecheckAll} disabled={rechecking || loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${rechecking ? "animate-spin" : ""}`} />
          {rechecking ? "Re-checking..." : "Re-check now"}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Last Checked</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Loading...</TableCell></TableRow>
            ) : jobs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No user-submitted jobs yet.</TableCell></TableRow>
            ) : jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">
                  <a
                    href={job.posting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {job.job_title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
                <TableCell>{job.employer}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{job.job_category || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    job.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {job.active ? "Active" : "Removed"}
                  </span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => handleRecheckOne(job.id)} title="Re-check this job">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(job)} title={job.active ? "Deactivate" : "Reactivate"}>
                    {job.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(job)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};
