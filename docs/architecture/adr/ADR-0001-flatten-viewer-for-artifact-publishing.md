---
# --- doc-gardener required frontmatter ---
title: "ADR-0001 — Flatten the bundle viewer into one self-contained file for Claude Artifact publishing"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0001
name: "Flatten the bundle viewer into one self-contained file for Claude Artifact publishing"
state: approved
groups: []
approved_by: "merge of PR #2"
problem: "The bundle viewer (viewer/index.html) depends on sibling <script src> data loading, relative asset/audio paths, and two external CDN requests — none of which survive being published as a Claude Artifact, which is a single file under a CSP that blocks every external request."
decision: "export_artifact.py inlines story/manifest/diff/ADR data as literal window globals, rewrites the two relative-asset lookups and the narration-audio src to pull from embedded data-URI maps, and drops both CDN tags — recompressing scene art from PNG to JPEG (1400px/q78, retried at tighter tiers if needed) to fit the 16 MiB cap, since audio's ~33% base64 inflation makes it the tighter constraint of the two."
alternatives:
- option: "Publish the raw .odyssey bundle directory as-is"
  rejected_because: "Artifacts are one file with no sibling files and no external requests — the viewer's <script src=\"../data/story.js\"> tags and relative asset paths simply don't resolve outside a real bundle directory."
- option: "Keep images as lossless PNG"
  rejected_because: "Source PNGs run ~5MB each at the 2K generation size — three of them alone (~15MB, ~20MB after base64) already exceed the 16 MiB cap before audio is even considered."
forces:
- "Claude Artifacts enforce a strict CSP: no external stylesheets/scripts/fetch, one self-contained file, 16 MiB rendered size cap."
- "The Motion animation library already degrades gracefully when window.Motion is undefined, so dropping its CDN tag costs only micro-animations, not correctness."
- "Diffs of HTML files can contain a literal </script> substring, which silently truncates an inlined <script> block unless escaped."
related_decisions: []
related_concerns: []
history:
- state: decided
  date: unrecorded
  source: .cobuilder-architect/self/data/adrs.json
  note: "Retro-extracted from the self-bundle."
- state: approved
  date: "2026-07-24"
  by: "merge of PR #2"
  note: "Approved by the merge that shipped the decision."
maps_to:
  district: scripts
  unanchored: true
  modules:
  - scripts
  rule: "Artifact export inlines bundle data and drops CDN tags so a PR story is one self-contained file."
delivers:
  capability: "One command turns any generated PR narrative into a shareable, self-contained web page — no server, no bundle directory, no sibling files required."
  benefit: "PR stories can be shared with anyone with the link, not only teammates with the repo checked out and a local viewer server running."
  beneficiary:
  - developer
  - operator
source_pr: 2
provenance: inferred
---

## Context

Retroactively extracted from PR #2. The plugin already had a bundled viewer
for local use (`python3 -m http.server`), but no way to share a single PR's
story outside that setup. Claude Artifacts looked like the natural target,
but the viewer was never built to be self-contained.

## Options considered

1. **Publish the raw `.odyssey` bundle directory as-is.** Rejected —
   Artifacts are one file with no sibling files and no external requests;
   the viewer's relative paths and CDN tags don't resolve in that sandbox.
2. **Keep images as lossless PNG (chosen: recompress instead).** Rejected —
   source PNGs run ~5MB each; three of them alone would blow the budget
   before audio is even considered.
3. **Inline everything, recompress images, drop CDN deps (chosen).** Verified
   by actually publishing a flattened export this session — it rendered
   correctly, full nav/audio/ADR sheet all worked.

## Decision

`export_artifact.py` inlines `window.STORY`/`ODYSSEY`/`DIFFS_BY_PR`/`ADRS`
plus `ODYSSEY_ASSETS`/`ODYSSEY_AUDIO` data-URI maps, rewrites the viewer's
three relative-path touch points to read from those maps, and drops the
Google Fonts + Motion CDN tags.

## Consequences

- **Positive:** any generated PR can be published as a shareable Artifact
  with one command.
- **Constraint introduced:** the export is scoped to one PR at a time —
  multiple PRs' images+audio together would risk the 16 MiB cap.
- **Negative / accepted:** scene art loses some fidelity (PNG → JPEG,
  downscaled) in the published copy; the local viewer still shows full
  quality.

## Value delivered

- **New capability:** turn a generated bundle into a link, not just a
  locally-served page.
- **Benefit:** removes the repo-checkout requirement from sharing a story.
- **Beneficiary:** developer, operator

## Maps to

District `scripts` from `.odyssey/inventory.yaml`.
