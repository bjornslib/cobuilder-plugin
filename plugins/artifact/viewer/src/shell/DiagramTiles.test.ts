/*
  A source may open with a `%%` comment that names the drawing for a human. The word for
  the grammar sits on the line below, so the rule skips the comment. A tile that showed
  the comment would put a sentence where the shell promises one word, and that sentence
  would become the tile's accessible name.
*/

import { describe, expect, it } from "vitest";

import { labelFor, sizeFromViewBox } from "./DiagramTiles";

function readsWordUnderLeadingComment() {
  const source = "%% review-flight-deck level 1 — where each part runs\nC4Container\n";

  expect(labelFor(source)).toBe("Container");
}

function readsWordUnderCommentAndBlankRun() {
  const source = "%% the landscape\n\n%% drawn 2026-09-22\nclassDiagram\n  class A\n";

  expect(labelFor(source)).toBe("Classes");
}

function keepsWordWhenSourceOpensOnIt() {
  const source = "C4Container\n    title cobuilder-viewer\n";

  expect(labelFor(source)).toBe("Container");
}

function namesEachRecordedGrammar() {
  expect(labelFor("sequenceDiagram\n  A->>B: go\n")).toBe("Sequence");
  expect(labelFor("%% a comment\nsequenceDiagram\n  A->>B: go\n")).toBe("Sequence");
  expect(labelFor("%% a comment\nclassDiagram\n")).toBe("Classes");
}

function fallsBackToDiagram() {
  expect(labelFor("")).toBe("Diagram");
  expect(labelFor("\n   \n")).toBe("Diagram");
  expect(labelFor("%% only a comment\n%% and another\n")).toBe("Diagram");
}

describe("labelFor", () => {
  it("reads the grammar word under a leading comment line", readsWordUnderLeadingComment);
  it("reads the grammar word under a run of comment and blank lines", readsWordUnderCommentAndBlankRun);
  it("keeps the grammar word when the source opens on it", keepsWordWhenSourceOpensOnIt);
  it("names each grammar the bundle records", namesEachRecordedGrammar);
  it("returns the first line itself when the grammar is unknown", () => {
    expect(labelFor("flowchart TD\n  A --> B\n")).toBe("flowchart TD");
  });
  it("falls back to Diagram when no line carries a word", fallsBackToDiagram);
});

describe("labelFor: the named runtime slot", () => {
  it("names an authored SVG runtime architecture", () => {
    expect(labelFor('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">')).toBe(
      "Runtime architecture",
    );
  });
});

function sizesViewBoxOnlySvg() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1850 800"><g/></svg>';

  expect(sizeFromViewBox(svg)).toBe(
    '<svg width="1850" height="800" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1850 800"><g/></svg>',
  );
}

function readsExtentAfterOffsetOrigin() {
  expect(sizeFromViewBox('<svg viewBox="-50 -20 300.5 120"/>')).toContain('width="300.5" height="120"');
}

function leavesSizedSvgAlone() {
  const svg = '<svg width="640" viewBox="0 0 1850 800"/>';

  expect(sizeFromViewBox(svg)).toBe(svg);
}

function leavesViewBoxlessSvgAlone() {
  const svg = "<svg><g/></svg>";

  expect(sizeFromViewBox(svg)).toBe(svg);
}

describe("sizeFromViewBox", () => {
  it("gives a viewBox-only SVG the pixel size of its viewBox", sizesViewBoxOnlySvg);
  it("reads the extent after an offset origin", readsExtentAfterOffsetOrigin);
  it("leaves an SVG that already has a size as it is", leavesSizedSvgAlone);
  it("leaves an SVG with no viewBox as it is", leavesViewBoxlessSvgAlone);
});
