# Runtime architecture contract

How to author the runtime architecture diagram for a design. This contract
translates Nexus's architecture prompt (`packages/nexus-api/src/nexus/api/routes/pipeline_workflow.py`,
`_ARCH_SYSTEM`) into the mermaid rules this family already uses.

The diagram describes **runtime components** — services, processes, libraries,
data stores, external systems. It is NOT a workflow or execution-graph diagram.
The sequence level (level 2) owns messages over time; the class level owns
types. This diagram owns the structure: what runs, what it talks to, and which
protocol crosses each boundary.

## 1. Where it lives

```
docs/architecture/designs/<name>/diagrams/runtime-architecture.mmd
```

One file, raw mermaid only. The first line is `C4Container`, optionally after
`%%` comment lines. `shared/build_index.py` compiles it to
`record["diagrams"]["runtime"]`. The viewer renders it as the lead tile inside
the design's architecture level, ahead of the level-3 class diagram. The
level-1 overview stays the leading diagram of the design as a whole.

## 2. Grounding rule

Design mode is pre-code, so this diagram is grounded in the **proposal**, not
in a diff. Every component maps to one of:

- a real module, package, or store the repo already has (name it as it exists);
- an explicit, drafted creation carried by the ADR (`intent.approach`);
- an external system the ADR names.

Do not invent a component neither the repo nor the ADR shows. Label nodes with
real names. A node whose only support is a feeling does not go in.

## 3. Hard rules (from Nexus's `_ARCH_SYSTEM`, translated)

1. **Clustered boundaries.** Group related nodes into named boundaries showing
   logical areas. Use the five canonical clusters where they fit: `client`,
   `api`, `data`, `infra`, `external` (mermaid `System_Boundary` or
   `Container_Boundary`, or flowchart subgraphs where C4 grouping renders
   poorly). A design touching a plugin family may name its own boundaries, but
   every cluster must map to a boundary an ADR or district name already owns.
2. **Shape semantics.** Services and processes are rounded boxes; data stores
   are cylinders (`containerDb` in C4, `[( )]` in flowchart); libraries are
   component markers; external systems are dashed.
3. **Protocol-labeled edges.** Every edge across a boundary carries the
   protocol or concern: HTTP, gRPC, SQL, pub/sub, filesystem write, subprocess,
   SDK call. An unlabeled cross-boundary edge is a defect the same way an
   uncited challenge is.
4. **Size cap.** 8 to 30 nodes, one page. Not hundreds. If the system needs
   more, split the diagram at a real boundary, or the design is too big for one
   design record.
5. **Single page.** One rendering, no page breaks, no zoom-scraping detail.

## 4. Authoring time

Stage 5 of design mode, as part of the five-artifact draft, shown to the
engineer with the other artifacts. The runtime diagram is a prediction: label
it as such in your narration of it, never dress it as a check.

## 5. Validation

`shared/build_index.py` treats the file as non-empty or absent — no numeric
level key, no readiness effect. A design that omits the file omits the tile.
`--strict` mermaid-cli parsing applies the same as the three level files.