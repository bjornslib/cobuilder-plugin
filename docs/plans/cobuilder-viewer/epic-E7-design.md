# Epic Technical Solution Design: E7 — FlightDeck, one pull request

Feature: cobuilder-viewer
Epic ID: cobuilder-viewer/E7

## Scope and Intent

E7 gives one work item its change's account. The work item and the pull request its own
epics carry are two accounts of one surface. E5 renders the program's account, and this
epic adds the change's. The rail carries both, grouped under Build and Review, and a
reader crosses between them on a section of the same name. ADR-0029 decided the shape,
and the 2026-09-25 amendment to that record governs wherever this document and the
record disagree.

**Parity covers six things, and the epic keeps them.** Four narration levels, diagrams,
scene art, narration audio, the diff, and the intent and assessment sheet. The change's
account renders them in four rows of its own: Intent, Problem & Solution, Architecture,
and File Diffs. Three of those four names also stand in the Build group. That repetition
is what makes the same-section jump possible.

**The change's account renders through the shipped section model.** ADR-0028 fixed that
shape: one box on screen, the strip, and no page scroll. The change's four rows render
through the same `Pager` machinery the program's rows use. One model therefore serves
both accounts, and the two cannot disagree about how a row reads.

**The joins rail is gone, and its content has homes.** It listed the decisions, the
design, and the epics that reach one pull request. The decisions a change landed read in
its own Architecture row. The epics that carry the change read in the Build group's Epics
row, which names each epic's slices, and in its Rubrics row. One rule holds for the
account: it reads the index's joins, and it derives none of them.

**The rename of `landscape` to `intent` travels with this work.** ADR-0029 keeps the
rename with the parity work. A rename that landed first would rewrite the same level
list twice. The rename is a real rename and not a display label, and the audio filename
follows the key. This epic moves the files and re-records nothing.

**The boundary.** E7 builds the change's account of one work item, and the rail that
reads both accounts. The open set, the merge-order simulator, the ledger's three state
subtypes, the path runner, and every publishing path defer with E11 to E18. There is no
mode switch, and no second surface. The change's account renders inside the shipped
shell, at an address of its own.

## Files Touched

- `plugins/artifact/viewer/src/shell/change/sections.tsx` — new. The change's four rows,
  one element per panel, read from the row the address names.
- `plugins/artifact/viewer/src/shell/change/levels.ts` — new. The four narration levels,
  the scene art, the audio, the drawings, and the diff files, each derived once.
- `plugins/artifact/viewer/src/shell/change/Frame.tsx` — new. The level's picture, its
  drawing, and the art-or-diagram toggle.
- `plugins/artifact/viewer/src/shell/change/Diff.tsx` — new. The diff view, ported as it
  stands. `intent.json` puts the diff's own rendering out of scope, so the port changes
  no part of how a diff reads.
- `plugins/artifact/viewer/src/shell/change/Sheets.tsx` — new. The change's intent body
  and its assessment body.
- `plugins/artifact/viewer/src/shell/AccountMark.tsx` — new. The mark, a word and a glyph
  with no fill, and the jump to the other account's same-named section.
- `plugins/artifact/viewer/src/shell/model.ts` — modified. The rail's rows become the two
  groups, and the change's address and its named-section segment join the route.
- `plugins/artifact/viewer/src/shell/Rail.tsx` — modified. It renders the two groups, and
  its fold and its arrow walk obey one convention.
- `plugins/artifact/viewer/src/shell/App.tsx` — modified. The pane renders the change's
  rows, and the account rule stands above the section.
- `plugins/artifact/viewer/src/shell/readiness.ts` — modified. The narration level's key
  and its label read `intent`.
- `plugins/artifact/viewer/src/data/bundle.ts` — modified. `DesignNarrative` takes the
  key `intent` in place of `landscape`, and the `StoryEntry` comment names the new key.
- `shared/verify_bundle.py`, `shared/migrate_bundle.py`,
  `plugins/pr/scripts/generate_prompts.py`,
  `plugins/pr/skills/odyssey/references/story-mode.md` — modified. Each holds its own copy
  of the level key list, so each takes `intent`.
