# WebP Scene Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch generated PR scene art from PNG to WebP (quality 90) across the
whole pipeline, migrate the bundles that already carry PNGs, and strip the old
PNG blobs out of git history to shrink clone size.

**Architecture:** `generate_prompts.py` is the only writer of scene art — change
its Pillow save call and output filename there. Four readers (`_manifest.py`,
`verify_bundle.py`, `export_artifact.py`, `viewer/index.html`) match art files
by the literal `level-N.png` pattern and must move to `level-N.webp` in lock
step. A new one-off migration script converts the PNGs already committed in
the two existing bundles, in place, so the working tree matches the new
convention before the history rewrite. `git filter-repo` then removes every
historical PNG blob under `assets/pr-*/level-*.png` from every ref, which
requires a force-push and a heads-up to anyone with a local clone.

**Tech Stack:** Python 3.10+ (Pillow via PEP 723 inline deps), pytest, plain
JS in `viewer/index.html`, `git-filter-repo` (already on PATH at
`/Library/Frameworks/Python.framework/Versions/3.10/bin/git-filter-repo`).

**Spec:** No separate spec file — this plan is scoped directly from the
investigation in this conversation. Key facts carried over:
- Scene art is only ever produced by `call_gemini()` /
  `run_generate()` in `plugins/cobuilder-pr/scripts/generate_prompts.py`.
- Four other files match art filenames by regex/glob on `.png` and must
  change together: `shared/_manifest.py`, `shared/verify_bundle.py`,
  `plugins/cobuilder-artifact/scripts/export_artifact.py`,
  `plugins/cobuilder-artifact/viewer/index.html`.
- `export_artifact.py`'s `compress_png_to_jpeg()` already re-encodes whatever
  Pillow can open (RGBA/LA/P handling is format-agnostic), so it does **not**
  need a rename or logic change — only its glob/regex needs to accept
  `.webp`.
- Exactly two bundles carry committed PNGs today: `.cobuilder-architect/self/assets/pr-2/`
  (3 files) and `.cobuilder-architect/digital-curator-80f83abb/assets/pr-1/`
  (3 files, a committed test fixture — do not delete it, only re-encode it).
- History bloat measured directly: `git rev-list --objects --all | git
  cat-file --batch-check` over `\.png$` blobs sums to 32.9 MB across all refs,
  all introduced by 3 historical commits (`cc8c44d`, `66782c7`, `6f9dc4d`)
  that touch only those two directories.
- Repo has a GitHub remote (`origin` →
  `https://github.com/bjornslib/prodyssey.git`) and 4 local branches plus one
  known remote-only branch (`origin/claude/pr-odyssey-vscode-plugin-e5cw6n`).
  A `filter-repo` run rewrites commit hashes on every ref it touches, and
  pushing the rewritten history force-overwrites `origin`. Anyone else who has
  cloned this repo must re-clone (or hard-reset onto the new history) after
  the push — a filter-repo run is per-repository, not something a normal
  `git pull` recovers from.

## Global Constraints

- WebP quality is fixed at **90** everywhere this plan writes a WebP file —
  do not introduce a second quality constant.
- Every reader that currently matches `level-(\d+)\.png$` must be changed to
  match `level-(\d+)\.webp$` in the same task as its neighboring writer
  change — never leave a reader expecting `.png` after the writer stops
  producing it, and never leave a writer producing `.webp` before every
  reader can find it.
- The history rewrite (Task 6) is the only destructive, hard-to-reverse step
  in this plan. It must not run until Tasks 1-5 are merged and Task 6a's
  local rewrite has been verified against a full local backup. The
  force-push at the end of Task 6 requires the user's explicit go-ahead —
  do not push it unattended.
