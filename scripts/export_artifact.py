#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10.0.0"]
# ///
"""Flatten one PR from a Codebase Odyssey bundle into a single self-contained
HTML file safe to publish as a Claude Artifact.

The bundled viewer (`viewer/index.html`) is a normal multi-file web page in
disguise: it loads `window.STORY`/`ODYSSEY`/`DIFFS_BY_PR`/`ADRS`/`DIAGRAMS`
via sibling `<script src="../data/*.js">` tags, references scene-art PNGs
and narration WAVs by relative path, and pulls Google Fonts + the Motion
animation library + the Mermaid diagram-rendering library from three CDNs.
A published Artifact is one file with no siblings and a CSP that blocks
every external request, so none of that survives as-is.

This script produces one flattened file per requested PR:
  - that PR's `story.json` timeline entry (world districts/meta kept intact —
    the viewer's district lookups need them) inlined as literal JSON instead
    of a script-src fetch
  - that PR's referenced ADRs, its diff file, its manifest (hero/diff_prs
    scoped to just this PR), and its authored Mermaid diagram sources (levels
    1-3, read straight from `<bundle-dir>/data/diagrams/pr{N}-level{L}.mmd`)
    inlined the same way
  - hero PNGs recompressed to JPEG (resize + quality tiers, retried
    progressively tighter if the file would exceed the budget) and embedded
    as data URIs; narration WAVs embedded unmodified unless the budget still
    doesn't fit, in which case audio is dropped as a last resort
  - the Google Fonts + Motion CDN tags dropped (Motion already no-ops
    gracefully when `window.Motion` is undefined; Google Fonts failing just
    falls back to the existing monospace/sans-serif stack)
  - the Mermaid CDN tag dropped too, by default: published Claude Artifacts
    render `<pre class="mermaid">` blocks NATIVELY, so no runtime needs
    inlining, and the viewer's own no-Mermaid fallback (plain escaped source)
    is harmless dead code in that environment. Pass --inline-mermaid to
    instead vendor a real Mermaid runtime into the page (see that flag's
    help text) for viewing contexts that don't render Mermaid natively.

Also computes and records, in `<bundle-dir>/exports/publish-manifest.json`,
whether this PR's underlying commit or narrative content (including its
diagram sources) changed since the last export — the signal the publish
pipeline uses to decide whether an already-published artifact needs
republishing.

Usage:
    uv run export_artifact.py --repo <path> --prs 73
    uv run export_artifact.py --bundle-dir <path>/.prodyssey/self --prs 73,75
    uv run export_artifact.py --bundle-dir <bundle> --prs 73 --force
    uv run export_artifact.py --bundle-dir <bundle> --prs 73 --inline-mermaid
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

SCHEMA_VERSION = "1.0"
DEFAULT_MAX_BYTES = 15 * 1024 * 1024  # target under the 16 MiB artifact hard cap
# (image-width, jpeg-quality) tiers, tried in order until the file fits budget.
COMPRESSION_TIERS = [(1400, 78), (1100, 68), (900, 55)]

TITLE_TAG_RE = re.compile(r"<title>.*?</title>")

SCRIPT_BLOCK_RE = re.compile(
    r'<script src="\.\./data/story\.js"></script>.*?<script src="\.\./data/diagrams\.js"></script>\n',
    re.S,
)
CDN_LINK_RES = [
    re.compile(r'<link rel="preconnect"[^>]*>\n'),
    re.compile(r'<link href="https://fonts\.googleapis[^>]*>\n'),
    re.compile(r'<script src="https://cdn\.jsdelivr\.net/npm/motion[^>]*></script>\n'),
]
# Handled separately from CDN_LINK_RES (not just folded into that list) because its
# fate depends on --inline-mermaid: dropped by default (published Claude Artifacts
# render `<pre class="mermaid">` blocks NATIVELY, so no runtime needs inlining — the
# viewer's own no-Mermaid fallback in mountOneDiagram() just shows escaped source
# instead, same graceful-degradation posture as the Motion no-op above), or replaced
# in place with a vendored runtime when --inline-mermaid is passed.
MERMAID_CDN_RE = re.compile(r'<script src="https://cdn\.jsdelivr\.net/npm/mermaid[^>]*></script>\n')
HERO_SRC_OLD = ': `<img src="../assets/pr-${prNum}/level-${levelIdx}.png" alt="${escapeHtml(alt)}" loading="lazy">`;'
HERO_SRC_NEW = (
    ": `<img src=\"${window.ODYSSEY_ASSETS['pr-' + prNum + '/level-' + levelIdx + '.png'] || ''}\" "
    'alt="${escapeHtml(alt)}" loading="lazy">`;'
)
DIALOG_IMG_OLD = "img.src = `../assets/${rel}`;"
DIALOG_IMG_NEW = "img.src = window.ODYSSEY_ASSETS[rel] || '';"
AUDIO_SRC_OLD = "narrationAudio.src = `../data/audio/${file}`;"
AUDIO_SRC_NEW = "narrationAudio.src = window.ODYSSEY_AUDIO[file] || '';"
# The three script-default fallbacks the viewer sets right after its data-loading
# <script src> block (see SCRIPT_BLOCK_RE above) — left in place after that block is
# swapped for our inline literals, this would silently clobber window.DIAGRAMS (and
# DIFFS/ADRS) back to `{}` since `window.X || {}` re-runs after our inline assignment
# too. Matched and stripped verbatim, behind the same fail-loudly guard as every other
# transform in this script — see the VERBATIM_GUARDS check in build_html().
DEFAULTS_BLOCK_OLD = (
    "window.DIFFS = window.DIFFS || {};\n"
    "window.ADRS = window.ADRS || {};\n"
    "window.DIAGRAMS = window.DIAGRAMS || {};\n"
)
DEFAULTS_BLOCK_NEW = ""


# ---- filesystem / repo resolution (same conventions as the other scripts) ----

def resolve_repo(repo_arg: str | None) -> Path:
    target = repo_arg or "."
    try:
        out = subprocess.check_output(
            ["git", "-C", target, "rev-parse", "--show-toplevel"],
            text=True,
            stderr=subprocess.PIPE,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(
            f"error: '{target}' is not inside a git repository.\n"
            "remediation: run from inside a git checkout, or pass --repo <path-to-git-repo>",
            file=sys.stderr,
        )
        sys.exit(1)
    return Path(out)


def level_num_from_filename(name: str) -> int:
    m = re.match(r"level-(\d+)\.png$", name)
    return int(m.group(1)) if m else 0


def escape_script_close(s: str) -> str:
    """Diffs of HTML files can contain a literal `</script>` — left alone it
    closes our inline <script> block early and silently breaks the page."""
    return s.replace("</script", "<\\/script")


# ---- data loading ----

def load_story(bundle_dir: Path) -> dict:
    story_path = bundle_dir / "data" / "story.json"
    if not story_path.exists():
        print(
            f"error: {story_path} not found.\n"
            "remediation: run /prodyssey:baseline (and /prodyssey:generate) against this bundle first.",
            file=sys.stderr,
        )
        sys.exit(1)
    return json.loads(story_path.read_text())


def find_pr_entry(story: dict, pr_num: int) -> dict | None:
    for entry in story.get("timeline", []):
        if entry.get("pr") == pr_num:
            return entry
    return None


def load_adrs_subset(bundle_dir: Path, adr_ids: list[str]) -> dict:
    adrs_path = bundle_dir / "data" / "adrs.json"
    if not adrs_path.exists() or not adr_ids:
        return {}
    all_adrs = json.loads(adrs_path.read_text())
    return {k: v for k, v in all_adrs.items() if k in adr_ids}


def load_diffs_js(bundle_dir: Path, pr_num: int) -> str | None:
    diffs_path = bundle_dir / "data" / f"diffs-pr{pr_num}.js"
    if not diffs_path.exists():
        return None
    return diffs_path.read_text()


def load_diagrams_for_pr(bundle_dir: Path, pr_num: int) -> dict[str, str]:
    """Returns {"<level>": "<mermaid source>"} for this PR, string keys to match
    window.DIAGRAMS's shape in the viewer (see diagramSource() in viewer/index.html).

    Reads the authored `.mmd` files directly from `<bundle-dir>/data/diagrams/`
    rather than parsing `data/diagrams.js` — the `.mmd` files are
    build_diagrams.py's own input/ground truth (same naming convention
    `pr{N}-level{L}.mmd` that extract_story.py's rewrite_manifest() already
    keys its manifest listing off of), so this works even if diagrams.js
    hasn't been (re)built yet, and avoids taking on a second JS-literal parser
    for a shape this script doesn't otherwise need to round-trip.
    """
    diagrams_dir = bundle_dir / "data" / "diagrams"
    if not diagrams_dir.is_dir():
        return {}
    out: dict[str, str] = {}
    pattern = re.compile(rf"pr{pr_num}-level(\d+)\.mmd$")
    for mmd in sorted(diagrams_dir.glob(f"pr{pr_num}-level*.mmd")):
        m = pattern.match(mmd.name)
        if not m:
            continue
        out[m.group(1)] = mmd.read_text()
    return out


def discover_hero_pngs(bundle_dir: Path, pr_num: int) -> list[Path]:
    pr_dir = bundle_dir / "assets" / f"pr-{pr_num}"
    if not pr_dir.is_dir():
        return []
    return sorted(pr_dir.glob("level-*.png"), key=lambda p: level_num_from_filename(p.name))


def discover_audio(bundle_dir: Path, pr_num: int) -> list[Path]:
    audio_dir = bundle_dir / "data" / "audio"
    if not audio_dir.is_dir():
        return []
    return sorted(audio_dir.glob(f"pr{pr_num}_*.wav"))


# ---- image compression ----

def compress_png_to_jpeg(png_path: Path, width: int, quality: int) -> bytes:
    from PIL import Image

    im = Image.open(png_path)
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        rgba = im.convert("RGBA")
        bg = Image.new("RGB", rgba.size, (255, 255, 255))
        bg.paste(rgba, mask=rgba.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    if im.width > width:
        new_height = round(im.height * (width / im.width))
        im = im.resize((width, new_height), Image.LANCZOS)
    buf = BytesIO()
    im.save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


# ---- artifact assembly ----

def build_html(
    viewer_html: str,
    story_obj: dict,
    manifest_obj: dict,
    diffs_js: str | None,
    adrs_obj: dict,
    diagrams_obj: dict[str, str],
    assets_map: dict[str, str],
    audio_map: dict[str, str],
    page_title: str,
    inline_mermaid_js: str | None,
) -> str:
    html = viewer_html
    for cdn_re in CDN_LINK_RES:
        html = cdn_re.sub("", html, count=1)

    # The static <title> tag, not the page's own JS (which sets document.title
    # at runtime), is what the Artifact tool reads to name a published page —
    # give every PR its own instead of shipping the viewer's generic default.
    import html as _html_mod

    html = TITLE_TAG_RE.sub(f"<title>{_html_mod.escape(page_title)}</title>", html, count=1)

    # Fail loudly, not silently, if the viewer no longer contains any string this
    # script depends on verbatim — an unguarded str.replace() that finds nothing
    # just no-ops, which for DEFAULTS_BLOCK_OLD in particular would leave a stale
    # `window.DIAGRAMS = window.DIAGRAMS || {};`-style line able to clobber the
    # inlined data below it. Every verbatim string this function relies on must be
    # listed here.
    verbatim_checks = {
        "hero image <img> (heroFrameInner)": HERO_SRC_OLD,
        "audio-dialog image src assignment": DIALOG_IMG_OLD,
        "narration-audio src assignment": AUDIO_SRC_OLD,
        "window.DIFFS/ADRS/DIAGRAMS defaults block": DEFAULTS_BLOCK_OLD,
    }
    missing = [label for label, needle in verbatim_checks.items() if needle not in html]
    if missing:
        print(
            "error: this bundle's viewer/index.html doesn't match the expected shape for this "
            f"transform — not found verbatim: {', '.join(missing)}.\n"
            "remediation: most often the bundle simply holds an older copy of the viewer than the "
            "installed plugin (each bundle carries its own copy, and the Mermaid-diagram support "
            "changed it). Refresh it and retry:\n"
            '  cp "${CLAUDE_PLUGIN_ROOT}/viewer/index.html" <bundle-dir>/viewer/index.html\n'
            "or re-run /prodyssey:baseline against the bundle, which does the same copy.\n"
            "If the bundle's viewer is already current, then viewer/index.html was edited and "
            "export_artifact.py's replacement strings need updating to match.",
            file=sys.stderr,
        )
        sys.exit(1)
    if not inline_mermaid_js and not MERMAID_CDN_RE.search(html):
        print(
            "error: viewer/index.html's Mermaid CDN <script> tag not found verbatim.\n"
            "remediation: the viewer was edited — update export_artifact.py's MERMAID_CDN_RE to match.",
            file=sys.stderr,
        )
        sys.exit(1)
    html = html.replace(HERO_SRC_OLD, HERO_SRC_NEW)
    html = html.replace(DIALOG_IMG_OLD, DIALOG_IMG_NEW)
    html = html.replace(AUDIO_SRC_OLD, AUDIO_SRC_NEW)
    html = html.replace(DEFAULTS_BLOCK_OLD, DEFAULTS_BLOCK_NEW)

    if inline_mermaid_js is not None:
        # Vendor the runtime in place of the CDN fetch instead of dropping it —
        # for viewing contexts (e.g. this script's own file:// verification, or any
        # non-Artifact host) that don't render `<pre class="mermaid">` natively.
        html = MERMAID_CDN_RE.sub(
            "<script>" + escape_script_close(inline_mermaid_js) + "</script>\n",
            html,
            count=1,
        )
    else:
        # Published Claude Artifacts render `<pre class="mermaid">` blocks NATIVELY,
        # so no runtime needs inlining — drop the CDN tag same as Fonts/Motion above.
        html = MERMAID_CDN_RE.sub("", html, count=1)

    old_block = SCRIPT_BLOCK_RE.search(html)
    if not old_block:
        print(
            "error: viewer/index.html's data-loading <script> block not found verbatim.\n"
            "remediation: the viewer was edited — update export_artifact.py's SCRIPT_BLOCK_RE to match.",
            file=sys.stderr,
        )
        sys.exit(1)

    diffs_block = escape_script_close(diffs_js) if diffs_js else (
        "window.DIFFS_BY_PR = window.DIFFS_BY_PR || {};"
    )
    inline_data = f"""<script>