- `<bundle-dir>/data/story.json`, `data/story.js`, `data/audio/` — modified. The level key
  is part of the audio filename, so the audio of every bundle moves to its new name. The
  bytes stay as they are, and nobody records a paid file again.
- `plugins/artifact/viewer/src/shell/change/Change.test.tsx` — new. The change's four rows
  and the six parts of parity, as component cases.
- `plugins/artifact/viewer/src/shell/Rail.test.tsx` — new. The grouped rail, its
  addresses, its fold, and its walk, as component cases.

## Types & Signatures

```ts
/** The change's four rows. Three of the four names also stand in the Build group. */
export type ChangeKey = "intent" | "problem-and-solution" | "architecture" | "file-diffs";

/** The bundle's own narration level key behind each of the change's four rows. */
export const CHANGE_LEVEL_KEY: Record<ChangeKey, LevelKey> = {
  intent: "intent",
  "problem-and-solution": "problem_solution",
  architecture: "architecture",
  "file-diffs": "file_changes",
};

/** The rail's two groups, and the account each one reads. */
export type GroupKey = "build" | "review";
export type AccountId = "program" | "change";

export interface RailRow {
  key: string;
  label: string;
  /** The address a press opens. One row, one address, and no row invents one. */
  href: string;
  account: AccountId;
  /** The section name this row shares with the other account, or null. */
  shared: SharedKey | null;
  count: string;
}

export interface RailGroup {
  key: GroupKey;
  label: string;
  account: AccountId;
  rows: RailRow[];
}

export function railGroups(source: RailSource): RailGroup[];
export function rowsOf(groups: RailGroup[]): RailRow[];

/** One narration level of one change, as the bundle holds it. */
export interface ChangeLevel {
  number: 1 | 2 | 3 | 4;
  key: LevelKey;
  title: string;
  narration: string;
  /** Scene art, when the bundle holds it. The fourth level has no drawing. */
  art: string | null;
  audio: string | null;
  diagram: string | null;
}

export function changeLevelsOf(
  entry: StoryEntry,
  story: Story,
  manifest: Manifest,
  diagrams: Record<string, string>,
): ChangeLevel[];

/** The change's four rows, one element per panel, in the order the row pages them. */
export function changeSections(props: ChangeBodyProps): ReactNode[];

/* AccountMark.tsx — the mark, a word and a glyph, and the jump. */
export const ACCOUNT_MARK: Record<AccountId, { word: string }>;
export const ACCOUNT_GLYPH: Record<AccountId, LucideIcon>;

export function AccountRule(props: {
  account: AccountId;
  /** Whose record this is, in the account's own words. */
  whose: string;
  section: string;
  jump: JumpTargetLink | null;
  onGo(href: string): void;
}): JSX.Element;

/* model.ts — one builder per account, so no row derives an address by hand. */
export function changeHref(workId: string, pr: number, section: ChangeKey): string;
export function programHref(workId: string, section: ProgramKey): string;
```

**The change's address is the shell's own, with one appended segment.**
`#/<work>/pull-requests/<pr>` opens the change's Intent row. One further segment selects a
named row, so `.../problem-and-solution`, `.../architecture`, and `.../file-diffs` each
open their own. The segment rides the shell's existing `subId` field, so no second parser
exists and no second address scheme either.

**The mark is a word and a glyph, and it carries no fill.** `Program` stands by a person,
and `Change` stands by a pull request. ADR-0029 fixes those two parts, and it removed a
third part, which was a background fill.

**The asset paths are relative, and they stay relative.** The rows request
`../assets/pr-{N}/level-{L}.png` and `../data/audio/pr{N}_{level_key}.wav`. They read
exactly as the shipped viewer reads them, so one bundle serves both readers.

## Slice Decomposition

Per `docs/plans/cobuilder-viewer/04-slices.md`, in build order.

