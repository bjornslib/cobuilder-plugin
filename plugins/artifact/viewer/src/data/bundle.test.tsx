/**
 * Slice 4's contract: one typed model reads the bundle.
 *
 * The rubric is `.cobuilder/rubrics/cobuilder-viewer/slice-4.md`, and this file states
 * its four criteria as cases. Two of them are type-level, so this file runs under two
 * runners: `npm test` runs the behaviour, and `npm run typecheck` runs the type guards.
 * A type guard is a no-op at runtime, so its state shows in the `tsc` output alone.
 *
 * WHY SOME CASES READ THE SOURCE. Two criteria are about an absence: no join resolved
 * outside the data module (C1), and no global read outside it (C4). A reader can only fail
 * an absence by looking at the tree, so those cases scan the source and name the structure
 * they inspect. A hit is reported as `path:line: text`, so a failure shows what it found.
 *
 * WHAT THE SCAN READS. Each criterion reads a projection of the source in which comments
 * are blanked, and the text of a literal is kept or blanked according to the question that
 * criterion asks. The projection block below states both projections, and why this file no
 * longer scans quote characters by hand.
 *
 * WHICH GLOBALS THE SCAN NAMES. The criterion's list says `window.DIFFS`, and the bundle
 * does not write that name. `data/diffs-pr{N}.js` writes `window.DIFFS_BY_PR[N]`, and
 * `src/variations/flightdeck/model.ts` records the difference. So the scan reads the six
 * names the bundle actually defines:
 *
 *   STORY  ODYSSEY  DIFFS_BY_PR  ADRS  DESIGNS  DIAGRAMS
 *
 * The scan also matches a bare `DIFFS`, so a reader of the criterion's old spelling still
 * fires. `word boundary` keeps the two apart: `\bDIFFS\b` does not match inside
 * `DIFFS_BY_PR`, so one reader is reported once.
 *
 * WHICH FILES THE SCAN COVERS. Every `.ts` and `.tsx` under `src/`, apart from two sets:
 * the test files and `src/data/` itself, which is the one module the criteria name. No
 * path under `src/` is excluded. `src/variations/` is covered along with `src/shell/`,
 * `src/components/`, `src/hooks/`, `src/lib/`, and the two files at the top of `src/`,
 * `App.tsx` and `main.tsx`.
 *
 * WHY NOTHING IS EXCLUDED NOW. A scope that once left `src/variations/` out did so for a
 * reason that is gone. `src/Variations.tsx` imported every prototype statically, so the
 * build carried each prototype's code and its duplicate Sheet, panel, atoms, and markdown
 * copies. That harness is deleted, the shell's variations route with it, and each
 * prototype has its own dev entry, so no prototype enters the built file.
 *
 * WHAT THE WIDENED SCOPE FINDS TODAY. Both cases pass, and both read every file under
 * `src/` with no `src/variations/` exclusion. Neither needs one.
 *
 *   C4 passes. The six globals are read in `src/data/` alone. Each prototype handed its
 *   own reader to the data module, so no file outside it names a global.
 *
 *   C1 passes. Every join resolves under `src/data/`, in `works.ts` and in `joins.ts`, and
 *   a surface consumes the resolved value. The old pattern named 78 lines across 13 files,
 *   and 48 of those were a real resolution, in 11 of the files: a join lookup, or a fallback
 *   to an entity's own placeholder. That work moved onto the data module, and no line outside
 *   it resolves a join or reads a join key.
 *
 * THE SCOPE IS A PROPERTY OF THE RULE, NOT OF THE BUNDLE. A criterion that reads every file
 * under `src/` is the honest reading of the rule, and it does not depend on which files the
 * build happens to carry. A prototype that resolved a join is a second source for one fact
 * whether or not it ships, and C1 names that defect. So the case reports it either way,
 * rather than hide it behind an exclusion that a later harness change would invalidate.
 *
 * WHAT THE SCAN DOES NOT COVER, and why the criterion stays partly unmet. C3's own
 * evidence is a served bundle read through the ChromeDevTools MCP tools. No runner in
 * this repository holds a browser, so the case below keeps the half that a DOM can
 * carry: the level renders the records the bundle carries. The console half of C3 is
 * kept here too, because jsdom has a console.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { cleanup, render, waitFor } from "@testing-library/react";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";

import type { DesignRecords } from "./bundle";
import type { OpenPullRequest, PullRequest } from "./types";

/* -------------------------------------------------------------- the project */

