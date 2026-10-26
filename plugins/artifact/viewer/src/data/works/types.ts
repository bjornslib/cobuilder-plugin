import type {
  AdrEntity,
  ContextEntity,
  DesignEntity,
  DistrictEntity,
  EpicDesignEntity,
  EpicEntity,
  GateStep,
  ProgramDesignEntity,
  PublicationEntity,
  PullRequest,
  RubricEntity,
  SliceEntity,
} from "@/data/types";
import type { DesignRecord } from "@/data/bundle";

/* ------------------------------------------------------------------ the work */

export interface BoundaryRule {
  id: string;
  kind: string;
  target: string;
  why: string;
  /** Every other field the boundary record carries, so a Sheet can show them all. */
  detail: Record<string, unknown>;
  /** The context this rule belongs to. */
  context: string;
}

/**
 * One work item, and everything the index resolves about it.
 *
 * `adr_to_pull_request` is deliberately absent from the joins read below. The shell
 * shows no pull request beside a decision, so a decision's carrier has nothing to
 * feed. Do not add it back without a surface that shows one.
 */
/** A work's three plan documents, in gate order. */
export interface PlanDocs {
  product: ProgramDesignEntity | null;
  architecture: ProgramDesignEntity | null;
  program: ProgramDesignEntity | null;
}

export interface WorkItem {
  /** The design id. It is the route's `:workId`. */
  id: string;
  design: DesignEntity;
  /** The record bodies, or undefined when `designs.js` carried no entry. */
  record: DesignRecord | undefined;
  epics: EpicEntity[];
  slices: SliceEntity[];
  /** The slices of one epic, read from the `slice_to_epic` join. */
  slicesByEpic: Map<string, SliceEntity[]>;
  /** Refined epic state, read from the join and never from the entity. */
  epicState: (epic: EpicEntity) => string;
  /** The decisions this work names. `goal.adrs[]`, `goal.adr`, and each `goal.epics[].adr` are the source, and the shell says so. */
  linkedAdrs: AdrEntity[];
  /** Where the linked-decision list came from. */
  adrSource: "record" | "index" | "none";
  /**
   * The pull requests this work's own epics carry. This is the work's own set, and
   * `joins.epic_to_pull_request` is its only source. Section 3.3.
   */
  pullRequests: PullRequest[];
  /** Which epic named each pull request. */
  pullRequestVia: Map<number, string[]>;
  /** Publications for a pull request this work's own epics carry. Never another work's. */
  publications: PublicationEntity[];
  /** The planning slug this work's gates are keyed by. */
  planSlug: string;
  planSlugVia: "slice" | "design";
  /**
   * True when a plan directory exists for this work.
   *
   * The index carries no design-to-plan field, so the shell reads the three record kinds
   * that only a plan can carry, and it treats a slug as a real plan only when one of them
   * names it. An epic's design panel reads this to tell a work with no plan from a work
   * whose plan is simply missing one epic's document. The two need different sentences.
   */
  hasPlan: boolean;
  /** The Gates 1, 2, and 3 documents of this work's plan, or null for an absent one. */
  planDocs: PlanDocs;
  gateSteps: GateStep[] | null;
  /** Every feature slug the gate join holds. The Rubrics panel names what it did not read. */
  gateSlugs: Record<string, GateStep[]>;
  /** The Gate 4b technical solution design per epic, keyed by the epic's own id. */
  epicDesigns: Map<string, EpicDesignEntity>;
  /** How an epic design resolved. The panel that shows one names this. */
  epicDesignVia: "id" | "plan slug" | "none";
  contexts: ContextEntity[];
  districts: DistrictEntity[];
  boundaryRules: BoundaryRule[];
  /** Districts no context verifies. The index computes this list once. */
  districtsUncovered: DistrictEntity[];
  /**
   * This work's plan-slug rubric documents, in slice order. A work whose plan holds no
   * rubric carries an empty list, and the Rubrics page states that absence per slice.
   */
  rubrics: RubricEntity[];
  /**
   * Each rubric keyed by its slice id. The ids are the same string by construction —
   * both are `<plan slug>/<n>` — so this is a lookup and not a join, and no new join
   * key exists for the shell to read.
   */
  rubricBySlice: Map<string, RubricEntity>;
  diagramLevels: string[];
}

export type WorkPart<K extends keyof WorkItem> = Pick<WorkItem, K>;
