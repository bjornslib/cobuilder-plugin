---
title: "ADR-0043 — formulas follow the wisps key in tracker.yaml"
status: active
type: architecture
last_verified: 2026-10-23
owner: bjornslib
id: ADR-0043
source_pr: null
name: "formulas follow the wisps key in tracker.yaml"
state: decided
groups: [workflow, packaging]
approved_by: ""
problem: "The slice-loop formula of E5 is a file that no code reads. The loop cannot use molecules and wisps, and a molecule that is poured twice makes duplicate rows."
decision: "The key wisps in tracker.yaml turns the formula path on or off. The default is true for beads and false for the files and fake adapters. With wisps true, the new operation start-slice-loop pours one molecule for a slice and finds it again, record-attempt adds a wisp, and closing a slice squashes the molecule with --keep-children and a summary. With wisps false, start-slice-loop exits 4 and runs no bd call. This amends ADR-0040 and builds on ADR-0042."
maps_to:
  context: tracker-port
  modules: [shared/tracker_port/config.py, shared/tracker_port/beads.py, shared/tracker_port/bd_runner.py, shared/tracker.py]
  rule: "Only shared/tracker_port/ calls bd. A formula operation runs only when the wisps key is true. Every row that the formula makes is foreign: it never holds a cb key."
forces:
  - "An ephemeral wisp never syncs, so one machine alone sees it."
  - "A molecule syncs, and each pour makes a new molecule."
  - "bd mol pour has no --parent flag, and bd never commits or syncs the formula file."
  - "A poured row has no cb metadata, so the adapter reads it as foreign."
  - "A default of true gives every beads repo the cost of four or more rows for each slice."
alternatives:
  - option: "No formula, E5 file only"
    rejected_because: "The file stays unused. The loop gets no molecule, no wisp, and no digest."
  - option: "One new operation only, start-slice-loop"
    rejected_because: "The attempts and the close then do not touch the molecule, so it never records a result and never closes."
  - option: "Wisps as the only attempt record"
    rejected_because: "A wisp never syncs. A second machine or a restart loses the attempts. The envelope and the digest summary keep the history."
delivers:
  capability: "A slice on beads runs as one molecule, and a squash keeps the attempt history in a synced digest."
  benefit: "The engineer sees the red, green, and validate steps in bd, and the history reaches every clone."
  beneficiary: [developer, implement-worker]
  enables: ["A doctor that separates formula rows from foreign rows"]
provenance: authored
history:
  - { state: decided, date: 2026-10-23, by: engineer, note: "Decided in session: the five points of E6, with default-on for beads." }
related_decisions:
  - { type: amends, target: ADR-0040 }
  - { type: is-related-to, target: ADR-0042 }
  - { type: is-related-to, target: ADR-0031 }
related:
  - "docs/plans/beads-storage/epic-E6-design.md"
  - "shared/tracker-usage.md"
---

# ADR-0043 — formulas follow the wisps key in tracker.yaml

## Context

E5 added the file `shared/tracker_port/formulas/slice-loop.toml`. No code reads it. ADR-0040 sets the port, and ADR-0031 sets the beads mapping. ADR-0042 added the `sync` key to the config. A spike on bd 1.3.0 gave the facts below. The evidence is in the E6 design.

- A poured molecule and its steps sync. An ephemeral wisp does not sync.
- Each `bd mol pour` makes a new molecule. Pour has no `--parent`.
- bd never commits or syncs `.beads/formulas/`.
- A poured row has no `cb` key, so the adapter reads it as foreign.

## Decision

The key `wisps` in `.cobuilder/tracker.yaml` takes `true` or `false`. When the key is absent, it means true for the beads adapter and false for the files and fake adapters. The config loader checks it as it checks `sync`.

With `wisps` true:

- `start-slice-loop <slice-id>` installs the formula into `.beads/formulas/slice-loop.formula.toml` when it is missing. It pours one molecule and sets `slice=<slice bd id>` on the root. A second call finds the molecule through `bd list --metadata-field slice=<bd id>`.
- `record-attempt` also adds an ephemeral wisp child of the molecule.
- `set-slice-state <id> closed` squashes the molecule with `--keep-children` and a `--summary` built from the recorded attempts. Then it closes the root.

With `wisps` false, `start-slice-loop` exits 4, names the key `wisps`, and makes no bd call. `record-attempt` and `set-slice-state` keep their current behavior.

When `wisps` is true on beads and the probe `bd mol seed slice-loop` fails, the adapter raises `AdapterError`, which the CLI reports as exit 3.

## Consequences

- The durable attempt history stays in the slice envelope and in the digest summary. The wisps are local to one machine.
- `tracker.py prepare` and `start-slice-loop` install the formula in each clone.
- Each slice adds four or more foreign rows. `doctor` counts them in `foreign_issues`. A later slice may split the count into foreign rows and formula rows.
- Default-on gives every beads repo the cost at once. The engineer chose it. The rollback is `wisps: false`.
- The name `wisps` also covers formulas and molecules. This is a naming gap. It is not fixed here.
- This ADR amends ADR-0040: the port gains the operation `start-slice-loop`.
