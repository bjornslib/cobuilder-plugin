# Epic E3: The contracts doc

Sources: `02-architecture.md` §contracts, `03-program-design.md`, ADR-0036.

## Technical approach

`docs/architecture/designs/<name>/contracts.md` becomes the optional sixth
artifact of stage 5, authored when and only when the design touches **a
public interface or durable state** — endpoints, entity models, index keys,
manifest schemas, stored file formats. It carries two sections, `## Endpoints`
and `## Data models` (entity, fields, relations), every entry marked as a
prediction grounded in the ADR draft, not a check.

The skip rule is stated prose, Gate 2b style: a design touching no public
surface says so with a reason (for example `n/a (no public interface —
prose-only mode change)`), so absence stays meaningful and cannot go silent.

The compile side rides E1's `attach_authored_file`:
`record["contracts"]` is stamped when the file exists and is non-empty,
exactly matching the `pr_draft` behavior — presence optional, absence not an
error.

The consume side: `build/SKILL.md`'s Gate 2 and Gate 3 grounding line gains
one clause — when a design record exists for the feature, ground the
`02-architecture.md` draft and Gate 3's types in its `contracts.md` as well
as `intent.json`. The viewer renders the section beside the envisioned pull
request (E1 slice 3's `ContractsSection`, built there so the two epics ship
one compile-and-render unit).

## Boundary rules touched

- ADR-0018: one more authored file attached to the existing record entity.
- ADR-0013: the artifact budget in stage 5 grows by one with an explicit skip
  rule, so the budget stays deliberate.

## Risks

Ritual: designs that touch nothing may still write the file to look complete.
The stated skip rule, show-before-write, and the absence semantics in
build_index are the counterweight.