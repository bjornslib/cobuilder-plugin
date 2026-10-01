---
title: "Vocabulary Bootstrap — create DDD-VOCABULARY.md from evidence"
description: "How to create DDD-VOCABULARY.md in a repository that never made one: propose term candidates from the baseline districts, grill the engineer, and write the file with consent."
status: active
---

# Vocabulary Bootstrap — create DDD-VOCABULARY.md from evidence

How to create `DDD-VOCABULARY.md` in a repository that never made one. Most
modes read the glossary or state its absence. Only this bootstrap, design
stage 1, and design stage 5's update step write it.

Design stage 1 runs this procedure as its primary caller, before the
hypothesis is drafted. It is also called as an offer, not a run: the options
mode hand-off stage offers it when its stage-1 check found the file absent,
and review mode offers it when its run ends. An offer waits for a yes. A run
declares itself. Design stage 1 is the only caller that runs it inside a
stage; the offers never start without consent.

## 1. Step 1 — Propose from evidence

Work from the baseline districts in `inventory.yaml` in the bundle, and from
verified code symbols. Real directories, real classes, real methods, real
events. Code symbols are the start. When the bundle has no baseline, they
are the only source, and the offer or run says so before it asks. The baseline discipline rules a boundary without verification as a
defect; a term with the same weakness is a defect too. List term candidates
per district, and annotate each candidate with its DDD kind.

The kind annotations come from the kind-matched cards in
`corpus/principles/ddd`: `entities.yaml`, `value_objects.yaml`,
`repositories.yaml`, `domain_events.yaml`, and `aggregates.yaml`. Load the
cards under the existing corpus load cap, by the same rule the ground stage
uses: choose from the districts' symptoms. Load the card a district's
symptom maps to, not every card in the directory.

Then check that each name is sensible. Read the project's own documents
(README, `CLAUDE.md`, ADRs, design docs) for its business outcomes and
context. For each candidate, ask whether the name says what the thing does
for that business, and whether a domain expert would recognise it. A name
that fails the check stays a candidate, and carries a proposed replacement
and the evidence for it. The grill in step 2 settles which name holds.

The terms come from the code, the baseline, and the project's own documents,
never from the corpus.
The corpus supplies the questions and the entry discipline. It never
supplies the words. A term that appears in a corpus card but nowhere in the
districts is not a candidate.

## 2. Step 2 — Grill

Run the grill through `AskUserQuestion`, one round per district. For each
candidate in that district, ask the engineer to confirm it, rename it to the
domain word, or reject it. Record what comes back before the round ends.

Then ask the inverted question. The generic-name check asks whether the
code's names are too generic; invert it and ask what the team calls this
thing that the code does not name. `Manager`, `Processor`, `Handler`, `Data`,
and `Info` are the tell: a candidate carrying one of those names is usually
standing in for a domain word the team knows. Use
`corpus/scenarios/architecture_ddd/004_ubiquitous_language_naming.yaml` as
the question bank for this round.

Then scope across contexts. If a term means different things in two
districts, it is two terms, one per context, each entry carrying its context
id. `corpus/scenarios/architecture_ddd/003_bounded_context_splitting.yaml`
decides whether a district is really two contexts. A district that splits
gets its terms split with it.

A candidate that conflicts with an existing entry resolves explicitly. Ask
the engineer which meaning holds before you write anything, and record the
losing usage under `_Avoid_` on the entry that wins. This is the same rule
design stage 5's glossary update uses.

`corpus/scenarios/ddd/` holds only a README today. Cite only
`corpus/scenarios/architecture_ddd/` until real scenario files exist there.

## 3. Step 3 — Write

Write one file, `DDD-VOCABULARY.md`, in the established entry format: an
anchor line, the bold term with its context id, at most two sentences on
what the term is, and an `_Avoid_` line for any rejected synonym.

The location depends on the target. For a self repo, write it at the target
repo root. For a foreign target, write `<bundle-dir>/DDD-VOCABULARY.md`, the
describe-lite surface, beside `inventory.yaml`. Never write into a foreign
repo's root. The foreign repo is read to this mode; the bundle is not.

## 4. The consent rule

The engineer's answers gate each write. A refusal or a silence ends the
bootstrap without writing. Do not write the file, the directory entry, or
anything else from a round the engineer did not answer.

This rule carries the glossary-existence rule of ADR-0036. Every architect
and implement mode checks that `DDD-VOCABULARY.md` exists and states the
result. Only design stage 1, design stage 5's update step, and a consented
offer through this bootstrap write it. No other mode writes the glossary.