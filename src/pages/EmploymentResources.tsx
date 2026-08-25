import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  GraduationCap,
  Compass,
  Search,
  MapPin,
  BookOpen,
  Briefcase,
  Wrench,
  LifeBuoy,
  Users,
  Phone,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkipNavigation } from "@/components/SkipNavigation";
import { siteConfig, type ResourceLink, type CareerCenterService } from "@/config";

const SERVICE_ICON_MAP: Record<CareerCenterService["icon"], LucideIcon> = {
  BookOpen,
  Briefcase,
  GraduationCap,
  Wrench,
  LifeBuoy,
};

const ResourceCard = ({ resource }: { resource: ResourceLink }) => (
  <Card className="flex flex-col">
    <CardContent className="flex flex-1 flex-col justify-between gap-4 p-6">
      <h3 className="text-lg font-semibold leading-none tracking-tight">{resource.name}</h3>
      <p className="text-sm text-muted-foreground">{resource.description}</p>
      <a href={resource.url} target="_blank" rel="noopener noreferrer">
        <Button variant="success" size="sm" className="w-full">
          Visit Site
          <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </a>
    </CardContent>
  </Card>
);

const EmploymentResources = () => {
  const cc = siteConfig.careerCenter;
  return (
    <div className="min-h-dvh bg-background">
      <SkipNavigation />

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="" aria-hidden="true" className="h-8 w-8" />
              <h1 className="text-2xl font-bold text-foreground">{siteConfig.siteName}</h1>
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
          <h2 className="mb-2 text-3xl font-bold text-foreground">Employment Resources</h2>
          <p className="text-muted-foreground">
            Career support, training programs, and job search tools available to {siteConfig.countyName} residents.
          </p>
        </div>

        {/* Career Center */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="text-2xl font-semibold text-foreground">
              {cc.name}
            </h3>
          </div>

          <Card className="overflow-hidden border-primary/20">
            {/* Hero band */}
            <div className="bg-primary/5 px-6 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-base leading-relaxed text-foreground">
                    {cc.blurb}
                  </p>
                  <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                      {cc.address}
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="text-foreground">{cc.phone}</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                      <a
                        href={`mailto:${cc.email}`}
                        className="text-primary hover:underline"
                      >
                        {cc.email}
                      </a>
                    </div>
                  </div>
                </div>
                <a
                  href={cc.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button variant="success">
                    Visit Career Center
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Services grid */}
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                <h4 className="font-semibold text-foreground">Services Offered</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cc.services.map((s) => {
                  const Icon = SERVICE_ICON_MAP[s.icon];
                  return (
                    <div
                      key={s.title}
                      className="flex gap-3 rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{s.title}</div>
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>


        {/* Training & Education */}
        {siteConfig.trainingAndEducation.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="text-2xl font-semibold text-foreground">
                Training and Education Opportunities
              </h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {siteConfig.trainingAndEducation.map((r) => (
                <ResourceCard key={r.name} resource={r} />
              ))}
            </div>
          </section>
        )}

        {/* Job Search Links */}
        {siteConfig.jobSearchLinks.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="text-2xl font-semibold text-foreground">Helpful Job Search Links</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {siteConfig.jobSearchLinks.map((r) => (
                <ResourceCard key={r.name} resource={r} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default EmploymentResources;
