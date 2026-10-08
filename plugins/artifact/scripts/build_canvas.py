#!/usr/bin/env python3
"""Read one CoBuilder design folder and emit the data for its tldraw canvas.

Usage:
  build_canvas.py <design-dir> --format spec   # JSON: every fact the canvas needs
  build_canvas.py <design-dir> --format js     # JS for tldraw /exec: draws the frames,
                                               # the Why zone and the Contract zone

Reads goal.json (required), narrative.json and intent.json (optional) and lists
diagrams/*.mmd. The JS draws the outcome and why-now cards of zone A and all of zone E.
It draws the before/after frame (inside A) and zones B, C and D as empty frames for the agent.
"""
import argparse
import json
import re
import sys
from pathlib import Path

STATE_COLOUR = {"planned": "grey", "open": "blue", "in-progress": "orange",
                "done": "green", "completed": "green", "accepted": "green",
                "implemented": "green", "merged": "green"}
LEVELS = [("landscape", "level-1", "Landscape: who are the parts"),
          ("flow", "level-2", "Flow: what happens, in order"),
          ("structure", "level-3", "Structure: the central thing")]
FRAME_W, FRAME_H, GAP = 1300, 1000, 120


def load(path):
    return json.loads(path.read_text()) if path.exists() else {}


def short(text, limit=320):
    text = text if isinstance(text, str) else json.dumps(text) if text else ""
    """Keep whole sentences up to the limit."""
    sentences = re.split(r"(?<=[.!?])\s+", (text or "").strip())
    out = ""
    for s in sentences:
        if out and len(out) + len(s) > limit:
            break
        out = f"{out} {s}".strip()
    return out[:limit + 80]


def diagram_info(path):
    """Return the leading %% comment block and the diagram type of a .mmd file."""
    lines = path.read_text().splitlines()
    comment = " ".join(l[2:].strip() for l in lines if l.startswith("%%"))
    kind = next((l.split()[0] for l in lines if l.strip() and not l.startswith("%%")), "")
    return {"path": str(path), "kind": kind, "summary": short(comment, 500)}


def build_spec(design):
    goal = load(design / "goal.json")
    if not goal:
        sys.exit(f"no goal.json in {design}")
    narr, intent = load(design / "narrative.json"), load(design / "intent.json")
    ps = narr.get("problem_solution", {})
    diagrams = {}
    for key, stem, title in LEVELS:
        p = design / "diagrams" / f"{stem}.mmd"
        diagrams[key] = {"title": title, **(diagram_info(p) if p.exists() else {"path": None})}
    return {
        "design": design.name,
        "title": goal.get("title", design.name),
        "tagline": narr.get("landscape", {}).get("tagline") or goal.get("title"),
        "outcome": short(goal.get("outcome"), 360),
        "why_now": short(intent.get("why_now"), 300),
        "problem": short(ps.get("problem") or intent.get("problem")),
        "solution": short(ps.get("solution") or intent.get("approach")),
        "epics": [{"slug": e["slug"], "title": e.get("title", e["slug"]),
                   "state": e.get("state", "planned"), "adr": e.get("adr"),
                   "depends_on": e.get("depends_on", []), "index": n}
                  for n, e in enumerate(goal.get("epics", []))],
        "done_when": goal.get("done_when", []),
        "diagrams": diagrams,
    }


def layers(epics):
    """Column of each epic = longest dependency chain below it."""
    by = {e["slug"]: e for e in epics}
    memo = {}

    def depth(slug, seen=()):
        if slug in memo:
            return memo[slug]
        deps = [d for d in by[slug]["depends_on"] if d in by and d not in seen]
        memo[slug] = 0 if not deps else 1 + max(depth(d, seen + (slug,)) for d in deps)
        return memo[slug]

    return {e["slug"]: depth(e["slug"]) for e in epics}


MAX_ROWS = 4


