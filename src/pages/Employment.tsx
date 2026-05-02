import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ArrowLeft, Briefcase, MapPin, DollarSign, Clock, ExternalLink, Tag } from "lucide-react";
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
  job_category: string | null;
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

const CATEGORY_COLORS: Record<string, string> = {
  Education: "bg-blue-100 text-blue-800 border-blue-200",
  Healthcare: "bg-red-100 text-red-800 border-red-200",
  Hospitality: "bg-amber-100 text-amber-800 border-amber-200",
  Government: "bg-slate-100 text-slate-800 border-slate-200",
  Technology: "bg-violet-100 text-violet-800 border-violet-200",
  "Trades/Labor": "bg-orange-100 text-orange-800 border-orange-200",
  Administrative: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Social Services": "bg-emerald-100 text-emerald-800 border-emerald-200",
  Other: "bg-gray-100 text-gray-800 border-gray-200",
};

const Employment = () => {
  const [jobs, setJobs] = useState<EmploymentOpportunity[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<EmploymentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [employerFilter, setEmployerFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    let filtered = jobs;

    if (typeFilter !== "all") {
      filtered = filtered.filter(j => normalizeEmploymentType(j.employment_type).includes(typeFilter));
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter(j => j.source_site === sourceFilter);
    }

    if (employerFilter !== "all") {
      filtered = filtered.filter(j => j.employer === employerFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(j => j.job_category === categoryFilter);
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
    setCurrentPage(1);
  }, [jobs, typeFilter, sourceFilter, employerFilter, categoryFilter, searchQuery]);

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
    new Set(jobs.flatMap(j => normalizeEmploymentType(j.employment_type)))
  ).sort();

  const sources = Array.from(
    new Set(jobs.map(j => j.source_site).filter(Boolean))
  ).sort();

  // Only show employers with 2+ jobs
  const employerCounts = jobs.reduce((acc, j) => {
    acc[j.employer] = (acc[j.employer] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const employers = Object.entries(employerCounts)
    .filter(([, count]) => count >= 2)
    .map(([name]) => name)
    .sort();

  const categories = Array.from(
    new Set(jobs.map(j => j.job_category).filter(Boolean) as string[])
  ).sort();

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
        <div className="flex flex-col sm:flex-row gap-4 mb-8 flex-wrap">
          <Input
            placeholder="Search by title, employer, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-sm"
          />
          {categories.length > 0 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="Job Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {employers.length > 0 && (
            <Select value={employerFilter} onValueChange={setEmployerFilter}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="Employer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employers</SelectItem>
                {employers.map(emp => (
                  <SelectItem key={emp} value={emp}>
                    {emp}
                    <span className="text-muted-foreground ml-1">({employerCounts[emp]})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {employmentTypes.length > 0 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="Employment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {employmentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {sources.length > 1 && (
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
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
            (() => {
              const grouped = filteredJobs.reduce((groups, job) => {
                const cat = job.job_category || "Other";
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(job);
                return groups;
              }, {} as Record<string, EmploymentOpportunity[]>);
              const sortedGroups = Object.entries(grouped).sort(
                ([, a], [, b]) => b.length - a.length
              );
              const slugify = (s: string) =>
                `cat-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
              const isFiltered =
                categoryFilter !== "all" ||
                typeFilter !== "all" ||
                sourceFilter !== "all" ||
                employerFilter !== "all" ||
                searchQuery.trim() !== "";

              return (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                      {isFiltered ? "Showing " : "Browsing "}
                      <span className="font-semibold text-foreground">
                        {filteredJobs.length}
                      </span>{" "}
                      {filteredJobs.length === 1 ? "job" : "jobs"} across{" "}
                      <span className="font-semibold text-foreground">
                        {sortedGroups.length}
                      </span>{" "}
                      {sortedGroups.length === 1 ? "category" : "categories"}
                      {isFiltered && " (filters active)"}
                    </p>
                    {sortedGroups.length > 1 && (
                      <div className="flex flex-wrap gap-2" aria-label="Jump to category">
                        {sortedGroups.map(([category, categoryJobs]) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(slugify(category));
                              el?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className={`text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors ${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}`}
                          >
                            {category} ({categoryJobs.length})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-8">
                    {sortedGroups.map(([category, categoryJobs]) => (
                      <div key={category} id={slugify(category)} className="scroll-mt-20">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className={`text-sm px-3 py-1 ${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}`}
                      >
                        <Tag className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                        {category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">({categoryJobs.length})</span>
                    </div>
                    <div className="border border-border rounded-lg divide-y divide-border bg-card">
                      {categoryJobs.map(job => (
                        <div key={job.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground truncate">{job.job_title}</span>
                              {formatEmploymentType(job.employment_type) && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1 flex-shrink-0">
                                  <Clock className="h-3 w-3" aria-hidden="true" />
                                  {formatEmploymentType(job.employment_type)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                              <span className="font-medium">{job.employer}</span>
                              {job.location && job.location.replace(/[,\s]/g, '') !== "" && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" aria-hidden="true" />
                                  {job.location}
                                </span>
                              )}
                              {job.wage && job.wage.replace(/[,\s]/g, '') !== "" && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" aria-hidden="true" />
                                  {job.wage}
                                </span>
                              )}
                              <span className="text-xs">
                                Updated {formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <a
                            href={job.posting_url.startsWith("http") ? job.posting_url : `https://${job.posting_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                          >
                            <Button size="sm" className="bg-success">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                              View
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                    ))}
                  </div>
                </div>
              );
            })()
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
