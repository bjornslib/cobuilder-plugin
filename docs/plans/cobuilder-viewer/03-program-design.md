# Program Design: cobuilder-viewer

Gate 3. The decisions an agent would otherwise make silently while implementing
Gate 2. Every one of them is cheap to change here and expensive to change once a
slice has landed.

This design builds one program with three surfaces. Work reads a design. FlightDeck
reads a pull request, or the whole open set. Reference reads the decisions and the
map coverage. A Vite build compiles all three into the committed viewer file.

**The scope narrowed on 2026-09-22.** The engineer cut this program to two surfaces:
the Work surface, and the current pull request viewer renamed to FlightDeck at parity.
Eleven epics deferred on that date, E8 to E18, and their material stays in this
document rather than leaving it. That material is the Reference surface, the describe
path, the whole multi-pull-request mode and its simulator, the path runner, the
ledger's three state subtypes, publish parity, and the feedback path. None of it is
part of the build. The live ladder is `04-slices.md`: sixteen slices across E1, E2,
E3, E4, E5, E6, E7, and E19. Read every section below that serves a deferred epic as
design on the shelf, ready for the epic that returns.

Five ADRs govern it. ADR-0023 holds the build. ADR-0027 holds one FlightDeck surface
with two modes. ADR-0028 holds a level as sections on a track. ADR-0018 holds the
record index, and ADR-0019 holds the ledger. Where this document and an ADR
disagree, the ADR wins and this document is wrong.

## Files

### The build, and the file it produces

```
plugins/artifact/viewer/
  package.json                     scripts: dev, build, typecheck. React 19, Vite 7,
                                   @vitejs/plugin-react, vite-plugin-singlefile
  vite.config.ts                   root src/, the single-file plugin, outDir today
                                   ../dist, alias @ -> src/, port 5273
  tsconfig.json                    strict, noUnusedLocals, noUnusedParameters
  src/index.html                   the dev entry
  src/main.tsx                     mounts the shell
  src/index.css                    the token set: ground, surface, ink, band, tint
  index.html                       THE COMMITTED OUTPUT. The build writes here once
                                   E2 lands, and a test rebuilds and compares
  dist/                            today's scratch output. Deleted once index.html
                                   is the build's target
```

**Why `vite.config.ts` changes.** It builds to `../dist` today, and its own comment
says ADR-0023's output rule is under revision while the shipped file keeps working.
E2 settles that: the build writes `plugins/artifact/viewer/index.html`, and the
committed file becomes a build artifact rather than a hand-maintained one.

**Why the markers exist.** `export_artifact.py` rewrites the viewer by verbatim
string replacement and hard-errors when a literal moves. E1 gives the build's output a small set
of named markers. The exporter then matches those names, rather than whatever
literal happens to sit between them. That is the seam, and it is the first slice.

### The typed data layer

```
src/data/
  global.d.ts                 the six window globals the bundle's script tags define:
                              STORY, ODYSSEY, DIFFS, ADRS, DESIGNS, DIAGRAMS
  types.ts                    every record type, the index shape, and the join results.
                              Declares PullRequest here, and OpenPullRequest as its
                              branded extension. ADR-0027 requires exactly one
                              declaration of each
  bundle.ts                   loads data/index.json, reads the globals, and resolves
                              every join in one place. Exposes entitiesOf, joinsOf,
                              and loadIndex
  designs.ts / adrs.ts        record bodies, keyed by design and by decision id
```

**Why one module resolves the joins.** ADR-0018 built the joins into
`data/index.json`. The shell reads them and derives none of them. A second
derivation in the viewer would be a second source for the same fact.

### The shell, and the section model

```
src/shell/
  App.tsx                     the boot: index load, route, theme, the rail and the top
                              bar, and the pane
  model.ts                    buildWorkItems, gatesOf, levelsOf, readRoute, routeHref,
                              the section lists per level
  hooks.ts                    useIndexLoad, useHashRoute, useDocumentNoScroll,
                              useVisibleWidthCap, useCollapsedRail, useFocusOnChange,
                              useScrollResetOnRoute, useSectionAvailability
  Pager.tsx                   SectionStrip, SectionStage, SectionPager, LevelProgress,
                              useSectionPaging, withinOf. ADR-0028 owns this shape
  panels/                     the sections each level pages, one file per level
    Intent.tsx                Why, Done when, Abort if, Out of scope
    ProblemSolution.tsx       Problem and solution, Risks, Assessment, Unknowns
    Architecture.tsx          Diagrams, Architecture Decisions, Boundaries, Districts
                              and alternatives considered
    Build.tsx                 the epic runs, the slices, the rubrics
    PullRequests.tsx          the envisioned pull request first, then the real ones,
                              then FlightDeck
    Shipped.tsx               the stage, the publications, and the deploy gap
  atoms.tsx                   Panel, Box, Chip, TextList, and the band and tint classes
  DiagramTiles.tsx            the diagram tiles, the dialog, the zoom, and the offline
                              source fallback
  Sheet.tsx                   the record sheet, and its jumplink row
  Rail.tsx / TopBar.tsx       the traverse and the work item
  Board.tsx                   the board E19 adds: one row per design, its stage,
                              and its six record marks
```

