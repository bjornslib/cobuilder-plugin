# Epic Technical Solution Design: E4 — One DDD vocabulary

Feature: slice-agents-and-vocabulary
Epic ID: E4

## Scope and Intent

Create `DDD-VOCABULARY.md` at the repository root as the one glossary. It
merges Matt Pocock's glossary format (term, short definition, `_Avoid_`
list) with this repository's DDD canvases (each term belongs to one bounded
context or district). Design mode reads and writes it. A vocabulary agent
checks each slice against it. Finally, the `CLAUDE.md` Vocabulary table
moves into it.

## Files Touched

- `DDD-VOCABULARY.md` (new)
- `plugins/architect/skills/architecture/references/templates/canvas-template.md`
- `docs/architecture/contexts/cobuilder-packaging/canvas.md`
- `plugins/implement/agents/vocabulary.md` (new)
- `plugins/implement/skills/build/references/slice-loop.md`
- `plugins/implement/skills/build/workflows/slice-loop.js`
- `plugins/architect/skills/architecture/references/design-mode.md`
- `CLAUDE.md` (slice 8 only)
- `tests/test_ddd_vocabulary.py` (new, written by RED)

## Types & Signatures

File header: a two-sentence purpose, then a "How to use" list: one name per
concept, a term belongs to one context, add a term when it is resolved, and
list rejected synonyms under `_Avoid_`. Then one `## <context>` heading per
bounded context or district, and a `## Cross-cutting` heading for terms
that span the plugin family.

Entry:

```markdown
<a id="<term-slug>"></a>
**<Term>** (`<context-id>`):
<One or two sentences: what it IS, not what it does.>
_Avoid_: <synonym>, <synonym>
```

A homonym gets one entry per context, and each entry names the other.
The anchor line gives each entry a stable link target, because a bold line
makes no heading anchor. The context id must match the enclosing `##`
heading, except under `## Cross-cutting`. A definition holds at most two
sentences. (Tightened after slice 6 attempt 1.)

Canvas link: in the "Ubiquitous language" table, each term cell becomes
`[**Term**](../../../../DDD-VOCABULARY.md#<anchor>)`.

`implement:vocabulary` agent: `tools: Read, Grep, Glob, Bash`, inherits the
model. Input: slice number, slug, and the diff command. It checks district,
directory, file, class, function, and method names, plus changed prose.
Findings: `[AVOID]` a word from an `_Avoid_` list, `[UNDEFINED]` a new
domain concept with no entry, `[CONFLICT]` a term used with a different
meaning than its entry. Output appends a `### Vocabulary` section to the
slice evidence file, with a verdict of `CLEAN` or `FINDINGS`. It does not
score and does not edit code.

`design-mode.md`: stage 1 loads `DDD-VOCABULARY.md` next to the districts.
Stage 5 adds or sharpens each term the interview resolved, and flags a
conflict with an entry to the engineer as a question.

## Slice Decomposition

- Slice 6 (tracer bullet): the file, its header, every canvas term, canvas
  links.
- Slice 7 (real content): the vocabulary agent, the loop step, and design
  mode. Depends on slice 6.
- Slice 8 (the move): the `CLAUDE.md` table into the glossary, a pointer
  left behind. Depends on slice 6. Runs last, as you asked.

## Test Plan

`tests/test_ddd_vocabulary.py`:

- Slice 6: the file exists. Every entry matches the entry regex. Every term
  in each canvas "Ubiquitous language" table has an entry, and each canvas
  term cell links to `DDD-VOCABULARY.md`.
- Slice 7: `agents/vocabulary.md` parses, has no ignored key, and names the
  three finding tags. `slice-loop.md` and `slice-loop.js` name
  `implement:vocabulary`. `design-mode.md` names `DDD-VOCABULARY.md` in
  the stage 1 and stage 5 sections. Behavioural criterion: a blind agent
  given a seeded diff with an `_Avoid_` term reports `[AVOID]`.
- Slice 8: every bold term in the old table has an entry. `CLAUDE.md` has
  no `| Term | Meaning |` table and links to `DDD-VOCABULARY.md`.

## Risks & Open Questions

- The `CLAUDE.md` table carries "Not to confuse with" text. That text maps
  to `_Avoid_` for synonyms and to the homonym note for collisions. It must
  not be lost.
- `docs/architecture/contexts/` has one context today. Other terms belong
  to districts, which are inferred. Terms with no context go under
  `## Cross-cutting`.