- `.cobuilder-architect/digital-curator-80f83abb/` and
  `.cobuilder-architect/self/` are both committed, intentional content (see
  CLAUDE.md's Bundle output shape section). Task 5 re-encodes their PNGs to
  WebP; it never deletes the directories or the fixture.

---

## File Structure

| File | Responsibility |
|---|---|
| `plugins/cobuilder-pr/scripts/generate_prompts.py` | Writer: change `call_gemini()`'s Pillow save call from PNG to WebP q90; change `build_prompts()`'s `output_path` template from `.png` to `.webp` |
| `shared/_manifest.py` | Reader: `level_num_from_filename()` regex and the `pr_dir.glob("level-*.png")` call that feeds `manifest.js`'s `hero` array |
| `shared/verify_bundle.py` | Reader: `check_pr()`'s per-level `png_path` construction that verifies each PR's 3 hero assets exist and aren't truncated |
| `plugins/cobuilder-artifact/scripts/export_artifact.py` | Reader: `level_num_from_filename()` regex and `discover_hero_pngs()` glob that feed the artifact-publish base64 inlining |
| `plugins/cobuilder-artifact/viewer/index.html` | Reader: 3 template-literal occurrences of `level-${levelIdx}.png` (`heroFrameInner`, `heroFrame`, `onArtModeToggle`, the audio dialog) that build the `<img src>` / `HERO_ASSETS` lookup key |
| `shared/migrate_png_assets_to_webp.py` (new) | One-off migration: walks a bundle's `assets/pr-*/level-*.png`, re-encodes each to `level-*.webp` at q90, deletes the source PNG, and calls `rewrite_manifest()` so `manifest.js` picks up the new filenames |
| `tests/test_shared_manifest.py` | Extend: assert `_manifest.py`'s hero-asset glob matches `.webp`, not `.png` |
| `tests/test_generate_prompts_webp.py` (new) | Assert `generate_prompts.py` writes `.webp` output paths and no longer references PNG in its Pillow save call |
| `tests/test_migrate_png_assets_to_webp.py` (new) | Assert the migration script converts a fixture PNG to WebP, removes the PNG, and rewrites the manifest |

---

## Task 1: Switch the writer — `generate_prompts.py` produces WebP

**Files:**
- Modify: `plugins/cobuilder-pr/scripts/generate_prompts.py:190-250` (`build_level4`/`build_prompts` output path, `call_gemini`)
- Test: `tests/test_generate_prompts_webp.py`

**Interfaces:**
- Produces: `build_prompts()` entries now carry `"output_path": f"assets/pr-{pr}/level-{i}.webp"` instead of `.png`. `call_gemini()` returns PNG-free WebP bytes (same `(bytes, str | None)` return signature, unchanged callers).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_generate_prompts_webp.py
"""generate_prompts.py must produce WebP scene art, not PNG.

Run with: uv run --with pytest pytest tests/test_generate_prompts_webp.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "plugins" / "cobuilder-pr" / "scripts"
SHARED_DIR = REPO_ROOT / "shared"


def _load_generate_prompts():
    for p in (SCRIPTS_DIR, SHARED_DIR):
        if str(p) not in sys.path:
            sys.path.insert(0, str(p))
    import generate_prompts
    return generate_prompts


def test_build_prompts_output_path_is_webp():
    gp = _load_generate_prompts()
    story = {
        "meta": {"levels": ["PR Landscape", "Problem & Solution", "Architecture", "File Changes"]},
        "world": {"districts": []},
        "timeline": [{"pr": 42, "levels": {}, "touched": {}, "size": {"files": 1}}],
    }
    prompts = gp.build_prompts(story, prs_filter=None, levels_filter=[1, 2, 3])
    output_paths = [p["output_path"] for p in prompts]
    assert output_paths == [
        "assets/pr-42/level-1.webp",
        "assets/pr-42/level-2.webp",
        "assets/pr-42/level-3.webp",
    ]
    assert not any(p.endswith(".png") for p in output_paths)


def test_call_gemini_saves_webp_quality_90(monkeypatch):
    gp = _load_generate_prompts()

    class FakePart:
        def __init__(self, text=None, inline_data=None):
            self.text = text
            self.inline_data = inline_data

    class FakeInlineData:
        def __init__(self, data):
            self.data = data

    class FakeResponse:
        def __init__(self, parts):
            self.parts = parts

    from PIL import Image
    from io import BytesIO

    src = Image.new("RGB", (4, 4), (10, 20, 30))
    buf = BytesIO()
    src.save(buf, "PNG")

    class FakeModels:
        def generate_content(self, model, contents, config):
            return FakeResponse([
                FakePart(inline_data=FakeInlineData(buf.getvalue())),
                FakePart(text="a description"),
            ])

    class FakeClient:
        models = FakeModels()

    saved_kwargs = {}
    real_save = Image.Image.save

    def spy_save(self, fp, format=None, **kwargs):
        if format == "WEBP":
            saved_kwargs["format"] = format
            saved_kwargs["quality"] = kwargs.get("quality")
        return real_save(self, fp, format=format, **kwargs)

    monkeypatch.setattr(Image.Image, "save", spy_save)

    image_bytes, text = gp.call_gemini("a prompt", "fake-model", FakeClient())

    assert saved_kwargs.get("format") == "WEBP"
    assert saved_kwargs.get("quality") == 90
    assert text == "a description"

    out = Image.open(BytesIO(image_bytes))
    assert out.format == "WEBP"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --with pytest --with pillow --with google-genai --with python-dotenv pytest tests/test_generate_prompts_webp.py -v`
Expected: FAIL — `output_paths` still end in `.png`, and `saved_kwargs` stays empty (the real save call passes `format="PNG"`).

- [ ] **Step 3: Change the output path template**

In `plugins/cobuilder-pr/scripts/generate_prompts.py`, in `build_prompts()`:

```python
            prompts.append(
                {
                    "pr": pr["pr"],
                    "level": i,
                    "level_name": level_name,
                    "output_path": f"assets/pr-{pr['pr']}/level-{i}.webp",
                    "prompt": prompt,
                    "aspect_ratio": "16:9",
                }
            )
```

(only the `output_path` line's extension changes, from `.png` to `.webp`)

- [ ] **Step 4: Change the Pillow save call in `call_gemini()`**

Replace the image-normalize/save block inside `call_gemini()`:

```python
            image = PILImage.open(BytesIO(image_data))
            buf = BytesIO()
            if image.mode == "RGBA":
                rgb_image = PILImage.new("RGB", image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[3])
                rgb_image.save(buf, "WEBP", quality=90)
            elif image.mode == "RGB":
                image.save(buf, "WEBP", quality=90)
            else:
                image.convert("RGB").save(buf, "WEBP", quality=90)
            image_bytes = buf.getvalue()
```

- [ ] **Step 5: Run test to verify it passes**

Run: `uv run --with pytest --with pillow --with google-genai --with python-dotenv pytest tests/test_generate_prompts_webp.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add plugins/cobuilder-pr/scripts/generate_prompts.py tests/test_generate_prompts_webp.py
git commit -m "feat: generate scene art as WebP q90 instead of PNG"
```

---

## Task 2: `shared/_manifest.py` reads `.webp` hero assets

**Files:**
- Modify: `shared/_manifest.py:47,59`
- Test: `tests/test_shared_manifest.py`

**Interfaces:**
- Consumes: nothing new.
- Produces: `rewrite_manifest()`'s `hero` list now contains `"pr-N/level-L.webp"` entries when `assets/pr-N/level-L.webp` files exist on disk. It no longer discovers `.png` files.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_shared_manifest.py`:

```python
def test_rewrite_manifest_discovers_webp_hero_assets(tmp_path: Path):
    """rewrite_manifest must list .webp hero assets, not .png."""
    import sys

    if str(SHARED_DIR) not in sys.path:
        sys.path.insert(0, str(SHARED_DIR))

    import _manifest
    import json as _json

    bundle_dir = tmp_path / "bundle"
    data_dir = bundle_dir / "data"
    data_dir.mkdir(parents=True)
    manifest_path = data_dir / "manifest.js"

    pr_dir = bundle_dir / "assets" / "pr-7"
    pr_dir.mkdir(parents=True)
    (pr_dir / "level-1.webp").write_bytes(b"fake-webp-bytes")
    (pr_dir / "level-2.webp").write_bytes(b"fake-webp-bytes")
    (pr_dir / "level-1.png").write_bytes(b"stale-png-should-be-ignored")

    with patch("_manifest.require_compatible"):
        _manifest.rewrite_manifest(bundle_dir, manifest_path)

    text = manifest_path.read_text()
    prefix = "window.ODYSSEY = "
    payload = _json.loads(text[len(prefix):text.rindex(";")])

    assert payload["hero"] == ["pr-7/level-1.webp", "pr-7/level-2.webp"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --with pytest pytest tests/test_shared_manifest.py::test_rewrite_manifest_discovers_webp_hero_assets -v`
Expected: FAIL — `payload["hero"]` is empty because the current glob only matches `level-*.png`.

- [ ] **Step 3: Update the glob and regex in `shared/_manifest.py`**

```python
    def level_num_from_filename(name: str) -> int:
        m = re.match(r"level-(\d+)\.webp$", name)
        return int(m.group(1)) if m else 0
```

and:

```python
            for webp in sorted(pr_dir.glob("level-*.webp"), key=lambda p: level_num_from_filename(p.name)):
                hero.append(f"{pr_dir.name}/{webp.name}")
```

(rename the loop variable from `png` to `webp` for clarity; the `hero.append` body is otherwise unchanged)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --with pytest pytest tests/test_shared_manifest.py -v`
Expected: PASS (all tests in the file, including the pre-existing ones)

- [ ] **Step 5: Commit**

```bash
git add shared/_manifest.py tests/test_shared_manifest.py
git commit -m "feat: manifest builder discovers .webp hero assets"
```

---

## Task 3: `shared/verify_bundle.py` checks `.webp` assets

**Files:**
- Modify: `shared/verify_bundle.py:326-332`
- Test: `tests/test_verify_bundle_webp.py` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces: `check_pr()`'s `results[f"asset.level-{i}"]` now reflects `assets/pr-{pr_num}/level-{i}.webp`, not `.png`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_verify_bundle_webp.py
"""verify_bundle.py's per-PR asset check must look for .webp files.

Run with: uv run --with pytest pytest tests/test_verify_bundle_webp.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED_DIR = REPO_ROOT / "shared"

if str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))

