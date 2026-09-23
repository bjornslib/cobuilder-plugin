/**
 * The shell's own cases: the surfaces the boot picks.
 *
 * `src/main.tsx` mounts `src/shell/App.tsx`, so this file fixes what a reader meets at
 * each address, and it fixes it against the globals a published file inlines. Nothing
 * here reaches the network: `loadIndex`, `loadDesigns`, and `loadAdrs` all prefer the
 * global when one exists, so the three fixtures below are the whole bundle.
 *
 * The board is the subject of most of these cases, because it is the surface the shell
 * had to gain. `Board.test.tsx` fixes the row's own claims and takes its data as props.
 * This file fixes the route decisions around it: the bare route lands on the board, the
 * board draws no strip and no pager, an unknown id keeps its own error, the rail's `Work`
 * entry returns to the board, and the comparison harness keeps its own address.
 *
 * The last two cases are slice 7's, and they fix the address in motion: a press on a
 * row's link lands on that design's Work surface at the level the row named, and one
 * row's address opens the same surface on its own, with no board first.
 *
 * One group follows the board's cases. "The rail's arrow keys" fixes the traversal a
 * reader makes with the up and down arrows, over every entry the rail renders. Its design
 * therefore holds a record of every kind: the rail's groups appear only when the work
 * fills them, and the walk needs all nine entries.
 * `IntentDrawing.test.tsx` fixes which drawing level the Intent level draws.
 *
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and the shell asks both
 * questions on its first render: `useCollapsedRail` reads a media query and the diagram
 * tiles observe their box. The stubs answer the query false and observe nothing, which
 * is the desktop rail and a diagram tile whose box is never measured.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { RecordIndex } from "@/data/types";
import type { DesignRecord, DesignRecords } from "@/data/bundle";

import Shell from "./App";
import { buildWorkItems, gatesOf, levelsOf, railGroups } from "./model";

/* ------------------------------------------------------------------- jsdom */

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

  /* The pane resets its own scroll on a route change, and jsdom has no scroll. */
  Element.prototype.scrollTo = () => undefined;
});

/* ---------------------------------------------------------------- fixtures */

const INDEX: RecordIndex = {
  schema_version: "1.3",
  sources: { git_head: "0123456789abcdef", trees: {} },
  entities: {
    design: [
      {
        id: "cobuilder-viewer",
        name: "cobuilder-viewer",
        outcome: "The shell lands on a board of every design in the bundle.",
        stage: "approved",
      },
      {
        id: "inflight-record-store",
        name: "inflight-record-store",
        outcome: "An open pull request becomes an entity in the index.",
        stage: "superseded",
      },
    ],
    epic: [
      {
        id: "cobuilder-viewer/E19",
        design: "cobuilder-viewer",
        epic_id: "E19",
        branch: "design/cobuilder-viewer/work-prototype",
        pr: 11,
        state: "planned",
        note: null,
      },
      {
        id: "inflight-record-store/E1",
        design: "inflight-record-store",
        epic_id: "E1",
        branch: null,
        pr: null,
        state: "planned",
        note: null,
      },
    ],
    slice: [],
    adr: [],
    context: [],
    district: [],
    boundary_rule: [],
    pull_request: [
      {
        id: 11,
        title: "The board lands",
        state: "open",
        commit: "0123456789abcdef",
        date: "2026-09-23",
      },
    ],
    publication: [
      {
        id: "publish-11",
        pull_request: 11,
        artifact_url: "https://example.invalid/artifact/11",
        published_at: "2026-09-23",
      },
    ],
    program_design: [],
    epic_design: [],
    interaction_design: [],
  },
  joins: {
    adr_to_pull_request: {},
    epic_to_pull_request: { "cobuilder-viewer/E19": 11 },
    epic_status: {},
    slice_to_epic: {},
    slice_to_epic_unresolved: {},
    context_verifies_district: {},
    district_uncovered: [],
    adr_to_context: {},
    adr_to_district: {},
    feature_gates: {},
  },
};

/**
 * The one rich work item, `cobuilder-viewer` itself.
 *
 * It holds every record the bundle writes for a design, and its epic reaches one pull
 * request that one publication names. So all three levels of its Work surface fill, every
 * group of the rail appears, and the whole rail is nine entries from Work to Release
 * status. Its three diagram levels are the corpus's own, and the container drawing is
 * level 1.
 */
