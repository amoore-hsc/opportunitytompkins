import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MedicaidCard } from "@/components/benefits/MedicaidCard";
import { siteConfig } from "@/config";
import { SNAP_QUESTIONS, type SnapOutcome, type SnapQuestionKey } from "@/config/snapScreener";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { evaluateSnap, type SnapAnswers } from "@/lib/snapScreener";
import { telHref } from "@/lib/siteSettings";
import { cn } from "@/lib/utils";

/*
 * Privacy: answers live only in this component's memory. They are never put
 * in the URL, browser storage, logs, analytics or Supabase, and are gone as
 * soon as the visitor leaves or reloads the page.
 */

interface AnsweredStep {
  key: SnapQuestionKey;
  answer: boolean;
}

const TOTAL_QUESTIONS = SNAP_QUESTIONS.length;

const Pill = () => (
  <p className="mb-4 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
    SNAP work requirements
  </p>
);

const PhoneLink = ({ phone }: { phone: string }) => (
  <a href={telHref(phone)} className="whitespace-nowrap underline hover:no-underline">
    {phone}
  </a>
);

const ExternalButtonLink = ({
  href,
  children,
  variant = "default",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "outline" | "success";
  className?: string;
}) => (
  <Button
    asChild
    size="lg"
    variant={variant}
    className={cn(
      "h-auto min-h-12 w-full whitespace-normal py-3 text-base",
      variant === "outline" && "border-2 border-primary text-primary",
      // Darken (not lighten) on hover so white text keeps 4.5:1 contrast.
      variant === "success" && "hover:bg-success hover:brightness-90",
      className,
    )}
  >
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ExternalLink aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  </Button>
);

const formUrl = (id: "abawd_medical" | "caregiver") =>
  siteConfig.verificationForms.find((form) => form.id === id)?.url;