window.STORY = {escape_script_close(json.dumps(story_obj, ensure_ascii=False))};
window.ODYSSEY = {json.dumps(manifest_obj, ensure_ascii=False)};
{diffs_block}
window.ADRS = {escape_script_close(json.dumps(adrs_obj, ensure_ascii=False))};
window.DIAGRAMS = {escape_script_close(json.dumps(diagrams_obj, ensure_ascii=False))};
window.ODYSSEY_ASSETS = {json.dumps(assets_map, ensure_ascii=False)};
window.ODYSSEY_AUDIO = {json.dumps(audio_map, ensure_ascii=False)};
</script>
"""
    html = html.replace(old_block.group(0), inline_data)
    return html


def render_for_pr(
    viewer_html: str,
    story: dict,
    bundle_dir: Path,
    pr_num: int,
    entry: dict,
    image_width: int,
    jpeg_quality: int,
    include_audio: bool,
    inline_mermaid_js: str | None,
) -> tuple[str, int, list[str]]:
    """Returns (html, total_bytes, notes)."""
    story_obj = {
        "meta": story.get("meta", {}),
        "world": story.get("world", {}),
        "timeline": [entry],
    }
    adr_ids = entry.get("adrs") or []
    adrs_obj = load_adrs_subset(bundle_dir, adr_ids)
    diffs_js = load_diffs_js(bundle_dir, pr_num)
    diagrams_by_level = load_diagrams_for_pr(bundle_dir, pr_num)
    # Scoped the same way window.DIAGRAMS's shape is looked up in the viewer —
    # {"<pr>": {"<level>": src}}, string keys throughout — even though this file
    # only ever inlines one PR's worth, so diagramSource()'s DIAGRAMS[String(prNum)]
    # lookup keeps working unmodified in the exported page.
    diagrams_obj = {str(pr_num): diagrams_by_level} if diagrams_by_level else {}

    # Empty when the PR has no PNGs at all (an --art diagram PR, say) — the loop
    # below and the compression-tier retry loop in main() both handle that fine:
    # zero iterations, empty assets_map, no exception.
    hero_pngs = discover_hero_pngs(bundle_dir, pr_num)
    assets_map: dict[str, str] = {}
    hero_rel: list[str] = []
    for png in hero_pngs:
        rel = f"pr-{pr_num}/{png.name}"
        jpeg_bytes = compress_png_to_jpeg(png, image_width, jpeg_quality)
        assets_map[rel] = "data:image/jpeg;base64," + _b64(jpeg_bytes)
        hero_rel.append(rel)

    audio_map: dict[str, str] = {}
    notes: list[str] = []
    if include_audio:
        for wav in discover_audio(bundle_dir, pr_num):
            audio_map[wav.name] = "data:audio/wav;base64," + _b64(wav.read_bytes())
    else:
        notes.append("audio dropped to fit budget")

    diff_prs = [pr_num] if diffs_js else []
    manifest_obj = {
        "schema_version": SCHEMA_VERSION,
        "excluded_prs": [],
        "hero": hero_rel,
        "diff_prs": diff_prs,
    }

    repo_name = story.get("meta", {}).get("repo", "")
    page_title = f"{repo_name} — PR #{pr_num}: {entry.get('title', '')}".strip(" —")
    html = build_html(
        viewer_html,
        story_obj,
        manifest_obj,
        diffs_js,
        adrs_obj,
        diagrams_obj,
        assets_map,
        audio_map,
        page_title,
        inline_mermaid_js,
    )
    return html, len(html.encode()), notes


def _b64(data: bytes) -> str:
    import base64

    return base64.b64encode(data).decode()


def compute_source_hash(entry: dict, adrs_obj: dict, diffs_js: str | None, diagrams_by_level: dict[str, str]) -> str:
    # diagrams_by_level included so an edited `.mmd` (no commit/entry change) still
    # trips a re-export — otherwise the hash would report "unchanged" forever once a
    # PR's diagram source is tweaked after the fact. Note this changes the hash for
    # every PR already exported before diagrams existed, so the very next run of
    # `/prodyssey:publish` will re-export all of them once, even ones with no
    # diagrams (empty dict still changes the payload's shape) — expected, one-time.
    payload = json.dumps(
        {"entry": entry, "adrs": adrs_obj, "diffs": diffs_js, "diagrams": diagrams_by_level},
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


# ---- publish-manifest.json ----

def load_publish_manifest(path: Path, repo_name: str) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except json.JSONDecodeError:
            pass
    return {"schema_version": "1.0", "repo": repo_name, "prs": {}, "index": {}}


def save_publish_manifest(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=None, help="path to the target git repo (default: cwd)")
    parser.add_argument("--bundle-dir", default=None, help="bundle dir to read (default: <repo>/.prodyssey/self)")
    parser.add_argument("--prs", required=True, help="comma-separated PR numbers, e.g. 73,75")
    parser.add_argument("--out-dir", default=None, help="export output dir (default: <bundle-dir>/exports)")
    parser.add_argument("--image-width", type=int, default=None, help="override the first compression tier's width")
    parser.add_argument("--jpeg-quality", type=int, default=None, help="override the first compression tier's quality")
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES, help="target byte budget (default ~15 MiB)")
    parser.add_argument("--no-audio", action="store_true", help="never embed narration audio")
    parser.add_argument(
        "--inline-mermaid",
        action="store_true",
        help=(
            "vendor a real Mermaid runtime into the exported page instead of relying on "
            "native rendering (published Claude Artifacts render `<pre class=\"mermaid\">` "
            "blocks natively, so this is normally unnecessary there). Requires "
            "viewer/vendor/mermaid.min.js to already exist, version-matched to the CDN tag "
            "pinned in viewer/index.html — this script never downloads it."
        ),
    )
    parser.add_argument("--force", action="store_true", help="rebuild even if the export already exists")
    args = parser.parse_args()

    repo = resolve_repo(args.repo)
    bundle_dir = Path(args.bundle_dir).resolve() if args.bundle_dir else repo / ".prodyssey" / "self"
    out_dir = Path(args.out_dir).resolve() if args.out_dir else bundle_dir / "exports"
    viewer_path = bundle_dir / "viewer" / "index.html"

    if not viewer_path.exists():
        print(
            f"error: {viewer_path} not found.\n"
            "remediation: run /prodyssey:baseline against this bundle first.",
            file=sys.stderr,
        )
        sys.exit(1)
    viewer_html = viewer_path.read_text()

    inline_mermaid_js: str | None = None
    if args.inline_mermaid:
        vendored_path = Path(__file__).resolve().parent.parent / "viewer" / "vendor" / "mermaid.min.js"
        if not vendored_path.exists():
            print(
                f"error: --inline-mermaid requires a vendored Mermaid runtime at {vendored_path}, "
                "but it was not found. This script never downloads it.\n"
                "remediation: fetch mermaid.min.js for the exact version pinned in viewer/index.html's "
                "CDN tag (currently mermaid@11.6.0's dist/mermaid.min.js) and save it to that exact path, "
                "then re-run with --inline-mermaid.",
                file=sys.stderr,
            )
            sys.exit(1)
        inline_mermaid_js = vendored_path.read_text()

    pr_nums = sorted({int(x.strip()) for x in args.prs.split(",") if x.strip()})
    if not pr_nums:
        print("error: --prs must list at least one PR number.\nremediation: pass --prs N[,M,...]", file=sys.stderr)
        sys.exit(1)

    story = load_story(bundle_dir)
    repo_name = story.get("meta", {}).get("repo", repo.name)
    manifest_path = out_dir / "publish-manifest.json"
    publish_manifest = load_publish_manifest(manifest_path, repo_name)

    tiers = list(COMPRESSION_TIERS)
    if args.image_width or args.jpeg_quality:
        w = args.image_width or COMPRESSION_TIERS[0][0]
        q = args.jpeg_quality or COMPRESSION_TIERS[0][1]
        tiers = [(w, q)] + COMPRESSION_TIERS[1:]

    out_dir.mkdir(parents=True, exist_ok=True)

    for pr_num in pr_nums:
        entry = find_pr_entry(story, pr_num)
        if entry is None:
            print(
                f"error: PR #{pr_num} not found in {bundle_dir}/data/story.json.\n"
                f"remediation: run /prodyssey:generate --prs {pr_num} first.",
                file=sys.stderr,
            )
            sys.exit(1)

        out_path = out_dir / f"pr-{pr_num}.html"
        prior = publish_manifest["prs"].get(str(pr_num), {})

        adr_ids = entry.get("adrs") or []
        adrs_obj = load_adrs_subset(bundle_dir, adr_ids)
        diffs_js = load_diffs_js(bundle_dir, pr_num)
        diagrams_by_level = load_diagrams_for_pr(bundle_dir, pr_num)
        source_hash = compute_source_hash(entry, adrs_obj, diffs_js, diagrams_by_level)
        commit = entry.get("commit")

        unchanged = (
            out_path.exists()
            and prior.get("source_hash") == source_hash
            and prior.get("commit") == commit
        )
        if unchanged and not args.force:
            print(f"PR #{pr_num}: unchanged since last export (commit={commit}, hash={source_hash}) -> {out_path}")
            continue

        include_audio = not args.no_audio
        html = total_bytes = notes = None
        for width, quality in tiers:
            html, total_bytes, notes = render_for_pr(
                viewer_html, story, bundle_dir, pr_num, entry, width, quality, include_audio, inline_mermaid_js
            )
            if total_bytes <= args.max_bytes:
                break
        if total_bytes > args.max_bytes and include_audio:
            width, quality = tiers[-1]
            html, total_bytes, notes = render_for_pr(
                viewer_html, story, bundle_dir, pr_num, entry, width, quality,
                include_audio=False, inline_mermaid_js=inline_mermaid_js,
            )
        if total_bytes > args.max_bytes:
            print(
                f"WARNING: PR #{pr_num} export is {total_bytes / 1024 / 1024:.2f} MiB, "
                f"over the {args.max_bytes / 1024 / 1024:.1f} MiB target even at the tightest "
                "compression tier with audio dropped. Writing it anyway — it may be rejected "
                "at publish time (16 MiB hard cap).",
                file=sys.stderr,
            )

        out_path.write_text(html)

        if not prior:
            change_note = "first export"
        else:
            changed_bits = []
            if prior.get("commit") != commit:
                changed_bits.append("commit")
            if prior.get("source_hash") != source_hash:
                changed_bits.append("content")
            change_note = ", ".join(changed_bits) if changed_bits else "unchanged (forced)"

        publish_manifest["prs"][str(pr_num)] = {
            **prior,
            "title": entry.get("title", ""),
            "tagline": entry.get("tagline", ""),
            "date": entry.get("date", ""),
            "status": entry.get("status", "merged"),
            "commit": commit,
            "source_hash": source_hash,
            "export_file": str(out_path.relative_to(bundle_dir)),
            "export_bytes": total_bytes,
            "exported_at": now_iso(),
        }
        save_publish_manifest(manifest_path, publish_manifest)

        note_str = f" ({'; '.join(notes)})" if notes else ""
        print(
            f"PR #{pr_num}: wrote {out_path} — {total_bytes / 1024 / 1024:.2f} MiB, "
            f"changed: {change_note}{note_str}"
        )


if __name__ == "__main__":
    main()