/**
 * This file's own directory, as a plain path.
 *
 * `new URL("..", import.meta.url)` is not used here. Vite rewrites that exact shape into
 * an asset reference, and the rewrite turns the value into something that is not a file
 * URL. The string form below reads the module's own URL and changes nothing else.
 */
const HERE = decodeURIComponent(import.meta.url.replace(/^file:\/\//, "")).replace(/\/[^/]+$/, "");
/** This file sits at `src/data/`, so one step up is `src/`. */
const SRC_ROOT = join(HERE, "..");
/** The package root, the directory `npm run typecheck` runs in. */
const VIEWER_ROOT = join(SRC_ROOT, "..");
/** The committed self bundle, the corpus every reader in the app reads. */
const BUNDLE_DATA = join(VIEWER_ROOT, "..", "..", "..", ".cobuilder-architect", "self", "data");

/** One source file, with its path relative to the package root: `src/shell/model.ts`. */
interface SourceFile {
  path: string;
  text: string;
}

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

/**
 * The literal node kinds: every range of text that is data rather than code.
 *
 * A template is the one kind worth naming. `TemplateHead`, `TemplateMiddle`, and
 * `TemplateTail` are the three text chunks of `` `a${x}b${y}c` ``, and the two `${}`
 * substitutions sit between them as ordinary expression nodes. Blanking the chunks alone
 * therefore keeps the substitutions as code, which is what C1 needs: a join read inside a
 * `${}` is a read of it.
 */
const LITERAL_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.RegularExpressionLiteral,
  /* JSX text is prose a reader sees, so it is data for the same reason a string is. */
  ts.SyntaxKind.JsxText,
]);

/** A `.tsx` file is parsed as TSX, so a JSX element is not read as a type assertion. */
function scriptKind(file: SourceFile): ts.ScriptKind {
  return file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/** Every range of literal text in one file, in source order. */
function literalRanges(file: SourceFile): Array<[number, number]> {
  const source = ts.createSourceFile(
    file.path,
    file.text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    scriptKind(file),
  );
  const ranges: Array<[number, number]> = [];
  const visit = (node: ts.Node): void => {
    if (LITERAL_KINDS.has(node.kind)) ranges.push([node.getStart(source), node.getEnd()]);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return ranges;
}

/**
 * Every range of comment trivia, read from text whose literals are already blanked.
 *
 * THE ORDER MATTERS, AND IT IS THE WHOLE FIX. The TypeScript scanner decides what a `/`
 * is from the tokens around it, and it does not re-scan a slash as the start of a regular
 * expression on its own. A regex holding a backtick, such as the markdown-fence matcher in
 * `src/variations/record-mosaic/records.ts`, therefore ends the scanner's string state
 * early, and every comment after it in that file is read as code. Blanking the literals
 * first removes the characters that could mislead it, and blanking changes no offset, so
 * the ranges still name the right lines. A comment cannot sit inside a literal, so no real
 * comment is lost by reading them in this order.
 */
function commentRanges(text: string): Array<[number, number]> {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    /* skipTrivia */ false,
    ts.LanguageVariant.Standard,
    text,
  );
  const ranges: Array<[number, number]> = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      ranges.push([scanner.getTokenPos(), scanner.getTextPos()]);
    }
    token = scanner.scan();
  }
  return ranges;
}

/** Replace every character in every range with a space, and keep every newline. */
function blankRanges(text: string, ranges: Array<[number, number]>): string {
  const chars = text.split("");
  for (const [start, end] of ranges) {
    for (let i = start; i < end; i += 1) {
      if (chars[i] !== "\n" && chars[i] !== "\r") chars[i] = " ";
    }
  }
  return chars.join("");
}

