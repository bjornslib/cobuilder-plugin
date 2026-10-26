/**
 * The change's two written records: its intent, and the assessment against its diff.
 *
 * WHERE THEY COME FROM. The bundle keeps two blocks on one pull request's timeline entry.
 * `intent` is the author's own statement, captured by Generate mode before the code
 * existed. `assessment` is the reading written against the merged diff. Both belong to the
 * change's account and to no other account, so both render here.
 *
 * ABSENCE IS A STATE HERE TOO. A pull request carries an intent block when Generate mode
 * captured one, and an assessment when one was written. An entry with neither states that
 * in place rather than rendering two blank panels, which is what most of this bundle's
 * pull requests need: the records exist for a few of them and not for the rest.
 *
 * NOTHING HERE JUDGES A RECORD. An `inferred` intent says so, because a reading of the
 * diff is not an author's statement, and a reader who mistakes the two has been misled.
 * That single flag is the whole of the judgement this module makes.
 */

export { ChangeIntentPart } from "./IntentParts";
export type { IntentPart } from "./IntentParts";
export { ChangeAssessmentPart } from "./AssessmentParts";
export type { AssessmentPart } from "./AssessmentParts";
