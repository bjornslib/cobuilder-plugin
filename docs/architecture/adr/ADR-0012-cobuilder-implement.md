---
# --- doc-gardener required frontmatter ---
title: "ADR-0012 — CoBuilder Implement: a design becomes verified code"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0012
name: "CoBuilder Implement: a design becomes verified code"
state: approved
groups: [workflow, verification]
approved_by: bjoerns
problem: "Software Factory gates every design decision before code exists, then accepts a slice on the implementer's own word. CoBuilder Guardian scores work independently against a rubric the implementer never reads, but runs only on the pi SDK, DOT pipelines, beads, and Hindsight. Neither can take an approved architecture design and turn it into verified code in an arbitrary coding harness, so the designs cobuilder-architect now produces have nothing that consumes them."
decision: "Ship cobuilder-implement as a separate plugin: a three-tier build (initiative, epic, slice) behind four gates, where a validator that did not write the code executes the test suite, then judges whether the tests cover the declared outcomes, and scores every slice and epic at 0.90 or better against a rubric written before the code existed."
alternatives:
- option: "One agent writes the rubric, the tests, the code, and the self-report in a single context, and a human skims the log at the end"
  rejected_because: "It abandons independent scoring, which the outcome requires. The agent that wrote the code judges its own test run."
- option: "Delete the validator and get blindness from context amnesia: one agent writes the rubric, the harness clears context, then the same agent implements and self-scores twice, voiding on a mismatch above 0.15"
  rejected_because: "Erasure blindness cannot be verified from outside the model, and two runs of one policy give correlated error rather than independent verification."
- option: "Treat rubrics as a cross-repo append-only ledger and cluster criterion fingerprints into a shared genome that primes the validator with a prior"
  rejected_because: "It needs a periodic clustering job across repos, which breaks the no-external-service rule, and it solves a volume problem this work does not have yet."
- option: "Forbid the validator from reading the implementation and score only from a test runner's exit codes"
  rejected_because: "It scores whether tests pass and never asks whether the tests are worth passing. The validator reads the code after it executes the suite, and judges test adequacy against the specs."
- option: "Commit a hash of every test file at G3 and check it before scoring"
  rejected_because: "It changes the G3 gate contract to close a hole that a validator judging test adequacy already covers."
- option: "Score a criterion called 'no undeclared test dependencies' to catch a fixture added after G3"
  rejected_because: "Enumerating a test's transitive dependencies is not free in a dynamically imported language."
- option: "Strip the validator's retry feedback to pass or fail per criterion, so accumulated feedback cannot leak the rubric's shape"
  rejected_because: "Rich feedback is mandatory for the implementing agent to improve within its attempts. Starving it pushes slices into escalation, which costs more than the leak."
- option: "Extend Software Factory with a verification step per slice"
  rejected_because: "A rubric written after the code describes the code, so it always passes."
- option: "Port CoBuilder Guardian and replace its dispatch layer with subagents"
  rejected_because: "The guardian's ceremony was proportionate to its machinery. Remove the machinery and the ceremony stays without its justification."
- option: "Accept a slice at 0.70, the guardian's shipped threshold"
  rejected_because: "A 0.70 gate accepts three criteria in ten being half met, and half met is where the observed bugs came from."
forces:
- "the skill must run in any harness that can spawn a subagent, with no SDK, no pipeline runtime, and no external service"
- "an implementing agent that reads the rubric writes to the rubric, not to the requirement"
- "an agent that wrote code cannot score it, because it reads its own intent into the code"
- "a skill directory is not a workflow discovery path, but a plugin's workflows directory is"
- "process weight that does not scale down makes small work cost more than the work"
- "ADR-0015 makes the architecture modes self-only, so a build workflow cannot live inside cobuilder-architect"
related_decisions:
- {type: is-related-to, target: ADR-0011}
- {type: is-related-to, target: ADR-0013}
- {type: is-related-to, target: ADR-0015}
related_concerns: []
history:
- {state: decided, date: "2026-08-19", note: "Recorded from design mode. Stage 4 produced seven rejected options. Chosen on this branch; not approved until a human merges."}
- {state: approved, date: "2026-08-19", by: bjoerns, note: "Approved in the design review session, before merge."}
maps_to:
  district: skills
  unanchored: true
  modules:
  - skills
  rule: "No slice or epic is accepted on the word of the agent that built it. A validator that did not write the code executes the tests, judges their adequacy against the declared outcomes, and scores at 0.90 or better against a rubric written before the code existed."
