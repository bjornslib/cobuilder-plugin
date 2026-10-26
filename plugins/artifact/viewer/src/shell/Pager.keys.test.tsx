import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { keyPressIsTaken } from "./Pager";
import { PAGED, open, press, setupPagerHooks } from "./testSupport/Pager/page";
import { hasStrip, onScreenIndex, pagerText } from "./testSupport/Pager/queries";

setupPagerHooks();

/*
  C4's first evidence, and it is read as a pair: the index moved AND the hash did not.
  Either half alone is vacuous — a key that did nothing would keep the address, and a
  key that wrote a route would move the reader without stepping the section.
*/
async function stepsRight(hash: string) {
  press("ArrowRight");
  await waitFor(() => expect(onScreenIndex()).toBe(1));
  expect(pagerText()).toBe("Section 2 of 4");
  expect(window.location.hash, "the step is view state and not a destination").toBe(hash);
}

async function stepsAndKeepsAddress() {
  const hash = PAGED[2].hash;
  await open(hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  expect(window.location.hash).toBe(hash);
  await stepsRight(hash);
  press("ArrowLeft");
  await waitFor(() => expect(onScreenIndex()).toBe(0));
  expect(pagerText()).toBe("Section 1 of 4");
  expect(window.location.hash).toBe(hash);
}

async function focusFilterField(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole("button", { name: "Change work item" }));
  const field = await waitFor(() => screen.getByLabelText("Filter the work item list"));
  field.focus();
  expect(document.activeElement, "the field holds focus, so the guard is the live path").toBe(
    field,
  );
  return field;
}

/*
  ONE PRESS, AND ONLY FORWARD. A forward press and a backward press would cancel, and the
  case would read the same whether the guard held or not — a staged run of this file
  proved exactly that, and this is the fix. A single ArrowRight steps forward if anything
  lets it through.
*/
async function fieldPressDoesNotStep(field: HTMLElement) {
  fireEvent.keyDown(field, { key: "ArrowRight" });
  await waitFor(() => expect(pagerText()).toBe("Section 1 of 4"));
  expect(onScreenIndex(), "a field owns its own caret keys").toBe(0);
}

/*
  C4's second evidence. The page carries one real text field: the work-item switcher's
  filter, inside its popover. The case opens that field, focuses it, presses the arrow
  key, and reads the section. It then presses the same key at the body, so a shell that
  had stopped stepping altogether would fail this case rather than pass it.
*/
async function ignoresTextFieldPress() {
  await open(PAGED[0].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));

  await fieldPressDoesNotStep(await focusFilterField());

  press("ArrowRight");
  await waitFor(() => expect(onScreenIndex(), "the key still steps outside the field").toBe(1));
}

const MODIFIED: Array<Record<string, boolean>> = [
  { altKey: true },
  { ctrlKey: true },
  { metaKey: true },
  { shiftKey: true },
];

/*
  C4's third evidence, held to the same pair as the field's. Each modifier is pressed on
  its own and forward only, so a guard that let a modified press through would walk the
  level four boxes along and fail here. A plain press then steps, so the case cannot pass
  by the keys being broken.
*/
async function ignoresModifiedPress() {
  await open(PAGED[0].hash);
  await waitFor(() => expect(hasStrip()).toBe(true));
  for (const init of MODIFIED) press("ArrowRight", init);
  await waitFor(() => expect(pagerText()).toBe("Section 1 of 4"));
  expect(onScreenIndex(), "a modified press names a command, not a section").toBe(0);

  press("ArrowRight");
  await waitFor(() => expect(onScreenIndex(), "a plain press still steps").toBe(1));
  expect(pagerText()).toBe("Section 2 of 4");
}

const guardPress = (key: string, target: EventTarget, init: KeyboardEventInit = {}) =>
  keyPressIsTaken({ key, target, ...init } as unknown as KeyboardEvent);

function expectFieldPressTaken(tag: string) {
  const field = document.createElement(tag);
  document.body.appendChild(field);
  expect(guardPress("ArrowRight", field), `a press inside a ${tag} is the field's`).toBe(true);
  field.remove();
}

/*
  The guard itself, called directly. It is one function shared by the pager's keys and
  the rail's traversal, and its rule is two lines: a field owns its caret keys, and a
  modifier names a command. Each branch is read in both directions, so a guard widened
  to swallow every key fails on the arrow keys below it.
*/
function takesFieldAndModifierPresses() {
  for (const tag of ["INPUT", "TEXTAREA", "SELECT"]) {
    expectFieldPressTaken(tag);
  }

  for (const init of MODIFIED) {
    expect(guardPress("ArrowLeft", document.body, init), "a modified press is a command").toBe(true);
  }

  expect(guardPress("ArrowRight", document.body), "a plain arrow press is the shell's").toBe(false);
  expect(guardPress("ArrowLeft", document.body), "both arrow keys belong to the shell").toBe(false);
}

describe("Slice 8 · the arrow keys are guarded, and they never write the route", () => {
  it("steps the index and leaves the address where it was", stepsAndKeepsAddress);
  it("leaves a press inside a text field alone, and still steps outside one", ignoresTextFieldPress);
  it("leaves a press with a modifier alone, and still steps without one", ignoresModifiedPress);
  it(
    "takes a press from a field or a modifier, and leaves the two arrow keys to the shell",
    takesFieldAndModifierPresses,
  );
});