import verify_bundle  # noqa: E402


def test_check_pr_finds_webp_assets(tmp_path: Path):
    bundle_dir = tmp_path / "bundle"
    pr_dir = bundle_dir / "assets" / "pr-9"
    pr_dir.mkdir(parents=True)
    for i in (1, 2, 3):
        (pr_dir / f"level-{i}.webp").write_bytes(b"x" * (verify_bundle.MIN_ASSET_BYTES + 1))

    story = {"timeline": [{"pr": 9, "levels": {}, "adrs": []}]}
    results = verify_bundle.check_pr(bundle_dir, story, adrs=None, pr_num=9)

    assert results["asset.level-1"] == "ok"
    assert results["asset.level-2"] == "ok"
    assert results["asset.level-3"] == "ok"


def test_check_pr_reports_missing_when_only_png_present(tmp_path: Path):
    """A stale .png left over from before the WebP switch must not count as present."""
    bundle_dir = tmp_path / "bundle"
    pr_dir = bundle_dir / "assets" / "pr-9"
    pr_dir.mkdir(parents=True)
    (pr_dir / "level-1.png").write_bytes(b"x" * (verify_bundle.MIN_ASSET_BYTES + 1))

    story = {"timeline": [{"pr": 9, "levels": {}, "adrs": []}]}
    results = verify_bundle.check_pr(bundle_dir, story, adrs=None, pr_num=9)

    assert results["asset.level-1"] == "missing"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --with pytest pytest tests/test_verify_bundle_webp.py -v`
Expected: FAIL on `test_check_pr_finds_webp_assets` — `results["asset.level-1"]` is `"missing"` because the code still looks for `level-1.png`.

- [ ] **Step 3: Update `shared/verify_bundle.py`**

```python
    for i in (1, 2, 3):
        asset_path = bundle_dir / "assets" / f"pr-{pr_num}" / f"level-{i}.webp"
        if not asset_path.exists():
            results[f"asset.level-{i}"] = "missing"
        elif asset_path.stat().st_size <= MIN_ASSET_BYTES:
            results[f"asset.level-{i}"] = "too-small"
        else:
            results[f"asset.level-{i}"] = "ok"
