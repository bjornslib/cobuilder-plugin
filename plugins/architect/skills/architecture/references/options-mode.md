---
title: Options Mode
description: Full procedure of options mode. Seven stages that turn a repo read into one HTML report of inquiries, diagrams, and alternatives.
status: active
---

# Options Mode

This file is the source of truth for options mode. `SKILL.md` holds the
summary. Read this file in full before stage 0.

The mode comes before design mode. It asks three things:

- Is the flow designed correctly?
- Are the technology and library choices still right?
- What would other options look like for the same outcome?

The mode **proposes**. It never decides. Design mode stage 4 alone fills
`intent.alternatives`. Every direction in the report stays a draft until
design mode tests it.

## 1. Invocation

| Item | Rule |
|---|---|
| Command | `/architect:options`, which dispatches `Skill("architecture", args="options $ARGUMENTS")`. |
| Arguments | An optional scope sentence. An optional `--non-interactive`. |
| Interactive | Ask one question first: "Which system area or question should I examine?" Then go on. |
| Non-interactive | The scope is the whole repo. |
| Self-only | Refuse `--repo`, `--store`, and any output override. |
| Install surface | The mode ships no agent, no hook, and no MCP server (ADR-0025). |

## 2. The seven stages

Do each stage before the next.

| Stage | Name | What the agent does |
|---|---|---|
| 0 | Frame | Name the scope. Make a slug `<name>`. Confirm the repo is the session repo. Create `docs/architecture/options/<name>/`. |
| 1 | Ground | Load the skill files and the corpus (section 3). Check `DDD-VOCABULARY.md`. Then read the repo and its decisions (section 4). |
| 2 | Inquire | Write the inquiries (section 5). |
| 3 | Options | Write the alternatives for each inquiry (section 6). |
| 4 | Draw and write | Draw three diagrams (section 8). Fill the template (section 7). |
| 5 | Verify | Run the validator. Check the render (section 10). |
| 6 | Hand off | Tell the user where the report is and what to do next. Offer the vocabulary bootstrap when the glossary is absent (section 11). |

## 3. Stage 1, part one: load

Load in this order. Use the Read tool. Do not pipe corpus files into `wc`
or `cat`, because the content is then not read.

1. `SKILL.md`, all of it.
2. `references/corpus-index.md`, Section 1.
3. `references/stacks/README.md`. Detect the stack for each sub-tree. A
   repo with two languages gets two cards.
4. Each matched stack card. Then each file in the `Corpus Load` list of
   that card.
5. Up to three more files from `corpus/principles/architecture`, `ddd`,
   and `design_patterns`. Choose them from the symptoms of the scope.
6. The `resilience` cards, when the system calls external services.
7. The pre-flight gate in `references/divergent-exploration.md` section 1.
   State the result in one line. This mode does not run the exploration.
8. Check whether `DDD-VOCABULARY.md` exists at the repo root (or in
   `<bundle-dir>/` for a foreign target). Record in the Evidence section
   whether the glossary exists.

Record what you loaded. It goes into the Evidence section of the report.
If a card does not match the stack well, say so. Example: a plain Starlette
service matched the `python-fastapi` card only because `pyproject.toml`
listed fastapi.

## 4. Stage 1, part two: read the repo

| Step | Action | Evidence to keep |
|---|---|---|
| a | Read the instruction files: CLAUDE.md, README, `DDD-VOCABULARY.md`. Treat them as claims. | Any claim the code contradicts. |
| b | Count tracked files by language with `git ls-files`. Exclude skill folders, docs, and lock files. List the manifests. | A table of trees and languages. |
| c | List the ADRs. Read the `state`, `approved_by`, `problem`, and `decision` fields of all. Read the full text of each ADR that maps to the scope. | The rejected alternatives. The `forces` list. |
| d | Read earlier reviews and plans under `docs/architecture/review/` and `docs/plans/`. | Their finding IDs. |
| e | List the components: processes, runtimes, stores, external services. Use manifests, deploy files, and entry points. | The component map. |
| f | Trace each main flow from the entry point to the store. Cite `file:line`. For a large class, list its methods. | The data flow. |
| g | Check every fact about an outside platform or library against its docs or its installed type definitions. Do not trust an ADR for such a fact. | A source link or `path:line`. |
| h | Count artifacts: trained or compiled files, test folders, CI folders, generated code. | Numbers, not impressions. |

Rules for this stage:

- Run read commands at the repo toplevel.
- Do not `cd` into a skill or corpus folder. The shell keeps the new
  folder for later commands. Use absolute paths.
- Tag every claim with one confidence level (section 5).
- Do the reading yourself. You may use read-only exploration subagents for
  breadth. Do not spawn the divergent exploration. That run costs seven
  agent calls and needs the approval of the user.

## 5. Stage 2: inquire

Write 3 to 8 inquiries. An **inquiry** is one item the report raises. Do
not call it a "finding" or a "question". Both words have other meanings in
`DDD-VOCABULARY.md`. Number flow inquiries `F1`, `F2`. Number technology
inquiries `T1`, `T2`. Number gaps `G1`, `G2`. The IDs are stable. The
reader pastes them into `/architect:design`.