/**
 * True when the literal starting at `start` is an element-access key: `joins["KEY"]`.
 *
 * That is the same read as `joins.KEY`, spelled another way, so the code projection keeps
 * it and the pattern matches the bracket form. C1's rule says "however the call site
 * spells it", so a spelling the projection erased would be a hole rather than a mention.
 */
function isIndexKey(text: string, start: number): boolean {
  let i = start - 1;
  while (i >= 0 && (text[i] === " " || text[i] === "\t")) i -= 1;
  return text[i] === "[";
}

/**
 * The two projections of one source file. Everything the two absence criteria read comes
 * from here, and neither criterion reads the file's own text.
 */
interface Projections {
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
 * comments. Files such as `src/variations/record-mosaic/records.ts` and
 * `src/variations/flightdeck/model.ts` contain exactly that, and the defect went unseen
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

const ALL_SOURCES: SourceFile[] = walk(SRC_ROOT)
  .filter((file) => !/\.test\.tsx?$/.test(file))
  .map((file) => ({ path: relative(join(SRC_ROOT, ".."), file), text: readFileSync(file, "utf8") }));

/** The data module the criteria name: every source file under `src/data/`. */
const DATA_SOURCES = ALL_SOURCES.filter((file) => file.path.startsWith("src/data/"));

/** Every source file under `src/` that is not the data module itself. See this file's header. */
const OUTSIDE_SOURCES = ALL_SOURCES.filter((file) => !file.path.startsWith("src/data/"));

/** The projection a case reads. C1 reads `codeOnly`; C4 and C2 read `withStrings`. */
type Projection = keyof Projections;

function projectedText(file: SourceFile, which: Projection): string {
  return projected(file)[which];
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/**
 * Every line of a file that matches, with its own number, so a failure shows what it found.
 *
 * The pattern runs against one projection of the source, line by line, so a hit names the
 * line a reader would open. See the projection block above for what each one erases.
 */
function hitsByLine(pattern: RegExp, files: SourceFile[], which: Projection): string[] {
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

/** One declaration's text, from its keyword to the end of its own block. */
function declarationText(text: string, start: number): string {
  let depth = 0;
  let seenBlock = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      depth += 1;
      seenBlock = true;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, text[i + 1] === ";" ? i + 2 : i + 1);
      continue;
    }
    if (ch === ";" && depth === 0 && !seenBlock) return text.slice(start, i + 1);
  }
  return text.slice(start);
}

/** Every `interface X` or `type X =` declaration of `name`, with its line number. */
function declarationsOf(name: string, files: SourceFile[]): { at: string; text: string }[] {
  const pattern = new RegExp(
    `(?:^|\\n)[ \\t]*(?:export\\s+)?(?:declare\\s+)?(?:interface|type)\\s+${name}\\b`,
    "g",
  );
  const found: { at: string; text: string }[] = [];
  for (const file of files) {
    const text = projectedText(file, "withStrings");
    for (const match of text.matchAll(pattern)) {
      const start = match.index + (match[0].startsWith("\n") ? 1 : 0);
      found.push({
        at: `${file.path}:${lineAt(text, start)}`,
        text: declarationText(text, start),
      });
    }
  }
  return found;
}

/* ------------------------------------------------------- C1: the join model */

/**
 * The join keys `data/index.json` carries, exactly as `shared/build_index.py` writes them.
 * The longest name leads each alternative, so `slice_to_epic_unresolved` is not read as
 * `slice_to_epic`.
 */
const JOIN_KEY_NAMES =
  "epic_status|epic_to_pull_request|slice_to_epic_unresolved|slice_to_epic|adr_to_pull_request|adr_to_context|adr_to_district|context_verifies_district|district_uncovered|feature_gates";

/**
 * An expression rooted at a joins object: the name `joins`, or a call to `joinsOf`, which
 * is the accessor `@/data/bundle` publishes. Everything C1 reports hangs off one of these.
 *
 * THE ROOT IS WHAT MAKES THE PATTERN ABOUT RESOLUTION. A join key is a resolution only
 * when something reads it off a joins object. `joins.slice_to_epic[slice.id]` resolves one.
 * A tooltip that reads `title="joins.slice_to_epic"`, and a glossary that explains the join
 * rules in prose, name the same key and resolve nothing. Anchoring the pattern at the root
 * separates the two, and the anchoring is what lets the pattern stop at the key's name
 * instead of guessing from the shape of the line around it.
 */
