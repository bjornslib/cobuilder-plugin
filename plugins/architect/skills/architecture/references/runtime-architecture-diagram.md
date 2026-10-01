# Runtime architecture diagram contract

How to author the runtime architecture diagram for a design. This contract
translates Nexus's architecture prompt (`pipeline_workflow.py`,
`_ARCH_SYSTEM`) into an authored inline SVG, the format ADR-0035 already
accepted as the working exception to the shared mermaid pipeline: SVG carries
the emphasis borders and shape semantics the runtime picture needs, which
mermaid cannot render reliably inside the viewer.

The diagram describes **runtime components** — services, processes, scripts,
libraries, data stores, external systems. It is NOT a workflow or
execution-graph diagram. The sequence level (level 2) owns messages over time;
the class level owns types. This diagram owns the structure: what runs, what
it talks to, and which protocol crosses each boundary.

## 1. Where it lives

```
docs/architecture/designs/<name>/diagrams/runtime-architecture.svg
```

One self-contained SVG file. `shared/build_index.py` compiles it to
`record["diagrams"]["runtime"]`. The viewer renders it as the lead tile
inside the design's architecture level, ahead of the level-3 class diagram.
The level-1 overview stays the leading diagram of the design as a whole.
The file stays out of the shared mermaid pipeline: `build_diagrams.py` never
sees it, and `--strict` mermaid-cli testing does not apply.

## 2. Grounding rule

Design mode is pre-code, so this diagram is grounded in the **proposal**, not
in a diff. Every component maps to one of:

- a real module, package, or store the repo already has (name it as it exists);
- an explicit, drafted creation carried by the ADR (`intent.approach`);
- an external system the ADR names.

Do not invent a component neither the repo nor the ADR shows. Label nodes with
real names. A node whose only support is a feeling does not go in.

## 3. Hard rules (from Nexus's `_ARCH_SYSTEM`, translated)

1. **Clustered boundaries.** Group related nodes into named boundaries
   showing logical areas. Use the five canonical clusters where they fit:
   `client`, `api`, `data`, `infra`, `external`. A design touching a plugin
   family may name its own boundaries, but every cluster must map to a
   boundary an ADR or district name already owns.
2. **Shape semantics.** Services, processes, and scripts are rounded
   rectangles; data stores are cylinders (rect with a curved top edge, or a
   labeled `<path>`); libraries are plain rectangles; external systems are
   dashed borders. Mark nodes the design only *proposes* with a `pending`
   badge — every prediction stays visible as a prediction.
3. **Protocol-labeled edges.** Every edge across a boundary carries the
   protocol or concern: `subprocess spawn`, `uv run`, `git read`, `fs
   read/write`, `HTTP`, `SDK call`. An unlabeled cross-boundary edge is a
   defect the same way an uncited challenge is.
4. **Size cap.** 8 to 30 nodes, one page. Not hundreds. If the system needs
   more, split the diagram at a real boundary, or the design is too big for one
   design record.
5. **Single page.** One rendering, no page breaks, no zoom-scraping detail.

## 4. SVG file rules

- One `<svg>` element with a `viewBox`; no fixed pixel width that breaks
  reflow.
- No external references: no `<script>`, no external `<style>` or `href` to a
  network resource. The file must render offline in the viewer's inline
  context.
- Every `<g id>` carries a `<title>`, so screen readers and the validator can
  name each boundary.
- Text stays short; the validator warns on long single lines, because the
  viewer's tile clips them.
- The five canonical boundary groups use the ids `bound-client`,
  `bound-api`, `bound-data`, `bound-infra`, `bound-external`; a design's own
  boundaries use `bound-<name>`.

## 5. Authoring time

Stage 5 of design mode, as part of the artifact draft, shown to the engineer
with the other artifacts. The runtime diagram is a prediction: label it as
such in your narration of it, never dress it as a check.

## 6. Validation

Authoring-time structural check:

```
uv run plugins/architect/scripts/check_design_svg.py \
  docs/architecture/designs/<name>/diagrams/runtime-architecture.svg
```

The validator follows the checks of `check_options_report.py` (ADR-0035):
the root element is `<svg>` with a `viewBox`, every `<g id>` holds a
`<title>`, no `<script>` and no external reference appears anywhere, long
text warns rather than errors. A missing file means a missing tile, and the
record simply omits the key; a failing file must be fixed before stage 6,
because the reviewer and the engineer both read it.