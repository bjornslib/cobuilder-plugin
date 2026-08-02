# PR #2 — docs: add CLAUDE.md with codebase orientation + artifact feasibility findings

Status: open, commit 70f51543af31cc77e1a5505a8225ba5a6c07b53e, date 2026-07-22. Size: 29 files, +7586/-43.

Grew from a simple orientation-doc PR into that plus a full "publish as Claude Artifact" pipeline.

Problem: (1) prodyssey had no in-repo orientation doc — only SKILL.md, which covers orchestration procedure, not repo layout/bundle-shape. (2) The bundle viewer only works served from a real `.odyssey/`/`.prodyssey/` dir with sibling data/assets folders, so sharing a generated PR story meant sharing the whole repo checkout.

Solution: `CLAUDE.md` added (layout, generation flow, bundle shape). Plus three new scripts — `export_artifact.py`, `export_index.py`, `record_publish.py` — and a new Publish mode in SKILL.md, exposed as `/prodyssey:publish`, that inlines story/ADRs/diff/scene-art/narration into one self-contained HTML file and publishes it as a Claude Artifact, plus a standalone index artifact kept current across publish runs.

Concrete proof: `export_artifact.py` took the digital-curator bundle's PR #1 (three ~5MB PNGs, three narration WAVs) and produced one 8.83 MiB HTML file (under the 16 MiB Artifact cap) by recompressing images to JPEG at 1400px/q78 (~150KB each) and embedding audio unmodified — actually published and rendered correctly.

Two architecture decisions (ADRs):
- ADR-0001: make the viewer artifact-safe — inline story/manifest/diff/ADR data as literal JSON, rewrite the 3 relative-path touch points to read from embedded data-URI maps (`window.ODYSSEY_ASSETS`/`ODYSSEY_AUDIO`), drop both CDN tags (Google Fonts + Motion), recompress images with a budget-checked retry loop. Forced by: Claude Artifacts enforce strict CSP (one self-contained file, no external requests, 16 MiB cap) vs. viewer assuming a real multi-file bundle dir.
- ADR-0002: staleness tracking for republishing — persist each PR's commit SHA + a content hash of narrative/ADRs/diff in `exports/publish-manifest.json`; only re-invoke the Artifact tool when either changed, reusing the recorded URL so republish updates in place. Forced by: `extract_story.py` already resolves a merge-commit/branch-head SHA per PR internally (previously discarded) — open-PR entries aren't immutable, so publish-time staleness must track the same signal the narrative does.

Boundary: one artifact per PR, not a combined multi-PR export (16 MiB budget comfortable for one PR's images+audio, not several). `exports/publish-manifest.json` is tracked in git like `data/`/`assets/`, not disposable output.

File groups touched: orientation docs (CLAUDE.md, README.md); publish skill wiring (commands/publish.md, SKILL.md, references/story-mode.md — open-PR narration-tense guidance); generation+export scripts (export_artifact.py, export_index.py, record_publish.py, extract_story.py commit-persistence, extract_diffs.py open-PR diff-base support); self-analysis bundle refresh (16 files under .odyssey/ — this PR's own regenerated data + published pr-2.html/index.html/publish-manifest.json); central-store proof — digital-curator-80f83abb bundle's published artifact+index+manifest committed as evidence the pipeline works outside self-analysis.