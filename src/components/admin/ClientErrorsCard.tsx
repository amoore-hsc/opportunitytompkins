import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ClientErrorRow {
  id: string;
  message: string;
  path: string | null;
  user_agent: string | null;
  created_at: string;
}

export function ClientErrorsCard() {
  const [errors, setErrors] = useState<ClientErrorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchErrors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_errors")
      .select("id, message, path, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setErrors((data as ClientErrorRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchErrors();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          Visitor Browser Errors
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchErrors} disabled={loading}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No errors reported by visitors. 🎉
          </p>
        ) : (
          <ul className="space-y-3">
            {errors.map((err) => (
              <li key={err.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium break-words">{err.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {err.path || "unknown page"} ·{" "}
                  {new Date(err.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
