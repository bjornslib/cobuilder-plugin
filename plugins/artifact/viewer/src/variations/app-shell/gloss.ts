/**
 * One sentence per state word, for the badge tooltips.
 *
 * Section 8.3 requires every state to carry a word, and section 3.2 requires the
 * status badge to gloss that word on hover and on focus. A word outside the recorded
 * vocabulary keeps its raw spelling in the tooltip and reads `unknown` in the badge.
 *
 * The stage glosses already live in `src/data/bundle.ts`, so this file re-exports
 * them rather than writing a second copy that could drift.
 */

import { STAGE_GLOSS } from "@/data/bundle";

export { STAGE_GLOSS };

/** The gloss for a badge word, or null when the word is outside the vocabulary. */
export function STATE_GLOSS_OF(word: string): string | null {
  return (STAGE_GLOSS as Record<string, string | undefined>)[word] ?? null;
}

export const STATE_GLOSS: Record<string, string> = STAGE_GLOSS;

/** What each assessment verdict means, in one line. */
export const VERDICT_GLOSS: Record<string, string> = {
  proceed: "The assessment found nothing that blocks the design.",
  concerns: "The assessment found risks the design does not resolve. It is not a pass.",
  rework: "The assessment found a problem the design must answer first.",
};

/** What each refined epic state means, in one line. */
export const EPIC_GLOSS: Record<string, string> = {
  unstarted: "No branch and no pull request carries this epic.",
  "no-pull-request": "A branch carries this epic, and no pull request is recorded.",
  planned: "The epic sits in the plan. No branch has started.",
  open: "A pull request carries this epic, and that pull request is open.",
  completed: "The joined state reads completed.",
  merged: "A merged pull request carries this epic.",
  blocked: "The work stopped on a decision, a dependency, or a failed check.",
  "in-progress": "A branch or a pull request carries the epic.",
  "in-review": "The work is built and waits on a reviewer.",
};