**Why the section model lives in `Pager.tsx` and not in each level.** One index
drives the strip, the pager bar, and the two arrow keys, and one function computes
the level's progress. A level states its sections and nothing else.

**Why the prototypes are separate directories.** `src/variations/sections-e/` and
`src/variations/app-shell/` hold the built prototype and its comparison. They are
scaffolding for the design decision, they are not the shipped surface, and the
slices below port what they proved into `src/shell/`.

### FlightDeck

```
src/flightdeck/
  OpenSet.tsx                 the multi-pull-request mode: every open pull request,
                              its head branch, its changed files, its design, and the
                              ones the auto-merge rules already handled
  SinglePr.tsx                the single-pull-request mode, at parity with today's
                              viewer, plus the joins rail
  ModeSwitch.tsx              one surface, two modes
  MergePlan.tsx               renders data/merge-plan.json. It computes nothing
```

### Reference

```
src/reference/
  Decisions.tsx               every decision, with its rule and its anchors
  Coverage.tsx                the contexts, the districts, and the uncovered ones
```

**Why the five record-type tabs go.** E9 removes them. Reference is the surface those tabs
pointed at. A tab per record type also grows with the corpus, which section 2.1 of
the interaction design forbids.

### Outside the browser

```
plugins/pr/scripts/
  simulate_merge_order.py     reads the selected open set, simulates at least three
                              paths against the common ancestor, replays the best one
                              or two on a scratch worktree, and writes
                              <bundle-dir>/data/merge-plan.json
  execute_path.py             the runner: one integration branch per bundle, chained
                              from the common ancestor, never the default branch
shared/ledger.py              gains the merge-order proposal, the acceptance, and the
                              post-merge actual as subtypes of the existing state line
plugins/artifact/scripts/
  export_artifact.py          matches the build's named markers, and drops or
                              transcodes audio when a level exceeds the 16 MiB budget
```

### Tests

```
tests/test_viewer_build.py          new. Runs the viewer build and compares the result
                                    against the committed index.html, byte for byte
tests/test_sections.py              new. The section model's own claims, against the
                                    served viewer
tests/test_simulate_merge_order.py  new. The simulator, against a fixture repository
tests/test_execute_path.py          new. The runner, against a fixture repository
tests/test_ledger.py                extended. The three new state subtypes
tests/test_export_artifact_budget.py new. The budget, and the degradation order
```

## Types & signatures

