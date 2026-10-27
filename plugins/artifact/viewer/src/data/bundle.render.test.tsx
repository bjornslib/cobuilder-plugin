import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { installJsdomStubs } from "@/shell/testSupport/jsdom";

import type { DesignRecords } from "./bundle";
import { BUNDLE_DATA } from "./testSupport/bundle/sources";

interface CorpusIndex {
  schema_version: string;
  entities: { design: { id: string; name: string; outcome: string; stage: string }[] };
}

/**
 * The bundle sits outside this package, at the repository root. `designs.js` and `adrs.js`
 * assign `window.DESIGNS` and `window.ADRS` instead of holding JSON. Each runs here as the
 * shell's script tag would run it.
 */
function runSiblingScripts(): void {
  for (const sibling of ["designs.js", "adrs.js"]) {
    const run = new Function(readFileSync(join(BUNDLE_DATA, sibling), "utf8"));
    run();
  }
}

function loadBundle(): { index: CorpusIndex; designs: DesignRecords } {
  const index = JSON.parse(readFileSync(join(BUNDLE_DATA, "index.json"), "utf8")) as CorpusIndex;
  runSiblingScripts();
  const designs = (window as unknown as { DESIGNS?: DesignRecords }).DESIGNS;
  return { index, designs: designs ?? ({} as DesignRecords) };
}

/** The index arrives by one fetch, with no `window.INDEX`. A published file inlines the global instead. */
function serveIndexByFetch(index: CorpusIndex): void {
  delete (window as unknown as { INDEX?: unknown }).INDEX;
  const served = JSON.stringify(index);
  globalThis.fetch = (async () =>
    new Response(served, { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;
}

function teeConsole(level: "error" | "warn", reported: string[]): () => void {
  const original = console[level];
  console[level] = (...args: unknown[]) => {
    reported.push(`${level}: ${args.map(String).join(" ")}`);
    original(...args);
  };
  return () => {
    console[level] = original;
  };
}

function captureConsole() {
  const reported: string[] = [];
  const undo = [teeConsole("error", reported), teeConsole("warn", reported)];
  return { reported, restore: () => undo.forEach((one) => one()) };
}

async function expectOutcomeRendered(id: string, outcome: string, reported: string[]) {
  await waitFor(() => {
    const text = (document.body.textContent ?? "").replace(/\s+/g, " ");
    expect(text, `${id}'s goal outcome reaches the Intent level`).toContain(outcome.slice(0, 60));
  });
  const missing = reported.filter((one) => /undefined|not a function|is not defined|Cannot read/i.test(one));
  expect(missing, "no console message reports a missing global or an undefined field").toEqual([]);
}

async function renderObserved(id: string, outcome: string) {
  const { reported, restore } = captureConsole();
  const Shell = (await import("@/shell/App")).default;
  window.location.hash = `#/${id}/intent`;
  render(<Shell />);
  try {
    await expectOutcomeRendered(id, outcome, reported);
  } finally {
    restore();
    cleanup();
  }
}

async function showsDesignRecordsWithNothingMissing() {
  const { index, designs } = loadBundle();
  const id = index.entities.design.map((design) => design.id).sort()[0];
  const record = designs[id];
  expect(id, "the corpus carries at least one design").toBeTruthy();
  const outcome = (record?.goal?.outcome ?? "").replace(/\s+/g, " ").trim();
  expect(outcome.length, `designs.js carries ${id}'s goal outcome`).toBeGreaterThan(40);
  serveIndexByFetch(index);
  await renderObserved(id, outcome);
}

describe("a level renders from the bundle", () => {
  beforeAll(installJsdomStubs);
  it("C3: shows the design's own records, with nothing reported missing", showsDesignRecordsWithNothingMissing);
});
