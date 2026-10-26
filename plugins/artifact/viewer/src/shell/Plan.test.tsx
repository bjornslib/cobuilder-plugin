/**
 * review-link slice 2 — the plan page at `#/<work>/build/plan`.
 *
 * The page shows the three plan documents of one work, in gate order: product (Gate 1),
 * architecture (Gate 2), and program design (Gate 3). A present document shows its
 * source path and its own markdown body. An absent document shows an empty state.
 *
 * THE CONTRACT THESE CASES READ. The prose is not pinned. Each block carries
 * `data-plan-block="<product|architecture|program>"`. An absent document's block holds
 * one element with `data-testid="plan-empty"`. The page is reached through `Shell`, at a
 * real address, so a missing page fails on an assertion and not on an import.
 *
 * The fixture holds two works in one index, because the data module caches its answer
 * for the whole file. `alpha` has all three documents. `beta` has the architecture
 * document only.
 */

import { cleanup, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  ALPHA,
  ARCH_HEADING,
  BETA,
  BETA_ARCH_HEADING,
  PRODUCT_HEADING,
  PROGRAM_HEADING,
} from "./testSupport/Plan/fixtures";
import { blockKinds, blockOf, blocks, installBrowserStubs, installFixtures, openPlan } from "./testSupport/Plan/page";

beforeAll(installBrowserStubs);

beforeEach(installFixtures);

afterEach(cleanup);

const PRESENT_DOCUMENTS: [string, string, string][] = [
  ["product", PRODUCT_HEADING, "docs/plans/alpha/01-product.md"],
  ["architecture", ARCH_HEADING, "docs/plans/alpha/02-architecture.md"],
  ["program", PROGRAM_HEADING, "docs/plans/alpha/03-program-design.md"],
];

async function rendersThreeBlocks() {
  await openPlan(`#/${ALPHA}/build/plan`);
  expect(blocks()).toHaveLength(3);
  expect(blockKinds()).toEqual(["product", "architecture", "program"]);
}

async function namesEachGate() {
  await openPlan(`#/${ALPHA}/build/plan`);
  expect(blockOf("product").textContent).toMatch(/Gate 1/);
  expect(blockOf("architecture").textContent).toMatch(/Gate 2/);
  expect(blockOf("program").textContent).toMatch(/Gate 3/);
}

function expectPresent([kind, heading, path]: [string, string, string]) {
  const block = blockOf(kind);
  expect(within(block).queryAllByText(heading).length, `${kind} heading`).toBeGreaterThan(0);
  expect(block.textContent, `${kind} source path`).toContain(path);
  expect(within(block).queryByTestId("plan-empty"), `${kind} is present`).toBeNull();
}

async function rendersHeadingAndPath() {
  await openPlan(`#/${ALPHA}/build/plan`);
  PRESENT_DOCUMENTS.forEach(expectPresent);
}

async function rendersMarkdownBody() {
  await openPlan(`#/${ALPHA}/build/plan`);
  const block = blockOf("architecture");
  const h2 = Array.from(block.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) =>
    (h.textContent ?? "").trim(),
  );
  expect(h2).toContain("Body section 2");
}

async function showsEmptyStates() {
  await openPlan(`#/${BETA}/build/plan`);
  expect(within(blockOf("product")).queryByTestId("plan-empty")).not.toBeNull();
  expect(within(blockOf("program")).queryByTestId("plan-empty")).not.toBeNull();
  const arch = blockOf("architecture");
  expect(within(arch).queryByTestId("plan-empty")).toBeNull();
  expect(within(arch).queryAllByText(BETA_ARCH_HEADING).length).toBeGreaterThan(0);
}

async function hidesOtherWorks() {
  await openPlan(`#/${BETA}/build/plan`);
  expect(blocks()).toHaveLength(3);
  const text = blocks().map((b) => b.textContent ?? "").join("\n");
  expect(text).not.toContain(PRODUCT_HEADING);
  expect(text).not.toContain(ARCH_HEADING);
  expect(text).not.toContain(PROGRAM_HEADING);
}

describe("the plan page", () => {
  it("renders three blocks in gate order: product, architecture, program", rendersThreeBlocks);
  it("names the gate of each block", namesEachGate);
  it("renders each present document's own heading and source path", rendersHeadingAndPath);
  it("renders the markdown body through the markdown renderer", rendersMarkdownBody);
  it("shows an empty state for each absent document and the body of the present one", showsEmptyStates);
  it("does not show another work's documents", hidesOtherWorks);
});
