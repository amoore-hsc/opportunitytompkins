/**
 * SNAP Work Rules Screener: questions, order and outcomes, kept as data.
 *
 * To change the question order, reorder SNAP_QUESTIONS. The screener asks
 * them top to bottom and stops at the first answer that leads to a result.
 *
 * Source of truth: the "SNAP Work Rules Screener" Google Form (printed
 * 11/6/26). `oldFormId` is that form's question id and `oldFormOrder` its
 * position, which the parity test uses to compare old and new results.
 *
 * Answers are never stored. The screener keeps them in memory only while the
 * page is open.
 */

/** Where an answer leads. "continue" means ask the next question. */
export type SnapOutcome =
  | "not_receiving" // does not get SNAP: tool doesn't apply
  | "exempt" // exempt, nothing to do
  | "medical" // exempt, needs the ABAWD medical form
  | "caregiver" // exempt, needs the Caregiver's form
  | "action_needed"; // no exemption found

export type SnapStep = SnapOutcome | "continue";

export type SnapQuestionKey =
  | "snap_enrolled"
  | "age_65_plus"
  | "age_16_17"
  | "working"
  | "child_under_14"
  | "health_condition"
  | "caregiver"
  | "ssi_ssdi"
  | "pregnant"
  | "unemployment"
  | "substance_treatment"
  | "nys_disability"
  | "ihs";

export interface SnapQuestion {
  key: SnapQuestionKey;
  text: string;
  onYes: SnapStep;
  onNo: SnapStep;
  /** Google Form question id, for parity checks */
  oldFormId: string;
  /** Position in the Google Form (1-based), for parity checks */
  oldFormOrder: number;
}

/** Result when every question was answered without reaching an outcome. */
export const SNAP_DEFAULT_OUTCOME: SnapOutcome = "action_needed";

/**
 * Asked in this order. Because the screener stops at the first Yes, the
 * order decides which result someone with several exemptions sees. Following
 * SNAP guidance (when more than one exemption applies, use the one that lasts
 * longest; "unfit for work" is checked last, for people who don't qualify any
 * other way), the order is:
 *   1. receiving SNAP (screens people out)
 *   2. long-lasting exemptions that need no paperwork
 *   3. shorter-term exemptions that need no paperwork
 *   4. exemptions that need a form, with the health condition question last
 */
export const SNAP_QUESTIONS: SnapQuestion[] = [
  {
    key: "snap_enrolled",
    text: "Are you currently receiving SNAP (food assistance)?",
    onYes: "continue",
    onNo: "not_receiving",
    oldFormId: "1450874763",
    oldFormOrder: 1,
  },
  {
    key: "age_65_plus",
    text: "Are you 65 or over?",
    onYes: "exempt",
    onNo: "continue",
    oldFormId: "483937143",
    oldFormOrder: 2,
  },
  {
    key: "age_16_17",
    text: "Are you 16-17 years old, not the head of household, and not attending school or training?",
    onYes: "exempt",
    onNo: "continue",
    oldFormId: "996623318",
    oldFormOrder: 3,
  },
  {
    key: "ssi_ssdi",
    text: "Do you receive SSI or SSD/SSDI?",
    onYes: "exempt",
    onNo: "continue",
    oldFormId: "1245219036",
    oldFormOrder: 6,
  },
  {
    key: "nys_disability",
    text: "Do you receive NYS Disability Benefits?",
    onYes: "exempt",
    onNo: "continue",
    oldFormId: "1648935393",
    oldFormOrder: 5,
  },
  {
    key: "ihs",
    text: "Are you eligible for Indian Health Services?",
    onYes: "exempt",
    onNo: "continue",
    oldFormId: "1567455980",
    oldFormOrder: 13,
  },
  {
    key: "child_under_14",
    text: "Do you live with a child under 14 years old?",
    onYes: "exempt",
    onNo: "continue",
    oldFormId: "1468055151",
    oldFormOrder: 4,
  },
  {
    key: "working",
    text: "Are you working 30 or more hours a week OR earning at least $217.50 per week?",
    onYes: "exempt",
    onNo: "continue",
    oldFormId: "1307935201",
    oldFormOrder: 11,
  },
  {
    key: "unemployment",
    text: "Are you receiving unemployment benefits?",
    onYes: "exempt",
    onNo: "continue",
    oldFormId: "1614966714",
    oldFormOrder: 12,
  },
  {
    key: "pregnant",
    text: "Are you pregnant?",
    onYes: "exempt",
    onNo: "continue",
    oldFormId: "217028634",
    oldFormOrder: 7,
  },
  {
    key: "substance_treatment",
    text: "Are you currently in a drug or alcohol treatment program?",
    onYes: "medical",
    onNo: "continue",
    oldFormId: "677354061",
    oldFormOrder: 9,
  },
  {
    key: "caregiver",
    text: "Are you caring for someone who cannot care for themselves?",
    onYes: "caregiver",
    onNo: "continue",
    oldFormId: "1750238696",
    oldFormOrder: 10,
  },
  {
    key: "health_condition",
    text: "Do you have a physical or mental condition that makes it hard for you to work?",
    onYes: "medical",
    onNo: "continue",
    oldFormId: "1126178568",
    oldFormOrder: 8,
  },
];
