# Epic Technical Solution Design: E7 — FlightDeck, one pull request

Feature: cobuilder-viewer
Epic ID: cobuilder-viewer/E7

## Scope and Intent

E7 rebuilds the current pull request viewer as a React surface, at parity, and adds a
joins rail. It is the second of the narrowed program's two surfaces: the Work surface
reads a design, and FlightDeck reads a pull request.

**Parity covers six things, and the epic names them.** Four narration levels, diagrams,
scene art, narration audio, the diff, and the intent and assessment sheet. The joins rail is the one addition parity does not carry. It lists the decisions, the
design, and the epics that reach that pull request. The shipped viewer answers that
question only by asking a reader to search.

The boundary. E7 builds single-pull-request mode and nothing else. The multi-pull-request
mode, the merge-order simulator, the ledger's three state subtypes, the path runner, and
every publishing path are deferred with E11 to E18. The mode switch ships with one live
mode. The two modes are one surface in the design, and the second mode's arrival must
not reshape the first.

## Files Touched

- `plugins/artifact/viewer/src/flightdeck/SinglePr.tsx` — new. One pull request, at
  parity: the four levels, the diagrams, the art, the audio, the diff, and the sheets.
- `plugins/artifact/viewer/src/flightdeck/Levels.tsx` — new. The four narration levels
  and their navigation, ported from the shipped viewer's own level reader.
- `plugins/artifact/viewer/src/flightdeck/Diagrams.tsx` — new. The per-pull-request
  diagram levels, rendered through `DiagramTiles.tsx`.
- `plugins/artifact/viewer/src/flightdeck/Art.tsx`, `Audio.tsx` — new. The hero frames
  at `assets/pr-{N}/level-{L}.png` and the narration at `data/audio/pr{N}_{level}.wav`.
- `plugins/artifact/viewer/src/flightdeck/Diff.tsx` — new. The diff view, ported as it
  stands. `intent.json` puts the diff's own rendering out of scope, so the port changes
  no part of how a diff reads.
- `plugins/artifact/viewer/src/flightdeck/ModeSwitch.tsx` — new. One surface, two modes.
  Only the single-pull-request mode is live in this program.
- `plugins/artifact/viewer/src/flightdeck/JoinsRail.tsx` — new. The decisions, the
  design, and the epics that reach the pull request.
- `plugins/artifact/viewer/src/shell/panels/PullRequests.tsx` — modified. Its FlightDeck
  entry routes into the surface.
- `plugins/artifact/viewer/src/data/types.ts` — modified. `PullRequest` gains the fields
  parity needs, and `OpenPullRequest` stays the declared extension.
- `tests/test_flightdeck_parity.py` — new. The parity cases.

## Types & Signatures

```ts
/* The pull request the surface reads. The record index holds one per merged or open
   pull request, and the bundle's own narration files hold the rest. */
export interface PullRequest {
  id: number;
  title: string;
  state: "open" | "merged" | "closed";
  head: string | null;
}

/** ADR-0027's branded extension. E3 declares it, and this epic consumes it. */
export type OpenPullRequest = PullRequest & { status: "open" };

/** One narration level of one pull request, as the bundle's story.json holds it. */
export interface Level {
  level: 1 | 2 | 3 | 4;
  title: string;
  narration: string;
  /** Scene art, when the bundle carries it. Level 4 has no diagram. */
  art: string | null;
  audio: string | null;
  diagram: string | null;
}

export function levelsOf(story: StoryEntry): Level[];

/** The joins that reach one pull request, read from the index. Never derived here. */
export interface ReachingJoins {
  decisions: AdrEntity[];
  design: DesignEntity | null;
  epics: EpicEntity[];
}

export function joinsReaching(index: RecordIndex, pr: number): ReachingJoins;

/* JoinsRail.tsx */
export function JoinsRail(props: { joins: ReachingJoins; onOpenPr(n: number): void }): JSX.Element;

/* SinglePr.tsx */
export function SinglePr(props: {
  pr: number;
  story: StoryEntry;
  index: RecordIndex;
  onOpenPr(n: number): void;
}): JSX.Element;

/* ModeSwitch.tsx */
export type Mode = "single" | "multi";
export function ModeSwitch(props: { mode: Mode; onMode(mode: Mode): void }): JSX.Element;
```