def to_js(spec):
    cols = layers(spec["epics"])
    # A dependency layer taller than MAX_ROWS wraps into extra columns, so a design with
    # no dependencies draws as a grid and not as one tall column.
    slots, width_of, next_col = {}, {}, 0
    for layer in sorted(set(cols.values())):
        members = [e for e in spec["epics"] if cols[e["slug"]] == layer]
        for n, e in enumerate(members):
            slots[e["slug"]] = (next_col + n // MAX_ROWS, n % MAX_ROWS)
        next_col += (len(members) - 1) // MAX_ROWS + 1
    rows, placed = {}, []
    for e in spec["epics"]:
        c, r = slots[e["slug"]]
        rows[c] = max(rows.get(c, 0), r + 1)
        placed.append({**e, "col": c, "row": r, "colour": STATE_COLOUR.get(e["state"], "grey")})
    contract_h = 160 + max(rows.values(), default=1) * 150
    why_h = 640
    y_diag = why_h + GAP
    y_contract = y_diag + FRAME_H + GAP
    width = 3 * FRAME_W + 2 * GAP
    data = {"spec": spec, "placed": placed, "why_h": why_h, "y_diag": y_diag,
            "y_contract": y_contract, "contract_h": contract_h, "width": width,
            "frame_w": FRAME_W, "frame_h": FRAME_H, "gap": GAP,
            "state_colour": STATE_COLOUR}
    return JS_TEMPLATE.replace("__DATA__", json.dumps(data, indent=1))


JS_TEMPLATE = r"""
const D = __DATA__
const { createShapeId, toRichText } = await import('tldraw')
const S = D.spec
const id = (k) => createShapeId(k)
const lines = (t, w) => Math.max(1, Math.ceil((t || '').length / (w / 8.5)))
const cardH = (t, w) => Math.max(70, 36 + lines(t, w) * 20)
const NO_LABEL = '\u200b' // a blank name shows "Frame"; a zero-width space shows nothing
const frame = (key, name, x, y, w, h) => {
	editor.createShape({ id: id(key), type: 'frame', x, y, props: { w, h, name: NO_LABEL } })
	return id(key)
}
const card = (key, parent, x, y, w, text, colour, source, minH = 0) => {
	const h = Math.max(minH, cardH(text, w))
	editor.createShape({
		id: id(key), type: 'geo', parentId: parent, x, y,
		meta: { source },
		props: { geo: 'rectangle', w, h, color: colour, fill: 'semi', size: 's',
			verticalAlign: 'start', align: 'start', richText: toRichText(text) },
	})
	return { id: id(key), h }
}

// Zone A: Why. Outcome and why-now on the left, an empty frame on the right for the
// agent to draw the before/after picture (problem on the left, solution on the right).
const A = frame('zone-why', 'Why: ' + S.tagline, 0, 0, D.width, D.why_h)
const t = card('why-outcome', A, 40, 60, 1000, 'Outcome: ' + S.outcome, 'violet', 'goal.json#outcome')
if (S.why_now) card('why-now', A, 40, 60 + t.h + 40, 1000, 'Why now: ' + S.why_now, 'yellow', 'intent.json#why_now')
editor.createShape({ id: id('why-beforeafter'), type: 'frame', parentId: A, x: 1140, y: 60,
	props: { w: D.width - 1140 - 40, h: D.why_h - 100, name: NO_LABEL } })

// Zones B, C, D: empty frames for the agent to fill from the diagrams
;[['landscape', 0], ['flow', 1], ['structure', 2]].forEach(([k, i]) =>
	frame('zone-' + k, S.diagrams[k].title, i * (D.frame_w + D.gap), D.y_diag, D.frame_w, D.frame_h))

// Zone E: Contract
const E = frame('zone-contract', 'Contract: ' + S.epics.length + ' epics, colour = state', 0, D.y_contract, D.width, D.contract_h)
const CW = 420, CG = 140
D.placed.forEach((e) =>
	card('epic-' + e.slug, E, 40 + e.col * (CW + CG), 60 + e.row * 150, CW,
		e.title + '\n[' + e.state + (e.adr ? ' | ' + e.adr : '') + ']', e.colour, `goal.json#epics[${e.index}]`, 120))
D.placed.forEach((e) => e.depends_on.forEach((dep) => {
	if (D.placed.some((x) => x.slug === dep))
		helpers.createArrowBetweenShapes(id('epic-' + dep), id('epic-' + e.slug), {})
}))
// Headings: tldraw's own frame label is tiny and fixed, so each zone gets a large text
// shape above its frame (outside the frame, so it passes the text-crosses-container lint)
const heading = (key, text, x, y) =>
	editor.createShape({ id: id(key), type: 'text', x, y: y - 110,
		meta: { source: 'heading' }, props: { size: 'xl', autoSize: true, richText: toRichText(text) } })
heading('h-why', 'Why: ' + S.tagline, 0, 0)
;[['landscape', 0], ['flow', 1], ['structure', 2]].forEach(([k, i]) =>
	heading('h-' + k, S.diagrams[k].title, i * (D.frame_w + D.gap), D.y_diag))
heading('h-contract', 'Contract: ' + S.epics.length + ' epics. Colour = state (grey planned, blue open, orange in-progress, green completed or implemented)', 0, D.y_contract)
await helpers.saveDoc()
return { frames: ['zone-why', 'why-beforeafter', 'zone-landscape', 'zone-flow', 'zone-structure', 'zone-contract'], epics: D.placed.length }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("design_dir", type=Path)
    ap.add_argument("--format", choices=["spec", "js"], default="spec")
    a = ap.parse_args()
    spec = build_spec(a.design_dir)
    print(json.dumps(spec, indent=2) if a.format == "spec" else to_js(spec))


if __name__ == "__main__":
    main()
