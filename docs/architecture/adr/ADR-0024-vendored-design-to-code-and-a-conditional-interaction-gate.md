---
# --- doc-gardener required frontmatter ---
title: "ADR-0024 — Vendored design-to-code: a trimmed three-step skill behind a conditional Gate 2b"
status: active
type: architecture
last_verified: 2026-09-14
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0024
name: "Vendored design-to-code: a trimmed three-step skill behind a conditional Gate 2b"
state: approved
groups: [workflow, packaging]
approved_by: bjornslib
problem: "Every gate document describes the interface at rest. Gate 1 holds plain HTML mockups, Gate 2 holds modules and data, and Gate 3 holds types and signatures. No document states a component's initial state, the transitions between its states, which controls a connection reveals, which event arms a timer, or which default a fresh profile receives. Gate 4c must derive each rubric criterion from an approved document, so a criterion about behaviour is either omitted or guessed, and VALIDATE can only score the guess. A build of the hosted canvas in a sibling repository produced three defects of this class, each found in a browser after the slice was accepted, where a correction costs a code change and a re-validated slice instead of a document edit."
decision: "Fork the five-step design-to-code workflow into plugins/implement/skills/design-to-code/ as a three-step skill that produces an interaction design specification, a component research note, and a JSONC UI specification. Insert Gate 2b between Gate 2 and Gate 3. Gate 2b reads 01-product.md's Screens line and 02-architecture.md's Fit section, asks the person to supply the design when a front end exists, and records 2b: n/a (no UI) with the Screens line it relied on when none exists. The contract travels in docs/plans/<slug>/interaction-design.md and docs/plans/<slug>/ui-spec.jsonc, and Gate 4c and the slice loop read both. verify_gate.py gains a 2b group so the step has the mechanical consumer CLAUDE.md requires."
alternatives:
  - option: "Insert the interaction gate at Gate 1b, between Gate 1 and Gate 2"
    rejected_because: "Gate 1 is a no-tech-talk document, and its own rules forbid database details, schemas, and endpoints. The interaction specification names state classes, timing tokens, hit targets, scroll owners, and a JSONC schema. Authoring it at Gate 1b breaks that rule, or forces a state table into language too loose to hold states. Gate 1's Screens line does state no UI, so the conditional is available there, but that document is the wrong home for this content."
  - option: "Insert the gate at Gate 4d, after the epic technical solution designs and before the blind rubrics"
    rejected_because: "That point lands after 04-slices.md, so the slice plan cannot group slices by state. The three contracts in the specification's layering, hit-target, and scroll-ownership sections are properties of the feature, and they belong to no single epic. It is also the latest and most expensive moment to capture the person's intent."
  - option: "Vendor the skill into shared/skills/ under ADR-0017"
    rejected_because: "The skill has one consumer, the implement plugin. shared/ is a marketplace-wide commitment with a compatibility posture of its own. A skill under plugins/implement/skills/ is auto-discovered, needs no manifest entry, and carries no boundary classification debt."
  - option: "Add a wrapper skill in the implement plugin that calls design-to-code"
    rejected_because: "The wrapper's only caller is the build skill, so it adds an indirection with no reuse. The build skill already expresses a deeper procedure through references/, of which it holds five."
  - option: "Keep all five steps of design-to-code"
    rejected_because: "Step 1 rebuilds a product brief that Gate 1's 01-product.md already holds, which is the duplication ADR-0013 split the first gate to prevent. Step 4 writes component code, which collides with the slice loop's red-then-green contract and bypasses the blind rubric."
  - option: "Require the interaction design for every feature"
    rejected_because: "A change with no front end has no interaction to design. A step that always reads n/a teaches sessions to treat gates as formalities."
  - option: "Have the skill generate the design from the architecture"
    rejected_because: "The specification must record what the person chose. A design the harness invented would be approved twice removed from that person's intent."
  - option: "Insert the gate and add no mechanical consumer"
    rejected_because: "CLAUDE.md records the binding lesson. Gate 4b was the only Gate 4 sub-step nothing downstream required, and it ran for zero of five multi-slice epics. A documented step with no consumer is a step that gets skipped."
