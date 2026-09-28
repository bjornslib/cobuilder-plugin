---
# --- doc-gardener required frontmatter ---
title: "ADR-0032 — A document under review carries a viewer link"
status: active
type: architecture
last_verified: 2026-09-28
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0032
source_pr: null
name: "A document under review carries a viewer link"
state: decided
groups: [workflow, viewer, records]
approved_by: ""
problem: "The architect and implement workflows present a document for review in chat, as a bullet summary and a file path. The build skill starts the viewer only after the user approves a gate. Five hand-offs call View mode, and each one prints the root URL of the viewer, never a link to the document. Gate 1 and Gate 2 documents are not in the record index, so no viewer page exists for them. The Gate 3 program design is in the index, but the viewer renders no page for it. The user reads the document in chat, and the viewer stays closed at the one moment it helps."
decision: "Each document that a workflow presents for review carries a deep link to its page in the viewer. The link comes before the approval question. View mode owns the server, so a new Present for review section in the cobuilder-artifacts skill owns the procedure. View mode accepts a route, checks that the page answers HTTP 200, and prints the deep link. The record index projects the Gate 1 and Gate 2 documents, and the viewer shows the three plan documents on one page under the Build level. The gate verifier checks that each APPROVED gate line dated on or after 2026-09-28 carries a viewer link."
alternatives:
  - option: "Serve the viewer from the Vite dev server"
    rejected_because: "An installed plugin has no node_modules. The dev server runs only in a checkout with the viewer's dependencies installed. View mode's python http.server serves the committed, built viewer, and it runs everywhere the plugin installs."
  - option: "Publish each document under review as a Claude Artifact"
    rejected_because: "The user put publishing out of scope for this work. The publish path is also broken at present, so it cannot carry a step that runs at every gate."
  - option: "Add a prose rule to the skills, and no check"
    rejected_because: "CLAUDE.md records the lesson. A process step with no mechanical consumer gets skipped, however well it is documented. Gate 4b ran for zero of five epics before it had a check. The gate verifier is the consumer of this rule."
  - option: "Keep the viewer step after the approval, as it is today"
    rejected_because: "The user reads the document before the answer. A link that arrives after the approval shows a decision that is already made."
forces:
  - "The user decided the scope in chat on 2026-09-28: one ADR, one epic, and a small number of slices, built without further questions."
  - "View mode owns the server, the pid file, and the log file. A second owner of the port would duplicate its reuse logic."
  - "ADR-0016 forbids a file path from one plugin into another. The architect and implement workflows name the mode, and the artifact skill resolves its own path."
  - "The interaction design document has no viewer page. Its gate gives a file path, and the user accepted that."
  - "A link must answer HTTP 200 before the workflow prints it. A dead link is worse than a file path."
related_decisions:
  - { type: depends-on, target: ADR-0016 }
  - { type: depends-on, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0022 }
  - { type: is-related-to, target: ADR-0020 }
related_concerns: []
history:
  - { state: decided, date: 2026-09-28, by: bjornslib, note: "The user made decisions 1 to 7 in chat on 2026-09-28 and approved the scope. An agent wrote this record, so the state is decided and never approved." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/artifact, plugins/implement, plugins/architect, shared]
  rule: "A workflow that asks the user to approve a document prints a viewer link to that document first. The link is checked live. An APPROVED gate line dated on or after 2026-09-28 names the link, and verify_gate.py fails a line that does not."
delivers:
  capability: "A reviewer opens the document under review in the viewer from one link, at the moment of review."
  benefit: "The reviewer reads the rendered document with its diagrams and joins, not a bullet summary in chat."
  beneficiary: [developer, reviewer]
  enables: ["A later comment ledger entry can anchor to the page the reviewer approved"]
  addresses_problem: P1
provenance: authored
related:
  - "docs/architecture/designs/review-link/goal.json"
  - "docs/plans/review-link/"
  - "plugins/artifact/skills/cobuilder-artifacts/SKILL.md"
  - "plugins/implement/skills/build/SKILL.md"
  - "plugins/implement/scripts/verify_gate.py"
  - "shared/build_index.py"
---

# ADR-0032 — A document under review carries a viewer link

## Context

The architect and implement workflows stop at each gate and ask the user to
approve a document. Today they show a bullet summary and a file path in chat.
The build skill starts the viewer in step 6 of its approval protocol, which is
after the user answers.

Five hand-offs call `Skill("cobuilder-artifacts", args="view")`. Each one
prints `http://localhost:<port>/active/viewer/`, the root of the viewer. None
of them prints a link to the document under review.

The viewer also has gaps. `shared/build_index.py` projects the Gate 3 program
design and the Gate 4b epic designs. It does not project `01-product.md` or
`02-architecture.md`. The React viewer reads `program_design` entities only to
find work slugs, and it renders no page for them. So a link to a plan
document has no page to point at today.

## Decision

The user made these decisions on 2026-09-28.

1. A **Present for review** section lives in the cobuilder-artifacts skill,
   because View mode owns the server. The architect and implement workflows
   name that section by mode name, never by a file path into another plugin
   (ADR-0016).
2. View mode accepts a route and prints a deep link, for example
   `http://127.0.0.1:<port>/active/viewer/index.html#/<work>/build/plan`. It
   checks that the page answers HTTP 200 before it prints the link.
3. `build_index.py` projects `01-product.md` and `02-architecture.md`. The
   viewer shows the product, architecture, and program design documents on
   one page under the Build level, so each of those gates has a link.
4. `verify_gate.py` checks that each APPROVED gate line dated on or after
   2026-09-28 carries a viewer link. An older line is exempt.
5. The server is View mode's python `http.server`, which serves the built
   viewer. It is not the Vite dev server.
6. The interaction design document gets no viewer page. Its gate gives a
   file path, and that is accepted.
7. Publishing to Claude Artifacts is out of scope.

## Options considered

**The Vite dev server.** Rejected. An installed plugin has no
`node_modules`, so the dev server cannot start outside a checkout.

**A Claude Artifact publish per document.** Rejected. The user put it out of
scope, and the publish path is broken at present.

**A prose rule with no check.** Rejected. CLAUDE.md records that a step with
no mechanical consumer gets skipped. `verify_gate.py` is the consumer.

## Consequences

- The approval question moves after the link. The viewer step moves before
  "Approve Gate N", not after the approval.
- A gate line in `00-status.md` gains a `view:` link. The check exempts lines
  dated before 2026-09-28, so the existing plans keep passing.
- The index gains two plan document kinds. The viewer gains one page, at
  `#/<work>/build/plan`.
- The committed `viewer/index.html` needs a rebuild when the page ships.
- The interaction design gate keeps a file path. A reviewer of that gate
  still reads the file outside the viewer.
