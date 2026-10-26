import type { GateStep } from "@/data/types";
import type { WorkItem } from "@/data/works";

export interface Gates {
  build: boolean;
  pullRequests: boolean;
  shipped: boolean;
  rubrics: boolean;
  /** The gate steps the index holds for this feature, or null when it holds none. */
  gateSteps: GateStep[] | null;
}


/*
 * One of this work's own epics carries a pull request, or the work states the pull
 * request it will open. A design's `pr-draft.md` is authored before the code exists,
 * and it is the only pull-request record a work in the design stage has. Excluding
 * it left the level absent and the route silently redirected to Intent, which is the
 * shell stating that a level holds nothing while its first block was waiting to be
 * read.
 */
function hasPullRequest(work: WorkItem): boolean {
  return work.pullRequests.length >= 1 || Boolean(work.record?.pr_draft);
}

/* The stage is implemented, or a publication exists for one of this work's own. */
function hasShipped(work: WorkItem): boolean {
  return work.design.stage === "implemented" || work.publications.length >= 1;
}

/*
 * The Rubrics item always renders, and it states that no gate record exists when
 * the join is empty. A missing record must not read as a pass, so the flag below
 * means "the join holds a record", never "the gate passed".
 */
function hasGateRecord(work: WorkItem): boolean {
  return work.gateSteps !== null && work.gateSteps.length > 0;
}

/**
 * The section rules of section 3.3, each stated once and nowhere else.
 *
 * A section that fails its rule is absent from the rail. It is never disabled,
 * because an empty section wastes a click.
 *
 * Two of the three rules are narrow on purpose, and the corpus is why. A work item
 * whose decisions reach pull requests has not thereby opened them:
 * `joins.adr_to_pull_request` never feeds the Pull requests group, and a publication
 * for somebody else's pull request is not evidence that this work shipped.
 */
export function gatesOf(work: WorkItem): Gates {
  return {
    build: work.epics.length >= 1,
    pullRequests: hasPullRequest(work),
    shipped: hasShipped(work),
    rubrics: hasGateRecord(work),
    gateSteps: work.gateSteps,
  };
}
