# Artifact and transport map: architect:design → cobuilder-implement

A Gate 2 input. Every artifact the lifecycle produces, grouped by the place a
person actually reads it.

## Reading surface — the organising idea

An earlier version of this map listed 41 artifacts one per row. That over-counts
what a person experiences. A reader does not open eleven files to review a pull
request. They open one viewer page, and eleven artifacts converge inside it.

A **reading surface** is one place a person looks. Seven exist.

| Surface | What it is | Artifacts that land there |
|---|---|---|
| Viewer | the bundle page, over localhost or as a published export | 11 |
| Chat | the session, including `AskUserQuestion` | 3 |
| Git diff | a reviewer opening the change | 11 |
| GitHub PR | the pull request page | 1 |
| Report file | a standalone HTML file opened in a browser | 3 |
| Artifact page | a published page with a URL | 3 |
| None | machine input, never rendered for a person | 9 |

**Direct** means the person sees the artifact itself: a PNG, a rendered
Markdown file, an HTML page. **Indirect** means a script compiles it first and
the person reads the result: `narrative.json` becomes prose in the viewer,
never JSON on a screen.

## The map, grouped by surface

### Surface: the viewer — 11 artifacts, one page

A person opens one page and reads a pull request at four levels, or a design.
Every row below is a component of that single reading experience.

| Artifact | Produced by | Format | Direct | Return path |
|---|---|---|---|---|
| `story.json` narrative, 4 levels | `pr:review` | JSON → `story.js` | indirect | none |
| `assets/pr-N/level-{1,2,3}.png` | `pr:review` | PNG | direct | none |
| `data/audio/prN_<level>.wav` | `pr:review` | WAV | direct | none |
| `diffs-prN.js` | `pr:review` | JS projection | indirect | none |
| `adrs.json` + `adrs.js` | `pr:review` | JSON → JS | indirect | none |
| `data/diagrams/prN-level{1,2,3}.mmd` | `pr:review` | Mermaid → `diagrams.js` | direct | none |
| `narrative.json` | `design` st.5 | JSON → `designs.js` | indirect | none |
| `goal.json` | `design` st.5 | JSON → `designs.js` | indirect | none |
| `intent.json` | `design` st.5 | JSON → `designs.js` | indirect | none |
| `assessment.json` | `design` st.5 | JSON → `designs.js` | indirect | none |
| `designs/<name>/diagrams/level-{1,2,3}.mmd` | `design` st.5 | Mermaid → `designs.js` | direct | none |

**Nothing on this surface can be answered.** The viewer is read-only, served
over localhost, and it carries no way to record a reaction.

### Surface: chat — 3 artifacts

| Artifact | Produced by | Format | Direct | Return path |
|---|---|---|---|---|
| interview questions | `design` st.0–2 | `AskUserQuestion` | direct | direct answer |
| round churn verdict | `design` st.6 | chat | direct | direct answer |
| slice score 0.00–1.00 | `implement` slice | number | direct | retry or escalate |

Fastest return path in the map. It dies with the session unless something
writes it to disk.

### Surface: a git diff — 11 artifacts

| Artifact | Produced by | Format | Direct | Return path |
|---|---|---|---|---|
| `ADR-NNNN-<slug>.md` | `design` st.5 | Markdown | direct | git review |
| `pr-draft.md` | `design` st.5 | Markdown | direct | git review |
| `contexts/<id>/canvas.md` | `describe` | Markdown | direct | git review |
| `contexts/<id>/boundary.yaml` | `describe` | YAML | direct | git review |
| `assessment.md` | `pr:assess` | Markdown | direct | git review |
| `00-status.md` | `implement` G1–G4 | Markdown | direct | chat approval |
| `01-product.md` | `implement` G1 | Markdown | direct | chat approval |
| `02-architecture.md` | `implement` G2 | Markdown | direct | chat approval |
| `03-program-design.md` | `implement` G3 | Markdown | direct | chat approval |
| `04-slices.md` | `implement` G4 | Markdown | direct | chat approval |
| failing tests | `implement` slice | source | direct | test run |

### Surface: the GitHub pull request — 1 artifact

| Artifact | Produced by | Format | Direct | Return path |
|---|---|---|---|---|
| `description.md` | `pr:generate` | Markdown → GitHub | direct | PR review comments |