```

(renamed `png_path` → `asset_path` since it no longer names a PNG)

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --with pytest pytest tests/test_verify_bundle_webp.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/verify_bundle.py tests/test_verify_bundle_webp.py
git commit -m "feat: verify_bundle checks .webp hero assets"
```

---

## Task 4: `export_artifact.py` discovers `.webp` hero assets

**Files:**
- Modify: `plugins/cobuilder-artifact/scripts/export_artifact.py:140-142,268-272`
- Test: `tests/test_export_artifact_webp.py` (new)

**Interfaces:**
- Consumes: nothing new. `compress_png_to_jpeg()` is unchanged — Pillow's `Image.open()` already reads WebP, so it needs no format-specific branch.
- Produces: `discover_hero_pngs()` (kept under its existing name — see note below) now globs `level-*.webp`; `level_num_from_filename()` matches `.webp`.

Note: this task intentionally does **not** rename `discover_hero_pngs` or
`compress_png_to_jpeg`. Both names are used only inside this file and by this
task's own test; renaming them is pure churn with no behavior change, so it
is left out per this repo's "don't refactor beyond what the task requires"
convention. A future task may rename them if it also touches their call
sites for another reason.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_export_artifact_webp.py
"""export_artifact.py must discover and compress .webp hero assets.

Run with: uv run --with pytest --with pillow pytest tests/test_export_artifact_webp.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "plugins" / "cobuilder-artifact" / "scripts"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import export_artifact  # noqa: E402


def test_discover_hero_pngs_finds_webp_files(tmp_path: Path):
    bundle_dir = tmp_path / "bundle"
    pr_dir = bundle_dir / "assets" / "pr-3"
    pr_dir.mkdir(parents=True)
    (pr_dir / "level-2.webp").write_bytes(b"x")
    (pr_dir / "level-1.webp").write_bytes(b"x")
    (pr_dir / "level-1.png").write_bytes(b"stale, must be ignored")

    found = export_artifact.discover_hero_pngs(bundle_dir, 3)

    assert [p.name for p in found] == ["level-1.webp", "level-2.webp"]


def test_compress_webp_to_jpeg_round_trips(tmp_path: Path):
    from PIL import Image

    webp_path = tmp_path / "level-1.webp"
    Image.new("RGB", (20, 20), (1, 2, 3)).save(webp_path, "WEBP", quality=90)

    jpeg_bytes = export_artifact.compress_png_to_jpeg(webp_path, width=10, quality=70)

    out = Image.open(__import__("io").BytesIO(jpeg_bytes))
    assert out.format == "JPEG"
    assert out.width == 10
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --with pytest --with pillow pytest tests/test_export_artifact_webp.py -v`
Expected: `test_discover_hero_pngs_finds_webp_files` FAILs (`found` is empty). `test_compress_webp_to_jpeg_round_trips` already PASSes — it proves `compress_png_to_jpeg` needs no code change, only the glob/regex feeding it.

- [ ] **Step 3: Update `level_num_from_filename()` and `discover_hero_pngs()`**

```python
def level_num_from_filename(name: str) -> int:
    m = re.match(r"level-(\d+)\.webp$", name)
    return int(m.group(1)) if m else 0
```

```python
def discover_hero_pngs(bundle_dir: Path, pr_num: int) -> list[Path]:
    pr_dir = bundle_dir / "assets" / f"pr-{pr_num}"
    if not pr_dir.is_dir():
        return []
    return sorted(pr_dir.glob("level-*.webp"), key=lambda p: level_num_from_filename(p.name))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --with pytest --with pillow pytest tests/test_export_artifact_webp.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/cobuilder-artifact/scripts/export_artifact.py tests/test_export_artifact_webp.py
git commit -m "feat: export_artifact discovers .webp hero assets"
```

---

## Task 5: `viewer/index.html` points at `.webp`

**Files:**
- Modify: `plugins/cobuilder-artifact/viewer/index.html:1631,1636,1661,3547`

**Interfaces:**
- Consumes: `HERO_ASSETS` set (built elsewhere in the viewer from `manifest.js`'s `hero` array, which Task 2 already changed to list `.webp` names) and the on-disk `../assets/pr-N/level-L.webp` files.
- Produces: no new interface — this is the last of the four readers, so after this task nothing in the repo still expects `.png` hero assets.

- [ ] **Step 1: Update the 4 template-literal occurrences**

In `plugins/cobuilder-artifact/viewer/index.html`:

Line 1631 (`heroFrameInner`):
```javascript
      : `<img src="../assets/pr-${prNum}/level-${levelIdx}.webp" alt="${escapeHtml(alt)}" loading="lazy">`;
```

Line 1636 (`heroFrame`):
```javascript
    const rel = `pr-${prNum}/level-${levelIdx}.webp`;
```

Line 1661 (`onArtModeToggle`):
```javascript
    const rel = `pr-${prNum}/level-${levelIdx}.webp`;
```

Line 3547 (audio dialog):
```javascript
    const rel = state.level <= 3 ? `pr-${p.pr}/level-${state.level}.webp` : null;
```

- [ ] **Step 2: Update `export_artifact.py`'s verbatim guard strings to match**

`HERO_SRC_OLD`, `HERO_SRC_NEW`, and the `level_num_from_filename` regex
inside `export_artifact.py` (already updated in Task 4) all embed the
`.png`/`.webp` literal from the viewer HTML. Update the two constants at
the top of `plugins/cobuilder-artifact/scripts/export_artifact.py`:

```python
HERO_SRC_OLD = ': `<img src="../assets/pr-${prNum}/level-${levelIdx}.webp" alt="${escapeHtml(alt)}" loading="lazy">`;'
HERO_SRC_NEW = (
    ": `<img src=\"${window.ODYSSEY_ASSETS['pr-' + prNum + '/level-' + levelIdx + '.webp'] || ''}\" "
    'alt="${escapeHtml(alt)}" loading="lazy">`;'
)
```

`export_artifact.py` fails loudly (`verbatim_checks` in `build_html()`) if
`HERO_SRC_OLD` isn't found verbatim in the viewer HTML — so this step is
self-verifying the next time `export_artifact.py` runs against a bundle
whose viewer copy includes Step 1's change. No standalone test is added for
this step; `export_artifact.py`'s existing verbatim-guard mechanism is the
test, and it already fails fast with a clear remediation message (see
`build_html()`'s `missing` check) if these two files drift.

- [ ] **Step 3: Manually verify no other `.png` reference remains for hero assets**

Run: `grep -n 'level-\${levelIdx}\.png\|level-\${state.level}\.png' plugins/cobuilder-artifact/viewer/index.html`
Expected: no output.

Run: `grep -rn 'level-.*\.png' plugins/ shared/`
Expected: no output (confirms Tasks 1-5 left no PNG-matching code behind).

- [ ] **Step 4: Commit**

```bash
git add plugins/cobuilder-artifact/viewer/index.html plugins/cobuilder-artifact/scripts/export_artifact.py
git commit -m "feat: viewer and artifact export point hero assets at .webp"
```

---

## Task 6: Migrate the two committed bundles' PNGs to WebP

**Files:**
- Create: `shared/migrate_png_assets_to_webp.py`
- Test: `tests/test_migrate_png_assets_to_webp.py`

**Interfaces:**
- Consumes: `shared/_manifest.py`'s `rewrite_manifest(bundle_dir: Path, manifest_path: Path) -> None` (Task 2's version, which globs `.webp`).
- Produces: `convert_bundle_assets(bundle_dir: Path, quality: int = 90) -> list[Path]` — returns the list of new `.webp` paths written; deletes each source `.png` after a successful re-encode; leaves non-image files alone.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_migrate_png_assets_to_webp.py
"""migrate_png_assets_to_webp.py converts a bundle's PNG hero assets to WebP.

