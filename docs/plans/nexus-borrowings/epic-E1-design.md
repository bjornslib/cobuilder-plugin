# Epic E1: The runtime SVG diagram

Sources: `02-architecture.md` §runtime-slot, `03-program-design.md`, ADR-0036, ADR-0035 (SVG exception).

## Technical approach

The design's runtime picture lands as one authored, self-contained SVG at
`docs/architecture/designs/<name>/diagrams/runtime-architecture.svg`.
`shared/build_index.py` compiles it into `record["diagrams"]["runtime"]` —
the diagrams dict already carries arbitrary string keys, so this is additive.
The viewer renders that value as the lead tile inside the design's
architecture level, ahead of the `"3"` class tile, and never passes it to the
mermaid renderer.

Three moving parts:

1. **The contract prose** (`references/runtime-architecture-diagram.md`):
   clustered boundaries (`bound-client` … `bound-<name>`), cylinder data
   stores, dashed external systems, rounded services, pending badges for
   drafted components, protocol-labeled boundary edges, 8-30 nodes, one page,
   `viewBox`, no `<script>`, no external references. The contract cites ADR-0035,
   which accepted inline SVG for the options report, and the pre-merge
   mermaid contract is deleted.
2. **The validator** (`plugins/architect/scripts/check_design_svg.py`): mirrors
   `check_options_report.py`'s SVG checks. Exit 0 on clean, exit 1 with
   `ERROR check N` on failure, `WARN check N` for long text. No third-party
   imports; `html.parser` subclass only, reading the SVG file as text.
3. **The compile step**: `compile_design_diagrams(diagrams_dir)` replaces the
   `(1, 2, 3)` loop — same numeric keys, plus the named key. `attach_authored_file`
   generalizes the `pr_draft` stamp; `contracts` rides the same helper.

## Boundary rules touched

- ADR-0018 (one lifecycle surface): additive record keys only; no new joins.
- ADR-0017 (vendored shared code): nothing added to `shared/` — the contract
  is architect-owned because only design mode authors the slot.
- ADR-0035 (inline SVG exception): extended from reports to design records.

## Risks

Raw markup in the viewer: mitigated by the validator's no-script and
no-external-reference checks, and by the `runtime` key never touching the
mermaid renderer. A broken file renders blank in the worst case; the
authoring-time check is the gate.