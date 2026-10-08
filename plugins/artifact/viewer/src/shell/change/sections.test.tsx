/**
 * The change's account: each row is a paged level, and each section is one panel.
 *
 * A row's sections are what its section strip names, so the titles below are the strip's
 * own words. The rail already names the four rows, and a strip that repeated them told
 * the reader nothing.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { isValidElement } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { StoryEntry } from "@/data/bundle";

import { CHANGE_KEYS, changeSections } from "./sections";
import type { ChangeBodyProps, ChangeKey } from "./sections";
import type { ChangeLevel } from "./levels";

afterEach(cleanup);

const LEVEL: ChangeLevel = {
  number: 1,
  key: "intent",
  title: "Intent",
  narration: "The draw gate remembers what it drew.",
  voice: "A voice script.",
  art: null,
  audio: "../data/audio/pr12_intent.wav",
  diagram: null,
};

const ENTRY: StoryEntry = { pr: 12, status: "merged", intent: { problem: "A problem." } };

function props(over: Partial<ChangeBodyProps> = {}): ChangeBodyProps {
  return {
    entry: ENTRY,
    levels: [LEVEL],
    diff: null,
    diffMessage: null,
    theme: "light",
    artMode: "image",
    onArtMode: () => {},
    failedArt: null,
    onArtFailed: () => {},
    diffFile: null,
    onDiffFile: () => {},
    joins: null,
    adrs: {},
    openSheet: () => {},
    ...over,
  };
}

function titles(row: ChangeKey, over: Partial<ChangeBodyProps> = {}): string[] {
  return changeSections(props(over), row).map((section) => {
    expect(isValidElement(section)).toBe(true);
    return (section as ReactElement<{ title: string }>).props.title;
  });
}

describe("each row lays down its own sections", () => {
  it("Intent", () => {
    expect(titles("intent")).toEqual(["Why", "Approach", "Scope and risk", "Where it sits"]);
  });

  it("Problem & Solution", () => {
    expect(titles("problem-and-solution")).toEqual([
      "Problem and solution",
      "Assessment",
      "Findings and checks",
      "Regret risk and drift",
    ]);
  });

  it("Architecture", () => {
    expect(titles("architecture")).toEqual(["Mechanism", "Decisions landed"]);
  });

  it("File Diffs", () => {
    expect(titles("file-diffs")).toEqual(["Change groups", "The diff"]);
  });

  it("no section repeats a row name, which the rail already names", () => {
    const rowNames = ["Intent", "Problem & Solution", "Architecture", "File Diffs"];
    for (const row of CHANGE_KEYS) {
      for (const title of titles(row)) expect(rowNames).not.toContain(title);
    }
  });

  it("an entry the bundle does not hold gives one stated section, named for the row", () => {
    expect(titles("architecture", { entry: null })).toEqual(["Architecture"]);
  });
});

describe("what a section does not say", () => {
  function text(row: ChangeKey, over: Partial<ChangeBodyProps> = {}): string {
    const { container } = render(<>{changeSections(props(over), row)}</>);
    return container.textContent ?? "";
  }

  it("never states that the WAV file is missing", () => {
    const said = text("intent");
    expect(said).not.toMatch(/holds no audio file/);
    expect(screen.queryByText(/voice script/i)).toBeNull();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("never states that a level has no voice script", () => {
    const said = text("intent", { levels: [{ ...LEVEL, voice: null, audio: null }] });
    expect(said).not.toMatch(/no voice script/);
  });

  it("leaves the audio control and the narration to the In Short strip", () => {
    const said = text("intent");
    expect(document.querySelector("audio")).toBeNull();
    expect(said).not.toContain(LEVEL.narration);
  });

  it("states no missing-narration sentence", () => {
    const said = text("intent", { levels: [] });
    expect(said).not.toMatch(/narration record|no narration text/);
  });

  it("carries no picture heading and no count beside a heading", () => {
    const said = text("intent");
    expect(said).not.toMatch(/The picture/);
    expect(screen.queryAllByRole("heading", { level: 3 }).every((h) => !/\d$/.test(h.textContent ?? ""))).toBe(true);
  });
});
