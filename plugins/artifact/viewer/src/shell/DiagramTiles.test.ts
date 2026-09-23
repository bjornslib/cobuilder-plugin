/**
 * The tile title rule, on its own.
 *
 * `labelFor` reads one Mermaid source and returns the one word the tile shows. It is
 * pure, so this file needs no DOM, no runtime, and no bundle: the import pulls in the
 * module for this function alone, and no test here calls `loadMermaid`.
 *
 * A source may open with a `%%` comment. That comment names the drawing for a human, and
 * it is not the grammar. The word for the grammar sits on the line below it, so the rule
 * skips the comment. A tile that showed the comment text would put a sentence where the
 * shell promises one word, and it would give the tile that sentence as its accessible
 * name.
 */

import { describe, expect, it } from "vitest";

import { labelFor } from "./DiagramTiles";

describe("labelFor", () => {
  it("reads the grammar word under a leading comment line", () => {
    const source = "%% review-flight-deck level 1 — where each part runs\nC4Container\n";

    expect(labelFor(source)).toBe("Container");
  });

  it("reads the grammar word under a run of comment and blank lines", () => {
    const source = "%% the landscape\n\n%% drawn 2026-09-22\nclassDiagram\n  class A\n";

    expect(labelFor(source)).toBe("Classes");
  });

  it("keeps the grammar word when the source opens on it", () => {
    const source = "C4Container\n    title cobuilder-viewer\n";

    expect(labelFor(source)).toBe("Container");
  });

  it("names each grammar the bundle records", () => {
    expect(labelFor("sequenceDiagram\n  A->>B: go\n")).toBe("Sequence");
    expect(labelFor("%% a comment\nsequenceDiagram\n  A->>B: go\n")).toBe("Sequence");
    expect(labelFor("%% a comment\nclassDiagram\n")).toBe("Classes");
  });

  it("returns the first line itself when the grammar is unknown", () => {
    expect(labelFor("flowchart TD\n  A --> B\n")).toBe("flowchart TD");
  });

  it("falls back to Diagram when no line carries a word", () => {
    expect(labelFor("")).toBe("Diagram");
    expect(labelFor("\n   \n")).toBe("Diagram");
    expect(labelFor("%% only a comment\n%% and another\n")).toBe("Diagram");
  });
});
