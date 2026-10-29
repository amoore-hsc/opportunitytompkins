/**
 * LOCAL OVERRIDE — Tompkins County values for the live deployment.
 *
 * This file is GITIGNORED so it never enters the public template repo.
 * It overrides the neutral defaults in `site.config.ts`.
 * See `site.config.local.example.ts` for the structure.
 */

import { defaultConfig, type SiteConfig } from "./site.config";

export const localConfig: SiteConfig = {
  ...defaultConfig,

  siteName: "Tompkins Opportunity",
  countyName: "Tompkins County",
  stateName: "New York",

  dssName: "Tompkins County DSS",
  dssUrl: "https://www.tompkinscountyny.gov/All-Departments/Social-Services",
  dssPhone: "(607) 274-5680",

  exemptionFormUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSfXDths0eQwRcWRMrqVdjjhILjLpi5qz7lMyn27VyhdKTt6nw/viewform",

  fromEmail: "hello@tompkins-opportunity.org",
  fromName: "Tompkins Opportunity",

  supportEmail: "amoore@hsctc.org",

  verificationForms: [
    {
      label: "Volunteer Work Experience Verification Form",
      url: "https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:e0afda57-43d9-4689-a17f-c67cbfd932ee",
      icon: "Briefcase",
    },
    {
      label: "Training / Educational Program Verification Form",
      url: "https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:4ac824f4-0900-46e6-8b1f-64f38bb7e621",
      icon: "GraduationCap",
    },
    {
      label: "ABAWD Medical Statement",
      url: "https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:700e7380-20bf-4309-9061-51a05eef9eaf",
      icon: "Stethoscope",
    },
    {
      label: "Monthly WIOA Job Search Activity Record",
      url: "https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:24e801ef-9093-4b49-aba4-2eb8a4453126",
      icon: "Search",
    },
    {
      label: "Caregiver Verification",
      url: "https://acrobat.adobe.com/id/urn:aaid:sc:VA6C2:8fe26071-4bad-49e1-aaea-71184206bdca",
      icon: "Heart",
    },
    {
      label: "Submit Documentation to DSS via NYDocSubmit",
      url: "https://otda.ny.gov/programs/nydocsubmit",
      icon: "Send",
    },
  ],

  careerCenter: {
    name: "Tompkins Workforce New York Career Center",
    blurb: "Services for every job seeker — empowering individuals and families to find better employment and build better lives.",
    address: "Center Ithaca on the Commons, Downtown Ithaca",
    phone: "(607) 272-7570",
    email: "workforce@tompkins-co.org",
    websiteUrl: "https://www.tompkinscountyny.gov/All-Departments/Workforce-Development",
    services: [
      { title: "Job Search Training", description: "Effective job search strategies, resume writing, interview skills, and more.", icon: "BookOpen" },
      { title: "Job Search Assistance", description: "Personalized connections and resources to help you find and land a job.", icon: "Briefcase" },
      { title: "Basic Education", description: "Build reading, writing, and foundational skills for today's job market.", icon: "GraduationCap" },
      { title: "Vocational Career Education", description: "Short-term training in high-demand skills and credentials.", icon: "Wrench" },
      { title: "Job Retention Support", description: "Up to 90 days of support after starting a new job to set you up for success.", icon: "LifeBuoy" },
    ],
  },

  trainingAndEducation: [
    { name: "CCE Tompkins Energy Warriors", description: "Clean energy workforce training.", url: "https://ccetompkins.org/energy/energy-warriors" },
    { name: "GIAC-HETP", description: "The City of Ithaca runs the Hospitality Employment Training Program (HETP), hosted at the Greater Ithaca Activities Center (GIAC).", url: "https://www.cityofithacany.gov/533/HETP" },
    { name: "Tompkins Build", description: "Paid apprenticeship readiness program that provides individuals with the skills, support, and hands-on experience necessary to succeed in the construction trades.", url: "https://ithacaareaed.org/tompkins-build/" },
    { name: "Finger Lakes ReUse — ReSET", description: "A free job training program offered by Finger Lakes ReUse. ReSET (Skills and Employment Training) trainings are embedded in hands-on learning environments throughout ReUse Center departments.", url: "https://ithacareuse.org/reset-old/" },
    { name: "College Initiative Upstate", description: "Helps people overcome barriers to higher education—such as court involvement, past incarceration, underemployment, low income, or stability in recovery.", url: "https://ciutompkins.org" },
    { name: "Youth Employment Service (YES) Ithaca", description: "Youth employment services for ages 14–21.", url: "https://yesithaca.org" },
    { name: "Challenge Workforce Solutions", description: "Challenge staff work with the people we serve to develop an individualized plan for vocational advancement or employment. Challenge services meet clients where they are to overcome their own barriers to employment.", url: "https://www.aboutchallenge.org/services" },
    { name: "TC3 Business Division", description: "Career-focused, non-credit education programs and professional development workshops to meet the changing needs of the community, with flexible scheduling options to fit your needs.", url: "https://www.tompkinscortland.edu/continuing-education" },
    { name: "TST BOCES Adult Education", description: "Adult education and GED programs.", url: "https://www.tstboces.org/page/adult-education-overview" },
    { name: "Women's Opportunity Center", description: "Workforce and life skills training.", url: "https://www.womensopportunity.org/" },
    { name: "ACCES-VR", description: "Vocational rehabilitation services.", url: "https://acces.nysed.gov/vr" },
    { name: "The Learning Web", description: "Dedicated to enabling local youth to build capacity and thrive as self-assured, self-directed, productive adults.", url: "https://learning-web.org/programs/" },
    { name: "Hammerstone School", description: "Empowers women and gender minorities through craft trades education.", url: "https://hammerstoneschool.org/" },
  ],

  jobSearchLinks: [
    { name: "Indeed Job Search Academy", description: "A free, virtual career development program created in partnership with Indeed and Tompkins County Workforce Development. Covers the five key areas of job searching to help you feel confident every step of the way.", url: "https://www.indeed.com/job-search-services/job-search-academy-tompkins-workforce-new-york" },
    { name: "NY JobZone", description: "A free New York State tool for building your resume, exploring careers, and developing job skills.", url: "https://jobzone.labor.ny.gov/jz/views/jobzone/guest.jsf" },
    { name: "NY State Jobs Bank", description: "Search job openings across the Ithaca area and beyond through the New York State Department of Labor.", url: "https://myjobsny.usnlx.com/jobs/?location=Ithaca,+NY" },
    { name: "Tompkins Chamber Job Board", description: "Browse job listings posted directly by local Tompkins County employers.", url: "https://business.tompkinschamber.org/jobs" },
    { name: "DSS Employment Services", description: "Employment support and services through the Tompkins County Department of Social Services, for those who may need additional assistance.", url: "https://www.tompkinscountyny.gov/All-Departments/Social-Services/Employment-Program-Services" },
  ],

  logos: {
    workforce: "/assets/workforce-ny-logo.png",
    chrn: "/assets/chrn-logo.jpg",
    foodbank: "/assets/foodbank-logo.png",
  },

  countyPlaces: [
    "tompkins", "ithaca", "dryden", "trumansburg", "lansing", "newfield",
    "groton", "danby", "enfield", "caroline", "ulysses", "freeville",
    "cayuga heights", "brooktondale", "slaterville", "etna", "mclean",
    "jacksonville", "varna", "forest home", "bethel grove",
  ],

  outOfCountyBlocklist: [
    "montour falls", "cortland", "homer", "marathon", "geneva", "new york city",
    "new york, ny", "nyc", "manhattan", "brooklyn", "queens", "bronx",
    "syracuse", "binghamton", "endicott", "johnson city", "vestal", "elmira",
    "horseheads", "watkins glen", "odessa", "owego", "waverly", "candor",
    "spencer", "van etten", "corning", "bath", "penn yan", "seneca falls",
    "waterloo", "auburn", "moravia", "interlaken", "whitney point", "rochester",
    "buffalo", "albany", "utica", "oneonta", "syracuse, ny", "long island",
    "westchester", "yonkers", "white plains", "washington, dc", "doha", "qatar",
  ],

  outOfStateRegions: defaultConfig.outOfStateRegions,
};
