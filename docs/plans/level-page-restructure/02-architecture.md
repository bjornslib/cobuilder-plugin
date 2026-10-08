# Architecture: Level page restructure

## Fit

All viewer changes sit in `plugins/artifact/viewer/src/shell/`. The built
`plugins/artifact/viewer/index.html` is rebuilt and committed (ADR-0020).

| Module | Role today | Change |
|---|---|---|
| `TopBar.tsx` | Work item switcher, stage badge, theme | Adds the branch and a supersedes mark |
| `App.tsx` | Shell, `TopLinePanel`, `AccountRule`, `PagedLevel` | Removes both bars. `PagedLevel` renders the strip and carries the account link and the section name across an account change |
| `AccountMark.tsx` | The account rule and its jump | The rule leaves. The marks `ACCOUNT_MARK` stay where the rail reads them |
| `atoms.tsx` `Panel` | Section panel with an `action` slot | Also reads a level-wide action from a context, so every section heading carries the link |
| `model.ts` | `railGroups`, `counterpartHref`, `RailRow` | One list of levels plus an "Also" group. A pure rule matches a section name across accounts |
| `Rail.tsx` | Draws the two groups | Draws the new groups |
| `change/sections.tsx` | PR sections, with a `Narration` block | The narration paragraph and audio move to the strip |
| `panels/ProblemSolution.tsx` | Draws record-gap lines | The lines go |
| New `InShort.tsx`, `inShort.ts` | none | The strip and its pure source rule |

`shared/build_index.py` also changes: it warns about missing record elements.

## Endpoints

None.

## Data

No schema change. The strip reads two existing fields: a PR level's `narration`
and `audio` (`ChangeLevel`), and a design's `narrative.<level>.narration`.

## Flow

1. The route names a level in one account (`programHref` or `changeHref`).
2. `PagedLevel` builds the sections of that level and the strip.
3. A press on "Read in …" calls `go(counterpartHref(...))` and stores the
   section's name as a one-shot carry (view state, never a route, per ADR-0028).
4. The destination `PagedLevel` mounts, reads the carry, and starts on the
   section with that name. With no match it starts on the first.

## External

None. Audio is the existing served file at `../data/audio/pr{N}_{level}.wav`.

## Decisions

ADR-0037 records them. It amends ADR-0028 (the strip joins the level, and the
index stays view state), ADR-0029 (the account rule becomes a link, and the
rail lists each level once), and ADR-0034 is unchanged.
