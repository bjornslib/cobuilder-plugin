# Epic Technical Solution Design: E1 — Level chrome

Feature: level-page-restructure
Epic ID: level-page-restructure/E1

## Scope and Intent

E1 changes what surrounds a level's content. The branch and the supersedes mark
move into the top bar. The top line panel and the account rule leave. The
account link joins the section heading and carries the section name across. The
rail lists each level once. E1 does not touch the In Short strip (E2) or the
record-gap lines (E3).

## Files Touched

- `shell/TopBar.tsx`, `shell/App.tsx`, `shell/AccountMark.tsx`, `shell/atoms.tsx`
- `shell/model.ts`, `shell/Rail.tsx`
- Existing tests that pin the removed UI: `App.test.tsx`, `SparseDesign.test.tsx`, and any that name the top line, the account rule, or the Review group.

## Types & Signatures

```ts
// model.ts
export function carriedSectionIndex(names: string[], carried: string | null): number;
export function readInLabel(from: AccountId, pr: number | null): string | null;
export interface RailSource { /* existing */ account: AccountId }
export function railGroups(source: RailSource): RailGroup[];   // "levels", "also"
// atoms.tsx
export const PanelActionContext: React.Context<React.ReactNode>;
// TopBar props gain
branch: string | null; branches: string[]; supersedes: string[];
```

## Slice Decomposition

1. Slice 1 — top bar branch and supersedes, `TopLinePanel` removed. No dependency.
2. Slice 2 — account link in the heading, carry, `AccountRule` removed. Needs slice 1 only for a clean `App.tsx`.
3. Slice 3 — single rail. Needs slice 2, because the link replaces the jump that the rail's `shared` field fed.

Each slice ends in a state a reader can see on the real bundle.

## Test Plan

- Slice 1: GREEN updates the tests that asserted the top line. No RED agent: the end is a layout fact.
- Slice 2: RED writes `carryAndLabel.test.ts` for `carriedSectionIndex` and `readInLabel`.
- Slice 3: RED writes `rail.test.ts` for the new `railGroups` shape, the account of the levels group, and the walk order.
- All slices: typecheck, the full Vitest suite, and the build reproduce.

## Risks & Open Questions

- `railGroups` feeds the arrow-key walk and the `aria-label` strings that `App.test.tsx` pins. Slice 3 changes both.
- A section name must exist on both accounts for a match. Names differ for Intent (Done when, Abort if exist only on the work item) and that is the specified fallback to the first section.
- The carry is view state. A hash-only navigation that the reader types has no carry.