const VIEWER: DesignRecord = {
  goal: {
    name: "cobuilder-viewer",
    title: "The Work board",
    created: "2026-09-22",
    outcome: "A reader arrives on the board and surveys every design.",
    done_when: ["Every design reads as a row."],
    min_work: { challenge_stage_run: true },
    stage: "approved",
    supersedes: null,
    adr: null,
    adrs: [],
  },
  intent: {
    problem: "The shell had no landing surface.",
    approach: "One flat row per design.",
    risks: ["Two boards disagree about one bundle."],
    unknowns: ["What sixty designs read like."],
    out_of_scope: ["The comparison harness."],
  },
  narrative: {
    landscape: { narration: "The shell lands nowhere." },
    problem_solution: { narration: "The board is the landing surface." },
    architecture: { narration: "One derivation, one row each." },
  },
  assessment: {
    verdict: "proceed",
    summary: "The surface is small and legible.",
    findings: [{ kind: "drift", title: "The lane board stays.", detail: "Confirm it." }],
  },
  pr_draft: "# The board\n\n## What changes\n\nOne row each.\n",
  diagrams: {
    "1": "%% the container drawing\nC4Container\n    title cobuilder-viewer\n",
    "2": "sequenceDiagram\n  A->>B: go\n",
    "3": "classDiagram\n  class A\n",
  },
};

const DESIGNS: DesignRecords = {
  "cobuilder-viewer": VIEWER,
  "inflight-record-store": {
    goal: {
      name: "inflight-record-store",
      title: "The open set as an entity",
      created: "2026-09-18",
      outcome: "An open pull request becomes an entity in the index.",
      done_when: ["The join resolves an open pull request."],
      min_work: { challenge_stage_run: false },
      stage: "backlog",
      supersedes: null,
      adr: null,
      adrs: [],
    },
  },
};

const ADRS = {
  "ADR-0028": {
    id: "ADR-0028",
    title: "One section on screen",
    state: "accepted",
  },
};

beforeEach(() => {
  window.INDEX = INDEX;
  window.DESIGNS = DESIGNS;
  /*
   * The decision global is declared by no module, because `src/data/bundle.ts` leaves it
   * to whoever reads the file. The shell's `./records` reads it through a cast and so does
   * this line.
   *
   * It needs one entry. Its guard reads the first value's `title`, so an empty map reads
   * as a file that assigned nothing, and the loader then asks the dev server for one. One
   * entry keeps the whole bundle in memory, where a published file keeps it too.
   */
  (window as unknown as Record<string, unknown>).ADRS = ADRS;
});

afterEach(cleanup);

/** The bare route is the board, and every other case names it for itself. */
function at(hash: string): void {
  window.location.hash = hash;
}

/**
 * The one link one board row carries, found the way `Board.test.tsx` finds the row: by
 * its level-2 heading. Slice 7 gives the row that link, so the board route has to settle
 * before this reads one.
 */
async function boardRowLink(name: string): Promise<HTMLElement> {
  const heading = await waitFor(() => {
    const found = screen
      .getAllByRole("heading", { level: 2 })
      .find((one) => (one.textContent ?? "").trim() === name);
    expect(found, `a board row names ${name}`).toBeTruthy();
    return found as HTMLElement;
  });
  const row = heading.closest("li");
  expect(row, `the row for ${name} is a list item`).toBeTruthy();
  const links = within(row as HTMLElement).queryAllByRole("link");
  expect(links.length, `the row for ${name} carries one link`).toBe(1);
  return links[0];
}

/** The top line of a Work surface names the work item the route carried. */
function workItemName(): string {
  return (document.getElementById("work-item-name")?.textContent ?? "").trim();
}

/** The level heading of a Work surface. The board carries "Work" in the same element. */
function levelHeading(): string {
  return (document.getElementById("work-section-heading")?.textContent ?? "").trim();
}

/** The rail, which holds the board entry and every group the work fills. */
function rail(): HTMLElement {
  return screen.getByRole("navigation", { name: "Work sections" });
}

/** Every rail row, in the order the rail renders it. A disabled row is a row too. */
function railRows(): HTMLElement[] {
  return within(rail()).getAllByRole("link");
}

/** One rail row's own label. A disabled row writes the label inside a longer sentence. */
function labelOf(row: HTMLElement): string {
  return (row.getAttribute("aria-label") ?? "").replace(/ is disabled.*$/, "").trim();
}

/** One rail row's address. A disabled row carries `#` and no route. */
function hrefOf(row: HTMLElement): string {
  return row.getAttribute("href") ?? "";
}

/**
 * True when a row reads disabled.
 *
 * A level is disabled rather than gated, so an entry whose record is absent stays in the
 * rail. Its row carries `#`, and a press on it does nothing, so it is never a step.
 */
