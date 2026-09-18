# Epic E2 design: Gate 2b in the build flow

## Scope and Intent

Add the gate to the build skill. The skill must ask for the design at the right
moment, record the answer in one place, and hand both artifacts to the two
steps that consume them.

The gate sits between Gate 2 (Architecture) and Gate 3 (Program Design). Three
reasons fix that position:

1. Gate 1 is headed "no tech talk". Its rules forbid database details, schemas,
   and endpoints. A specification that names state classes, timing tokens,
   pointer events, and scroll ownership cannot live there.
2. Gate 2's `## Fit` section is where the layers are named in engineering
   terms. The interaction design needs that answer.
3. Gate 2b is the last point before Gate 3 names types and signatures. A change
   after that point costs a rewrite of the program design.

Gate 2b is its own tracked line. It is not a sub-step of Gate 2. Gate 2
approves the architecture, then Gate 2b runs or records `n/a`. Each line gets
one approval, and the reason for the position survives.

## Files Touched

| File | Change |
|---|---|
| `plugins/implement/skills/build/SKILL.md` | A `## Gate 2b` section after the Gate 2 section. A `2b` line in the `00-status.md` template. The resume rule names 2b. |
| `plugins/implement/skills/build/references/rubric-authoring.md` | §4 gains both artifacts as derivation sources. |
| `plugins/implement/skills/build/references/slice-loop.md` | RED reads both documents. VALIDATE's front-end criteria name a browser check. |
| `plugins/implement/commands/start.md` | The "What this writes" list. |
| `plugins/implement/.claude-plugin/plugin.json` | `version` 0.1.0 to 0.2.0. |

### The `00-status.md` template line

The line goes between the Gate 2 line and the Gate 3 line:

```markdown
- Gate 1 — Product: pending | in progress | APPROVED <date>
- Gate 2 — Architecture: pending | in progress | APPROVED <date>
- Gate 2b — Interaction design: pending | in progress | APPROVED <date> | n/a (no UI) — Screens: "<the ## Screens entry>"
- Gate 3 — Program Design: pending | in progress | APPROVED <date>
- Gate 4 — Slice plan, epic designs, and rubrics: pending | in progress | APPROVED <date>
```

The `n/a` form must quote the `## Screens` entry it relied on. `verify_gate.py`
cannot tell whether a front end exists, so the quoting requirement is the only
check on that answer. The quote makes the reason auditable, because a reviewer
compares two documents in seconds.

## Types & Signatures

The build skill has no code. The change is prose, plus one status line.

Three paths must be written out exactly:

```markdown
### Path 1 — No front end
Write:
  - Gate 2b — Interaction design: n/a (no UI) — Screens: "<the entry>"
Then continue to Gate 3.

### Path 2 — A front end
1. Ask the person to supply the design: an image, a set of screenshots, or a
   link to a rendered page. Do not invent a design.
2. Invoke implement:design-to-code and run its three steps.
3. Request approval, then record APPROVED <date> on the 2b line.
If the person declines, write n/a (declined) with the reason.

### Path 3 — An earlier approval
Read 00-status.md. When the 2b line already reads APPROVED or n/a, do not
repeat the gate unless the requirements changed.
```

The consumption rule for the rubric author, added to `rubric-authoring.md` §4:

```markdown
A criterion about behaviour cites the interaction design. A criterion about a
state, a transition, a visibility rule, or a default cites
docs/plans/<slug>/interaction-design.md. A criterion about a class name or a
token cites docs/plans/<slug>/ui-spec.jsonc.
```

The consumption rule for the slice loop, added to `slice-loop.md`:

```markdown
RED reads 03-program-design.md, the epic design, the interaction design, and
ui-spec.jsonc. A front-end slice derives its failing contract from all four.
A front-end criterion in VALIDATE names a check a browser can make with real
pointer input. A component test that calls .click() is not that check.
```

## Slice Decomposition

- **Slice 3** writes the section and the status line. It proves the gate is
  visible to a session that reads `00-status.md`.
- **Slice 4** writes the three paths, the two consumption rules, and the
  returned-session rule. It proves the artifact reaches Gate 4c and the slice
  loop, which is the only thing that makes the gate more than paperwork.

Slice 4 carries the risk. A gate with no consumer gets skipped, however well it
is documented. That lesson is already recorded in this repository's `CLAUDE.md`
for Gate 4b, which ran for zero of five multi-slice epics while nothing
downstream required it.

## Test Plan

The build skill is prose, so most of this epic is verified by reading. Three
checks are mechanical.

| Check | Method |
|---|---|
| The `2b` line is in the template, between Gate 2 and Gate 3 | `tests/test_gate_2b.py` parses the template block and asserts the order |
| `commands/start.md` lists both artifacts | Grep for `interaction-design.md` and `ui-spec.jsonc` |
| `plugin.json` reads 0.2.0 | `tests/test_plugin_manifests.py` already validates the manifest. Extend it, or assert the version. |

`tests/test_commands.py` must keep passing. It requires a matching mode heading
in a skill for each command, and this change adds no command, so it should be
untouched.

## Risks & Open Questions

- **The `n/a` answer is self-reported.** A session that does not want the gate
  can write `n/a` and move on. The quote requirement makes the lie auditable
  rather than impossible. Accepted: the alternative is a second opinion on every
  feature, which costs more than the gate saves.
- **A session may run the gate after Gate 3 has started.** The skill states the
  order. Nothing enforces it mechanically, because `verify_gate.py` reads
  documents rather than a clock. Accepted.
- **The three-step skill may still be too long for a small feature.** A feature
  with one screen and one state carries a twelve-section document. Open
  question: should the skill allow a short form? Not decided. The first few
  builds should settle it.
- **Step 2 needs two optional MCP tools.** A session without them skips the
  lookups. The skill must say so, or the step reads as blocked.
