---
title: "Structure Judgment for VALIDATE"
status: active
type: reference
---

# Structure judgment

VALIDATE writes a `### Structure` block after it scores the slice. The block judges
the structure findings of the slice diff. The block stays outside `overall_score`.
Its judgments never change the slice score.

## 1. The block format

Write the block in this form. Keep each label as written, because the evaluation
counts the labels.

```
### Structure

Script: <n> findings, <m> not analysed.

- [confirmed|accepted|dismissed] <signal> <path or symbol>
  Evidence: <file:line or packet fact>
  Reason: <one line>

Contract drift: <none | each symbol, with the caller at risk>
Cohesion: <one line for each added file: its reason to change, and fits | does not fit>
Dependencies: <none | each new edge, with the boundary rule it meets or breaks>
```

## 2. The labels

Each structure finding gets one list item, with one label.

- `confirmed`: the finding is a real cost, and the slice gives no reason to keep it.
- `accepted`: the finding is a real cost, and the GREEN report gives a reason to keep it.
- `dismissed`: the finding is not a real cost for this slice. The `Reason:` line gives the reason.

## 3. The Script line and the three judgments

The `Script:` line gives the count of structure findings and the count of lines not
analysed in the evidence packet. When `uv run` fails, name the failure on the `Script:`
line. Then write the block from the diff alone.

The last three lines hold the judgments of ADR-0048 decision 8: contract drift,
cohesion, and each new dependency. Write `none` for a judgment that has nothing to report.

When the attempt fails, the block also goes to the feedback file, so the next GREEN attempt reads it. ADR-0048 decision 8 sets this rule.

## 4. Decision questions

Answer these four questions for the slice. Write each answer in the Structure block format of section 1.

1. **For each finding.** Decide whether the fact is true in the code. Decide whether it matters for the next reader. Label the finding `confirmed`, `accepted`, or `dismissed`. Give one line of reason and one `file:line`.

2. **Contract drift.** For each `contract-drift` finding, decide whether a caller-visible contract changed. Decide whether each file in `callers_untouched` stays safe. When `callers_total` is larger than the list, the list is partial. Then read the diff once for drift that the script cannot see. Look for a changed dictionary key, a changed file format, or a changed exit code.

3. **Cohesion.** For each added file, name the one reason that the file has to change. Decide whether that reason matches the folder that holds the file. A split made only to pass a size limit is a Modular Mirage. Say so in the Cohesion line of the block. When `evidence.consumer_locality` names the file, all its importers sit in one other folder. Decide whether the file belongs in that folder. This fact is evidence only, so it never gets a label of its own.

4. **Dependencies.** For each `boundary-edge` finding, and for each rule in `boundary_rules_for_agent`, decide whether the diff breaks the rule. Name each new dependency that the script cannot see. Examples are a `Skill("...")` call and a subprocess path.
