---
# --- decision record (lite schema: references/decision-records-lite.md §1) ---
id: ADR-0011
title: "Design mode: capture intent before the code exists"
state: proposed          # not "approved" — no PR has merged this yet
source_pr: null          # a design has no PR key. See Context
design_name: design-mode
problem: "The plugin captures author intent at submit time, after the change exists. Nothing captures it at design time, when the engineer still holds the alternatives, the constraints, and the doubts."
decision: "Add /prodyssey:design, a seven-stage interview-led design mode that writes a named design directory under exports/, and joins that design to its future pull request through the branch name."
alternatives:
  - option: "Build design mode in archkit, next to its existing design mode"
    rejected_because: "The interview discipline, the bundle, the diagram pipeline, and the viewer all live in prodyssey. archkit's contribution is one skill call."
  - option: "Keep archkit an optional dependency and degrade when absent"
    rejected_because: "A design mode whose substance is optional degrades silently into a chat."
  - option: "Ask the engineer which options they rejected, as an interview question"
    rejected_because: "A rejected option is an outcome of the design process, not an input to it."
  - option: "Mint a synthetic PR key so a design enters the story.json timeline directly"
    rejected_because: "story.json keys on an integer pr, and four readers depend on it."
  - option: "Review designs in a Lavish surface rather than the bundle viewer"
    rejected_because: "It adds an external dependency to a plugin that deliberately has none."
forces:
  - "story.json keys on an integer pr, and a design has no PR number"
  - "interview-guide.md caps the interview at six topics"
  - "the plugin ships no agents, hooks, or MCP servers, to stay off another session's permission surface"
  - "the architecture corpus is 3.1 MB across 233 files"
  - "migrate_bundle.py guards authored timeline fields against unattended migration"
delivers:
  capability: "An engineer can design a change with the plugin before writing it, and the design carries through to the pull request that implements it."
  benefit: "Intent, alternatives, and constraints are recorded while the author still knows them, so generate mode stops reconstructing them from merged code."
  beneficiary: [developer, reviewer, the-business]
---

# ADR-0011 — Design mode: capture intent before the code exists

## Context

Submit mode reverses the plugin's usual direction. It interviews an author before
the pull request opens, instead of narrating history after the merge. `CLAUDE.md` gives the reason. The rest of the plugin spends real effort to
reconstruct intent that nobody wrote down. Capture that intent at submit time,
and the guessing stops.

That reasoning does not stop at submit time. It runs further back. At submit time
the change already exists, so its alternatives are already closed. An engineer holds every option, every
constraint, and every doubt at one moment only, before they write any code. Nothing in the plugin reaches that moment.

Three parts needed for a design mode already exist and are not connected.

1. Submit mode's `intent` block is not diff-shaped. Its fields — `problem`,
   `why_now`, `approach`, `alternatives`, `out_of_scope`, `risks`, `unknowns` —
   are all answerable before code exists.
2. The bundle already holds the districts, the ADRs, and the narrated timeline
   that a design must be judged against.
3. The archkit `architecture` skill already holds the corpus, the stack cards, and
   the divergent exploration that produce real design options.

This record comes before the work, not after it. Its `state` is `proposed`, and
`source_pr` is null. That absence is the problem this design
solves, so the record shows it rather than hides it.

## Options considered

1. **Build it in archkit.** archkit already has a design mode and owns the corpus.
   Rejected: prodyssey holds the interview discipline, the bundle, the diagram
   subagent, and the viewer. A build in archkit must port four subsystems to reach
   one.

2. **Keep archkit an optional dependency.** prodyssey soft-calls
   `Skill("archkit:architecture")` and degrades to `decision-records-lite.md` when
   it is absent. Rejected: the corpus and the divergent exploration are the design
   content. A mode that runs without them is not a design mode. It also fails
   quietly rather than loudly.

3. **Merge the architecture skill into this repo, and add design mode here
   (chosen).** One plugin, four shipped skills: `odyssey`, `architecture`,
   `mermaid`, and `ste-writing`. The dependency becomes real, the corpus can be
   edited in place as design mode evolves it, and there is no cross-repo version
   skew between a mode and the corpus it reasons with.

## Decision

Add `/prodyssey:design`. It runs seven stages against a design the engineer names
in the opening turn.

