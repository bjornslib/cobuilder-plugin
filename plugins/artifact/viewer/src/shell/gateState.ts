/**
 * The gate state text, split for the Rubrics row.
 *
 * A gate state holds a status word and a date. It often adds a note in parentheses or
 * after a dash. The row shows the status word and the date in a short pill. The full
 * text moves to a tooltip, so a long note never squeezes the gate name.
 */

const NOTE_MARKS = [" (", " — "] as const;

export function splitGateState(text: string): { short: string; full: string } {
  const full = text.trim();
  let cut = full.length;
  for (const mark of NOTE_MARKS) {
    const at = full.indexOf(mark);
    if (at !== -1 && at < cut) cut = at;
  }
  return { short: full.slice(0, cut).trimEnd(), full };
}