Run with: uv run --with pytest --with pillow pytest tests/test_migrate_png_assets_to_webp.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED_DIR = REPO_ROOT / "shared"

if str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))


def test_convert_bundle_assets_replaces_png_with_webp(tmp_path: Path):
    from PIL import Image
    import migrate_png_assets_to_webp as migrate

    bundle_dir = tmp_path / "bundle"
    pr_dir = bundle_dir / "assets" / "pr-2"
    pr_dir.mkdir(parents=True)
    for i in (1, 2, 3):
        Image.new("RGB", (8, 8), (i, i, i)).save(pr_dir / f"level-{i}.png", "PNG")

    with patch("migrate_png_assets_to_webp.rewrite_manifest") as mock_rewrite:
        written = migrate.convert_bundle_assets(bundle_dir, quality=90)

    assert sorted(p.name for p in written) == ["level-1.webp", "level-2.webp", "level-3.webp"]
    for i in (1, 2, 3):
        assert not (pr_dir / f"level-{i}.png").exists()
        assert (pr_dir / f"level-{i}.webp").exists()
        out = Image.open(pr_dir / f"level-{i}.webp")
        assert out.format == "WEBP"
    mock_rewrite.assert_called_once_with(bundle_dir, bundle_dir / "data" / "manifest.js")


