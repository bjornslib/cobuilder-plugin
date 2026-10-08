---
# --- doc-gardener required frontmatter ---
title: "ADR-0038 — Review and maintenance mode read habit-hooks smells"
status: active
type: architecture
last_verified: 2026-10-08
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0038
source_pr: null
name: "Review and maintenance mode read habit-hooks smells"
state: decided
groups: [workflow, architect]
approved_by: ""
alternatives:
  - option: "Review runs habit-hooks --branch and pastes its rendered output"
    rejected_because: "The rendered text coaches an agent in session. It is not a findings record a report can carry, diff, or trend."
  - option: "Only review mode reads the smells; maintenance keeps its corpus read"
    rejected_because: "Maintenance trends the repo's health. A smell group that no scan recorded before the first maintenance run has no baseline, so the trend must start at the same scan that review writes."
  - option: "Vendor the sensors into shared/ and call them directly"
    rejected_because: "ADR-0025 already decided that habit-hooks stays an external CLI. Vendoring forks its release cycle."
forces:
  - "habit-hooks is already a dependency of the family, and it stays an external CLI (ADR-0025)."
  - "Review reports tool output next to judged findings, and names the source of each."
  - "A step with no mechanical consumer gets skipped, so the wiring prose needs tests and the scan needs a gate key in verify_bundle."
  - "A duplicate-code group can hold hundreds of findings, so a report section must cap per-file detail."
delivers:
  capability: "Review and maintenance reports count the mechanical smells habit-sensors finds, beside the corpus findings they already carry."
  benefit: "The reader sees tool output and judgment apart, and maintenance can trend a smell group over time with a recorded baseline."
  beneficiary: [developer, validator-agent]
history:
  - { state: decided, date: 2026-10-08, by: bjornslib, note: "Decided in chat on 2026-10-08. The design record for the habit-smells plan holds the details of the slices." }
maps_to:
  rule: "Review and maintenance name a mechanical source, and report it as tool output next to judged findings."
  modules: [shared/habit_smells.py, review mode Mechanical smells section, maintenance mode trend pairs]
  context: cobuilder-packaging

problem: "Review and maintenance modes audit a repo with a curated corpus and Claude's judgment. They run no linter. A smell a tool can count, such as a duplicated block or a too-complex function, is often invisible to a reading pass."
decision: "A new script, shared/habit_smells.py, runs habit-sensors and writes habit-smells.json beside the review reports. Review mode adds a classified Mechanical smells section to both reports. Maintenance mode trends the pairs of smell and file against the previous report. Both modes say unavailable when habit-hooks is missing."
---

# ADR-0038: Review and maintenance mode read habit-hooks smells as a findings source

## Problem

Review and maintenance modes audit a repo with a curated corpus and Claude's
judgment. They run no linter. A smell a tool can count, such as a duplicated
block or a too-complex function, is often invisible to a reading pass. On this
repo, habit-hooks reports 930 duplicated-code hits, 21 high-complexity
functions, and 148 oversized files that a corpus read does not name.

habit-hooks is already a family dependency (ADR-0025). habit-sensors prints
grouped JSON findings per smell, per file, and honors the snooze backlog. It
also prints an incomplete-run notice when a tool breaks, which means an
unscanned file, not a clean one.

## Consequences

- A review now reports mechanical smells next to judged findings, and names
  the source, so the reader can distinguish tool output from judgment.
- The script needs no new dependency. It shells out to the installed
  `habit-sensors`. A repo without the tool gets the unavailable section.
- The duplicate-code count is large in this repo. The section reports it once
  as a count and not 930 rows. Per-file detail caps at the top 10 files.
- Prose that governs both modes changes, so wiring tests pin it
  (tests/test_habit_smells_integration.py) and habit-checks run in
  verify_bundle as an optional warning only.

## Alternatives

- option: "Review runs habit-hooks --branch and pastes its rendered output"
  rejected_because: "The rendered text coaches an agent in session. It is not
  a findings record a report can carry, diff, or trend."
- option: "Only review mode reads the smells; maintenance keeps its corpus read"
  rejected_because: "Maintenance trends the repo's health. A smell group that
  no scan recorded before the first maintenance run has no baseline, so the
  trend must start at the same scan that review writes."
- option: "Vendor the sensors into shared/ and call them directly"
  rejected_because: "ADR-0025 already decided that habit-hooks stays an
  external CLI. Vendoring forks its release cycle."

related_decisions:
  - { type: is-related-to, target: ADR-0025 }
  - { type: is-related-to, target: ADR-0016 }
