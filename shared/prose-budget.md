---
title: "Prose budget — how much an author may write, and how to write it"
type: reference
status: active
last_verified: 2026-10-05
owner: bjoerns
---

# Prose budget

Every authored field in a bundle has a soft word cap. The reader wants a high-level view of the
design and its outcome. The detail already lives in the ADR, the plan, and the diff, and each
of them is one link away. A field that retells that detail hides the view.

`shared/prose_budget.py` holds the caps. A cap is soft: `build_index.py` and the check warn on a
field over it, because the fix is sometimes to keep a point the cap would cut. A field over twice
its cap is a ceiling breach, and `verify_bundle.py` fails the bundle on it. The ceiling stops a
runaway field. It never decides what you write. The writing rules below do that, and the caps do
not write content differently.

## 1. The rules

1. **Use the ste-writing skill on every field, always.** Use flavored mode for prose and strict
   mode for procedures. If the skill is not available, read
   `${CLAUDE_PLUGIN_ROOT}/shared/skills/ste-writing/SKILL.md` and obey it. STE controls the words
   and the sentence length. It does not control how much a field says. The caps below set that.
2. **Cut words, not meaning.** A cap never limits how many points a record makes. Never delete a
   decision, a constraint, a risk, a rejected alternative, an out-of-scope item, a name, or a
   number to meet a cap. Work in this order:
   1. Remove filler, repeated wording, and the history of how you found the fact.
   2. Shorten each sentence. One idea per sentence.
   3. If a field still has more meaning than its cap holds, move the extra point. A list takes
      another item, and it has no limit on the number of items, only on the words in each item. A
      text field such as `approach` or `testing` cannot split, so put the extra point in the field
      that fits it (`why_now`, `risks`, `reviewer_focus`, `unknowns`).
   4. If the full detail already lives in an ADR, a plan, or the diff, name that link in a short
      clause. A pointer states the point only when you have opened the target and it holds the
      point. If it does not, write the point.
3. **Explain how the system works, not only what changed.** The story levels use the method in
   `story-mode.md` section 3: start with how the system works, narrow to the gap, give one real
   example with real numbers, and say which side does the work and why. STE sets the sentences.
   The method sets what to explain. The caps keep each field tight.
4. **Suggested, not required: write the voice script first.** The trial gave no evidence that this
   step improves the result, so use it when it helps you. Before any field, say the change aloud in
   about thirty seconds. Write that as four to six sentences. It covers the whole change, and each level's
   `voice` script is the part of it that the level tells. Then write each field as one expansion
   of one sentence in the script. A field that says more than the script is a field to check
   against rule 2, not a field to delete.
5. **Give each design its own room.** A change that carries two designs lists both in
   `intent.design`, and the caps on its text fields apply once per design. State each design in at
   least one sentence of `problem` and of `approach`.
6. **Suggested: let the first sentence of a long field stand alone.** Where a field such as `approach`
   or `why_now` has no short twin, make its first sentence a headline that a reader can stop at.
   The rest of the field gives the detail. This keeps a long field scannable without a second text.
7. **Keep the facts a reader checks.** Keep names, numbers, and ADR ids. A level of the story does
   not list files. Only the file-diff level does.

## 2. The caps

Run this to print the current caps:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/shared/prose_budget.py" show
```

## 3. Check before you save

Run the check on each file before you show it to the engineer and before you write it to disk:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/shared/prose_budget.py" check <goal.json|intent.json|assessment.json|story.json>
```

The check prints each field over its cap, and marks each field over the ceiling. Story lines start
with `pr<N>.` and design lines have no prefix. Fix every ceiling line. Fix a cap line by the order in
rule 2, and leave it when the fix would cut a point. The check prints `ok` when no field is over a
cap. Edit a JSON file in place and keep its list and indent format, so the diff
shows only the words you changed. A record that is over the ceiling is not
finished.
