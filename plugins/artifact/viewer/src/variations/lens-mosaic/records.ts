/**
 * The authored design records, from `data/designs.js`.
 *
 * `data/index.json` carries each design's name, stage, and outcome. It carries no
 * intent, no narrative, no assessment, and no diagram source. Those live in the
 * authored records under `docs/architecture/designs/<id>/`, and
 * `shared/build_index.py` projects them into `data/designs.js`.
 *
 * `src/data/bundle.ts` fixes how a surface reaches a sibling under `data/`: the dev
 * server mounts the bundle root at `/bundle/`, every sibling has a `.js` twin, and
 * that twin assigns a global. `index.json` has an `.js` twin too, so a surface can
 * read either form. This reader follows that rule exactly. It appends one script
 * tag, waits for `window.DESIGNS`, and reads the global. A published Artifact
 * inlines the same global and this reader returns it with no request, which is why
 * the global is checked first.
 *
 * The types below are written from the real records. A field is optional where the
 * corpus holds a record without it, and no field is invented.
 */

import { useEffect, useState } from "react";

import { BUNDLE_DATA_URL } from "@/data/bundle";

export interface GoalEpic {
  id: string;
  slug?: string;
  branch: string | null;
  pr: number | null;
  state: string;
  outcome?: string;
  note?: string | null;
}

export interface GoalRound {
  n: number;
  changed: boolean;
  feedback_class?: string;
}

export interface Goal {
  name: string;
  title?: string;
  created?: string;
  outcome?: string;
  done_when?: string[];
  abort_if?: string[];
  min_work?: {
    derived_from?: string;
    note?: string;
    challenge_stage_run?: boolean;
    /** A count, when divergent exploration ran. */
    alternatives_explored?: number;
    /** Whether the boundary rules were checked against the design. */
    boundary_rules_checked?: boolean;
  };
  limits?: { warn_after_rounds?: number; cutoff_rounds?: number };
  epics?: GoalEpic[];
  stage?: string;
  adr?: string;
  adrs?: string[];
  supersedes?: string[];
  superseded_by?: string;
  rounds?: GoalRound[];
}

export interface Alternative {
  option: string;
  rejected_because: string;
}

export interface Intent {
  captured?: string;
  source?: string;
  authorship?: string;
  problem?: string;
  why_now?: string;
  approach?: string;
  alternatives?: Alternative[];
  out_of_scope?: string[];
  risks?: string[];
  testing?: string;
  reviewer_focus?: string[];
  unknowns?: string[];
}

export interface Beat {
  kind?: string;
  text?: string;
}

export interface ProblemSolution {
  problem?: string;
  solution?: string;
  narration?: string;
  beats?: Beat[];
  alternatives?: Alternative[];
}

export interface NarrativeLevels {
  landscape?: { tagline?: string; narration?: string };
  problem_solution?: ProblemSolution;
  architecture?: { narration?: string; beats?: Beat[] };
}

/** Seven records nest their levels one step down, under a `levels` key. */
export interface Narrative extends NarrativeLevels {
  design_name?: string;
  levels?: NarrativeLevels;
}

export interface Finding {
  kind?: string;
  id?: string;
  severity?: string;
  title?: string;
  detail?: string;
  cites?: string;
}

export interface Assessment {
  verdict?: string;
  summary?: string;
  risk_tier?: string;
  regret_risk?: string;
  constraint_introduced?: string;
  stage?: string;
  captured?: string;
  assessed?: string;
  findings?: Finding[];
  drift?: unknown[];
  boundary_checks?: unknown[];
}

export interface DesignRecord {
  goal: Goal;
  intent?: Intent;
  narrative?: Narrative;
  assessment?: Assessment;
  /** Mermaid source keyed by narration level, `"1"` to `"3"`. */
  diagrams?: Record<string, string>;
  pr_draft?: string;
}

export type DesignRecords = Record<string, DesignRecord>;

/**
 * `window.DESIGNS` is read through a cast rather than through a global declaration.
 * Two variations in this app read the same record, and two `declare global` blocks
 * for one property must agree on its type or neither compiles. A local cast cannot
 * collide with a sibling.
 */
function globalRecords(): DesignRecords | undefined {
  return (window as unknown as { DESIGNS?: DesignRecords }).DESIGNS;
}

/** The narrative levels, whichever way round the record nests them. */
export function levelsOf(narrative: Narrative | undefined): NarrativeLevels | null {
  if (!narrative) return null;
  return narrative.levels ?? narrative;
}

export function loadDesignRecords(): Promise<DesignRecords> {
  const inlined = globalRecords();
  if (inlined) return Promise.resolve(inlined);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${BUNDLE_DATA_URL}designs.js`;
    script.async = true;
    script.onload = () => {
      const loaded = globalRecords();
      if (loaded) resolve(loaded);
      else {
        reject(
          new Error(
            `${BUNDLE_DATA_URL}designs.js loaded and assigned no window.DESIGNS. ` +
              `Check that the bundle was built by the current shared/build_index.py.`,
          ),
        );
      }
    };
    script.onerror = () => {
      reject(
        new Error(
          `The dev server did not serve ${BUNDLE_DATA_URL}designs.js. ` +
            `Check that the bundle exists at .cobuilder-architect/self/ and that ` +
            `npm run dev is the server you are reading.`,
        ),
      );
    };
    document.head.appendChild(script);
  });
}

export type RecordsLoad =
  | { state: "loading" }
  | { state: "ready"; records: DesignRecords }
  | { state: "failed"; message: string };

/** Read the authored records once. The `attempt` value re-runs the load. */
export function useDesignRecords(attempt: number): RecordsLoad {
  const [load, setLoad] = useState<RecordsLoad>({ state: "loading" });

  useEffect(() => {
    let live = true;
    setLoad({ state: "loading" });
    loadDesignRecords()
      .then((records) => {
        if (live) setLoad({ state: "ready", records });
      })
      .catch((error: unknown) => {
        if (live) {
          setLoad({
            state: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  return load;
}

/** The record for one design, or null while it loads or when the file has none. */
export function recordFor(
  load: RecordsLoad,
  designId: string,
): DesignRecord | null {
  if (load.state !== "ready") return null;
  return load.records[designId] ?? null;
}