function disabledOf(row: HTMLElement): boolean {
  return row.getAttribute("aria-disabled") === "true";
}

/** One rail row, by the label it carries. */
function rowNamed(label: string): HTMLElement {
  const row = railRows().find((candidate) => labelOf(candidate) === label);
  expect(row, `a rail row names ${label}`).toBeTruthy();
  return row as HTMLElement;
}

/**
 * The rail's own input, built the way `App.tsx` builds it: the work item, its gates, and
 * its level states, each derived by `./model` from this file's own fixtures. The entry
 * list below is only as good as that input, so it is the same input the shell uses.
 */
function railSource(workId: string, board = false) {
  const works = buildWorkItems(INDEX, DESIGNS);
  const work = board ? null : (works.get(workId) ?? null);
  return {
    work,
    gates: work === null ? null : gatesOf(work),
    levels: work === null ? null : levelsOf(work),
    board,
    workCount: works.size,
  };
}

/**
 * The least one rail entry must carry: the word a reader reads, the address a press
 * opens, and whether a press can reach it at all.
 */
interface RailStep {
  label: string;
  href: string;
  available: boolean;
}

/** One arrow press, at the reader's own focus: the body of the document. */
function press(key: string, init: Record<string, boolean> = {}): void {
  fireEvent.keyDown(document.body, { key, ...init });
}

/* -------------------------------------------------------------------- tests */

describe("Shell", () => {
  it("lands on the board when the route names no work item", async () => {
    at("#/");
    render(<Shell />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Work" })).toBeTruthy();
    });

    const rows = screen
      .getAllByRole("heading", { level: 2 })
      .filter((heading) => heading.closest("li") !== null);
    expect(rows.map((heading) => (heading.textContent ?? "").trim()).sort()).toEqual([
      "cobuilder-viewer",
      "inflight-record-store",
    ]);
  });

  it("draws no strip, no pager, and no progress strip on the board", async () => {
    at("#/");
    render(<Shell />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Work" })).toBeTruthy();
    });

    expect(screen.queryByRole("navigation", { name: "Sections of this level" })).toBeNull();
    expect(screen.queryByText(/Section \d+ of \d+/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Previous" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("keeps the error a route that names an id the bundle lacks", async () => {
    at("#/no-such-design/intent");
    render(<Shell />);

    await waitFor(() => {
      expect(
        screen.getByText("The route names an id the bundle lacks"),
      ).toBeTruthy();
    });

    expect(screen.getAllByText(/no-such-design/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Work" })).toBeNull();
  });

  it("returns to the board from the rail's top entry", async () => {
    at("#/cobuilder-viewer/intent");
    render(<Shell />);

    const work = await waitFor(() => screen.getByRole("link", { name: "Work" }));

    expect(work.getAttribute("href")).toBe("#/");
  });

  it("hands its own addresses to the comparison harness", async () => {
    at("#/variations");
    render(<Shell />);

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: "Variation" })).toBeTruthy();
    });

    expect(screen.queryByRole("heading", { name: "Work" })).toBeNull();
  });

  it("opens the pressed row's Work surface, on the level the row names", async () => {
    at("#/");
    render(<Shell />);

    const link = await boardRowLink("inflight-record-store");
    fireEvent.click(link);

    /*
      The heading the shell moves focus to states the level the row's section named. It
      renders once the index resolved, so waiting on it waits on the whole surface. While
      the board still stands, that element reads "Work" and this never resolves.
    */
    await waitFor(() => {
      expect(levelHeading()).toBe("Intent");
    });

    expect(workItemName()).toBe("inflight-record-store");
    /* The surface renders that design's own goal, and not another design's. */
    expect(screen.getByText("The join resolves an open pull request.")).toBeTruthy();

    const rows = screen
      .queryAllByRole("heading", { level: 2 })
      .filter((heading) => heading.closest("li") !== null);
    expect(rows, "the board is gone once the surface replaces it").toEqual([]);
  });

  it("opens a row's address with no board first", async () => {
    at("#/");
    render(<Shell />);

    const href = (await boardRowLink("inflight-record-store")).getAttribute("href") ?? "";
    expect(href.startsWith("#/"), "the row carries a route").toBe(true);

    /* A fresh page load of that address, the way a new tab would open it. */
    cleanup();
    at(href);
    render(<Shell />);

    await waitFor(() => {
      expect(levelHeading()).toBe("Intent");
    });

    expect(workItemName()).toBe("inflight-record-store");
    expect(screen.getByText("The join resolves an open pull request.")).toBeTruthy();
    expect(screen.queryByText("The route names an id the bundle lacks")).toBeNull();
  });
});