- **Slice 15 — The change's account renders.** Depends on: slices 8 and 9, the section
  model, and slice 14, the approved prototype. Slice 4's typed model reads the bundle, so
  it comes first too. Its end is a reader of a work item reading the change's four rows.
  Each row renders that pull request's own records.
- **Slice 16 — The rail reads two accounts, each at its own address.** Depends on slice 15
  and on slice 7's route. The Review group's rows open the sections slice 15 renders. Its
  end is the grouped rail, the change's address with its named-section segment, the
  current row, and the fold and walk convention.
- **Slice 17 — The account mark, and the jump across.** Depends on slices 15 and 16. A
  mark stands on a section, and a jump needs two addresses. Its end is every section of
  both accounts carrying its account's mark. One press then moves a reader from one
  account's section to the same-named section of the other.

Slice 17 is not slice 16's edge cases. Three states: a section both accounts carry, a
section only one account carries, and a reader who arrives on a deep link.

## Test Plan

**The change's account is component work, and its cases live in the viewer suite.**
`npm test` in `plugins/artifact/viewer/` runs them through vitest. The repository's own
suite, `uv run --with pytest pytest tests/ -v`, holds the packaging invariants, and it
reads no page.

- `src/shell/change/Change.test.tsx` — slice 15. The four rows render one panel per
  section. Every value traces to the bundle. A row whose record is absent states the
  absence in place. Every asset the bundle holds resolves. The level key reads `intent` in
  every reader of it.
- `src/shell/Rail.test.tsx` — slices 16 and 17. The rail renders Build's five rows and
  Review's four. Every row carries its own address, and exactly one row reads current. The
  arrow walk reaches every row of both groups. A folded group that holds the current row
  refuses to close, and its control states that reason. A shared section carries the jump,
  and a section only one account carries states that fact in place.

**The page-level claims need a served bundle, and no runner here holds one.** A pane whose
scroll height equals its client height needs a browser. So do one box inside the pane's
rect, the strip's labels against the boxes, the mark's background, and the jump's
landing. The Gate 4c rubrics score all five through the ChromeDevTools MCP tools, as E5's
rubrics do.

**The parity comparison is a one-time measurement, and its reference sits in history.**
Today's viewer narration is the reference. E2 made the committed viewer a build output,
and the React shell reads no pull request's narration at all. So the reference is the
hand-written viewer as it stood before slice 3, read from git history. A later session
should record that measurement rather than derive it a second time.

## Risks & Open Questions

- **The parity reference is a file that HEAD no longer holds.** The hand-written viewer
  lived at `plugins/artifact/viewer/index.html` until slice 3 replaced it. The comparison
  therefore reads a past commit. Slice 15's rubric names the six parts, and the
  measurement stands on the record it writes.
- **Scene art and audio are paid assets.** They live in the bundle, they are megabytes,
  and a published Artifact cannot carry them under its budget. Publishing defers with E16,
  so this epic carries the paths and not the budget work.
- **The rename moves a paid file, and a browser cannot do it.** A level holds an audio
  file only when its `voice` field carries text. So one file exists per narrated level. A
  bundle whose audio does not move states the absence in place, and a reader meets a
  silent level rather than an error. The move needs one filesystem action per bundle.
- **The account reads a join the index holds.** `adr_to_pull_request` resolves a decision
  to a pull request, and `epic_to_pull_request` resolves a work's epics to theirs. The
  account reads those joins and derives none of them. A decision that reached a pull
  request through a path the join does not cover stays absent, and this design does not
  widen the join.
- **Only merged pull requests carry four narration levels.** An open pull request in this
  bundle holds fewer records. The surface states what it lacks rather than rendering an
  empty row. Absence is a state, and not a gap.
- **Two rows left the rail, and their content holds no row today.** The Deploy group held
  the Pull requests row and the Shipped row. The engineer removed that group on
  2026-09-25. So the envisioned pull request, this work's own pull-request list, the open
  set, and the release status render nowhere in the approved shape. Where each one lands
  stays open, and no slice here claims one.