delivers:
  capability: "An approved architecture design becomes working code in any coding harness that can spawn a subagent, with every slice and epic gated on an independent score rather than a self-report."
  benefit: "The defects a self-report hides are found at the slice boundary, while the diff is still small enough to fix cheaply. The design that cobuilder-architect captured stops at nothing."
  beneficiary: [developer, reviewer, validator-agent, the-business]
related:
- "docs/architecture/designs/cobuilder-implement/intent.json"
---

# ADR-0012 — CoBuilder Implement: a design becomes verified code

## Context

Two workflows exist, and each holds half of what a build needs.

**Software Factory** makes every important decision before implementation code
exists. Four gates run in order, and a human approves each one. It then builds
vertical slices, and each slice ends in a working state. Its weakness sits at
the end of a slice. The agent proves the slice works by running it and showing
the result, so the agent that built the slice decides what counts as proof.

**CoBuilder Guardian** answers that weakness. It writes acceptance rubrics
before implementation starts, stores them where the implementer cannot read
them, and scores the result. Its weakness is the runtime. It needs the pi SDK,
DOT pipelines, beads, and Hindsight, and none of that runs in another harness.

The valuable half of the guardian needs no runtime. Four ideas carry: write
the rubric before the code, hide it from the implementer, score with an agent
that did not build the thing, and route every gap instead of dropping it.

ADR-0011 added design mode, so designs now exist and carry intent,
alternatives, and constraints that nobody has to reconstruct later. ADR-0015
made the architecture modes self-only, so a build workflow cannot live inside
this plugin. The design therefore has nothing that consumes it.

## Options considered

Stage 4 of design mode contested the stated approach against five frames. The
full rejected set sits in the frontmatter. Three shaped the result.

1. **Collapse to one agent, one gate, one log.** Rejected. It abandons
   independent scoring, which the outcome requires.

2. **Delete the validator, and get blindness from context amnesia.** Rejected
   as a trap. It looks right because it assumes away the hard part: blindness
   by erasure cannot be verified from outside the model, and two scoring runs
   of one policy produce correlated error, not independent verification.

3. **Forbid the validator from reading the implementation (chosen, with a
   change).** The inversion frame showed that a validator which re-reads the
   code and asks whether it looks correct will score a plausible function with
   a swallowed exception at 1.0. Its proposed fix was to score only from exit
   codes. That fix scores whether tests pass and never asks whether the tests
   are worth passing. The decision takes the diagnosis and rejects the cure:
   the validator executes the suite first, then reads the code, and judges
   whether the tests are sensible and cover the outcomes the specs declared.

## Decision

Ship `cobuilder-implement` as a plugin of its own. It needs a git repository,
a test command, and the ability to spawn a subagent. It needs nothing else.

### Three tiers

A feature is an epic, one to one. An epic is a vertical slice of the product,
and **it must always be testable**. If nobody can state how to prove an epic
works, it is not an epic yet, and the Business Spec is not finished. An epic
holds the slices that build it.

### Four gates, two of them repeating

| Gate | Name | Cadence | Produces |
|---|---|---|---|
| G1 | Business Spec | once | the spec, the epics, one skeleton Technical Spec per epic |
| G2 | Technical Spec | per epic | the detailed spec, written just in time and research verified |
| G3 | Slice Plan and Rubrics | per epic | the slice list, and the blind epic and slice rubrics |
| G4 | Acceptance | per slice, then per epic | work scored at 0.90 or better |

G2 carries Software Factory's architecture gate and its program design gate for
one epic. **An epic gate is a complete Software Factory run.** The Business
Spec is a new tier above Software Factory's scope, which that workflow never
had an opinion about.

### The validator's mandate

The validator did not write the code, and it never wrote the tests. It works in
two steps, in this order.

1. **Execute.** Run the suite in a fresh process. Score from what the run
   reports, never from a claimed result.
2. **Read, then judge.** Read the implementation and the tests, and judge
   whether the tests are sensible, and whether they cover the outcomes the
   Business Spec and the Technical Spec declared for this epic and this slice.
   A test that passes without exercising the declared outcome is not a pass.

The second step is what stops a rubric from being satisfied by dead code, a
stub return, or a mocked response.

### Scoring

Criteria score `0.0`, `0.5`, or `1.0`. A wider scale lets a validator split the
difference on anything ambiguous, and a marginal slice then drifts past the
gate. Every score cites evidence: a test name, captured output, or a file and a
line. A score without evidence is an opinion and does not count.

