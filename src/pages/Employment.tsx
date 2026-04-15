import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ArrowLeft, Briefcase, MapPin, DollarSign, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SkipNavigation } from "@/components/SkipNavigation";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export interface EmploymentOpportunity {
  id: string;
  job_title: string;
  employer: string;
  employment_type: string | null;
  wage: string | null;
  location: string | null;
  posting_url: string;
  source_site: string;
  is_manual: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const normalizeEmploymentType = (raw: string | null): string[] => {
  if (!raw || raw.replace(/[,\s]/g, '') === '') return [];
  const text = raw.toLowerCase();
  const types: string[] = [];
  if (text.includes('full')) types.push('Full-Time');
  if (text.includes('part')) types.push('Part-Time');
  if (text.includes('per diem')) types.push('Per Diem');
  if (text.includes('seasonal')) types.push('Seasonal');
  if (types.length === 0) types.push('Other');
  return types;
};

const formatEmploymentType = (raw: string | null): string | null => {
  const types = normalizeEmploymentType(raw);
  return types.length > 0 ? types.join(', ') : null;
};

const Employment = () => {
  const [jobs, setJobs] = useState<EmploymentOpportunity[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<EmploymentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    let filtered = jobs;

    if (typeFilter !== "all") {
      filtered = filtered.filter(j => normalizeEmploymentType(j.employment_type).includes(typeFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(j =>
        j.job_title.toLowerCase().includes(q) ||
        j.employer.toLowerCase().includes(q) ||
        (j.location && j.location.toLowerCase().includes(q))
      );
    }

    setFilteredJobs(filtered);
  }, [jobs, typeFilter, searchQuery]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("employment_opportunities")
        .select("*")
        .eq("active", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setJobs(data || []);
      setFilteredJobs(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading employment opportunities",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const employmentTypes = Array.from(
    new Set(jobs.map(j => j.employment_type).filter(Boolean))
  ) as string[];

  return (
    <div className="min-h-screen bg-background">
      <SkipNavigation />

      <header className="border-b border-border bg-[#eeeeee]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="h-8 w-8 text-primary" aria-hidden="true" />
              <h1 className="text-2xl font-bold text-foreground">Employment Opportunities</h1>
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

      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="mb-2 text-3xl font-bold text-foreground">Find Employment</h2>
          <p className="text-muted-foreground">
            Browse job openings from employers in Tompkins County
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input
            placeholder="Search by title, employer, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-sm"
          />
          {employmentTypes.length > 0 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="Employment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {employmentTypes.map(type => (
                  <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div aria-live="polite" aria-atomic="true">
          {loading ? (
            <div className="text-center py-12" role="status">
              <p className="text-muted-foreground">Loading employment opportunities...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No employment opportunities available right now.</p>
              <p className="text-muted-foreground text-sm mt-2">Check back soon for new postings.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map(job => (
                <Card key={job.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <Badge variant="default" className="mb-2">Employment</Badge>
                      {job.employment_type && job.employment_type.replace(/[,\s]/g, '') !== "" && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {job.employment_type}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{job.employer}</CardTitle>
                    <p className="text-base font-medium text-foreground">{job.job_title}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {job.wage && job.wage.replace(/[,\s]/g, '') !== "" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>{job.wage}</span>
                      </div>
                    )}
                    {job.location && job.location.replace(/[,\s]/g, '') !== "" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>{job.location}</span>
                      </div>
                    )}

                    <a
                      href={job.posting_url.startsWith("http") ? job.posting_url : `https://${job.posting_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="w-full mt-4 bg-success">
                        <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                        View Full Posting
                      </Button>
                    </a>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                      <span>Updated {formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}</span>
                      {job.source_site !== "manual" && (
                        <Badge variant="outline" className="text-xs">
                          {job.source_site}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Want to list a job?{" "}
            <a href="mailto:rhinton@uwtc.org" className="underline hover:text-foreground">
              Contact us
            </a>{" "}
            to add your posting.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Employment;