const JOINS_ROOT = String.raw`(?:\bjoins\b|\bjoinsOf\s*\([^()]*\))`;

/** One member access off that root: `epic_status`, or `["epic_status"]`. */
const ANY_MEMBER = String.raw`(?:\.\s*[A-Za-z_$][\w$]*|\[\s*["'\`][^"'\`]*["'\`]\s*\])`;

/** The member that IS the join key, in either spelling. */
const KEY_MEMBER = String.raw`(?:\.\s*(?:${JOIN_KEY_NAMES})\b|\[\s*["'\`](?:${JOIN_KEY_NAMES})["'\`]\s*\])`;

/**
 * One join resolved: a join key read off a joins object, however the call site spells it.
 *
 * `data.joins.slice_to_epic[slice.id]`, `index.joins.slice_to_epic_unresolved`, and
 * `joinsOf(load.index).slice_to_epic_unresolved` all fire, because the root is named in
 * each one and a member of the chain is the key. `Object.keys(joins.feature_gates)` fires
 * for the same reason: reading the key as a whole value is reading it.
 *
 * This pattern runs against the `codeOnly` projection, so a key that appears only inside a
 * string literal, an attribute value, a comment, or prose cannot reach it. See the
 * projection block above, and `isIndexKey` for the one literal the projection keeps.
 */
const JOIN_KEY_READ = new RegExp(`${JOINS_ROOT}(?:${ANY_MEMBER})*?${KEY_MEMBER}`);

/**
 * The other shape of a second derivation: resolving a joined fact from the entity's own
 * placeholder instead. `epic.state` is the unrefined state and `epic.pr` is the
 * unrefined pull request, so a fallback to either one is a second answer. Both the `??`
 * and the `||` form count, and both are read from the same field list.
 */
const ENTITY_PLACEHOLDER = String.raw`\b(epic|slice)\.(state|pr)\b`;
const PLACEHOLDER_FALLBACK = new RegExp(
  `\\?\\?[^;\\n]*${ENTITY_PLACEHOLDER}|\\|\\|[^;\\n]*${ENTITY_PLACEHOLDER}`,
);

/* -------------------------------------------------- C2: the drift guard */

/**
 * The field of `PullRequest` that `OpenPullRequest` does not carry.
 *
 * With the extension form, this is `never`. If the two types are declared apart and one
 * field is renamed on one side, the missing field's own name appears here, so the type
 * checker names it in its message. That is the whole guard.
 */
type FieldMissingFromOpen = Exclude<keyof PullRequest, keyof OpenPullRequest>;

/**
 * The type-level guards. Each call is a no-op at runtime, so `npm test` cannot see what
 * they assert. `npm run typecheck` is the runner that decides them.
 */
function typeGuards(): void {
  /* The extension: every field of PullRequest is on OpenPullRequest. A rename fires here. */
  expectTypeOf<FieldMissingFromOpen>().toBeNever();

  /* The extension direction, stated the other way. */
  expectTypeOf<OpenPullRequest>().toExtend<PullRequest>();

  /* The brand: OpenPullRequest is not simply PullRequest under another name. */
  expectTypeOf<OpenPullRequest>().not.toEqualTypeOf<PullRequest>();
}

/* -------------------------------------------------- C4: the six globals */

/**
 * The six script-tag globals the bundle defines, in the order the viewer loads them.
 *
 * `DIFFS_BY_PR` is the name `data/diffs-pr{N}.js` writes. The criterion spells it
 * `DIFFS`, and the two names are not the same one. See this file's header.
 */
const SHIPPED_GLOBALS = ["STORY", "ODYSSEY", "DIFFS_BY_PR", "ADRS", "DESIGNS", "DIAGRAMS"];

