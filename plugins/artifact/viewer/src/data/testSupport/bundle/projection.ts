import { blankRanges, commentRanges, isIndexKey, literalRanges, type SourceFile } from "./ranges";

/**
 * The two projections of one source file. Everything the two absence criteria read comes
 * from here, and neither criterion reads the file's own text.
 */
export interface Projections {
  /** Comments blanked, every literal kept. C4 reads this one. */
  withStrings: string;
  /** Comments blanked, and every literal's text blanked. C1 reads this one. */
  codeOnly: string;
}

/**
 * Project one source file twice.
 *
 * WHY THE TYPESCRIPT PARSER, AND NOT A SCANNER THAT TRACKS QUOTES. This file used to blank
 * comments with a hand-rolled scanner that entered a string state on any quote character
 * and left it on the matching one. A regular-expression literal holding a backtick ends
 * that state early, and from there on the scanner reads comments as code and code as
 * comments. The record-mosaic and flightdeck prototypes, since removed from
 * `src/variations/`, held files that contain exactly that, and the defect went unseen
 * because the criteria were passing or failing for reasons other than the ones they state.
 * The parser answers the question the scanner was guessing at: it has already decided which
 * characters are literal text by the time it reports a comment.
 *
 * WHY TWO PROJECTIONS. The two criteria ask different questions, and one projection cannot
 * answer both. C4 asks whether a file reaches a bundle global, and a global's name inside a
 * string literal is how a generic reader reaches it, so C4 needs the literal kept. C1 asks
 * whether a file resolves a join, and a join key inside a string literal resolves nothing:
 * `title="joins.slice_to_epic"` is a tooltip, and a glossary is prose. So C1 needs the
 * literal's text blanked.
 *
 * LINE NUMBERS SURVIVE BOTH. Literal text and comment text become spaces, and newlines
 * stay, so a hit reads `path:line: text` and a failure shows the line it found.
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

/** One projection per file, built on first use. Parsing a file twice serves no purpose. */
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

/**
 * Every line of a file that matches, with its own number, so a failure shows what it found.
 *
 * The pattern runs against one projection of the source, line by line, so a hit names the
 * line a reader would open. See the projection block above for what each one erases.
 */
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
