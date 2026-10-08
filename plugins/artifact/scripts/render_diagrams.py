#!/usr/bin/env python3
"""Render a design's level-2 and level-3 mermaid diagrams to PNG and write the tldraw
/exec code that places them side by side to the right of the canvas.

Usage:
  render_diagrams.py <design-dir> --out <dir>

Writes <out>/level-2.png, <out>/level-3.png and <out>/place-images.js. The JS embeds the
PNGs as base64, so it is large (about 1 MB). Send it with `curl --data-binary @file`, not
as a command-line argument.

Rendering uses the official @mermaid-js/mermaid-cli through npx, with the Chrome that is
already installed. The pure-Python `mmdc` package cannot render class or C4 diagrams.
Class diagrams lose their `note` lines unless --keep-notes is set: the notes are long
single lines and stretch the picture sideways.
"""
import argparse
import base64
import json
import os
import re
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

CHROME = os.environ.get("CHROME_PATH", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
CLI = "@mermaid-js/mermaid-cli@11.12.0"
LEVELS = [("level-2", "Flow diagram", 3000), ("level-3", "Structure diagram", 2400)]
SHOW_W, GAP = 2600, 120  # width of each image on the canvas, gap between them


def png_size(path):
    return struct.unpack(">II", path.read_bytes()[16:24])


def render(src, out, width, keep_notes):
    text = src.read_text()
    if not keep_notes and text.lstrip().startswith(("classDiagram", "%%")) and "classDiagram" in text:
        text = re.sub(r"(?m)^\s*note .*\n", "", text)
    with tempfile.TemporaryDirectory() as tmp:
        mmd, cfg = Path(tmp, "d.mmd"), Path(tmp, "pp.json")
        mmd.write_text(text)
        cfg.write_text(json.dumps({"executablePath": CHROME, "args": ["--no-sandbox"]}))
        env = {**os.environ, "PUPPETEER_SKIP_DOWNLOAD": "1"}
        r = subprocess.run(["npx", "-y", CLI, "-i", str(mmd), "-o", str(out), "-p", str(cfg),
                            "-w", str(width), "-s", "1.5", "-b", "white"],
                           capture_output=True, text=True, env=env, timeout=240)
    if r.returncode or not out.exists():
        sys.exit(f"render failed for {src.name}: {r.stderr[-400:]}")


JS = r"""
// Places rendered diagram PNGs side by side, right of the canvas. Safe to rerun:
// it first removes images and headings an earlier run placed.
const { createShapeId, toRichText } = await import('tldraw')
const IMGS = __IMGS__
editor.deleteShapes(editor.getCurrentPageShapes().filter((s) => s.meta?.diagramImage || String(s.meta?.source || '').endsWith('(PNG)')).map((s) => s.id))
const frames = editor.getCurrentPageShapes().filter((s) => s.type === 'frame')
const right = Math.max(...frames.map((f) => editor.getShapePageBounds(f.id).maxX))
let x = right + 240
const out = []
for (const im of IMGS) {
	const bin = atob(im.b64), u8 = new Uint8Array(bin.length)
	for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
	const before = new Set(editor.getCurrentPageShapes().map((s) => s.id))
	await editor.putExternalContent({ type: 'files', files: [new File([u8], im.name, { type: 'image/png' })], point: { x: 0, y: 0 }, ignoreParent: true })
	const img = editor.getCurrentPageShapes().find((s) => !before.has(s.id) && s.type === 'image')
	// the drop point (0,0) lies inside a frame, so tldraw parents the image to it: move it to the page
	editor.reparentShapes([img.id], editor.getCurrentPageId())
	const w = __SHOW_W__, h = Math.round((w * im.h) / im.w)
	editor.updateShape({ id: img.id, type: 'image', x, y: 0, props: { w, h }, meta: { source: im.source + ' (PNG)', diagramImage: true } })
	editor.createShape({ id: createShapeId('h-img-' + im.name), type: 'text', x, y: -110,
		meta: { source: 'heading', diagramImage: true }, props: { size: 'xl', autoSize: true, richText: toRichText(im.title) } })
	out.push({ name: im.name, x, w, h })
	x += w + __GAP__
}
await helpers.saveDoc()
return { images: out, lints: await helpers.getLints() }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("design_dir", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--keep-notes", action="store_true")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    imgs = []
    for stem, title, width in LEVELS:
        src = a.design_dir / "diagrams" / f"{stem}.mmd"
        if not src.exists():
            print(f"skip {stem}: no {src}", file=sys.stderr)
            continue
        png = a.out / f"{stem}.png"
        render(src, png, width, a.keep_notes)
        w, h = png_size(png)
        imgs.append({"name": f"{stem}.png", "source": f"{stem}.mmd", "title": f"{title} ({stem}.mmd)",
                     "w": w, "h": h, "b64": base64.b64encode(png.read_bytes()).decode()})
    if not imgs:
        sys.exit("no diagrams to render")
    js = JS.replace("__IMGS__", json.dumps(imgs)).replace("__SHOW_W__", str(SHOW_W)).replace("__GAP__", str(GAP))
    (a.out / "place-images.js").write_text(js)
    print(json.dumps([{k: v for k, v in i.items() if k != "b64"} for i in imgs], indent=1))


if __name__ == "__main__":
    main()