forces:
  - "Gate 1's 01-product.md carries a Screens section that already reads 'one line per mockup in ./mockups/ — or \"no UI\"', so the no-front-end test reuses an existing convention and costs no new field."
  - "Gate 1 forbids technical detail, so a state table with state-class names and timing tokens cannot live there."
  - "Gate 2's Fit section names the modules the feature touches, which is the point at which the front end of an existing feature is named in engineering terms."
  - "references/rubric-authoring.md requires every criterion to derive from an approved document, so an unapproved state is a guess the rubric cannot cite."
  - "verify_gate.py already carries one group per Gate 4 sub-step, so a new sub-step is a new group rather than a new script."
  - "shared/build_index.py projects gate documents under ADR-0022, so a Gate 2b document stays invisible in the viewer until that projection covers it."
  - "ADR-0013 decided the design-to-implement join travels in a file on disk and never through a code call."
  - "CLAUDE.md records that a process step with no mechanical consumer gets skipped, however well it is documented."
  - "tests/test_pillar_boundaries.py fails on any SKILL.md directory that no set in that file names."
  - "design-to-code's Step 4 overlaps the slice loop's green step, and its browser checks overlap the validate step."
  - "The implement plugin carries no dependency on any plugin outside the marketplace."
related_decisions:
  - { type: depends-on, target: ADR-0022 }
  - { type: is-related-to, target: ADR-0012 }
  - { type: is-related-to, target: ADR-0013 }
  - { type: is-related-to, target: ADR-0016 }
  - { type: is-related-to, target: ADR-0017 }
related_concerns: []
history:
  - { state: decided, date: 2026-09-14, note: "Recorded from the design session. The three-step fork, the conditional Gate 2b placement, the ask-the-person rule, and the file join were each approved by the human during that session. This record awaits the human's approval on merge." }
  - { state: approved, date: 2026-09-14, by: bjornslib, note: "Approved by the human in session, before merge." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/implement/skills/design-to-code, plugins/implement/skills/build, plugins/implement/scripts/verify_gate.py, shared/build_index.py]
  rule: "design-to-code is a skill of the implement plugin and of no other plugin. Gate 2b runs only where a front end exists, and records an explicit n/a line quoting the Screens entry it relied on where none does. The interaction contract travels in docs/plans/<slug>/interaction-design.md and docs/plans/<slug>/ui-spec.jsonc, and build reads it, so the design never joins through a code call."
delivers:
  capability: "A build that has a front end produces an approved interaction contract before the slice plan exists, and every rubric criterion about a state, a transition, a default, or a gate cites it."
  benefit: "Interface defects that only a browser can reveal move from the end of an accepted slice to the gate that approves the design, where a correction costs a document edit."
  beneficiary: [developer, validator-agent, the-business]
  enables: ["Epic designs that name the states their slices must produce"]
  addresses_problem: P3
related:
  - "docs/architecture/contexts/cobuilder-packaging/boundary.yaml"
---

# ADR-0024 — Vendored design-to-code: a trimmed three-step skill behind a conditional Gate 2b

## Context

`implement`'s build skill captures the product at Gate 1, the architecture
at Gate 2, and the program design at Gate 3. Every one of those documents
describes the interface at rest. Gate 1 owns `mockups/`, which are plain
HTML pictures of a screen. Gate 2 owns modules, endpoints, data, and flow.
Gate 3 owns types, signatures, and a test plan.

No document in the pipeline states a component's initial state, or the
transitions between its states. No document states which controls a
connection or a permission reveals, which event arms a timer, or which
default a fresh profile receives. A mockup shows one state. It cannot show a state that lasts five
milliseconds, or a control that a parent element swallows before the click
lands.

Gate 4c then authors blind rubrics. `references/rubric-authoring.md`
requires each criterion to derive from an approved document, and a
front-end criterion to name a browser check. A criterion about behaviour has
no approved document to cite. It is therefore omitted, or guessed. The
slice loop's validate step can only score the guess.

The failure class is not hypothetical. A build of the hosted canvas in a
sibling repository produced three defects of exactly this kind. Each one was
found in a browser, after its slice was accepted.

