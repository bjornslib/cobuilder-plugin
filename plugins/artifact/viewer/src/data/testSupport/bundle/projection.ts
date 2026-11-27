import { blankRanges, commentRanges, isIndexKey, literalRanges, type SourceFile } from "./ranges";

/** The two projections of one source file. The two absence criteria read only these. */
export interface Projections {
  /** Comments blanked, every literal kept. C4 reads this one. */
  withStrings: string;
  /** Comments blanked, and every literal's text blanked. C1 reads this one. */
  codeOnly: string;
}

/**
 * Project one source file twice. The TypeScript parser reads the comments, not a scanner
 * that tracks quotes. A hand-rolled scanner left its string state early on a regex literal
 * that holds a backtick, and from there it read comments as code and code as comments. The
 * parser has already decided which characters are literal text when it reports a comment.
 *
 * The two criteria need two projections. C4 asks whether a file reaches a bundle global, and
 * a global's name in a string literal is how a generic reader reaches it, so C4 keeps
 * literals. C1 asks whether a file resolves a join, and a join key in a literal resolves
 * nothing: `title="joins.slice_to_epic"` is a tooltip. So C1 blanks literal text.
 *
 * Comment and literal text become spaces and newlines stay, so a hit keeps its line number.
 */
function projectionsFor(file: SourceFile): Projections {
  const text = file.text;
  const literals = literalRanges(file);
  /* Comment ranges are read from the literals-blanked text. See `commentRanges`. */
  const comments = commentRanges(blankRanges(text, literals));
  const kept = literals.filter(([start]) => isIndexKey(text, start));
  return {
    withStrings: blankRanges(text, comments),
    codeOnly: blankRanges(blankRanges(text, literals.filter((range) => !kept.includes(range))), comments),
  };
}

const PROJECTIONS = new Map<string, Projections>();

function projected(file: SourceFile): Projections {
  let held = PROJECTIONS.get(file.path);
  if (!held) {
    held = projectionsFor(file);
    PROJECTIONS.set(file.path, held);
  }
  return held;
}

/** The projection a case reads. C1 reads `codeOnly`; C4 and C2 read `withStrings`. */
export type Projection = keyof Projections;

export function projectedText(file: SourceFile, which: Projection): string {
  return projected(file)[which];
}

export function lineAt(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/** Every line of a file that matches, with its own number, so a failure shows what it found. */
export function hitsByLine(pattern: RegExp, files: SourceFile[], which: Projection): string[] {
  const found: string[] = [];
  for (const file of files) {
    projectedText(file, which)
      .split("\n")
      .forEach((line, index) => {
        pattern.lastIndex = 0;
        if (pattern.test(line)) found.push(`${file.path}:${index + 1}: ${line.trim()}`);
      });
  }
  return found;
}