Use these lenses:

| Lens | Ask |
|---|---|
| Trigger | What starts the work? Is that the right trigger? |
| Owner of truth | How many stores hold the same fact? What happens when they disagree? |
| Presence | What must be present for the flow to work? What if nobody is connected? |
| Transport | Does each connection earn its cost? |
| Technology | Do the forces that justified each major choice still hold? Compare the ADR `forces` to today's evidence. |
| ADR promises | For each decided ADR, list the mitigations it promised. Check that each exists. |
| Gaps | What do the earlier reviews and plans not cover? |
| Plan interaction | Does an inquiry change the order or content of an existing plan slice? If yes, say so in the summary. |

Rules:

- Raise a settled decision only with new evidence. Cite the ADR and its
  rejected alternatives.
- Each inquiry needs at least one cited evidence item.
- Do not repeat what an earlier review already reports. Link its ID.
- When the stage-1 check found the glossary absent, add one inquiry note
  that the repo runs without a glossary. Name the fix: the vocabulary
  bootstrap in design stage 1 (`references/vocabulary-bootstrap.md`). Put
  the note in the Evidence section, or in a glossary/ubiquitous-language
  gap inquiry if the report's structure gives it a natural place.
- Rank each inquiry by impact: `High`, `Medium`, `Low`.

Give every claim one confidence tag:

| Tag | Meaning |
|---|---|
| Verified | You read the code, ran the command, or read the docs. |
| ADR only | You read the ADR text. You did not trace the code. |
| Hypothesis | A judgment. You did not check it. |

## 6. Stage 3: options

For each inquiry write four parts:

1. **Current.** 3 to 5 numbered steps. State the effect or the pain.
2. **Proposed direction (draft).** 3 to 5 numbered steps. State the effect.
3. **Options table.** 3 or 4 rows, lettered A to D. Choose columns to fit
   the question. Always include a cost column. Colour each cell good, mid,
   or bad. Add the caption "The ratings are my estimate."
4. **Recommendation.** One callout. Give a recommendation only if evidence
   supports it. Otherwise write what the user must decide, and who decides.

Rules:

- Include "keep today and patch" as an option when it is real.
- Show the cost of each option as clearly as its benefit.
- Prefer a cheap check before a redesign. Name the check.
- When only the user can decide, turn the inquiry into a form (section 9).
- Label every proposal "draft" until design mode has tested it.
- Never write to `intent.alternatives`. Design mode stage 4 owns it.

## 7. Stage 4: the report

Copy `references/reports/options-report-TEMPLATE.html` to
`docs/architecture/options/<name>/options-report-YYYY-MM-DD.html`. Fill it.
This file is the only output. Write no `options.json` and no other
machine-readable file. The validator is the one consumer of the report.
The one declared exception is the consented glossary write at stage 6
(ADR-0036).

| # | Section | Anchor | Must contain |
|---|---|---|---|
| H | Header | none | Eyebrow with mode and date. H1 written as a question. One-sentence lead. A `.prompt-box` with the prompt and the command. Nav chips to all sections. |
| 1 | Summary | `#summary` | Four stat cards: flow inquiries, technology inquiries, gaps, files changed (always 0). A callout "Answer in three lines". An optional callout "One change to the plan". |
| 2 | Current component map | `#current` | SVG `fig-current`. Legend. A caption that lists the sources. |
| 3 | Data flow of one key flow | `#flow` | SVG `fig-flow`, a sequence diagram. Three cards below it. A caption with the verified lines. |
| 4 | Inquiries at a glance | `#inquiries` | A table: ID, Inquiry, Evidence, Impact, Confidence. One row per inquiry, `id="row-<ID>"`. |
| 5 | Directions and alternatives | `#directions` | One block per inquiry, `id="dir-<ID>"`, with the parts in section 6. Small inquiries may sit two to a row. |
| 6 | Proposed component map (draft) | `#proposed` | SVG `fig-proposed`. Legend. A table: Change, Depends on, Record needed, State. |
| 7 | Gaps beyond the existing review | `#gaps` | A table: ID, Gap, In the plan?, Suggested action. |
| 8 | Recommended order | `#order` | Three cards: Now, Next, Later. |
| 9 | Your decisions | `#decide` | The forms (section 9). The text they produce is the hand-off to design mode. |
| 10 | Evidence and limits | `#evidence` | Four `<details>`: what you verified, what you read but did not trace, what you did not read, and the skills, corpus, and design source. |

Use the `.stat`, `.callout`, `.dir-head`, `.table-wrap`, `.tag`, `.chip`,
and `form.q` classes of the template. Keep `assets/design-system.css`
unchanged. A confidence cell holds exactly one tag and nothing else. Put a
note in the Evidence text, not in the cell.

Run each prose pass through `Skill("architect:ste-writing")` in flavored
mode. If that call gives `Unknown skill`, read
`${CLAUDE_PLUGIN_ROOT}/shared/skills/ste-writing/SKILL.md` and obey that
file instead.