```ts
/* src/data/types.ts — the record types the index carries. */

export type DesignStage =
  | "backlog" | "design" | "review" | "approved" | "implemented" | "superseded";

export interface DesignEntity {
  id: string;
  name: string;
  outcome: string;
  stage: DesignStage;
}

export interface EpicEntity {
  id: string;            // "<design>/<epic-id>"
  design: string;
  epic_id: string;       // "E5"
  branch: string | null;
  pr: number | null;
  state: string;         // the ENTITY's own state, not the refined one
  note: string | null;
}

export interface SliceEntity {
  id: string; n: number; title: string; ends_with: string | null;
  score: number | null; state: string; attempts: number; feature: string;
}

export interface PullRequest {
  id: number;
  title: string;
  state: "open" | "merged" | "closed";
  /** The head branch. Present on an open pull request, absent on a merged one. */
  head: string | null;
}

/**
 * ADR-0027 fixes this shape, and E3 declares it once.
 * A field renamed on PullRequest and not here fails the build.
 */
export type OpenPullRequest = PullRequest & { status: "open" };

/* The index, as data/index.json holds it. */
export interface RecordIndex {
  entities: {
    design: DesignEntity[]; epic: EpicEntity[]; slice: SliceEntity[];
    adr: AdrEntity[]; boundary_rule: BoundaryRule[]; district: DistrictEntity[];
    context: ContextEntity[]; pull_request: PullRequest[]; publication: Publication[];
    epic_design: EpicDesignEntity[]; interaction_design: InteractionDesignEntity[];
  };
  joins: {
    epic_status: Record<string, string>;
    epic_to_pull_request: Record<string, number[]>;
    slice_to_epic: Record<string, string>;
    slice_to_epic_unresolved: string[];
    adr_to_pull_request: Record<string, number[]>;
    adr_to_context: Record<string, string[]>;
    adr_to_district: Record<string, string[]>;
    context_verifies_district: Record<string, string[]>;
    district_uncovered: string[];
    feature_gates: Record<string, GateStep[]>;
  };
}

export function loadIndex(): Promise<RecordIndex>;
export function entitiesOf(index: RecordIndex): RecordIndex["entities"];
export function joinsOf(index: RecordIndex): RecordIndex["joins"];

/* src/shell/model.ts — the shell's own derivations. It computes no join. */
export function buildWorkItems(index: RecordIndex, designs: DesignRecords): Map<string, WorkItem>;
export function gatesOf(work: WorkItem): Gates;
export function levelsOf(work: WorkItem): Record<LevelKey, LevelState>;
export function readRoute(): Route;
export function routeHref(workId: string, section: SectionKey, tail?: string): string;
export function epicGroups(work: WorkItem): EpicEntity[][];

/* src/shell/Pager.tsx — ADR-0028's shape. */
export interface Paging {
  index: number; count: number;
  select(index: number): void; previous(): void; next(): void;
}

/** The active section, clamped, and reset to `start` on a route change. */
export function useSectionPaging(count: number, routeKey: string, start?: number): Paging;

/** How far through one box the reader is, from 0 to 1. A box with no range is 1. */
export function withinOf(box: HTMLElement | null): number;

/** (index + within) / count, as a motion value the progress strip reads. */
export function useLevelProgress(index: number, count: number, boxRef: RefObject<HTMLElement | null>): MotionValue<number>;

export function SectionStrip(props: { targets: JumpTarget[]; activeIndex: number; onSelect(index: number): void }): JSX.Element;
export function SectionStage(props: { index: number; activeBoxRef?: RefObject<HTMLDivElement | null>; children: ReactNode }): JSX.Element;
export function SectionPager(props: { index: number; count: number; onPrevious(): void; onNext(): void }): JSX.Element;

/* src/shell/DiagramTiles.tsx */
export function DiagramTiles(props: { levels: string[]; sources: Record<string, string>; theme: Theme }): JSX.Element;
export function loadMermaid(theme: Theme): Promise<MermaidApi>;
export function uncap(svg: string): string;

/* src/shell/Sheet.tsx */
export function useSheetHeadings(scroll: HTMLElement | null, keys: readonly unknown[]): SheetHeading[];

/* Off the browser. Python, in plugins/pr/scripts/. */
def simulate(selected: list[OpenPullRequest], ancestor: str, scratch: Path) -> MergePlan: ...
def replay(candidates: list[CandidatePath], scratch: Path) -> list[ReplayResult]: ...
def execute(path: MergePlan, pace: Literal["one-at-a-time", "all-at-once"]) -> ExecutionRecord: ...
```

**The section model's own types are three, and nothing else needs one.** A section
is a rendered element plus the text its own heading carries. The shell reads the
text from the DOM rather than storing it, so a label cannot disagree with the
heading it names.

## Call stack

### Booting the shell and loading the index

```
main.tsx
  → createRoot(#root).render(<App />)
  → App()
       useIndexLoad()            → loadIndex() + loadDesigns() + loadAdrs()
                                     fetch data/index.json
                                     read the six window globals
                                     resolve the joins once
       useHashRoute()            → readRoute() from window.location.hash
       readRoute()               → ROUTE_PREFIX, the four fields
       useDocumentNoScroll()     → html and body carry no overflow
       useVisibleWidthCap()      → cap the shell to the screen, never the window
       useSectionAvailability()  → the nearest section this work can fill
       buildWorkItems(index, designs) → one WorkItem per design
       <Frame>                   → SidebarProvider, the shell's own token block
            <TopBar />           → the work item, the stage, the theme
            <Rail />             → the levels and the gated groups
            <pane>               → the only scrolling region, on a stacking section
```

Every count, state, and join on that path comes from the index. The shell renders.

### A level rendering its sections