**The asset paths are relative, and they stay relative.** The surface requests
`../assets/pr-{N}/level-{L}.png` and `../data/audio/pr{N}_{level}.wav`, exactly as the
shipped viewer does, so the same bundle serves both and a published export can rewrite
the two maps it already rewrites.

## Slice Decomposition

Per `docs/plans/cobuilder-viewer/04-slices.md`, in build order.

- **Slice 15 — A single pull request at parity.** Depends on: slice 5 (the approved Work
  prototype, which fixes the shell) and slice 14 (the approved FlightDeck prototype,
  which fixes the surface's shape). It also depends on slices 8 to 10, the section model
  the surface sits beside. Its end is a reader opening one pull request and reading all
  six parts of parity.
- **Slice 16 — The joins rail.** Depends on: slice 15, because the rail renders on the
  same page. Its end is that page listing the decisions, the design, and the epics that
  reach that pull request.

Slice 16 is not slice 15's edge cases. Two states: a pull request that reads as it reads
today, and a pull request that says where it came from.

## Test Plan

`tests/test_flightdeck_parity.py`, run by `uv run --with pytest pytest tests/ -v`. The
suite reads the built bundle and the served page, and it asserts against the shipped
viewer's own output where it can.

- `test_four_levels_render` — slice 15. A pull request in the bundle renders four
  levels, and each one carries its title and its narration.
- `test_diagrams_render_for_levels_one_to_three` — slice 15. The three diagram levels
  render, and level 4 carries none.
- `test_scene_art_paths_resolve` — slice 15. Every level that records art has a file at
  `assets/pr-{N}/level-{L}.png` in the bundle.
- `test_narration_audio_paths_resolve` — slice 15. Every level that records audio has a
  file at `data/audio/pr{N}_{level}.wav`.
- `test_diff_renders` — slice 15. The diff renders for a pull request the bundle carries
  a diff for, and it carries the same file entries the shipped viewer shows.
- `test_intent_and_assessment_sheet_opens` — slice 15. The sheet opens with the intent
  and the assessment the pull request records.
- `test_parity_against_the_shipped_viewer` — slice 15. The six parts of parity are
  present for one pull request in both readers.
- `test_joins_rail_lists_what_reaches` — slice 16. The rail lists the decisions linked
  to the design, the design itself, and the epics whose branch or pull request carries
  the change.
- `test_joins_rail_states_an_empty_join` — slice 16. A pull request nothing links to
  states that, rather than rendering an empty rail.
- `test_multi_mode_is_not_live` — slice 15. The mode switch offers the second mode and
  says it is not built, so no reader meets a dead control.

## Risks & Open Questions

- **This epic measures parity against a file E2 changes.** The shipped viewer is the
  reference, and E2 makes that file a build output. Until E2 lands, the reference is stable; after
  it, the reference is rebuilt from the React source E7 writes. That circularity is real. The
  honest reading is that the team measures parity once, before E2's move, and records it.
- **Scene art and audio are paid assets.** They live in the bundle, they are megabytes,
  and a published Artifact cannot carry them under its budget. Publishing defers with E16,
  so this epic carries the paths and not the budget work.
- **The mode switch offers a mode that is not built.** ADR-0027 makes the two modes one
  surface, and the second one defers. A switch that offers a dead control is worse than a
  switch that is absent, so the disabled state has to state why.
- **The joins rail reads a join the index holds.** `adr_to_pull_request` resolves a
  decision to a pull request. The rail reads that join rather than deriving it. A decision
  that reached a pull request through an epic the join does not cover would be absent
  from the rail, and this design does not widen the join.
- **Only merged pull requests carry four levels of narration.** An open pull request in
  this bundle holds fewer records. The surface must state what it lacks rather than render
  an empty level. The prototype's rule applies: absence is a state, not a gap.
