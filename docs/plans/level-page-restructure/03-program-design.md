# Program Design: Level page restructure

## Files

- `plugins/artifact/viewer/src/shell/inShort.ts` (new): the pure source rule for the strip.
- `plugins/artifact/viewer/src/shell/InShort.tsx` (new): the strip and the Listen control.
- `plugins/artifact/viewer/src/shell/model.ts`: `carriedSectionIndex`, `readInLabel`, the new rail shape.
- `plugins/artifact/viewer/src/shell/Rail.tsx`: draws the new rail.
- `plugins/artifact/viewer/src/shell/TopBar.tsx`: branch and supersedes.
- `plugins/artifact/viewer/src/shell/App.tsx`: removes `TopLinePanel` and `AccountRule`, wires the strip, the link, and the carry.
- `plugins/artifact/viewer/src/shell/atoms.tsx`: `Panel` reads `PanelActionContext`.
- `plugins/artifact/viewer/src/shell/change/sections.tsx`: drops the narration block.
- `plugins/artifact/viewer/src/shell/panels/ProblemSolution.tsx`: drops the gap lines.
- `shared/build_index.py`: record-gap warnings.
- `docs/architecture/adr/ADR-0037-*.md` (new).

## Types & signatures

```ts
// inShort.ts
export interface InShort { text: string; audio: string | null; voice: string | null }
export function inShortOf(input: {
  account: AccountId;               // "program" | "change"
  level: SharedKey;                 // "intent" | "problem-and-solution" | "architecture"
  work: WorkItem | null;
  changeLevels: ChangeLevel[];
}): InShort | null;                 // null: show no strip

// model.ts
export function carriedSectionIndex(names: string[], carried: string | null): number;
export function readInLabel(from: AccountId, pr: number | null): string | null;
//   program -> "Read in PR 12 ›", change -> "Read in the work item ›", no PR -> null

export interface RailSource { /* existing fields */ account: AccountId }
export function railGroups(source: RailSource): RailGroup[];
//   groups: "levels" (Intent, Problem & Solution, Architecture, addressed in source.account)
//           "also"   (Plan, Epics, Rubrics: program rows; File Diffs: change row)
//   an "also" row carries its own account, so a press switches the account
```

```ts
// atoms.tsx
export const PanelActionContext: React.Context<React.ReactNode>;
// Panel renders its own `action` first, then the context action, in the heading band.
```

```python
# shared/build_index.py
def record_gap_warnings(design_id: str, record: dict) -> list[str]
```

## Call stack

- `Shell` -> `PagedLevel(sections, targets, routeKey, lead, action, carry)` -> `<InShort/>`, `<SectionStrip/>`, `<SectionStage/>`.
- A press on the link -> `go(href)` + `setCarry(sectionName)` -> the destination `PagedLevel` mounts -> `useEffect` picks `carriedSectionIndex(names, carry)` then clears the carry.
- `build_index.main` -> `collect_designs` -> `record_gap_warnings` per design -> `warning:` lines on stderr.

## Test plan

Code tests (RED agents write these):
- `inShort.test.ts`: the source rule for both accounts, the three levels, absent text.
- `carryAndLabel.test.ts`: `carriedSectionIndex`, `readInLabel`.
- `rail.test.ts` (and updates to the rail rows in `App.test.tsx`): the new `railGroups` shape and the walk.
- `tests/test_build_index.py`: each record-gap warning, and that a complete record warns nothing.

Layout and copy are not pinned by RED tests. Existing tests that assert removed
UI (the top line, the account rule, the second rail group) are updated by GREEN
and each change is listed in its report.

## Least confident decisions

- The carry is stored in `Shell` state and consumed on mount. A deep link to a level opened by hand has no carry and starts on the first section, as today.
- A work item with no PR shows no link and no Review rows.
- Work narration has no audio: Listen appears only for a PR level whose file the bundle serves.