def test_convert_bundle_assets_no_assets_dir_is_a_noop(tmp_path: Path):
    import migrate_png_assets_to_webp as migrate

    bundle_dir = tmp_path / "empty-bundle"
    with patch("migrate_png_assets_to_webp.rewrite_manifest") as mock_rewrite:
        written = migrate.convert_bundle_assets(bundle_dir, quality=90)

    assert written == []
    mock_rewrite.assert_not_called()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --with pytest --with pillow pytest tests/test_migrate_png_assets_to_webp.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'migrate_png_assets_to_webp'`.

- [ ] **Step 3: Write `shared/migrate_png_assets_to_webp.py`**

```python
#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pillow>=10.0.0,<13",
# ]
# ///
"""One-off migration: re-encode a bundle's PNG hero assets as WebP q90.

This is not part of the regular generation pipeline (generate_prompts.py
already writes WebP directly after the WebP-scene-art change). Run this
once per bundle that still carries PNGs left over from before that change:

    uv run migrate_png_assets_to_webp.py --bundle-dir <path>

It converts every assets/pr-*/level-*.png to level-*.webp at the given
quality (default 90), deletes the source PNG on success, and rewrites
manifest.js so the hero list matches the new filenames. It never touches
files that are not named level-<N>.png.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _manifest import rewrite_manifest

LEVEL_PNG_RE = re.compile(r"level-(\d+)\.png$")


def convert_bundle_assets(bundle_dir: Path, quality: int = 90) -> list[Path]:
    """Convert every assets/pr-*/level-N.png under bundle_dir to WebP.

    Returns the list of .webp paths written. Deletes each source .png after
    a successful re-encode. Calls rewrite_manifest() once at the end if any
    file was converted, so manifest.js's hero list matches the new
    filenames. A bundle with no assets/ directory is a no-op.
    """
    from PIL import Image

    assets_dir = bundle_dir / "assets"
    written: list[Path] = []
    if not assets_dir.is_dir():
        return written

    for pr_dir in sorted(assets_dir.glob("pr-*")):
        if not pr_dir.is_dir():
            continue
        for png_path in sorted(pr_dir.glob("level-*.png")):
            if not LEVEL_PNG_RE.match(png_path.name):
                continue
            webp_path = png_path.with_suffix(".webp")
            image = Image.open(png_path)
            if image.mode not in ("RGB",):
                image = image.convert("RGB")
            image.save(webp_path, "WEBP", quality=quality)
            png_path.unlink()
            written.append(webp_path)
            print(f"converted {png_path.name} -> {webp_path.name} ({webp_path.stat().st_size} bytes)")

    if written:
        manifest_path = bundle_dir / "data" / "manifest.js"
        rewrite_manifest(bundle_dir, manifest_path)
        print(f"rewrote {manifest_path}")

    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bundle-dir", required=True, help="bundle directory to migrate, e.g. .cobuilder-architect/self")
    parser.add_argument("--quality", type=int, default=90, help="WebP quality (default: 90)")
    args = parser.parse_args()

    bundle_dir = Path(args.bundle_dir).resolve()
    if not bundle_dir.is_dir():
        print(f"error: {bundle_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    written = convert_bundle_assets(bundle_dir, quality=args.quality)
    print(f"Converted {len(written)} PNG asset(s) under {bundle_dir}.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --with pytest --with pillow pytest tests/test_migrate_png_assets_to_webp.py -v`
Expected: PASS

- [ ] **Step 5: Commit the migration script**

```bash
git add shared/migrate_png_assets_to_webp.py tests/test_migrate_png_assets_to_webp.py
git commit -m "feat: add one-off PNG-to-WebP migration script for existing bundles"
```

- [ ] **Step 6: Run the migration script against both committed bundles**

```bash
uv run shared/migrate_png_assets_to_webp.py --bundle-dir .cobuilder-architect/self
uv run shared/migrate_png_assets_to_webp.py --bundle-dir .cobuilder-architect/digital-curator-80f83abb
```

Expected: 3 conversions printed for each bundle (`level-1.png -> level-1.webp`,
etc.), plus one `rewrote .../data/manifest.js` line per bundle. Confirm no
`.png` files remain:

```bash
find .cobuilder-architect/self .cobuilder-architect/digital-curator-80f83abb -name '*.png'
```

Expected: no output.

- [ ] **Step 7: Commit the migrated bundle content**

```bash
git add .cobuilder-architect/self/assets .cobuilder-architect/self/data/manifest.js \
        .cobuilder-architect/digital-curator-80f83abb/assets .cobuilder-architect/digital-curator-80f83abb/data/manifest.js
git commit -m "chore: migrate committed bundle hero assets from PNG to WebP"
```

---

## Task 7: Verify the full pipeline end to end before touching history

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `uv run --with pytest --with pillow --with google-genai --with python-dotenv pytest tests/ -v`
Expected: all tests PASS, including the new ones from Tasks 1-6 and the
pre-existing 268-test suite CLAUDE.md describes.

- [ ] **Step 2: Run bundle verification against the migrated self-bundle**

```bash
uv run shared/verify_bundle.py --bundle-dir .cobuilder-architect/self
```

Expected: PR #2's `asset.level-1`, `asset.level-2`, `asset.level-3` all
report `ok` (not `missing`) — confirming Task 3's `.webp`-aware check finds
Task 6's migrated files.

- [ ] **Step 3: Serve the bundle and eyeball the viewer**

```bash
cd .cobuilder-architect/self && python3 -m http.server 8010
```

Open `http://localhost:8010/viewer/index.html` in a browser, navigate to PR
#2, and confirm the level 1-3 hero images render (not a broken-image icon).
This is the one step in this plan that a script cannot verify — Task 5
changed a template literal inside a large HTML file with no unit test
covering DOM rendering, so a manual look is the actual verification.
Stop the server (`Ctrl+C`) once confirmed.

- [ ] **Step 4: Commit any incidental fixes found in Step 3**

Only if Step 3 surfaces a bug. Otherwise, nothing to commit — this task is
verification-only.

---

## Task 8: Remove historical PNG blobs with `git filter-repo`

**Files:** none — this task operates on the git object database, not on
tracked file contents.

This is the plan's one destructive, hard-to-reverse step. Do not run Step 3
(the local rewrite) until Task 7 is fully green. Do not run Step 6 (the
force-push) without the user's explicit go-ahead in this session — CLAUDE.md
and this repo's own git-safety rules require confirmation before any force
push, and this one also invalidates every existing local clone.

- [ ] **Step 1: Confirm every branch that must survive the rewrite**

```bash
git branch -a
```

At the time this plan was written, that was: `master`,
`design/design-mode`, `docs/artifact-dependency-cleanup`,
`docs/post-pr11-cleanup`, `feature/design-the-architecture`, plus
`origin/claude/pr-odyssey-vscode-plugin-e5cw6n`. `git filter-repo` rewrites
every ref by default, local and would-be-mirrored-remote alike, so no
`--refs` restriction is needed — confirm this list still matches before
proceeding, since a branch created after this plan was written and not
listed here still gets rewritten (that is fine; only note it if a branch
was deleted and its absence needs explaining).

- [ ] **Step 2: Make a full backup clone before doing anything else**

```bash
cd ..
git clone --mirror /Users/theb/Documents/Windsurf/prodyssey prodyssey-backup-before-filter-repo.git
```

Expected: a bare mirror clone is created next to the working repo. This is
the restore path if anything in Steps 3-5 goes wrong — `git filter-repo`
edits history in place on whatever repo it targets, with no built-in undo
beyond starting over from a clone made before it ran.

- [ ] **Step 3: Run `git filter-repo` locally (rewrites this working repo's history)**

```bash
cd /Users/theb/Documents/Windsurf/prodyssey
git filter-repo --path-glob '.cobuilder-architect/*/assets/pr-*/level-*.png' --invert-paths
```

Expected: `git filter-repo` reports the number of commits it rewrote,
regenerates all refs, and (per its own default behavior) removes the
`origin` remote from `.git/config` as a safety measure against an
accidental push to the un-rewritten history. Do not re-add `origin` yet.

- [ ] **Step 4: Verify the rewrite locally**

```bash
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ && $4 ~ /\.png$/ {sum+=$3; n++} END {print n+0, sum/1024/1024 " MB"}'
```

Expected: `0  MB` — no `.png` blobs remain in any ref's history.

```bash
git log --oneline -5
git status
```

Expected: `git log` still shows recognizable recent commits (hashes will
have changed — that is the point of a history rewrite). `git status` on a
freshly `git filter-repo`'d repo shows a clean working tree with no branch
checked out in the usual sense — filter-repo leaves the repo in a state
where you may need `git checkout master` to restore a normal working
directory. Do this and confirm the working tree matches what Task 7
verified:

```bash
git checkout master
git status --short
```

Expected: no unexpected diffs (Task 6's committed migration should already
be part of this history).

- [ ] **Step 5: Confirm with the user before proceeding to the push**

Report the Step 4 verification numbers (0 PNG blobs, correct branch
present) to the user and get explicit confirmation to push. This is not
optional — the next step overwrites the shared GitHub history for everyone
with `origin` as a remote.

- [ ] **Step 6: Re-add the remote and force-push every rewritten ref (only after user confirmation)**

```bash
git remote add origin https://github.com/bjornslib/prodyssey.git
git push origin --force --all
git push origin --force --tags
```

Expected: GitHub accepts the rewritten history on every branch that existed
on `origin` before the rewrite. `origin/claude/pr-odyssey-vscode-plugin-e5cw6n`
is only on the remote, not a local branch here — if it is not fetched and
included in this local repo before `filter-repo` runs, it does not get
rewritten by this push and is left with old history containing the PNG
blobs. Decide with the user, before Step 3, whether that branch needs
fetching and rewriting too, or whether it is stale enough to leave alone or
delete.

- [ ] **Step 7: Tell anyone with an existing clone to re-clone**

This is a communication step, not a git command. Anyone who has cloned this
repo before the force-push (including any other local checkout on this
machine, and any CI cache) has diverged history after this push and must
either delete their clone and re-clone, or run
`git fetch origin && git reset --hard origin/<branch>` and accept losing
any local, un-pushed commits on top of the old history. Note this
explicitly to the user; do not assume it is understood.

- [ ] **Step 8: Delete the backup mirror once the push is confirmed good**

Only after confirming with the user that GitHub's copy is correct and
usable (e.g. by re-cloning the repo somewhere fresh and running the test
suite from Task 7 against it):

```bash
rm -rf /Users/theb/Documents/Windsurf/prodyssey-backup-before-filter-repo.git
```

Do not run this step automatically — confirm with the user first, the same
way any deletion of a backup that is the last restore path for a
destructive operation should be confirmed.

---

## Self-Review Notes

- **Spec coverage:** the two open questions from the investigation —
  "format: WebP vs JPEG" and "existing history: filter-repo" — are both
  resolved: WebP q90 per this session's decision (Task 1-6), and
  `git filter-repo` per this session's explicit instruction (Task 8).
- **No placeholders:** every task has literal code, exact file paths and
  line numbers as observed in this session, and runnable test/verification
  commands.
- **Type/name consistency:** `convert_bundle_assets(bundle_dir: Path,
  quality: int = 90) -> list[Path]` is defined once in Task 6 and used
  identically in that task's own script, test, and Step 6 CLI invocation.
  `discover_hero_pngs` and `compress_png_to_jpeg` in Task 4 are deliberately
  left under their existing names (see the note in that task) rather than
  drifting into a new name unused elsewhere.