```
pane
  → SECTION_TITLE / SECTION_LEAD   the level's own words
  → paged ? drop the band, keep <h1 id="work-section-heading" class="sr-only">
  → pagedSections({ section, work, levelState, … })   the ordered array
       intent              → Why, Done when, Abort if, Out of scope
       problem-and-solution→ Problem and solution, Risks, Assessment, Unknowns
       architecture        → Diagrams, Architecture Decisions, Boundaries,
                             Districts and alternatives considered
       build               → epicGroups(work) → one run per six epics
  → <PagedLevel sections targets routeKey start>
       useSectionPaging(count, routeKey, start)
       <SectionStrip targets activeIndex onSelect>      the headings
       <SectionStage index activeBoxRef>                the track
            one <SectionBox> per section, inert off screen
       <LevelProgress index count boxRef>               the 4 px strip
       <SectionPager index count onPrevious onNext>
```

`useJumpTargets(paneId, keys)` reads the panels the boxes rendered. So the strip's
labels come from the headings on the page, and its count comes from the same array
the boxes come from.

### A section change, and the progress strip

```
reader presses Next, a heading, or ArrowRight
  → useSectionPaging() step or select
       setState(clamp(next, count))
       a route change resets to `start`, which is the run holding an epic deep link
  → re-render
       SectionStage      animate x: -index * 100%     (150 ms reduced-motion aware)
       SectionStrip      aria-current="step" moves
       SectionPager      "Section N of M" moves; Previous and Next disable at the ends
       LevelProgress     useScroll({ container: boxRef })  → scrollYProgress
                         useTransform(within => (index + within) / count)
                         ScrollProgress value={progress}
       one box becomes active; the others carry inert
```

The index is view state. Nothing on that path writes the route. The progress strip
measures the box, so a box that cannot scroll reads as fully read, and the value
never resets on a section change.

### A diagram tile opening its dialog

```
<DiagramsSection levels sources theme>
  → useEffect on mount          loadMermaid(theme)        one runtime, shared
       api.render(id, source) per level, sequentially      uncap(result.svg)
  → <DiagramTile>               scale = tileWidth / drawing.offsetWidth
  → reader presses the tile     setOpen(level)
  → <DiagramDialog>             createPortal(document.body)
       zoom steps 50…400 % of fit
       the drawing's box is sized in pixels, so the body's own scroll grows
       Escape, the backdrop, and Close all close it
       a failed render shows the authored source as text
```

### A record opening its Sheet

```
reader presses a control inside a panel
  → openSheet(subject)          the subject: a decision, a boundary rule, or an
                                epic's technical solution design
  → <RecordSheet subject open>  the registry's Sheet, portal, Escape, 44 px close
       <SheetJumpLinks headings scroll>
            useSheetHeadings(scroll, keys)   reads [data-sheet-heading] in the record
            the callback ref puts the scroll container in state when it mounts
       reader presses a part link
            scroll.scrollTo(top + delta, behavior: reduce ? instant : smooth)
            heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true })
```

## Test plan

The repository's own suite is Python: `tests/`, run with
`uv run --with pytest pytest tests/ -v`. The viewer is TypeScript and React, so the
plan splits into three kinds of case, and each kind names its runner.

### The byte-equal rebuild test (E2, pytest)

`tests/test_viewer_build.py`:

1. `test_build_reproduces_the_committed_viewer` — run `npm run build` in
   `plugins/artifact/viewer/` and compare its output against
   `plugins/artifact/viewer/index.html`, byte for byte. Skips when `npm` or
   `node_modules` is absent, so the suite still runs on a checkout with no Node.
2. `test_editing_the_output_fails_the_test` — write one byte into a temporary copy
   of the committed file and assert the comparison fails. A rebuild test that cannot
   fail proves nothing.
3. `test_every_named_marker_survives_a_build` — assert `export_artifact.py`'s marker
   names all appear in the built output. That is E1's seam, and it is the assertion
   that keeps the exporter working.

### The section model's claims (pytest against the served viewer)

`tests/test_sections.py`. Each case asserts one claim ADR-0028 makes, and the Gate 4c
rubrics score the same claims on the built surface. The harness serves the bundle
rooted at `.cobuilder-architect/self/` and measures the DOM, which is how the
prototype's numbers in this document were taken.

1. `test_paged_level_pane_does_not_scroll` — on each of the four paged levels, the
   pane's `scrollHeight - clientHeight` is zero.
2. `test_one_box_is_in_view` — one box's rect sits inside the pane's, and no other's.
3. `test_strip_count_matches_box_count` — the strip's headings equal the boxes, and
   the pager reads `Section 1 of N` for that N.
4. `test_next_moves_exactly_one_box` — the track's transform moves by exactly one
   box width, forward and back.
5. `test_progress_is_level_progress` — the reading is 0 at the first section's top,
   one count's share higher mid-box, and the full walk never decreases.
6. `test_a_box_with_no_range_reads_as_read` — a section that fits one screen
   contributes its whole share.