- A component mounted in its expanded state, and its idle timer armed on
  mount. Joining the room took between 1.4 and 5.1 seconds, so the
  countdown often expired before the component was visible.
- A theme selector and an invite control could not receive a real click,
  because a parent element set `pointer-events: none`. A component test that
  fired a synthetic click passed.
- A status line changed for about five milliseconds, and then changed back.

A correction at that point costs a code change and a re-validated slice. A
correction at Gate 2b costs a document edit.

`design-to-code` already exists as a five-step workflow in another
repository. Step 1 derives a brief from a design image. Step 2 researches
components. Step 3 writes a JSONC specification. Step 4 implements and
verifies in a browser. Steps 1 and 4 duplicate work `implement` already
owns.

One further fact frames the answer. CLAUDE.md records one binding lesson.
**A process step with no mechanical consumer gets skipped, however well it
is documented.** Gate 4b ran for zero of five multi-slice epics while
nothing downstream required it. A new gate that nothing checks repeats that
failure.

## Options considered

1. **Insert the interaction gate at Gate 1b, between Gate 1 and Gate 2.**
   Rejected. Gate 1 is a no-tech-talk document, and its own rules forbid
   database details, schemas, and endpoints. The interaction specification
   names state classes, timing tokens, hit targets, scroll owners, and a
   JSONC schema. Authoring it at Gate 1b breaks that rule, or forces a state
   table into language too loose to hold states. Gate 1's `## Screens` line
   does state `no UI`, so the conditional is available there, but that
   document is the wrong home for this content.

2. **Insert the gate at Gate 4d, after the epic designs and before the
   rubrics.** Rejected. That point lands after `04-slices.md`, so the slice
   plan cannot group slices by state. The three contracts in the
   specification's layering, hit-target, and scroll-ownership sections are
   properties of the feature, and they belong to no single epic. It is also
   the latest and most expensive moment to capture the person's intent.

3. **Vendor the skill into `shared/skills/` under ADR-0017.** Rejected. The
   skill has one consumer, the implement plugin. `shared/` is a
   marketplace-wide commitment with a compatibility posture of its own. A
   skill under `plugins/implement/skills/` is auto-discovered, needs no
   manifest entry, and carries no boundary classification debt.

4. **Add a wrapper skill in the implement plugin that calls
   `design-to-code`.** Rejected. The wrapper's only caller is the build
   skill, so it adds an indirection with no reuse. The build skill already
   expresses a deeper procedure through `references/`, of which it holds
   five.

5. **Keep all five steps of `design-to-code`.** Rejected. Step 1 rebuilds a
   product brief that Gate 1's `01-product.md` already holds, which is the
   duplication ADR-0013 split the first gate to prevent. Step 4 writes
   component code, which collides with the slice loop's red-then-green
   contract and bypasses the blind rubric.

6. **Require the interaction design for every feature.** Rejected. A change
   with no front end has no interaction to design. A step that always reads
   `n/a` teaches sessions to treat gates as formalities.

7. **Have the skill generate the design from the architecture.** Rejected.
   The specification must record what the person chose. A design the harness
   invented would be approved twice removed from that person's intent.

8. **Insert the gate and add no mechanical consumer.** Rejected by
   CLAUDE.md's own lesson. Gate 4b is the worked example.

## Decision

### Vendor a trimmed `design-to-code` into the implement plugin

The fork lives at `plugins/implement/skills/design-to-code/`, and it carries
three steps.

| Step | Input | Output |
| --- | --- | --- |
| 1. Interaction design specification | the design the person supplied | `docs/plans/<slug>/interaction-design.md` |
| 2. Component research | Step 1's specification | a research note |
| 3. UI specification | Steps 1 and 2 | `docs/plans/<slug>/ui-spec.jsonc` |

Step 1 and Step 4 of the upstream workflow do not travel. The three
artifacts that serve a product brief do not travel either, because Gate 1
already holds one. `references/implementation-rules.md` stays, reframed as
front-end checks for the slice loop's green and validate steps. Step 4's
useful content is kept, without a second code path.

### Add a conditional Gate 2b