/** Every spelling a reader might write, so the old one fires too. */
const GLOBAL_SPELLINGS = [...SHIPPED_GLOBALS, "DIFFS"];

/**
 * One read of one global, in any of the three forms a reader writes it:
 * `window.STORY`, `window["STORY"]`, and the name as a string literal, which is how a
 * generic reader takes it: `loadGlobal(url, "ADRS", looksRight)`. A comment is blanked
 * before this runs, so prose that names a global is not a read of it.
 */
function readsGlobal(name: string): RegExp {
  return new RegExp(
    `window\\s*\\.\\s*${name}\\b|window\\s*\\[\\s*["'\`]${name}["'\`]\\s*\\]|globalThis\\s*\\.\\s*${name}\\b|["'\`]${name}["'\`]`,
  );
}

/* ---------------------------------------------------------- the cases */

describe("the typed data layer", () => {
  it("C1: resolves no join outside the data module", () => {
    /*
      The shell reads the joins the index carries. No component derives one of its own,
      so one fact keeps one source. The scan names both shapes of a second derivation:
      a line that resolves a join, and a line that falls back to an entity's own
      unrefined placeholder.

      IT NAMES RESOLUTION, NOT MENTION. A join key is reported when something reads it off
      a joins object. A tooltip that holds `joins.slice_to_epic` as its text, and a glossary
      whose content is the join rules written as prose, name the key and resolve nothing, so
      they are silent. The scan reads the `codeOnly` projection, which blanks every comment
      and every literal's text, and keeps an element-access key so that `joins["KEY"]` is
      still a read. See the projection block above.

      The scope is every file under `src/` outside `src/data/`, so `src/variations/` is
      scanned too. Every join resolves under `src/data/` today, in `works.ts` and `joins.ts`,
      so this list is empty over the whole of `src/`. See this file's header.
    */
    const found = [
      ...new Set([
        ...hitsByLine(JOIN_KEY_READ, OUTSIDE_SOURCES, "codeOnly"),
        ...hitsByLine(PLACEHOLDER_FALLBACK, OUTSIDE_SOURCES, "codeOnly"),
      ]),
    ];

    expect(
      found,
      "no file outside src/data/ may resolve a join or fall back to an entity's own placeholder",
    ).toEqual([]);
  });

  it("C2: declares PullRequest once and OpenPullRequest once, as its extension", () => {
    const pullRequests = declarationsOf("PullRequest", DATA_SOURCES);
    const openPullRequests = declarationsOf("OpenPullRequest", DATA_SOURCES);

    expect(
      pullRequests.map((one) => one.at),
      "src/data/ declares PullRequest in one place",
    ).toHaveLength(1);

    expect(
      openPullRequests.map((one) => one.at),
      "src/data/ declares OpenPullRequest in one place",
    ).toHaveLength(1);

    const declaration = openPullRequests[0]?.text ?? "";
    const extendsPullRequest =
      /extends\s+PullRequest\b/.test(declaration) || /=\s*PullRequest\s*&/.test(declaration);

    expect(
      extendsPullRequest,
      `OpenPullRequest extends PullRequest, so a rename on one side reaches the other. It reads: ${declaration}`,
    ).toBe(true);
  });

  it("C2: fails the type check when a field of PullRequest is missing from OpenPullRequest", () => {
    /*
      This case carries the type guard above. It runs for real under `npm run typecheck`,
      and it is a no-op here, because a type has no runtime value.
    */
    typeGuards();

    const missing = declarationsOf("OpenPullRequest", DATA_SOURCES);
    expect(
      missing.length,
      "the guard needs the two declarations before it can say anything (see npm run typecheck)",
    ).toBe(1);
  });

  it("C4: reads all six bundle globals inside the data module", () => {
    /*
      The six script-tag globals the bundle defines, by the names the bundle writes. One
      module reads them all, so a surface never asks which reader a bundle came from.

      The scope is every file under `src/` outside `src/data/`, so `src/variations/` is
      scanned too. Every prototype hands its global read to the data module, so the case
      passes over the whole of `src/` rather than over the shipped surface alone.
    */
    const unread = SHIPPED_GLOBALS.filter(
      (name) => hitsByLine(readsGlobal(name), DATA_SOURCES, "withStrings").length === 0,
    );

    expect(unread, "src/data/ reads every one of the six globals").toEqual([]);
  });

  it("C4: reads no bundle global outside the data module", () => {
    const found = GLOBAL_SPELLINGS.flatMap((name) =>
      hitsByLine(readsGlobal(name), OUTSIDE_SOURCES, "withStrings"),
    );

    expect(
      found,
      "a global the data module reads must be read nowhere else, so the reader is the one place a file's shape is known",
    ).toEqual([]);
  });
});

