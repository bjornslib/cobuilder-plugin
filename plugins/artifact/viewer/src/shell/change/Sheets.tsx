/**
 * The change's two written records: its intent, and the assessment against its diff.
 *
 * The bundle keeps both on one pull request's timeline entry. `intent` is the author's
 * statement, captured by Generate mode before the code existed. `assessment` is the
 * reading written against the merged diff. Both belong to the change's account only.
 *
 * Absence is a state here too. Most pull requests in this bundle carry few of these
 * records, so an entry with neither states that in place rather than rendering two
 * blank panels.
 *
 * Nothing here judges a record. An `inferred` intent says so, because a reading of the
 * diff is not an author's statement, and a reader who mistakes the two has been misled.
 */

export { ChangeIntentPart } from "./IntentParts";
export type { IntentPart } from "./IntentParts";
export { ChangeAssessmentPart } from "./AssessmentParts";
export type { AssessmentPart } from "./AssessmentParts";
