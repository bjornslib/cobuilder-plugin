# Contracts — nexus-borrowings

Authored during design mode stage 5 under the (pending) contracts rule: this
design touches public interfaces, so it carries its own contracts. Everything
below is a prediction grounded in the ADR-0036 draft, not a check.

## Endpoints

- `artifacts` — `GET  .cobuilder-architect/self/data/index.json` — served by
  the artifact View server. Gains per-design record fields `diagrams["runtime"]`
  and `contracts`; additive only, no existing field changes.
- Local routes — `#/work/<name>/intent` for design mode stage 5-6 presentation
  (existing); one section renders the runtime tile ahead of the class tile, one
  renders the contracts file. No new route family.

## Data models

Entity: `design-record` (compiled by `shared/build_index.py`)
- `diagrams`: gains named key `"runtime"` beside the numeric `"1"`, `"2"`, `"3"`.
  String-valued, presence optional.
- `contracts`: string, the authored markdown of `contracts.md`.
  Presence optional; a design that skips the file attaches nothing — the skip
  reason lives in the mode's narration to the engineer, not in the record.

Entity: `marketplace-version` (`.claude-plugin/marketplace.json`)
- `architect`: `0.6.0` -> `0.7.0`
- `implement`: `0.3.0` -> `0.4.0`
- `artifact`: `0.6.0` -> `0.7.0`
- `pr`, `cobuilder-full-lifecycle`: unchanged.

Entity: `goal.json` `min_work`
- gains `"draft_review_run": bool` beside `"challenge_stage_run"`, derived, not
  asked for.

## Skip statement

None. This design touches a public interface (the marketplace manifest and the
record index), so contracts.md carries entries.