Gate 2b sits between Gate 2 (Architecture) and Gate 3 (Program Design). It
is its own line in `00-status.md`. The name 2b marks it as the step that
follows Gate 2, and it shares Gate 2's subject, the design that precedes the
code. Gate 2 does not wait on 2b.

Four actions:

1. Read `01-product.md`'s `## Screens` line and `02-architecture.md`'s
   `## Fit` section.
2. When the feature has no front end, write
   `2b: n/a (no UI) — Screens: "no UI"` in `00-status.md` and continue.
   This mirrors the existing `4b` convention.
3. When the feature has a front end, ask the person to supply the design. An
   image, a set of screenshots, or a link to a rendered page all serve. The
   step never invents a design.
4. Invoke `Skill("implement:design-to-code")`, run its three steps, and
   request approval. Gate 3 does not begin until the `2b` line reads
   APPROVED or `n/a`.

### The join is a file

The design-to-implement join travels in two files under
`docs/plans/<slug>/`, in the manner ADR-0013 set for the first gate.
`interaction-design.md` holds the approved specification. `ui-spec.jsonc`
holds the machine-readable form. Build reads both. Neither side calls the
other, so a third tool can read the same contract.

### Every new step carries a mechanical consumer

- `plugins/implement/scripts/verify_gate.py` gains a `2b` group. It checks
  that the document exists, that its required sections are present, and that
  the approval or the `n/a` line is recorded.
- `references/rubric-authoring.md` names `interaction-design.md` and
  `ui-spec.jsonc` as derivation sources, so a criterion about a state cites
  an approved document.
- `references/slice-loop.md` requires red to read both files, and requires
  validate's front-end criteria to name a browser check.
- `shared/build_index.py` projects the Gate 2b document under ADR-0022, so a
  reviewer reads it in the viewer.

### Classification

`design-to-code` joins the implement plugin's `skills/` root. The directory
is auto-discovered, so `plugin.json` needs only a version bump.
`tests/test_pillar_boundaries.py` must name `design-to-code` in
`KNOWN_OTHER_SKILLS`, or `assert_no_unscanned_pillar` fails the suite.

### What this record does not decide

The internal structure of the three steps, the section list of
`interaction-design.md`, and the JSONC schema itself. Those belong to the
skill's own files, and to the plan document that implements this record.

## Consequences

- **Positive.** A build that has a front end produces an approved
  interaction contract before the slice plan exists. The slice plan can then
  group slices by state, and each rubric criterion about behaviour has a
  document to cite.

- **Positive.** The person's intent about states reaches an approval gate.
  Today it reaches the implementation directly, or it does not arrive at
  all.

- **Constraint introduced.** Gate 2b runs only where a front end exists.
  Where none does, the step records `n/a` rather than staying pending.

- **Constraint introduced.** The interaction contract travels in
  `docs/plans/<slug>/interaction-design.md` and
  `docs/plans/<slug>/ui-spec.jsonc`, and build reads it. The join is never a
  code call, following ADR-0013.

- **Constraint introduced.** `design-to-code` is a deliberate fork, not a
  mirror of the upstream five-step workflow. The two copies diverge by
  design, so a byte-identity drift check is neither available nor wanted.
  The upstream copy is updated after this plugin's changes land.

- **Constraint introduced.** `design-to-code` is a skill of the implement
  plugin and of no other plugin. No other plugin names its path, following
  ADR-0016.

- **Negative, accepted.** The gate adds one approval to every build that has
  a front end. The trade is one document approval against the cost of
  correcting an interaction defect after a slice is accepted.

- **Risk carried.** The `n/a` line is self-reported, so a session that reads
  `## Screens` loosely can skip a feature that does have a front end.
  `verify_gate.py` cannot tell whether a front end exists. The mitigation is
  to make the `n/a` line quote the `## Screens` entry it relied on. A
  reviewer can then check the claim against Gate 1.

- **Risk carried.** Nothing re-reads the specification after Gate 2b. A
  change to the interaction after approval reaches the code without reaching
  the document, and the rubric then cites a stale line.

