/**
 * Site configuration — neutral placeholder defaults.
 *
 * This file is committed to the public repo. To customize for your
 * county/organization, create `site.config.local.ts` (gitignored) in the
 * same directory and override any fields — see `site.config.local.example.ts`.
 *
 * Colors are defined as CSS custom properties in `src/index.css`.
 */

export interface VerificationForm {
  label: string;
  url: string;
  /** Lucide icon name, resolved in ElectronicVerificationForms */
  icon: "Briefcase" | "GraduationCap" | "Stethoscope" | "Search" | "Heart" | "Send";
}

export interface ResourceLink {
  name: string;
  description: string;
  url: string;
}

export interface CareerCenterService {
  title: string;
  description: string;
  icon: "BookOpen" | "Briefcase" | "GraduationCap" | "Wrench" | "LifeBuoy";
}

export interface CareerCenterInfo {
  name: string;
  blurb: string;
  address: string;
  phone: string;
  email: string;
  websiteUrl: string;
  services: CareerCenterService[];
}

export interface SiteConfig {
  /** Display name shown in headers, titles, and emails (e.g. "Tompkins Opportunity") */
  siteName: string;
  /** County or region name (e.g. "Tompkins County") */
  countyName: string;
  /** State or region token used in descriptions */
  stateName: string;

  /** Social-services agency label (e.g. "Department of Social Services") */
  dssName: string;
  dssUrl: string;
  dssPhone: string;

  /** Google Form (or other) URL for the exemption-status check */
  exemptionFormUrl: string;

  /** From-address for all outgoing transactional email */
  fromEmail: string;
  fromName: string;

  /** General support email shown to users */
  supportEmail: string;

  /** Verification / electronic forms (Adobe Acrobat links, NYDocSubmit, etc.) */
  verificationForms: VerificationForm[];

  /** Employment resources page: career center block */
  careerCenter: CareerCenterInfo;
  trainingAndEducation: ResourceLink[];
  jobSearchLinks: ResourceLink[];

  /** Logo image paths (relative to public/ or @/assets/) */
  logos: {
    workforce?: string;
    chrn?: string;
    foodbank?: string;
  };

  /** Job-location filtering: places inside the target county (lowercase) */
  countyPlaces: string[];
  /** Known places outside the county that appear in scraped sources (lowercase) */
  outOfCountyBlocklist: string[];
  /** State/region tokens that are definitively outside the target state */
  outOfStateRegions: string[];
}

export const defaultConfig: SiteConfig = {
  siteName: "Opportunity Board",
  countyName: "[Your County]",
  stateName: "[Your State]",

  dssName: "Department of Social Services",
  dssUrl: "https://example.gov/social-services",
  dssPhone: "(000) 000-0000",

  exemptionFormUrl: "https://forms.example.com/exemption-check",

  fromEmail: "noreply@example.gov",
  fromName: "Opportunity Board",

  supportEmail: "support@example.gov",

  verificationForms: [
    { label: "Volunteer Work Experience Verification Form", url: "https://example.com/volunteer-form", icon: "Briefcase" },
    { label: "Training / Educational Program Verification Form", url: "https://example.com/training-form", icon: "GraduationCap" },
    { label: "ABAWD Medical Statement", url: "https://example.com/medical-statement", icon: "Stethoscope" },
    { label: "Monthly WIOA Job Search Activity Record", url: "https://example.com/wioa-search", icon: "Search" },
    { label: "Caregiver Verification", url: "https://example.com/caregiver-form", icon: "Heart" },
    { label: "Submit Documentation to DSS via NYDocSubmit", url: "https://otda.ny.gov/programs/nydocsubmit", icon: "Send" },
  ],

  careerCenter: {
    name: "Local Career Center",
    blurb: "Services for every job seeker — empowering individuals and families to find better employment and build better lives.",
    address: "Downtown",
    phone: "(000) 000-0000",
    email: "careercenter@example.gov",
    websiteUrl: "https://example.gov/workforce",
    services: [
      { title: "Job Search Training", description: "Effective job search strategies, resume writing, interview skills, and more.", icon: "BookOpen" },
      { title: "Job Search Assistance", description: "Personalized connections and resources to help you find and land a job.", icon: "Briefcase" },
      { title: "Basic Education", description: "Build reading, writing, and foundational skills for today's job market.", icon: "GraduationCap" },
      { title: "Vocational Career Education", description: "Short-term training in high-demand skills and credentials.", icon: "Wrench" },
      { title: "Job Retention Support", description: "Up to 90 days of support after starting a new job to set you up for success.", icon: "LifeBuoy" },
    ],
  },

  trainingAndEducation: [],
  jobSearchLinks: [],

  logos: {},

  countyPlaces: [],
  outOfCountyBlocklist: [],
  outOfStateRegions: [
    " ak", " al", " ar", " az", " ca", " co", " ct", " dc", " de", " fl", " ga",
    " hi", " ia", " id", " il", " in", " ks", " ky", " la", " ma", " md", " me",
    " mi", " mn", " mo", " ms", " mt", " nc", " nd", " ne", " nh", " nj", " nm",
    " nv", " oh", " ok", " or", " pa", " ri", " sc", " sd", " tn", " tx", " ut",
    " va", " vt", " wa", " wi", " wv", " wy",
  ],
};