/* ------------------------------------------------- C3: a level renders */

/**
 * The bundle files the shell reads, taken from the committed corpus.
 *
 * The bundle is outside this package, at the repository root, and the dev server mounts
 * it at `/bundle/` for the same reader. A case that reads the corpus states what a reader
 * meets rather than what a fixture says.
 *
 * Two siblings assign a global rather than hold JSON. `designs.js` writes
 * `window.DESIGNS`, and `adrs.js` writes `window.ADRS`. Each one is run here, exactly as
 * the script tag the shell appends would run it. The third reader, the index, comes over
 * the stubbed fetch below.
 */
/** The part of the corpus this case reads. */
interface CorpusIndex {
  schema_version: string;
  entities: { design: { id: string; name: string; outcome: string; stage: string }[] };
}

function loadBundle(): { index: CorpusIndex; designs: DesignRecords } {
  const index = JSON.parse(readFileSync(join(BUNDLE_DATA, "index.json"), "utf8")) as CorpusIndex;
  for (const sibling of ["designs.js", "adrs.js"]) {
    const run = new Function(readFileSync(join(BUNDLE_DATA, sibling), "utf8"));
    run();
  }

  return {
    index,
    designs:
      (window as unknown as { DESIGNS?: DesignRecords }).DESIGNS ??
      ({} as DesignRecords),
  };
}

describe("a level renders from the bundle", () => {
  beforeAll(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    class StubResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    window.ResizeObserver = StubResizeObserver as unknown as typeof window.ResizeObserver;
    Element.prototype.scrollTo = () => undefined;
  });

  it("C3: shows the design's own records, with nothing reported missing", async () => {
    const { index, designs } = loadBundle();
    const id = index.entities.design.map((design) => design.id).sort()[0];
    const record = designs[id];

    expect(id, "the corpus carries at least one design").toBeTruthy();
    const outcome = (record?.goal?.outcome ?? "").replace(/\s+/g, " ").trim();
    expect(outcome.length, `designs.js carries ${id}'s goal outcome`).toBeGreaterThan(40);

    /*
      The index reaches the shell the way a dev server serves it: one fetch, and no
      `window.INDEX` anywhere. A published file inlines the global instead, and the shell
      reads either one.
    */
    delete (window as unknown as { INDEX?: unknown }).INDEX;
    const served = JSON.stringify(index);
    globalThis.fetch = (async () =>
      new Response(served, { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;

    const reported: string[] = [];
    const error = console.error;
    const warn = console.warn;
    console.error = (...args: unknown[]) => {
      reported.push(`error: ${args.map(String).join(" ")}`);
      error(...args);
    };
    console.warn = (...args: unknown[]) => {
      reported.push(`warn: ${args.map(String).join(" ")}`);
      warn(...args);
    };

    const Shell = (await import("@/shell/App")).default;
    window.location.hash = `#/${id}/intent`;
    render(<Shell />);

    try {
      await waitFor(() => {
        const text = (document.body.textContent ?? "").replace(/\s+/g, " ");
        expect(text, `${id}'s goal outcome reaches the Intent level`).toContain(
          outcome.slice(0, 60),
        );
      });

      const missing = reported.filter((one) => /undefined|not a function|is not defined|Cannot read/i.test(one));
      expect(missing, "no console message reports a missing global or an undefined field").toEqual([]);
    } finally {
      console.error = error;
      console.warn = warn;
      cleanup();
    }
  });
});