## 8. The three figures

Hand-author inline SVG. Do not use Mermaid for these. Write no `.mmd`
copy.

| Figure | Id | Question it answers |
|---|---|---|
| Current component map | `fig-current` | Which process owns which job today? |
| Data flow of one key flow | `fig-flow` | What must be present for the flow to complete? |
| Proposed component map (draft) | `fig-proposed` | What changes if we adopt the directions? |

Rules:

- Use a `viewBox` and `width: 100%`. Use no fixed pixel size.
- Use the CSS variables of the design system for colour.
- Give every node and region a stable `id` and a `<title>`.
- Keep labels short. A chip about 170 px wide holds about 24 characters at
  10.5 px.
- Use zones (dashed rounded boxes) to group by runtime or owner.
- Use solid edges for calls. Use dashed edges for streams or for plans not
  built.
- Use a clay border for the part that carries the most weight. Use clay
  badges for inquiry IDs.
- In the proposed map, mark parts `NEW` (green) or `CHG` (clay). Mark
  waiting changes `PROBE` or `DECIDE`.
- In the sequence diagram, use at most seven lanes. Number each step. Put
  one band behind the steps that share the critical dependency. Label the
  band.
- Do not build boxes and arrows from HTML elements.
- Do not link external images, fonts, or scripts.
- Add `white-space: nowrap` to tags and ID cells. A long label breaks a
  layout.

## 9. Decision forms

The forms let the reader answer without writing a prompt. Build them from
native controls. Use no editor, no outside service, and no network.

| Form | Kind | Rule |
|---|---|---|
| Explore | Checkboxes, one per inquiry ID | Each box carries the ID, a label, and a disposition (`run` or `check-only`). Pre-check the inquiries you recommend. |
| Product choices | Radios | One form per choice that only the user can make. Include "Not decided". |
| Notes | Textarea | "Anything I got wrong or missed?" |

Behaviour:

1. Keep every answer local until the reader presses a copy button.
2. Each form has its own copy button. It copies the answer text to the
   clipboard and shows a status line.
3. Add one "Copy all answers" button. It gathers every form into one text
   block. The reader pastes that block into `/architect:design`.
4. The page must run with no script error and no network request.

## 10. Stage 5: verify

1. Run the validator:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/check_options_report.py" <report>
   ```
   Fix every failure. A warning prints but does not change the exit code.
2. If a browser tool exists, open the report. Check it at 1280 px and at
   390 px wide:
   - no horizontal scroll on the page,
   - no clipped text in a node, chip, or tag,
   - no label that overlaps an edge or a zone border.
3. If no browser tool exists, write that in the Evidence section.

**What the validator checks.** It checks form only. It checks that the ten
anchors exist, that the three figures are SVG with a `viewBox`, that each
`<g id>` holds a `<title>`, that each `row-<ID>` has a `dir-<ID>`, that each
confidence value is one of the three tags, that the page has no outside
`src`, `href`, script, or stylesheet, and that the page has a `<title>`, a
`.prompt-box`, and a "Copy all answers" button. It warns about long SVG
text.

**What it does not check.** It does not check that a claim is true. It does
not check that a tag matches the evidence, that a cited `file:line` exists,
or that a diagram is clear. A passing report can still be wrong. The
Evidence section and the render check carry that load.

## 11. Stage 6: hand off

Print three things:

1. The path of the report.
2. The inquiry IDs the user can pick (`F1`, `T1`, `G1`, and so on).
3. The suggested next command: `/architect:design`, with the chosen
   inquiry as the outcome.
4. When stage 1 recorded the glossary as absent, tell the user so and
   ask whether to run the vocabulary bootstrap now, per
   `references/vocabulary-bootstrap.md`. Only an explicit yes triggers
   the write, and the write follows that reference's procedure. This
   consented write is the one declared exception to the rule that the
   mode writes nothing but the report (ADR-0036).

Tell the user to paste the "Copy all answers" text into that command. Do
not start the command. Options mode proposes. Design stage 4 decides.

## 12. Lessons from earlier runs

| Lesson | Detail |
|---|---|
| Verify claims | A project CLAUDE.md said the ADRs ran up to 0007. The repo had 35. Check instruction files against the tree. |
| Check outside facts | An ADR said only one mechanism could do a job. The platform docs showed a second. Check the docs. |
| Audit ADR promises | One ADR required a build check. The repo had no CI. That was a real gap. |
| Compare forces to now | An ADR chose a runtime to train a model. The repo held two trained files, and the live path moved away from them. |
| Large labels break layouts | A chip with 28 characters overflowed. A tag in a narrow column wrapped. An ID column wrapped to two lines. |
| Do not `cd` into skill folders | The shell keeps the folder. Use absolute paths. |
| zsh and `echo` | A string that starts with `=` fails in zsh. Use another separator. |
| Read, do not pipe | Piping files into `wc` counts them. It does not load them. |
| State the limits | List what you did not read and did not measure. The reader then trusts the rest more. |
