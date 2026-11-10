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

export interface BoundaryRule {
  id: string;
  kind: string;
  target: string;
  why: string;
  /** Every other field the boundary record carries, so a Sheet can show them all. */
  detail: Record<string, unknown>;
  context: string;
}

export interface PlanDocs {
  product: ProgramDesignEntity | null;
  architecture: ProgramDesignEntity | null;
  program: ProgramDesignEntity | null;
}

/**
 * `adr_to_pull_request` is deliberately absent from the joins read below. The shell
 * shows no pull request beside a decision, so a decision's carrier has nothing to feed.
 * Do not add it back without a surface that shows one.
 */
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
  adrSource: "record" | "index" | "none";
  /**
   * The pull requests this work's own epics carry. `joins.epic_to_pull_request` is its
   * only source (section 3.3 of the program design).
   */
  pullRequests: PullRequest[];
  pullRequestVia: Map<number, string[]>;
  /** Publications for a pull request this work's own epics carry. Never another work's. */
  publications: PublicationEntity[];
  /** The planning slug this work's gates are keyed by. */
  planSlug: string;
  planSlugVia: "slice" | "design";
  /**
   * True when a plan directory exists for this work. The index carries no design-to-plan
   * field, so the shell reads the record kinds that only a plan can carry, and it treats
   * a slug as a real plan only when one of them names it. An epic's design panel reads
   * this to tell a work with no plan from a work whose plan is missing one epic's
   * document. The two need different sentences.
   */
  hasPlan: boolean;
  planDocs: PlanDocs;
  gateSteps: GateStep[] | null;
  /** Every feature slug the gate join holds. The Rubrics panel names what it did not read. */
  gateSlugs: Record<string, GateStep[]>;
  /** The Gate 4b technical solution design per epic, keyed by the epic's own id. */
  epicDesigns: Map<string, EpicDesignEntity>;
  epicDesignVia: "id" | "plan slug" | "none";
  contexts: ContextEntity[];
  districts: DistrictEntity[];
  boundaryRules: BoundaryRule[];
  /** Districts no context verifies. The index computes this list once. */
  districtsUncovered: DistrictEntity[];
  /**
   * This work's plan-slug rubric documents, in slice order. A work whose plan holds no
   * rubric has an empty list, and the Rubrics page states that absence per slice.
   */
  rubrics: RubricEntity[];
  /**
   * Each rubric keyed by its slice id. Both ids are `<plan slug>/<n>`, so this is a
   * lookup and not a join, and no new join key exists for the shell to read.
   */
  rubricBySlice: Map<string, RubricEntity>;
  diagramLevels: string[];
}

export type WorkPart<K extends keyof WorkItem> = Pick<WorkItem, K>;
