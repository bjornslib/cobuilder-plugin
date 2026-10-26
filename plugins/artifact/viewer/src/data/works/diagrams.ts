/**
 * The design's diagram levels, in the order the shell draws them (ADR-0036).
 *
 * The numeric levels come first, ascending. The named `runtime` slot sits
 * ahead of the class level: the reading order is overview (what the system
 * is), sequence (how it flows), runtime architecture (how it is structured),
 * then classes (what the types are). The slot is never a narrative level and
 * never renumbers one; the overview always leads the design.
 */
function withRuntime(levels: string[]): string[] {
  const classIndex = levels.indexOf("3");
  const ahead = classIndex === -1 ? levels.length : classIndex;
  return [...levels.slice(0, ahead), "runtime", ...levels.slice(ahead)];
}

export function architectureTileLevels(
  record: { diagrams?: Record<string, string> | undefined } | null | undefined,
): string[] {
  const diagrams = record?.diagrams;
  if (!diagrams) return [];
  const numeric = Object.keys(diagrams)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b));
  return diagrams["runtime"] ? withRuntime(numeric) : numeric;
}