A slice passes at 0.90 or better with no critical criterion below 1.0. Below
that it returns to the implementing agent with **full feedback**, up to three
attempts, then escalates. An epic gate is hard: below 0.90 a remediation slice
returns the epic feedback to the implementing agent until the epic closes, and
a human check-in runs after every third remediation.

**The threshold does not move in reaction to a failed attempt.** A moved
goalpost converts the score into noise.

### The void rule

A rigged pass voids the run instead of scoring it, and the void costs no
attempt, because what was measured was not the thing. The triggers are a test
edited, skipped, weakened, or narrowed; a test whose dependency was swapped or
narrowed in a sibling file; a test that would also pass against the
pre-change code; and an implementer that read the rubric.

The sibling-file trigger exists because the obvious rule misses the obvious
attack. An implementing agent does not need to edit a test to defeat it. It can
add a helper the test imports and narrow what the test exercises, and the diff
to the test file stays empty.

### The record

Each scored slice appends one line to a per-epic ledger that nothing rewrites.
The line carries the epic, the slice, the per-criterion score, and **the
validator's stated reason for each score**. A session that resumes a stalled
initiative can then see why a slice sits at 0.72 without re-invoking the
validator.

### The light path

A single-epic initiative collapses the two specs into one document and skips
the refute panel, the skeptic, and the epic rubric. Research still runs when
the spec names a new library, a new external API, or a version change, because
that risk does not scale with the epic count. **The slice loop and the 0.90
gate never switch off.**

### Out of scope

Opening a pull request or pushing a branch, which stays submit mode's job.
Changing design mode. Any code dependency between the two plugins. Agents,
hooks, and MCP servers.

## Consequences

- **Positive.** No slice is declared done by the agent that built it. The
  pattern that catches a plausible but wrong pass is structural, and it does
  not depend on the implementer's care.

- **Positive.** A validator that judges test adequacy catches the failure the
  void rule cannot express: criteria written at a level that dead code
  satisfies.

- **Positive.** The skill runs in any harness with a subagent. A scripted
  runner adds deterministic control flow, and the manual three-role mode is the
  portable fallback.

- **Constraint introduced.** No slice or epic is accepted on the word of the
  agent that built it. A validator that did not write the code executes the
  tests, judges their adequacy against the declared outcomes, and scores at
  0.90 or better against a rubric written before the code existed.

- **Constraint introduced.** The threshold is 0.90, and it does not move in
  reaction to a failed attempt. A different value is set only when a human asks
  for it, and the reason is recorded.

- **Risk carried, accepted.** Blindness is honour based. Nothing mechanically
  stops an implementer reading the rubric directory. The void rule punishes the
  read after the fact, and detection depends on the validator noticing.

- **Risk carried.** At volume, a validator pool statistically absorbs the shape
  of passing rubrics, so prompt discipline leaks. The fix proposed for this
  needs a cross-repo clustering job, which the no-external-service rule
  forbids, so the risk stays open and named.

- **Risk carried.** Just-in-time detailing can redefine a contract another epic
  depends on. A skeleton names the contracts an epic exposes or consumes, and
  those freeze at G1. The rule is a rule, not a mechanism, and it depends on
  each skeleton naming its contracts honestly.

- **Risk carried.** The validator now does two jobs, and the second is
  judgment. Judgment scored on a three-value scale may not repeat run to run.
  Consistency is an unknown to measure on real slices, not to assume.

- **Negative, accepted.** A multi-epic initiative runs one refute panel, plus a
  research panel and a skeptic per epic, before the first slice starts. The
  light path removes this for single-epic work, and nothing removes it for
  multi-epic work.

## Value delivered

- **New capability.** An approved architecture design becomes working code in
  any coding harness that can spawn a subagent, with every slice and epic gated
  on an independent score rather than a self-report.
- **Benefit.** The defects a self-report hides are found at the slice boundary,
  while the diff is still small enough to fix cheaply. The intent that
  cobuilder-architect captured now reaches the code.
- **Beneficiary.** The developer building the change, the reviewer reading it,
  the validating agent that finally has a rubric and a mandate, and the
  business that inherits fewer escaped defects.

## Maps to

District `skills` from `.cobuilder-architect/self/inventory.yaml`, and the
plugin that ships outside this repository. The join to this repository is one
file, and [ADR-0013](ADR-0013-design-mode-implement-join.md) governs it.
