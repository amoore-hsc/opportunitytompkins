import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bug, Lightbulb, MessageSquare, RefreshCw } from "lucide-react";

interface FeedbackRow {
  id: string;
  feedback_type: string;
  message: string;
  submitter_name: string | null;
  submitter_email: string | null;
  page_path: string | null;
  status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  done: "Done",
};

export function FeedbackCard() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feedback_submissions")
      .select(
        "id, feedback_type, message, submitter_name, submitter_email, page_path, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as FeedbackRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchFeedback();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    await supabase.from("feedback_submissions").update({ status }).eq("id", id);
  };

  const openCount = items.filter((i) => i.status !== "done").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          Bug Reports &amp; Feature Requests
          {openCount > 0 && <Badge variant="secondary">{openCount} open</Badge>}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchFeedback} disabled={loading}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {item.feedback_type === "bug" ? (
                      <Bug className="h-4 w-4 text-destructive" aria-hidden="true" />
                    ) : (
                      <Lightbulb className="h-4 w-4 text-success" aria-hidden="true" />
                    )}
                    <span className="font-medium">
                      {item.feedback_type === "bug" ? "Bug report" : "Feature request"}
                    </span>
                  </div>
                  <Select
                    value={item.status}
                    onValueChange={(value) => updateStatus(item.id, value)}
                  >
                    <SelectTrigger className="h-8 w-[150px]" aria-label="Feedback status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words">{item.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.page_path || "unknown page"} ·{" "}
                  {new Date(item.created_at).toLocaleString()}
                  {item.submitter_email ? ` · ${item.submitter_email}` : ""}
                  {item.submitter_name ? ` (${item.submitter_name})` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