The richest return path in the map, and exactly one artifact reaches it.

### Surface: a standalone report file — 3 artifacts

| Artifact | Produced by | Format | Direct | Return path |
|---|---|---|---|---|
| Technical report | `architect:review` | HTML | direct | **none** |
| Founder report | `architect:review` | HTML | direct | **none** |
| `mockups/*.html` | `implement` G1 | HTML | direct | chat iteration |

### Surface: a published Artifact page — 3 artifacts

| Artifact | Produced by | Format | Direct | Return path |
|---|---|---|---|---|
| `exports/pr-N.html` | `artifact:publish` | HTML, inlined | direct | Artifact comments |
| `exports/index.html` | `artifact:publish` | HTML | direct | Artifact comments |
| `.lavish/<slug>.html` | `collaborate-with-user` | HTML | direct | comments, chat |

### Surface: none — 9 artifacts, machine input only

| Artifact | Produced by | Format | Why no surface |
|---|---|---|---|
| `inventory.yaml` | `baseline` | YAML | grounding input for later stages |
| `story.json` world + districts | `baseline` | JSON | grounding input |
| divergent options + critic verdicts | `design` st.3 | none | **not written to disk at all** |
| first branch | `design` st.7 | git ref | state, not a document |
| `rubrics/manifest.yaml` | `implement` G4 | YAML | hidden from the implementer on purpose |
| `rubrics/slice-N.md` | `implement` G4 | Markdown | hidden from the implementer on purpose |
| `evidence/slice-N-attempt-M.md` | `implement` slice | Markdown | loop feedback, gitignored |
| `branch-<slug>/intent.json` | `pr:generate` | JSON | the join key, consumed by `pr:review` |
| `publish-manifest.json` | `artifact:publish` | JSON | staleness record |

## Formats, and what each one is for

- **JSON** is the agent-to-agent format. Nothing renders it directly.
- **YAML** carries authored, human-editable machine records.
- **Markdown** is the only format both a person and an agent read well, and it
  is the source of record for every decision.
- **JS projection** exists for one reason: the viewer is a static page that
  loads sibling `<script src>` tags. Every projection is a full rebuild.
- **HTML** is human-only and terminal. Nothing downstream reads it.
- **PNG and WAV** are paid and unrecoverable. This is why the migration guard
  refuses to write rather than regenerate.

## Findings

**F1 — Three HTML conventions, three destinations, three rule sets.**
`architect:review` writes paired reports to `docs/architecture/review/`.
`export_artifact.py` inlines a bundle into `exports/pr-N.html`.
`collaborate-with-user` writes `.lavish/<slug>.html`. All three build a
self-contained page for a person. None shares a template, a palette, or a
destination.

**F2 — The viewer is the largest reading surface and the only silent one.**
Eleven artifacts converge there, more than any other surface, and none of them
can be answered. A person reads a whole pull request as a story and has nowhere
to put a reaction.

**F3 — The review reports are the sharpest case.** They are the longest
human-facing output in the system, they carry severity ratings and a phased
remediation plan, and nothing captures the reader's response.

**F4 — Divergent exploration persists nothing.** Stage 3 runs isolated frames
and a critic that scores every candidate, flags traps with reasoning, and stars
non-obvious survivors. Only the survivors reach the ADR. This happened in this
session: five frames and a critic pass produced material that exists only in
the transcript.

**F5 — Two artifacts hide from a reader on purpose.** The rubrics are written
for the validator and withheld from the implementer. Every other artifact wants
more readers, not fewer.

**F6 — Indirect artifacts outnumber direct ones on the viewer surface.** Seven
of the eleven are compiled before a person sees them. The format answers to the
transport rather than to either party.

## Open questions

1. Should the three HTML conventions in F1 converge under `cobuilder-artifact`,
   or stay separate because they answer to different readers?
2. Should the viewer surface gain a return path? It is the biggest reading
   surface in the system and the only large one with no way to reply.
3. Should stage 3 write its critic output to disk? An `exploration.json` beside
   `intent.json` would preserve the traps and the scores.

## Unverified

- Artifact comments are documented as a return path. This session has not
  tested one end to end.
- Every `implement` row is read from `~/.claude/skills/cobuilder-factory/`, a
  personal skill outside this repo. It has not been ported, so those rows
  describe a prototype rather than shipped behaviour.
