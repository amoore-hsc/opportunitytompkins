/**
 * Compares the new SNAP screener with the old Google Form for every possible
 * combination of answers. Used by the parity test and the parity report
 * (`npm run parity-report`). Nothing here runs in the browser.
 */

import { SNAP_QUESTIONS, type SnapOutcome, type SnapQuestionKey } from "@/config/snapScreener";
import { evaluateOldForm, evaluateSnap, type SnapAnswers } from "@/lib/snapScreener";

export interface ParityCase {
  answers: SnapAnswers;
  yesKeys: SnapQuestionKey[];
  oldOutcome: SnapOutcome;
  newOutcome: SnapOutcome;
}

/** Every complete set of Yes/No answers (2^13 = 8,192 combinations). */
export function allAnswerCombinations(): SnapAnswers[] {
  const keys = SNAP_QUESTIONS.map((q) => q.key);
  const combos: SnapAnswers[] = [];
  for (let mask = 0; mask < 1 << keys.length; mask++) {
    const answers: SnapAnswers = {};
    keys.forEach((key, i) => {
      answers[key] = Boolean(mask & (1 << i));
    });
    combos.push(answers);
  }
  return combos;
}

export function runParity(): ParityCase[] {
  return allAnswerCombinations().map((answers) => {
    const state = evaluateSnap(answers);
    if (state.status !== "result") throw new Error("New screener left a question unanswered");
    return {
      answers,
      yesKeys: SNAP_QUESTIONS.filter((q) => answers[q.key]).map((q) => q.key),
      oldOutcome: evaluateOldForm(answers),
      newOutcome: state.outcome,
    };
  });
}

/** True if the outcome means "you're exempt" (any of the three exempt pages). */
export const isExempt = (outcome: SnapOutcome) =>
  outcome === "exempt" || outcome === "medical" || outcome === "caregiver";
