/**
 * A row's sections are what its section strip names, so the titles below are the strip's
 * own words. The rail already names the four rows, and a strip that repeated them told the
 * reader nothing.
 */

import { cleanup, screen } from "@testing-library/react";
import { isValidElement, type ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { CHANGE_KEYS, changeSections, type ChangeBodyProps, type ChangeKey } from "./sections";
import { LEVEL, props, text } from "./testSupport/sections";

afterEach(cleanup);

function titles(row: ChangeKey, over: Partial<ChangeBodyProps> = {}): string[] {
  return changeSections(props(over), row).map((section) => {
    expect(isValidElement(section)).toBe(true);
    return (section as ReactElement<{ title: string }>).props.title;
  });
}

function titlesProblemAndSolution() {
  expect(titles("problem-and-solution")).toEqual([
    "Problem and solution",
    "Assessment",
    "Findings and checks",
    "Regret risk and drift",
  ]);
}

function repeatsNoRowName() {
  const rowNames = ["Intent", "Problem & Solution", "Architecture", "File Diffs"];
  for (const row of CHANGE_KEYS) {
    for (const title of titles(row)) expect(rowNames).not.toContain(title);
  }
}

function statesNoMissingWav() {
  const said = text("intent");
  expect(said).not.toMatch(/holds no audio file/);
  expect(screen.queryByText(/voice script/i)).toBeNull();
  expect(document.querySelector("audio")).toBeNull();
}

function leavesAudioAndNarrationToStrip() {
  const said = text("intent");
  expect(document.querySelector("audio")).toBeNull();
  expect(said).not.toContain(LEVEL.narration);
}

function carriesNoPictureHeading() {
  const said = text("intent");
  expect(said).not.toMatch(/The picture/);
  const headings = screen.queryAllByRole("heading", { level: 3 });
  expect(headings.every((h) => !/\d$/.test(h.textContent ?? ""))).toBe(true);
}

describe("each row lays down its own sections", () => {
  it("Intent", () => {
    expect(titles("intent")).toEqual(["Why", "Approach", "Scope and risk", "Where it sits"]);
  });

  it("Problem & Solution", titlesProblemAndSolution);
});

describe("each row lays down its own sections", () => {
  it("Architecture", () => {
    expect(titles("architecture")).toEqual(["Mechanism", "Decisions landed"]);
  });

  it("File Diffs", () => {
    expect(titles("file-diffs")).toEqual(["Change groups", "The diff"]);
  });
});

describe("each row lays down its own sections", () => {
  it("no section repeats a row name, which the rail already names", repeatsNoRowName);

  it("an entry the bundle does not hold gives one stated section, named for the row", () => {
    expect(titles("architecture", { entry: null })).toEqual(["Architecture"]);
  });
});

describe("what a section does not say", () => {
  it("never states that the WAV file is missing", statesNoMissingWav);
  it("leaves the audio control and the narration to the In Short strip", leavesAudioAndNarrationToStrip);
  it("carries no picture heading and no count beside a heading", carriesNoPictureHeading);
});

describe("what a section does not say", () => {
  it("never states that a level has no voice script", () => {
    const said = text("intent", { levels: [{ ...LEVEL, voice: null, audio: null }] });
    expect(said).not.toMatch(/no voice script/);
  });

  it("states no missing-narration sentence", () => {
    const said = text("intent", { levels: [] });
    expect(said).not.toMatch(/narration record|no narration text/);
  });
});
