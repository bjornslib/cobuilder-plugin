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
  - { state: decided, date: 2026-09-28, by: bjornslib, note: "Amended in place: the link moves from a suffix on the gate line's state text to its own `view:` line directly under the gate line, indented. Two facts rode one string, so every parser had to split them, and one projection failed to. The state stays decided, because an agent wrote this amendment and an agent does not approve its own record." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/artifact, plugins/implement, plugins/architect, shared]
  rule: "A workflow that asks the user to approve a document prints a viewer link to that document first. The link is checked live. An APPROVED gate line dated on or after 2026-09-28 carries its link on a `view:` line directly under it, indented two spaces, and verify_gate.py fails a gate line with no such view line."
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

## Amendment, 2026-09-28

**This section states what moved, and it governs where the two disagree.** The
link moves off the gate line's state text. The original decision put the link
at the end of the state, as `APPROVED <date> — view: <url>`. The record above
keeps its original text, so a reader sees the decision of 2026-09-28 and this
amendment. The front matter's `decision` field keeps the original wording
too, and `maps_to.rule` carries the new shape, because a tool reads that
field.

1. **The link is its own line.** A gate block now reads:

   ```
   - Gate 1 — Product: APPROVED 2026-09-28
     view: http://127.0.0.1:<port>/active/viewer/index.html#/<work>/build/plan/product
   ```

   The `view:` line sits directly under the gate line, indented two spaces,
   the same indent style the 4a, 4b, and 4c sub-lines under Gate 4 already
   use. The URL itself is unchanged: it is the full deep link that View mode
   prints. This change is field separation, not URL reform.

2. **Why it moved.** Two facts rode one string: the approval state and the
   link. Every parser of the line had to split them, and one projection
   failed to, so a machine-specific absolute URL reached a derived index and
   a rendered page. One fact per line removes the split from every reader.
   The state text carries the approval and nothing else, so no projection can
   leak a URL through it again.

3. **The check reads the pair.** `verify_gate.py` reads a gate line and then
   the line directly after it. A gate line dated on or after 2026-09-28 with
   no following `view:` line reads "missing", exactly as before. Gate 2b
   keeps no link, because its document has no viewer page.

4. **The derived index keeps the portable fact.** `shared/gate_status.py` is
   the one parser of the gate block, and it projects the route fragment of
   the link, from its first `#`, into the gate step's own `view` field. The
   absolute URL, with its host and port, reaches no derived payload. The
   inline-suffix split it replaced is gone: no authored file carries the
   suffix, and one format beats a tolerated second one.