- **Risk carried.** The specification's layering, hit-target, and
  scroll-ownership contracts span the whole feature. A single epic's rubric
  cannot show that they hold together, so the check belongs to a browser
  pass over the built feature.

## Value delivered

- **New capability.** A build with a front end produces an approved
  interaction specification and a JSONC UI specification before any slice is
  planned. Each rubric criterion about a state cites one of them.

- **Benefit.** Interface defects that only a browser can reveal move from
  the end of an accepted slice to a gate that approves a document. A
  correction there costs a document edit, not a code change against a
  re-validated slice.

- **Beneficiary.** The developer building the slices, and the validation
  stage scoring a criterion about a state. Also the business whose chosen
  states are recorded before the code exists. A reviewer reads the same
  document from the viewer, under ADR-0022.

## Maps to

Context `cobuilder-packaging`, modules
`plugins/implement/skills/design-to-code`, `plugins/implement/skills/build`,
`plugins/implement/scripts/verify_gate.py`, and `shared/build_index.py`. See
the boundary record's rule and the context canvas.

## Addendum (2026-09-14) — the gate state resolves to three meanings, and a gate may hold no document

### What this addendum records

This addendum records two repairs that follow from the decision above. The
decision itself does not change, so the record stays `approved` and the
history keeps its two entries.

### Context

Gate 2b became a real gate. It is the first gate that can read `n/a` and still
name a document. Four faults followed, and two of them are live in this
repository.

**A gate state has three meanings, and the views knew two.** A gate line reads
`APPROVED`, it reads `n/a`, or it still waits. `cls()` in
`.cobuilder-architect/self/pages/builds-view.html` mapped `n/a` to `todo`, the
class for a gate that is not started. The viewer's rail template mapped `n/a`
to `is-planned`, and it printed "In progress" beside the gate. Both readings
are wrong. An `n/a` gate is closed, and no work follows it. This fault predates
Gate 2b. The `skill-collision-fix` Gate 1 line reads `n/a` today, and the rail
describes that gate as in progress.

**A gate may hold no document, and the page named one anyway.**
`current_doc()` in `plugins/artifact/scripts/build_builds_view.py` chooses the
document the page opens on. When every gate read resolved, the function named
the last gate and its first expected document. That document need not exist.
The page then opened on an empty body, and it printed the approval prompt above
it. This fault also predates Gate 2b. `skill-collision-fix` holds only
`00-status.md`, and its page opens on `04-slices.md`.

**A document with no title drew the text `undefined`.** `GATE_DOCS["2b"]`
named `interaction-design.md`, and `TITLES` named no title for that file. The
generator emitted a title map without that key, and the rail printed
`undefined` as the button label. This fault comes from the decision above.

**The rail header counted every gate.** The header read "5 Gates Approved"
over a rail that held one approved gate. The count gathered every card, and the
label named approval.

### Decision

`is_resolved(state)` holds the three-meaning test, so one place decides that an
`n/a` gate is closed. `current_doc()` receives the document map filtered to the
files that the plan holds, so a document it returns always exists on disk. It
returns `None` when the open gate holds no document. The static page states
that case in place of an empty body. Both renderers describe an `n/a` gate as
closed, and the rail header counts approved gates out of the total.

### Consequences

- A view opens a document that exists, or it opens no document and says so.
- The text `undefined` cannot reach a rendered page from a missing title. The
  emitted title map covers every document the plan holds and falls back to the
  file name.
- The word "approved" no longer describes an `n/a` gate. The generator's
  summary reads "no gate awaiting an answer".
- Three alternatives were rejected. A new ADR-0025 was rejected as paperwork
  for a five-file repair. A stored `resolved` boolean on the gate record was
  rejected, because `00-status.md` stays the one place that states a gate's
  meaning. A single slice for both views was rejected, because two agents must
  not edit one file.

### Recorded, not fixed

The two renderers disagree about the word "current". The viewer marks the last
gate as current. The static page opens the first gate that still waits. Both
rules stay as they are.

The static page's gate-line regex needs an em dash and a colon, so it does not
read a line such as `- Gate 1-3: n/a, ...`. `shared/build_index.py` reads that
line. The two parsers therefore report a different gate count for one plan.
