import { describe, expect, it } from "vitest";
import { SNAP_QUESTIONS, type SnapOutcome, type SnapQuestionKey } from "@/config/snapScreener";
import { evaluateOldForm, evaluateSnap, type SnapAnswers } from "@/lib/snapScreener";
import { isExempt, runParity } from "@/lib/snapParity";

const allNo = (): SnapAnswers => {
  const answers: SnapAnswers = { snap_enrolled: true };
  for (const q of SNAP_QUESTIONS) if (q.key !== "snap_enrolled") answers[q.key] = false;
  return answers;
};

/** Answer No to everything before `key`, then Yes to `key`. */
const yesAt = (key: SnapQuestionKey): SnapAnswers => {
  const answers: SnapAnswers = {};
  for (const q of SNAP_QUESTIONS) {
    if (q.key === key) {
      answers[key] = true;
      break;
    }
    answers[q.key] = q.key === "snap_enrolled";
  }
  return answers;
};

const outcomeOf = (answers: SnapAnswers): SnapOutcome => {
  const state = evaluateSnap(answers);
  if (state.status !== "result") throw new Error(`Expected a result, still asking ${state.question.key}`);
  return state.outcome;
};

describe("SNAP screener questions (data)", () => {
  it("has 13 Yes/No questions in the agreed order", () => {
    expect(SNAP_QUESTIONS.map((q) => q.key)).toEqual([
      "snap_enrolled",
      "age_65_plus",
      "age_16_17",
      "ssi_ssdi",
      "nys_disability",
      "ihs",
      "child_under_14",
      "working",
      "unemployment",
      "pregnant",
      "substance_treatment",
      "caregiver",
      "health_condition",
    ]);
  });

  it("uses the owner's wording for the two age questions", () => {
    const text = Object.fromEntries(SNAP_QUESTIONS.map((q) => [q.key, q.text]));
    expect(text.age_65_plus).toBe("Are you 65 or over?");
    expect(text.age_16_17).toBe(
      "Are you 16-17 years old, not the head of household, and not attending school or training?",
    );
  });

  it("maps every Google Form question exactly once", () => {
    const ids = SNAP_QUESTIONS.map((q) => q.oldFormId);
    expect(new Set(ids).size).toBe(13);
    expect(SNAP_QUESTIONS.map((q) => q.oldFormOrder).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 13 }, (_, i) => i + 1),
    );
  });

  it("has no 'not sure' / 'I don't know' wording", () => {
    for (const q of SNAP_QUESTIONS) expect(q.text).not.toMatch(/not sure|don't know|unsure/i);
  });
});

describe("SNAP screener rules engine", () => {
  it("starts with 'Are you currently receiving SNAP?'", () => {
    const state = evaluateSnap({});
    expect(state.status).toBe("question");
    if (state.status === "question") {
      expect(state.question.key).toBe("snap_enrolled");
      expect(state.index).toBe(0);
    }
  });

  it("sends people who don't get SNAP to the 'not receiving' page", () => {
    expect(outcomeOf({ snap_enrolled: false })).toBe("not_receiving");
  });

  it.each<[SnapQuestionKey, SnapOutcome]>([
    ["age_65_plus", "exempt"],
    ["age_16_17", "exempt"],
    ["working", "exempt"],
    ["child_under_14", "exempt"],
    ["health_condition", "medical"],
    ["caregiver", "caregiver"],
    ["ssi_ssdi", "exempt"],
    ["pregnant", "exempt"],
    ["unemployment", "exempt"],
    ["substance_treatment", "medical"],
    ["nys_disability", "exempt"],
    ["ihs", "exempt"],
  ])("Yes to %s shows the %s result", (key, outcome) => {
    expect(outcomeOf(yesAt(key))).toBe(outcome);
  });

  it("shows 'Action needed' when every answer is No", () => {
    expect(outcomeOf(allNo())).toBe("action_needed");
  });

  it("stops at the first Yes without asking later questions", () => {
    // Only two answers given; the result is reached without the rest.
    expect(evaluateSnap({ snap_enrolled: true, age_65_plus: true })).toEqual({ status: "result", outcome: "exempt" });
  });

  it("16-17 branch: No continues to the next question", () => {
    const state = evaluateSnap({ snap_enrolled: true, age_65_plus: false, age_16_17: false });
    expect(state.status === "question" && state.question.key).toBe("ssi_ssdi");
  });

  it("first Yes wins when several apply (working beats health condition)", () => {
    expect(outcomeOf({ ...allNo(), working: true, health_condition: true })).toBe("exempt");
  });

  it("asks every no-paperwork exemption before any form-based one", () => {
    const formBased = (q: (typeof SNAP_QUESTIONS)[number]) => q.onYes === "medical" || q.onYes === "caregiver";
    const firstForm = SNAP_QUESTIONS.findIndex(formBased);
    expect(SNAP_QUESTIONS.slice(firstForm).every(formBased)).toBe(true);
    expect(SNAP_QUESTIONS.at(-1)?.key).toBe("health_condition");
  });
});

describe("Parity with the old Google Form", () => {
  const cases = runParity();
  const enrolled = cases.filter((c) => c.answers.snap_enrolled);

  it("checks every combination of answers", () => {
    expect(cases).toHaveLength(2 ** 13);
  });

  it("agrees on 'not receiving SNAP' in every case", () => {
    for (const c of cases) {
      expect(c.newOutcome === "not_receiving").toBe(c.oldOutcome === "not_receiving");
    }
  });

  it("agrees on exempt vs. not exempt in every case", () => {
    for (const c of enrolled) expect(isExempt(c.newOutcome)).toBe(isExempt(c.oldOutcome));
  });

  it("gives the identical page whenever at most one answer after SNAP is Yes", () => {
    for (const c of enrolled.filter((x) => x.yesKeys.length <= 2)) {
      expect(c.newOutcome).toBe(c.oldOutcome);
    }
  });

  it("only differs where more than one exemption applies", () => {
    const diffs = enrolled.filter((c) => c.newOutcome !== c.oldOutcome);
    expect(diffs.length).toBeGreaterThan(0);
    for (const c of diffs) expect(c.yesKeys.length).toBeGreaterThan(2);
  });

  it("never sends someone a form the old Google Form would not have", () => {
    const needsForm = (o: string) => o === "medical" || o === "caregiver";
    for (const c of enrolled) {
      if (needsForm(c.newOutcome)) expect(needsForm(c.oldOutcome)).toBe(true);
    }
  });

  it("old form evaluation follows the Google Form order", () => {
    // Old form asks child under 14 (Q4) before health condition (Q8).
    expect(evaluateOldForm({ ...allNo(), child_under_14: true, health_condition: true })).toBe("exempt");
    // Old form asks health condition (Q8) before working (Q11).
    expect(evaluateOldForm({ ...allNo(), working: true, health_condition: true })).toBe("medical");
  });
});