/*
 * The rail's entries, walked with the up and down arrows.
 *
 * EVERY ENTRY IS A STEP. The first cut of this traversal moved between the three level
 * entries alone, and the engineer found the hole: a reader could not reach Epics from
 * Architecture. So the traversal covers every entry the rail renders, in render order:
 * the board's Work entry, then The work, Build, Pull requests, and Shipped, each entry in
 * the order its group lists it.
 *
 * ONE LIST SERVES BOTH. The rail renders the entries `railGroups` returns and the
 * traversal steps the same list, so the two cannot drift. The first case compares them.
 *
 * A DISABLED ENTRY IS NOT A STEP. A level is disabled rather than gated, so an entry
 * whose record is absent stays in the rail with `href="#"`. A step onto it would open the
 * board, so the traversal steps the entries that carry a real address.
 *
 * THE GUARD IS THE PAGER'S OWN. A field owns its caret keys and a modifier names a
 * command, so both kinds of press are left to the pager's key handler and to nothing
 * else. The pager's own two keys keep working beside these two.
 */
describe("The rail's arrow keys", () => {
  it("renders the nine entries in the rail's own order", async () => {
    at("#/cobuilder-viewer/intent");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Intent"));

    /* The order the browser reading found, and the address each entry opens. */
    expect(railRows().map(labelOf)).toEqual([
      "Work",
      "Intent",
      "Problem & Solution",
      "Architecture",
      "Epics",
      "Rubrics",
      "This work's pull requests",
      "FlightDeck",
      "Release status",
    ]);
    expect(railRows().map(hrefOf)).toEqual([
      "#/",
      "#/cobuilder-viewer/intent",
      "#/cobuilder-viewer/problem-and-solution",
      "#/cobuilder-viewer/architecture",
      "#/cobuilder-viewer/build/epics",
      "#/cobuilder-viewer/build/rubrics",
      "#/cobuilder-viewer/pull-requests",
      "#/cobuilder-viewer/pull-requests/flightdeck",
      "#/cobuilder-viewer/shipped",
    ]);
  });

  it("holds one entry list, and the rail renders it whole", async () => {
    at("#/cobuilder-viewer/intent");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Intent"));

    /*
      `railGroups` is the one list. Its entries carry these three facts at least, and the
      rail and the traversal both read them here.
    */
    const entries: RailStep[] = railGroups(railSource("cobuilder-viewer")).flatMap(
      (group: { entries: RailStep[] }) => group.entries,
    );

    /*
      The rail renders the entries this one function returns, in this one order. A second
      copy of the order is what lost every entry below Architecture.
    */
    expect(entries.map((entry) => entry.label)).toEqual(railRows().map(labelOf));
    expect(entries.map((entry) => entry.href)).toEqual(railRows().map(hrefOf));
    expect(entries.map((entry) => entry.available)).toEqual(
      railRows().map((row) => !disabledOf(row)),
    );
  });

  it("moves down every rail entry in render order", async () => {
    at("#/cobuilder-viewer/intent");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Intent"));

    /*
      Intent is the second entry, so this walks from the third to the last. The engineer's
      own case sits in here: from Architecture, the next press reaches Epics.
    */
    for (const row of railRows().slice(2)) {
      press("ArrowDown");
      await waitFor(() => expect(window.location.hash).toBe(hrefOf(row)));
    }
  });

  it("moves up every rail entry in render order", async () => {
    at("#/cobuilder-viewer/shipped");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Shipped"));

    const rows = railRows();
    /* The last entry is Release status, so this walks back to the board entry. */
    for (const row of rows.slice(0, rows.length - 1).reverse()) {
      press("ArrowUp");
      await waitFor(() => expect(window.location.hash).toBe(hrefOf(row)));
    }
  });

  it("reaches the board from the first level on ArrowUp", async () => {
    at("#/cobuilder-viewer/intent");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Intent"));

    /* Work is a rail entry, so the first level steps up into the board. */
    press("ArrowUp");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Work" })).toBeTruthy();
    });
    expect(window.location.hash).toBe("#/");
  });

  it("stays at the first entry, which is the board", async () => {
    at("#/");
    render(<Shell />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Work" })).toBeTruthy();
    });

    /*
      The board drops every group, so its rail holds the Work entry alone and that entry
      is the board itself. An arrow press there can only name the entry it is already on.
    */
    expect(railRows().map(labelOf)).toEqual(["Work"]);

    press("ArrowUp");
    press("ArrowDown");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Work" })).toBeTruthy();
    });
    expect(window.location.hash).toBe("#/");
  });

  it("stays at the last entry, which is Release status", async () => {
    at("#/cobuilder-viewer/shipped");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Shipped"));

    press("ArrowDown");
    press("ArrowDown");

    await waitFor(() => expect(levelHeading()).toBe("Shipped"));
    expect(window.location.hash).toBe("#/cobuilder-viewer/shipped");
  });

  it("steps down from Rubrics to the entry below it, because two entries share one section", async () => {
    at("#/cobuilder-viewer/build/rubrics");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Build"));

    /*
      Epics and Rubrics both name the Build section, so the reader's own entry is the row
      they arrived on and not the section they share. A match on the section alone would
      find Epics below Rubrics, and the press would step onto the row the reader is
      already on.
    */
    press("ArrowDown");
    await waitFor(() => {
      expect(window.location.hash).toBe(hrefOf(rowNamed("This work's pull requests")));
    });
  });

  it("steps up from Rubrics to Epics, because two entries share one section", async () => {
    at("#/cobuilder-viewer/build/rubrics");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Build"));

    /* The same shared section, in the other direction. The row above Rubrics is Epics. */
    press("ArrowUp");
    await waitFor(() => {
      expect(window.location.hash).toBe(hrefOf(rowNamed("Epics")));
    });
  });

  it("skips a disabled entry, because its row carries no address", async () => {
    at("#/inflight-record-store/intent");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Intent"));

    /* This design holds `goal.json` alone, so two level rows read disabled. */
    const disabled = railRows().filter(disabledOf);
    expect(disabled.map(labelOf)).toEqual(["Problem & Solution", "Architecture"]);
    expect(disabled.map(hrefOf)).toEqual(["#", "#"]);

    /*
      The next entry a press can reach is Epics, two rows below. Architecture is not a
      step: its row carries `#`, and a step onto it would open the board.
    */
    press("ArrowDown");
    await waitFor(() => expect(window.location.hash).toBe(hrefOf(rowNamed("Epics"))));

    press("ArrowUp");
    await waitFor(() => {
      expect(window.location.hash).toBe(hrefOf(rowNamed("Intent")));
    });
  });

  it("leaves a press inside a field alone", async () => {
    at("#/cobuilder-viewer/intent");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Intent"));

    /* A field owns its own caret keys, so a press inside one is the field's. */
    for (const tag of ["input", "textarea", "select"]) {
      const field = document.createElement(tag);
      document.body.appendChild(field);
      fireEvent.keyDown(field, { key: "ArrowDown" });
      fireEvent.keyDown(field, { key: "ArrowUp" });
      field.remove();
    }

    await waitFor(() => expect(levelHeading()).toBe("Intent"));
    expect(window.location.hash).toBe("#/cobuilder-viewer/intent");
  });

  it("leaves a press with a modifier alone", async () => {
    at("#/cobuilder-viewer/intent");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Intent"));

    /* A modified press names a command, which is the pager's guard and now this one's. */
    const modified: Array<Record<string, boolean>> = [
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
    ];
    for (const init of modified) press("ArrowDown", init);

    await waitFor(() => expect(levelHeading()).toBe("Intent"));
    expect(window.location.hash).toBe("#/cobuilder-viewer/intent");
  });

  it("steps the pager on ArrowLeft and ArrowRight, and never moves the rail", async () => {
    at("#/cobuilder-viewer/architecture");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Architecture"));

    const at2 = "#/cobuilder-viewer/architecture";

    press("ArrowRight");
    await waitFor(() => expect(screen.getByText(/Section 2 of \d+/)).toBeTruthy());
    expect(window.location.hash, "ArrowRight steps the pager and no more").toBe(at2);

    press("ArrowLeft");
    await waitFor(() => expect(screen.getByText(/Section 1 of \d+/)).toBeTruthy());
    expect(window.location.hash, "ArrowLeft steps the pager and no more").toBe(at2);
  });

  it("still steps the pager after a rail move", async () => {
    at("#/cobuilder-viewer/intent");
    render(<Shell />);
    await waitFor(() => expect(levelHeading()).toBe("Intent"));

    press("ArrowDown");
    await waitFor(() => expect(levelHeading()).toBe("Problem and solution"));

    /* The two key sets share the window, and neither one takes the other's keys. */
    press("ArrowRight");
    await waitFor(() => expect(screen.getByText(/Section 2 of \d+/)).toBeTruthy());
  });
});
