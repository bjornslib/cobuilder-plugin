# viewer/index.html — not self-contained

Depends on 3 things only present inside a real `.prodyssey/` bundle:
1. Sibling `<script src="../data/*.js">` tags (story.js, manifest.js, per-PR diffs-pr{N}.js via document.write, adrs.js) populate `window.STORY`/`ODYSSEY`/`DIFFS`/`ADRS` — no inline data anywhere.
2. Relative asset paths: hero images `../assets/pr-{N}/level-{L}.png` (built in `heroFrame()` + audio-dialog image, both in index.html), narration audio `../data/audio/pr{N}_{level}.wav` (`toggleAudio()`).
3. 2 external CDN requests: Google Fonts (JetBrains Mono) + `cdn.jsdelivr.net/npm/motion`.

Intended viewing: `python3 -m http.server` rooted at the bundle root (parent of `viewer/`, e.g. `.prodyssey/self/`) — NOT inside `viewer/` itself (sibling `../data/*` paths would 404).

Consequence: cannot be published as a Claude Artifact as-is (single-file, CSP blocks external requests). This is why `/prodyssey:publish` exists (Publish mode in SKILL.md):
- `scripts/export_artifact.py` — per-PR transform: inlines STORY/ODYSSEY/DIFFS/ADRS as literal JSON, rewrites asset/audio paths to look up `window.ODYSSEY_ASSETS`/`ODYSSEY_AUDIO` data-URI maps, drops both CDN tags. Has a compression-tier retry loop for the 16 MiB artifact cap (audio is the main size risk — uncompressed WAV inflates ~33% again as base64; drops audio as last resort).
- `scripts/export_index.py` — standalone landing page (no images/audio, no budget concerns) linking every published PR artifact for the bundle.
- `scripts/record_publish.py` — writes the Artifact tool's returned URL into `<bundle-dir>/exports/publish-manifest.json` after publish (only piece that must run post-publish, since no script can know the URL in advance). This manifest is also the staleness record (content hash + PR commit SHA) — re-running publish on an unchanged PR reports "already up to date".
- `--format artifact` is the only implemented target; `--format notion` is reserved/unimplemented.
- Motion CDN script has a graceful no-op fallback (`if (!el || !window.Motion) return {finished: Promise.resolve()}` in `anim()`); Google Fonts failure falls back to monospace/sans-serif stack.