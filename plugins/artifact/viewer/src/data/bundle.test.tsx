/**
 * Slice 4's contract: one typed model reads the bundle.
 *
 * The rubric is `.cobuilder/rubrics/cobuilder-viewer/slice-4.md`, and this file states
 * its four criteria as cases. Two of them are type-level, so this file runs under two
 * runners: `npm test` runs the behaviour, and `npm run typecheck` runs the type guards.
 * A type guard is a no-op at runtime, so its state shows in the `tsc` output alone.
 *
 * WHY SOME CASES READ THE SOURCE. Three criteria are about an absence: no join derived
 * outside the data module (C1), no global read outside it (C4). A reader can only fail an
 * absence by looking at the tree, so those cases scan the source and name the structure
 * they inspect. A hit is reported as `path:line: text`, so a failure shows what it found.
 *
 * WHAT THE SCAN READS. Comments are blanked before the scan, and string literals are kept,
 * so a comment that names a global is not a reader of it, and `loadGlobal(url, "ADRS", f)`
 * is. One limit: a global read inside a `${}` of a template literal is not seen.
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
 * WHICH FILES THE SCAN COVERS. Every `.ts` and `.tsx` under `src/`, apart from three sets:
 * the test files, `src/data/` itself (that is the one module the criteria name), and
 * `src/variations/`. `src/Variations.tsx` calls the variations "scaffolding for a design
 * decision ... not part of the shipped viewer", and each prototype carries its own reader
 * on purpose. Everything else is covered, and that includes `src/shell/`,
 * `src/components/`, `src/lib/`, `src/hooks/`, and the two files the harness keeps at the
 * top of `src/`. A criterion that fails on a harness file is still a criterion that fails,
 * because the build carries every file the shell can reach.
 *
 * WHAT THAT EXCLUSION LEAVES OUT. A scope that widened to `src/variations/` would add 77
 * join-key lines and 16 global-read lines today, comments blanked, counted with the same
 * scan. Those prototypes are the arrangement each design decision argued against, and each
 * one reads the bundle its own way. No data-layer move in `src/shell/` would clear them,
 * so the widened scope would stay red until the harness goes.
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
 * Blank every comment and keep every string.
 *
 * Line numbers survive, because a comment is replaced by spaces and its newlines are
 * kept. A string survives, because a `//` inside one is not a comment.
 */
function blankComments(code: string): string {
  let out = "";
  let i = 0;
  let mode: "code" | "line" | "block" | "single" | "double" | "tick" = "code";

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];

    if (mode === "code") {
      if (ch === "/" && next === "/") {
        mode = "line";
        out += "  ";
        i += 2;
        continue;
      }
      if (ch === "/" && next === "*") {
        mode = "block";
        out += "  ";
        i += 2;
        continue;
      }
      if (ch === "'") mode = "single";
      else if (ch === '"') mode = "double";
      else if (ch === "`") mode = "tick";
      out += ch;
      i += 1;
      continue;
    }

    if (mode === "line") {
      if (ch === "\n") mode = "code";
      out += ch === "\n" ? "\n" : " ";
      i += 1;
      continue;
    }

    if (mode === "block") {
      if (ch === "*" && next === "/") {
        mode = "code";
        out += "  ";
        i += 2;
        continue;
      }
      out += ch === "\n" ? "\n" : " ";
      i += 1;
      continue;
    }

    /* Inside a string: an escape pair travels together, and the quote closes it. */
    if (ch === "\\") {
      out += ch + (next ?? "");
      i += 2;
      continue;
    }
    if (
      (mode === "single" && ch === "'") ||
      (mode === "double" && ch === '"') ||
      (mode === "tick" && ch === "`")
    ) {
      mode = "code";
    }
    out += ch;
    i += 1;
  }

  return out;
}

const ALL_SOURCES: SourceFile[] = walk(SRC_ROOT)
  .filter((file) => !/\.test\.tsx?$/.test(file))
  .map((file) => ({ path: relative(join(SRC_ROOT, ".."), file), text: readFileSync(file, "utf8") }));

/** The data module the criteria name: every source file under `src/data/`. */
const DATA_SOURCES = ALL_SOURCES.filter((file) => file.path.startsWith("src/data/"));

/** The shipped surface, with the prototype harness left out. See this file's header. */
const OUTSIDE_SOURCES = ALL_SOURCES.filter(
  (file) => !file.path.startsWith("src/data/") && !file.path.startsWith("src/variations/"),
);

function blanked(file: SourceFile): string {
  return blankComments(file.text);
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/** Every line of a file that matches, with its own number, so a failure shows what it found. */
function hitsByLine(pattern: RegExp, files: SourceFile[]): string[] {
  const found: string[] = [];
  for (const file of files) {
    blanked(file)
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
    const text = blanked(file);
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
const JOIN_KEY =
  /\b(epic_status|epic_to_pull_request|slice_to_epic_unresolved|slice_to_epic|adr_to_pull_request|adr_to_context|adr_to_district|context_verifies_district|district_uncovered|feature_gates)\b/;

/**
 * The other shape of a second derivation: resolving a joined fact from the entity's own
 * placeholder instead. `epic.state` is the unrefined state and `epic.pr` is the
 * unrefined pull request, so a fallback to either one is a second answer.
 */
const PLACEHOLDER_FALLBACK = /\?\?[^;\n]*\b(epic|slice)\.(state|pr)\b|\|\|[^;\n]*\b(epic|slice)\.(state|pr)\b/;

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
      a line that carries a join key, and a line that falls back to an entity's own
      unrefined placeholder.
    */
    const found = [
      ...new Set([
        ...hitsByLine(JOIN_KEY, OUTSIDE_SOURCES),
        ...hitsByLine(PLACEHOLDER_FALLBACK, OUTSIDE_SOURCES),
      ]),
    ];

    expect(
      found,
      "no file outside src/data/ may name a join key of the index or resolve a join from an entity's placeholder",
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
    */
    const unread = SHIPPED_GLOBALS.filter(
      (name) => hitsByLine(readsGlobal(name), DATA_SOURCES).length === 0,
    );

    expect(unread, "src/data/ reads every one of the six globals").toEqual([]);
  });

  it("C4: reads no bundle global outside the data module", () => {
    const found = GLOBAL_SPELLINGS.flatMap((name) =>
      hitsByLine(readsGlobal(name), OUTSIDE_SOURCES),
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