const SnapScreener = () => {
  const settings = useSiteSettings();
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<AnsweredStep[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasInteracted = useRef(false);

  const answers: SnapAnswers = Object.fromEntries(history.map((step) => [step.key, step.answer]));
  const state = evaluateSnap(answers);

  useEffect(() => {
    document.title = `SNAP Work Rules Screener | ${siteConfig.siteName}`;
  }, []);

  // After each step, move focus to the new heading so screen-reader and
  // keyboard users land on the new question or result. Not on first load.
  useEffect(() => {
    if (!hasInteracted.current) return;
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [started, history.length]);

  const start = () => {
    hasInteracted.current = true;
    setStarted(true);
  };

  const answer = (value: boolean) => {
    if (state.status !== "question") return;
    hasInteracted.current = true;
    setHistory((prev) => [...prev, { key: state.question.key, answer: value }]);
  };

  const back = () => {
    hasInteracted.current = true;
    if (history.length === 0) setStarted(false);
    else setHistory((prev) => prev.slice(0, -1));
  };

  const startOver = () => {
    hasInteracted.current = true;
    setHistory([]);
    setStarted(false);
  };

  const headingProps = {
    ref: headingRef,
    tabIndex: -1,
    className: "outline-none",
  };

  let content: ReactNode;

  if (!started) {
    content = (
      <div className="mx-auto max-w-3xl">
        <Pill />
        <h1 {...headingProps} className="mb-6 text-4xl font-bold text-foreground outline-none sm:text-5xl">
          SNAP Work Rules Screener
        </h1>
        <div className="space-y-4 text-lg text-foreground">
          <p>
            Answer a few questions to see if the SNAP work rules for able-bodied adults without dependents (ABAWD) apply
            to you. This tool checks your eligibility but does not submit any information to DSS. Documentation may be
            submitted using NYDocSubmit. Please direct any questions to DSS <PhoneLink phone={settings.snapContact.phone} />.
          </p>
          <p>
            This form is intended for {siteConfig.countyName} residents. SNAP Work Rules are the same across New York
            State, so this tool can still help you. Some forms or steps we share are from {siteConfig.countyName} DSS.
            Your local DSS may use different forms.
          </p>
          <p>You're welcome to continue and use the information as a guide.</p>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button size="lg" className="min-h-12 px-10 text-base" onClick={start}>
            Start
          </Button>
          <p className="text-muted-foreground">About 2 minutes</p>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">We don't save your answers.</p>
      </div>
    );
  } else if (state.status === "question") {
    const number = state.index + 1;
    content = (
      <div className="mx-auto max-w-3xl">
        <Progress
          value={(number / TOTAL_QUESTIONS) * 100}
          aria-label={`Question ${number} of up to ${TOTAL_QUESTIONS}`}
          className="mb-2 h-2 bg-border"
        />
        <p className="mb-8 text-sm text-muted-foreground">
          Question {number} of up to {TOTAL_QUESTIONS}
        </p>
        <Pill />
        <h1 {...headingProps} className="mb-8 text-3xl font-bold text-foreground outline-none sm:text-4xl">
          {state.question.text}
        </h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <Button size="lg" className="min-h-14 text-lg" onClick={() => answer(true)}>
            Yes
          </Button>
          <Button size="lg" className="min-h-14 text-lg" onClick={() => answer(false)}>
            No
          </Button>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="mt-8 min-h-12 border-2 border-primary text-primary"
          onClick={back}
        >
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
      </div>
    );
  } else {
    content = (
      <ResultView outcome={state.outcome} headingProps={headingProps} onBack={back} onStartOver={startOver} />
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <main id="main-content" className="container mx-auto px-4 py-10 sm:py-14">
        {content}
      </main>
    </div>
  );
};

interface ResultViewProps {
  outcome: SnapOutcome;
  headingProps: { ref: React.RefObject<HTMLHeadingElement>; tabIndex: number; className: string };
  onBack: () => void;
  onStartOver: () => void;
}

const ExemptHeading = ({ headingProps }: Pick<ResultViewProps, "headingProps">) => (
  <h1 {...headingProps} className="mb-4 text-3xl font-bold text-foreground outline-none sm:text-4xl">
    Based on your responses, you're <strong className="font-extrabold">exempt</strong> from able-bodied adult without
    dependents (ABAWD) rules.
  </h1>
);

const FormExemption = ({
  headingProps,
  formName,
  formUrl: url,
}: Pick<ResultViewProps, "headingProps"> & { formName: string; formUrl: string | undefined }) => {
  const { nyDocSubmit } = useSiteSettings();
  const displayUrl = nyDocSubmit.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <>
      <ExemptHeading headingProps={headingProps} />
      <p className="mb-6 text-xl text-foreground">
        To keep your exemption, download and complete the <strong>{formName}</strong>, then upload it to NYDocSubmit.
      </p>
      {url && (
        <ExternalButtonLink href={url} variant="success" className="mb-6">
          Download the {formName}
        </ExternalButtonLink>
      )}
      <div className="rounded-lg bg-muted p-5 sm:p-6">
        <h2 className="mb-2 text-lg font-semibold text-foreground">More information about NYDocSubmit</h2>
        <p className="mb-3 text-foreground">
          NYDocSubmit is an app that can save you a trip to your local social services office. You can take a picture
          of your document or choose one from your phone, add your information, and send it to your social services
          district anytime. If you don't already have the app, you can download it for free from the App Store or
          Google Play.
        </p>
        <p className="text-foreground">
          To learn more, visit{" "}
          <a href={nyDocSubmit.url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
            {displayUrl}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </div>
    </>
  );
};

const ResultView = ({ outcome, headingProps, onBack, onStartOver }: ResultViewProps) => {
  const { snapContact, myBenefits } = useSiteSettings();
  const exempt = outcome === "exempt" || outcome === "medical" || outcome === "caregiver";

  let body: ReactNode;
  switch (outcome) {
    case "exempt":
      body = (
        <>
          <ExemptHeading headingProps={headingProps} />
          <p className="text-xl text-foreground">You don't need to do anything to stay enrolled.</p>
        </>
      );
      break;
    case "medical":
      body = <FormExemption headingProps={headingProps} formName="ABAWD medical form" formUrl={formUrl("abawd_medical")} />;
      break;
    case "caregiver":
      body = <FormExemption headingProps={headingProps} formName="Caregiver's form" formUrl={formUrl("caregiver")} />;
      break;
    case "action_needed":
      body = (
        <>
          <h1 {...headingProps} className="mb-4 text-3xl font-bold text-foreground outline-none sm:text-4xl">
            Action needed to keep your SNAP benefits
          </h1>
          <p className="text-xl text-foreground">
            Based on your answers, you don't appear to qualify for an exemption from the ABAWD (Able-Bodied Adult
            Without Dependents) work rules. To continue receiving SNAP benefits, you must take part in an approved work,
            training, or volunteer activity each month and submit documentation to DSS. Contact DSS for more
            information at <PhoneLink phone={snapContact.phone} />.
          </p>
        </>
      );
      break;
    case "not_receiving":
      body = (
        <>
          <h1 {...headingProps} className="mb-4 text-3xl font-bold text-foreground outline-none sm:text-4xl">
            This tool is for people who get SNAP
          </h1>
          <div className="mb-6 space-y-4 text-xl text-foreground">
            <p>This tool helps people who already get help through the Supplemental Nutrition Assistance Program (SNAP).</p>
            <p>
              If you don't get SNAP yet, you can apply online at NYS myBenefits or go to the {siteConfig.countyName}{" "}
              Website to learn how.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ExternalButtonLink href={myBenefits.url}>Apply on NYS myBenefits</ExternalButtonLink>
            <ExternalButtonLink href={snapContact.url} variant="outline">
              {siteConfig.countyName} website
            </ExternalButtonLink>
          </div>
        </>
      );
      break;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <section className={cn("rounded-xl border-2 bg-card p-6 sm:p-8", exempt ? "border-success" : "border-primary")}>
          {body}
        </section>
        <MedicaidCard />
      </div>

      {outcome !== "not_receiving" && (
        <section aria-labelledby="browse-heading" className="mt-6 rounded-xl bg-muted p-6 text-center sm:p-8">
          <h2 id="browse-heading" className="mb-2 text-2xl font-bold text-foreground">
            Not exempt, or want to find qualified hours?
          </h2>
          <p className="mb-5 text-lg text-muted-foreground">
            Volunteer, training, and education hours can count towards requirements.
          </p>
          <Button asChild size="lg" className="min-h-12 text-base">
            <Link to="/opportunities">Browse Opportunities</Link>
          </Button>
        </section>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="outline" size="lg" className="min-h-12 border-2 border-primary text-primary" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        <Button variant="outline" size="lg" className="min-h-12 border-2 border-primary text-primary" onClick={onStartOver}>
          Start over
        </Button>
      </div>

      <p className="mt-6 text-center text-muted-foreground">
        This is not a final benefits determination. Reach out to DSS with any SNAP eligibility questions.{" "}
        <PhoneLink phone={snapContact.phone} />
      </p>
    </div>
  );
};

export default SnapScreener;