0. **Name and outcome.** The engineer states the outcome and names the design
   before the agent reads a file. A subagent then searches existing designs
   semantically, not by keyword, for one that already covers this problem.
1. **Ground.** Read the districts the outcome touches, their ADRs, the stack card,
   and the earlier timeline entries. Run `baseline` automatically if the bundle has
   none.
2. **Interview.** Five topics: problem, approach, boundaries, assumptions and
   unknowns, stop condition. This fits `interview-guide.md`'s existing six-topic
   cap without amendment.
3. **Explore.** archkit divergent exploration with the design frame set, seeded by
   the interview answers. The engineer's stated approach is one candidate, not the
   given.
4. **Challenge.** Confront the engineer with the risks exploration surfaced that
   they did not raise. Contest the approach where a survivor option beats it. An
   overrule is recorded as a rejected option with the engineer's reason.
5. **Draft.** An ADR, level 1 to 3 Mermaid diagrams, an envisioned pull request,
   and a `stage: "design"` assessment.
6. **Review.** The engineer reads the draft in a new designs view in the viewer and
   answers in the session. Material feedback returns to stage 3. Cosmetic feedback
   returns to stage 5.
7. **Branch.** Create a local branch, confirmed through an option question, and
   record it in `goal.json`.

**The branch name joins a design to its pull request.** Submit mode strips the
`design/` prefix from the current branch to find `exports/design-<name>/`, and
falls back to `goal.json.branch` when the branch was renamed. It then loads
`intent.json` as its starting hypothesis instead of interviewing cold, and measures
the built change against the designed one.

**Out of scope.** Opening a pull request, pushing a branch, or any other remote
action. Element-level annotation in the viewer. Renaming this repository. Deciding
the fate of the archkit repository.

## Consequences

- **Positive.** Intent, alternatives, and constraints are captured while the author
  still holds them. `review-mode.md` §7 defines a `drift` array that has never had
  a baseline to compare against. A seeded `intent.json` gives it one.

- **Positive.** The design directory needs no schema migration. It lives under
  `exports/`, which `verify_bundle.py` does not gate on and no ladder step touches.
  `intent` and `assessment` are already in `AUTHORED_TIMELINE_FIELDS`.

- **Constraint introduced.** A design never enters the `story.json` timeline. It
  enters only when submit mode files it under the real PR number that
  `gh pr create` returns. This extends the rule submit mode already follows for
  `exports/branch-<slug>/`. Do not work around it with a synthetic key.

- **Constraint introduced.** A design-stage finding carries
  `kind: "prediction"` and cites an ADR id, a district id, or a boundary rule.
  It never cites a `path:line`, because no line exists yet. Do not write a finding
  that carries no citation.

- **Negative, accepted.** The install grows by 3.1 MB and 233 files, and the
  plugin ships four skills instead of two. `CLAUDE.md` states that an install
  gets "exactly the two skills … and never a third", and that `ste-writing` stays
  a repo-local tool. This change rewrites both statements deliberately. The real
  constraint stays the same: no agents, no hooks, and no MCP servers, so the plugin
  never touches another session's permission surface. Restate that constraint in
  their place.

- **Negative, accepted.** From the first edit to the architecture skill in this
  repo, it diverges from the archkit repository. The merge commit records both
  source SHAs so a later decision to archive or re-sync has a known baseline.

- **Risk carried.** Removing the "what did you reject?" interview question makes
  stage 4 the only producer of `alternatives`. A skipped or toothless challenge
  stage leaves an ADR that records one choice instead of a decision. The derived
  `goal.min_work` blocks completion until stage 4 has run and recorded its
  outcomes, and an empty challenge result must be stated explicitly rather than
  left as an absence.

## Value delivered

- **New capability.** An engineer designs a change with the plugin before writing
  it, and the design carries through to the pull request that implements it.
- **Benefit.** The plugin stops reconstructing intent from merged code, because
  the intent was recorded when it was still known. Drift between a design and its
  implementation becomes measurable for the first time.
- **Beneficiary.** The developer designing the change, the reviewer reading it,
  and the business that inherits the decision record.

## Maps to

Districts `skills`, `scripts`, and `viewer` from
`.prodyssey/self/inventory.yaml`.
