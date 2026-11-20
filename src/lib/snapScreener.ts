/**
 * SNAP screener rules engine. Pure functions over the question data in
 * `src/config/snapScreener.ts`; no I/O, no storage.
 */

import {
  SNAP_DEFAULT_OUTCOME,
  SNAP_QUESTIONS,
  type SnapOutcome,
  type SnapQuestion,
  type SnapQuestionKey,
} from "@/config/snapScreener";

export type SnapAnswers = Partial<Record<SnapQuestionKey, boolean>>;

export type SnapState =
  | { status: "question"; question: SnapQuestion; index: number }
  | { status: "result"; outcome: SnapOutcome };

/**
 * Walks the questions in order. Returns the first unanswered question, or the
 * result as soon as an answer leads to one (the screener stops at the first
 * answer that settles it).
 */
export function evaluateSnap(
  answers: SnapAnswers,
  questions: SnapQuestion[] = SNAP_QUESTIONS,
): SnapState {
  for (let index = 0; index < questions.length; index++) {
    const question = questions[index];
    const answer = answers[question.key];
    if (answer === undefined) return { status: "question", question, index };
    const step = answer ? question.onYes : question.onNo;
    if (step !== "continue") return { status: "result", outcome: step };
  }
  return { status: "result", outcome: SNAP_DEFAULT_OUTCOME };
}

/** The Google Form's question order, for comparing old and new results. */
export const OLD_FORM_QUESTIONS: SnapQuestion[] = [...SNAP_QUESTIONS].sort(
  (a, b) => a.oldFormOrder - b.oldFormOrder,
);

/** What the old Google Form would show for a complete set of answers. */
export function evaluateOldForm(answers: SnapAnswers): SnapOutcome {
  const state = evaluateSnap(answers, OLD_FORM_QUESTIONS);
  if (state.status !== "result") {
    throw new Error(`Old form needs an answer for ${state.question.key}`);
  }
  return state.outcome;
}
