import { Link } from "react-router-dom";
import {
  Handshake,
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkipNavigation } from "@/components/SkipNavigation";

interface ResourceLink {
  name: string;
  description: string;
  url: string;
}

const careerCenterServices: { title: string; description: string }[] = [
  {
    title: "Job Search Training",
    description:
      "Learn the most effective job search strategies and develop the tools you need to succeed, including resume writing, interview skills, and more.",
  },
  {
    title: "Job Search Assistance",
    description:
      "Get pointed in the right direction with connections and resources to help you find and land a job.",
  },
  {
    title: "Basic Education",
    description:
      "Build the reading, writing, and foundational skills needed to prepare for today's job market.",
  },
  {
    title: "Vocational Career Education",
    description:
      "Short-term training in high-demand skills to earn credentials and get ready for in-demand occupations.",
  },
  {
    title: "Job Retention Support",
    description:
      "Receive assistance for up to 90 days after starting a new job to help ensure your long-term success.",
  },
];

const trainingAndEducation: ResourceLink[] = [
  {
    name: "CCE Tompkins Energy Warriors",
    description: "Clean energy workforce training.",
    url: "https://energywarriors.org",
  },
  {
    name: "GIAC-HETP",
    description:
      "The City of Ithaca runs the Hospitality Employment Training Program (HETP), hosted at the Greater Ithaca Activities Center (GIAC).",
    url: "https://www.cityofithacany.gov/533/HETP",
  },
  {
    name: "Tompkins Build",
    description:
      "Paid apprenticeship readiness program that provides individuals with the skills, support, and hands-on experience necessary to succeed in the construction trades.",
    url: "https://ithacaareaed.org/tompkins-build/",
  },
  {
    name: "Finger Lakes ReUse — ReSET",
    description:
      "A free job training program offered by Finger Lakes ReUse. ReSET (Skills and Employment Training) trainings are embedded in hands-on learning environments throughout ReUse Center departments.",
    url: "https://ithacareuse.org/reset-old/",
  },
  {
    name: "College Initiative Upstate",
    description:
      "Helps people overcome barriers to higher education—such as court involvement, past incarceration, underemployment, low income, or stability in recovery.",
    url: "https://collegeinitiativeupstate.org",
  },
  {
    name: "Youth Employment Service (YES) Ithaca",
    description: "Youth employment services for ages 14–21.",
    url: "https://yesithaca.org",
  },
  {
    name: "Challenge Workforce Solutions",
    description:
      "Challenge staff work with the people we serve to develop an individualized plan for vocational advancement or employment. Challenge services meet clients where they are to overcome their own barriers to employment.",
    url: "https://www.aboutchallenge.org/services",
  },
  {
    name: "TC3 Business Division",
    description:
      "Career-focused, non-credit education programs and professional development workshops to meet the changing needs of the community, with flexible scheduling options to fit your needs.",
    url: "https://www.tompkinscortland.edu/continuing-education",
  },
  {
    name: "TST BOCES Adult Education",
    description: "Adult education and GED programs.",
    url: "https://www.tstboces.org/page/adult-education-overview",
  },
  {
    name: "Women's Opportunity Center",
    description: "Workforce and life skills training.",
    url: "https://www.womensopportunity.org/",
  },
  {
    name: "ACCES-VR",
    description: "Vocational rehabilitation services.",
    url: "https://acces.nysed.gov/vr",
  },
  {
    name: "The Learning Web",
    description:
      "Dedicated to enabling local youth to build capacity and thrive as self-assured, self-directed, productive adults.",
    url: "https://learning-web.org/programs/",
  },
  {
    name: "Hammerstone School",
    description: "Empowers women and gender minorities through craft trades education.",
    url: "https://hammerstoneschool.org/",
  },
];

const jobSearchLinks: ResourceLink[] = [
  {
    name: "Indeed Job Search Academy",
    description:
      "A free, virtual career development program created in partnership with Indeed and Tompkins County Workforce Development. Covers the five key areas of job searching to help you feel confident every step of the way.",
    url: "https://www.indeed.com/job-search-services/job-search-academy-tompkins-workforce-new-york",
  },
  {
    name: "NY JobZone",
    description:
      "A free New York State tool for building your resume, exploring careers, and developing job skills.",
    url: "https://jobzone.labor.ny.gov/jz/views/jobzone/guest.jsf",
  },
  {
    name: "NY State Jobs Bank",
    description:
      "Search job openings across the Ithaca area and beyond through the New York State Department of Labor.",
    url: "https://myjobsny.usnlx.com/jobs/?location=Ithaca,+NY",
  },
  {
    name: "Tompkins Chamber Job Board",
    description: "Browse job listings posted directly by local Tompkins County employers.",
    url: "https://business.tompkinschamber.org/jobs",
  },
  {
    name: "DSS Employment Services",
    description:
      "Employment support and services through the Tompkins County Department of Social Services, for those who may need additional assistance.",
    url: "https://www.tompkinscountyny.gov/All-Departments/Social-Services/Employment-Program-Services",
  },
];

const ResourceCard = ({ resource }: { resource: ResourceLink }) => (
  <Card className="flex flex-col">
    <CardHeader>
      <CardTitle className="text-lg">{resource.name}</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col justify-between gap-4">
      <p className="text-sm text-muted-foreground">{resource.description}</p>
      <a href={resource.url} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="w-full">
          Visit Site
          <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </a>
    </CardContent>
  </Card>
);

const EmploymentResources = () => {
  return (
    <div className="min-h-screen bg-background">
      <SkipNavigation />

      <header className="border-b border-border bg-[#eeeeee]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="h-8 w-8 text-primary" aria-hidden="true" />
              <h1 className="text-2xl font-bold text-foreground">Employment Resources</h1>
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
            Career support, training programs, and job search tools available to Tompkins County residents.
          </p>
        </div>

        {/* Career Center */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="text-2xl font-semibold text-foreground">
              Tompkins Workforce New York Career Center
            </h3>
          </div>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <p className="text-muted-foreground">
                Located in downtown Ithaca at Center Ithaca on the Commons, the Tompkins Workforce New
                York Career Center offers services for every job seeker, empowering individuals and
                families to find better employment and build better lives.
              </p>

              <div>
                <h4 className="mb-3 font-semibold text-foreground">Services Include</h4>
                <ul className="space-y-3">
                  {careerCenterServices.map((s) => (
                    <li key={s.title} className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{s.title}</span> — {s.description}
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href="https://www.tompkinscountyny.gov/All-Departments/Workforce-Development"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>
                  Visit Workforce Development
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </section>

        {/* Training & Education */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="text-2xl font-semibold text-foreground">
              Training and Education Opportunities
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trainingAndEducation.map((r) => (
              <ResourceCard key={r.name} resource={r} />
            ))}
          </div>
        </section>

        {/* Job Search Links */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="text-2xl font-semibold text-foreground">Helpful Job Search Links</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobSearchLinks.map((r) => (
              <ResourceCard key={r.name} resource={r} />
            ))}
          </div>
        </section>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Questions? Contact{" "}
          <a href="mailto:rhinton@uwtc.org" className="text-primary underline hover:no-underline">
            rhinton@uwtc.org
          </a>
        </div>
      </main>
    </div>
  );
};

export default EmploymentResources;