7. `test_arrow_keys_step_and_are_guarded` — `ArrowLeft` and `ArrowRight` step, and a
   press inside an `input`, a `textarea`, or a `select`, or with a modifier, does not.
8. `test_paged_level_drops_the_band_and_keeps_the_id` — no band element, and
   `#work-section-heading` exists as an `sr-only` `h1` carrying the level's title.
9. `test_a_section_that_stacks_keeps_the_pane_scroll` — Rubrics scrolls its pane and
   has no strip.
10. `test_sparse_design_renders` — one of the seven `goal.json`-only designs renders
    every level it can fill, and the rail gates what it cannot.

### The rest of the program (pytest)

11. `test_export_artifact_marker_seam` — a publish survives a marker rename.
12. `test_open_pull_request_drift_fails_the_build` — renaming a field on
    `PullRequest` and not on `OpenPullRequest` fails `npm run typecheck`.
13. `test_simulate_writes_a_plan_against_the_ancestor` — a fixture repository gives a
    plan whose recorded ancestor is the common ancestor, never the default head.
14. `test_replay_counts_real_conflicts` — a fixture with a known conflict reports it.
15. `test_execute_never_touches_the_default_branch` — the runner's merges land on
    `flightdeck/<path>/<n>-<slug>` and the default branch keeps its head.
16. `test_ledger_three_subtypes_fold` — a proposal, an acceptance, and an actual
    append as `state` subtypes, and `fold_threads` keeps all three.
17. `test_audit_reports_a_hash_mismatch` — a mismatched tree hash is a stated state.
18. `test_publish_holds_the_budget` — the exporter drops or transcodes over-budget
audio in the documented order, and the published file is under 16 MiB.
19. `test_describe_leaves_a_described_pull_request_alone` — the body stays identical.
20. `test_anchor_survives_a_rerender` — an anchor taken before a re-render still
    resolves to its sentence after it.

### Cases the rubrics score, not pytest

Two claims need a human or a scripted browser, and the repository's suite holds
neither today. This document states each one as a case for Gate 4c to score:

- **The tile dialog's zoom reads whole percentages and the drawing stays reachable**
  at 50 %, 100 %, and 400 %, measured in the browser.
- **The published Artifact renders every surface** under the platform's CSP, which
  only the platform can answer.

## Least confident decisions

1. **E4, E6, and E8 ask for a "detailed static HTML prototype". The Work prototype
   shipped as a React application instead.** `variations/sections-e/` is
   the artifact the engineer reviewed. Either the three prototype epics accept the
   React prototype as their deliverable, or the static-HTML wording stands and each
   prototype is a second artifact built beside the real one. This document assumes
   the React prototype satisfies E4 and that E6 and E8 follow it, and it could be
   wrong about all three.
2. **The two prototype epics E6 and E8 may collapse into their build epics.** A
   prototype whose only job is approval is cheap work, if the build epic already
   exists to hang it on. This document keeps them separate because E7 and E9 measure
   their own parity against an approved prototype, and that approval is the gate.
3. **The diagram runtime loads when the Diagrams section mounts.** It used to load
   on the reader's press, because the runtime is large. A tile cannot wait for a
   press, so the rule changed. The cost is that a reader who opens Architecture to
   read decisions pays for a runtime they never use. A lazy per-tile load is the
   obvious alternative, and this document does not take it.
4. **`ui-spec.jsonc` has no validator.** `verify_gate.py` checks that the file
   exists and reads nothing inside it. So the component specification is a document
   two people can disagree about with no test to settle it. Writing a schema check
   is real work, and nothing in this program owns it.
5. **The build's output path moves from `dist/` to the committed `index.html`.**
   `vite.config.ts` says ADR-0023's output rule is under revision. E2 needs the move,
   and every `export_artifact.py` run after it rewrites a build artifact. A stale
   committed file is a real risk here, and the byte-equal test is the only guard.
6. **The byte-equal test depends on a pinned toolchain.** Two machines with the same
   lockfile and the same Node version should produce the same bytes. Nobody has
   proven that yet. If it fails, the guard test fails for a reason nobody can act on. The spike
   in E2 is where that gets answered.
7. **The design settles where the runner's merges come from. It does not settle who
   deletes the integration branches.** E15 leaves N branches per path behind, and no
   epic owns their removal. It is out of scope in `intent.json`, and it stays out of scope here.
8. **The 16 MiB budget assumes audio is the thing that breaks first.** That is what
   the earlier artifact experiment measured. A pull request carrying four levels of
   scene art and inlined React could break it with no audio at all. No epic measures
   the degradation order this document implies on a real bundle.
