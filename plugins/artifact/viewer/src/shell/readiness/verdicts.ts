import type { DesignRecord } from "@/data/bundle";

import type { Readiness, Verdict } from "./kinds";

export function verdictOf(state: Readiness, missing: string[] = []): Verdict {
  return { state, missing };
}

export function hasText(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(value: unknown[] | undefined | null): boolean {
  return Array.isArray(value) && value.length > 0;
}

/**
 * The key this shell's first level carried before ADR-0029 renamed it.
 *
 * A design record authored before the rename holds its narration under the key the level
 * used to have, and `designs.js` is a projection of records authored over months. So the
 * reader asks for the level's current key first and for this one second, and a design
 * narrated before the rename still reads as narrated rather than as an empty level.
 *
 * Nothing writes this key. The level list above carries the one name the shell asks for
 * and shows, and this table is a read of an older record and not a second name for the
 * level. A future session that drops the read is free to, once no bundle in service
 * predates the rename.
 */
const PRE_RENAME_LEVEL_KEY: Record<string, string> = { intent: "landscape" };

type LevelRead = { narration?: string } | null;

function levelNamed(source: Record<string, unknown>, name: string): LevelRead {
  const level = source[name];
  return typeof level === "object" && level !== null ? (level as { narration?: string }) : null;
}

/**
 * One narrative level, whatever shape the record wrote it in.
 *
 * `review-flight-deck` wraps its three levels under `levels` instead of authoring them at
 * the top level. Both shapes are read, because a rule that saw only the flat one reported
 * that design's three levels missing while the text sat one key away.
 */
export function narrativeLevel(record: DesignRecord, key: string): LevelRead {
  const narrative = record.narrative;
  if (!narrative) return null;
  const source = (narrative.levels ?? narrative) as Record<string, unknown>;
  const previous = PRE_RENAME_LEVEL_KEY[key];
  const names = previous === undefined ? [key] : [key, previous];
  return names.map((name) => levelNamed(source, name)).find((level) => level !== null) ?? null;
}

/** Every `##` section of a draft, as a table of contents. */
function draftSections(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((row) => /^##\s+\S/.test(row))
    .map((row) => row.replace(/^##\s+/, "").trim());
}

/**
 * The goal, and the one rule that reads `min_work`.
 *
 * A goal that records `challenge_stage_run` false is a backlog entry. Design mode stopped
 * after stage 1, so the record is whole in its own terms and the design is not. The rule
 * names that, because a reader comparing two rows has to see the difference.
 */
export function goalVerdict(goal: DesignRecord["goal"]): Verdict {
  if (!goal) return verdictOf("absent");
  const missing: string[] = [];
  if (!hasText(goal.outcome)) missing.push("outcome");
  if (!hasItems(goal.done_when)) missing.push("done_when");
  if (goal.min_work?.challenge_stage_run === false) {
    missing.push("design mode's stages 2 to 7");
  }
  return verdictOf(missing.length === 0 ? "present" : "partial", missing);
}

export function intentVerdict(record: DesignRecord): Verdict {
  const intent = record.intent;
  if (!intent) return verdictOf("absent");
  const missing: string[] = [];
  if (!hasText(intent.problem)) missing.push("problem");
  if (!hasText(intent.approach)) missing.push("approach");
  if (!hasItems(intent.risks)) missing.push("risks");
  if (!hasItems(intent.unknowns)) missing.push("unknowns");
  return verdictOf(missing.length === 0 ? "present" : "partial", missing);
}

export function assessmentVerdict(record: DesignRecord): Verdict {
  const assessment = record.assessment;
  if (!assessment) return verdictOf("absent");
  const missing: string[] = [];
  if (!hasText(assessment.verdict)) missing.push("verdict");
  if (!hasText(assessment.summary)) missing.push("summary");
  if (!hasItems(assessment.findings)) missing.push("findings");
  return verdictOf(missing.length === 0 ? "present" : "partial", missing);
}

export function draftVerdict(record: DesignRecord): Verdict {
  const draft = record.pr_draft;
  if (!hasText(draft)) return verdictOf("absent");
  if (draftSections(draft).length === 0) return verdictOf("partial", ["sections"]);
  return verdictOf("present");
}

export function diagramVerdict(record: DesignRecord): Verdict {
  const diagrams = record.diagrams;
  if (!diagrams || Object.keys(diagrams).length === 0) return verdictOf("absent");
  const missing = ["1", "2", "3"]
    .filter((level) => !hasText(diagrams[level]))
    .map((level) => `level ${level}`);
  return verdictOf(missing.length === 0 ? "present" : "partial", missing);
}
