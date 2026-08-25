#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Refresh the embedded payload of .cobuilder-architect/self/pages/builds-view.html from docs/plans.

The page carries the plan markdown as text and renders it in the browser, so
there is one file per document on disk and no hand-authored HTML twin. This
script rewrites only the three generated lines: the window.BUILD payload, the
gate-to-document map, and the document titles. Everything else in the page is
authored by hand and is left alone.

Usage: uv run plugins/cobuilder-artifact/scripts/build_builds_view.py [--plan docs/plans/cobuilder-family]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))
import slice_table  # noqa: E402

# This script sits at <repo_root>/plugins/cobuilder-artifact/scripts/, so the
# repo root is three parents up. The defaults below resolve against it, so
# the script works from any working directory.
REPO_ROOT = Path(__file__).resolve().parents[3]

RUBRIC_COUNT = 14

TITLES = {
    "00-status.md": "Status",
    "01-product.md": "Product",
    "02-architecture.md": "Architecture",
    "02a-artifact-map.md": "Artifact map",
    "02b-view-designs.md": "View designs",
    "02c-record-model.md": "Record model",
    "03-program-design.md": "Program design",
    "04-slices.md": "Slices",
    "rubric-manifest": "Manifest",
}
TITLES.update({f"rubric-{n}": f"Slice {n}" for n in range(1, RUBRIC_COUNT + 1)})

GATE_DOCS = {
    "1": ["01-product.md"],
    "2": ["02-architecture.md", "02a-artifact-map.md",
          "02b-view-designs.md", "02c-record-model.md"],
    "3": ["03-program-design.md"],
    "4": ["04-slices.md", "rubric-manifest"]
         + [f"rubric-{n}" for n in range(1, RUBRIC_COUNT + 1)],
}

ASK_NOTES = {
    "1": "Approval moves to Gate 2, where the architecture, the data shapes, "
         "and the seam between the plugins are decided.",
    "2": "Approval moves to Gate 3 — program design — where the files, the "
         "type signatures, and the test plan are written before any "
         "implementation exists.",
    "3": "Approval moves to Gate 4, which writes the slice ladder and the "
         "blind rubrics. No implementation code is written before that.",
    "4": "Approval starts the build. Slice 1 is the tracer bullet.",
}

GATE_LINE = re.compile(r"- Gate (\d) — ([^:]+): (.+)")


def read_epics(designs_dir: Path, slices_md: str) -> list[dict]:
    """Every epic of every design, with the slices that advance it.

    The epic list is the backlog. An epic with no branch is planned and not
    started, which is the state the Builds view's Backlog lane shows.
    """
    by_epic: dict[str, list[dict]] = {}
    for row in slice_table.parse_table(slices_md).rows:
        by_epic.setdefault(row.epic_id, []).append(
            {"n": row.n, "name": row.name.replace("**", ""),
             "score": (row.score or "").strip(), "state": (row.state or "").strip()})

    epics = []
    for goal in sorted(designs_dir.glob("*/goal.json")):
        d = json.loads(goal.read_text())
        design = d.get("name", goal.parent.name)
        for e in d.get("epics", []):
            key = f"{design}/{e['id']}"
            epics.append({
                "id": e["id"], "key": key, "design": design,
                "note": e.get("note", ""), "state": e.get("state", "planned"),
                "branch": e.get("branch"), "pr": e.get("pr"),
                "slices": by_epic.get(key, []),
                "adrs": d.get("adrs", []),
            })
    return epics


def read_rubrics(rubrics_dir: Path) -> tuple[dict, dict]:
    """The blind rubrics as doc keys, plus their real repo-relative paths.

    A rubric key maps to a slice number by its file name: `slice-N.md`
    becomes `rubric-N`. The manifest is YAML, so it is wrapped in a fenced
    code block before it joins the markdown documents, or the page's
    markdown renderer prints it as garbage.
    """
    docs: dict[str, str] = {}
    paths: dict[str, str] = {}
    for n in range(1, RUBRIC_COUNT + 1):
        p = rubrics_dir / f"slice-{n}.md"
        if p.exists():
            docs[f"rubric-{n}"] = p.read_text()
            paths[f"rubric-{n}"] = str(p)
    manifest = rubrics_dir / "manifest.yaml"
    if manifest.exists():
        docs["rubric-manifest"] = "```yaml\n" + manifest.read_text() + "\n```"
        paths["rubric-manifest"] = str(manifest)
    return docs, paths


def read_plan(plan_dir: Path, designs_dir: Path, rubrics_dir: Path) -> dict:
    docs = {p.name: p.read_text() for p in sorted(plan_dir.glob("*.md"))}
    paths = {name: str(plan_dir / name) for name in docs}
    rubric_docs, rubric_paths = read_rubrics(rubrics_dir)
    docs.update(rubric_docs)
    paths.update(rubric_paths)
    gates = []
    for line in docs.get("00-status.md", "").splitlines():
        m = GATE_LINE.match(line.strip())
        if m:
            gates.append({"n": m.group(1), "name": m.group(2).strip(),
                          "state": m.group(3).strip()})
    epics = read_epics(designs_dir, docs.get("04-slices.md", ""))
    return {"docs": docs, "gates": gates, "epics": epics, "paths": paths}


def current_doc(gates: list[dict]) -> tuple[str, str, bool]:
    """The gate the page opens on: the first one not yet approved.

    Returns the gate, its first document, and whether that gate is still
    waiting for an answer. Every gate approved means the build is running,
    so the page opens on the last gate and asks nothing.
    """
    for g in gates:
        if not g["state"].startswith("APPROVED"):
            present = [d for d in GATE_DOCS.get(g["n"], []) if d]
            if present:
                return g["n"], present[0], True
    last = gates[-1]["n"] if gates else "1"
    present = [d for d in GATE_DOCS.get(last, []) if d]
    return last, (present[0] if present else "01-product.md"), False


def render(page: Path, plan_dir: Path, designs_dir: Path, rubrics_dir: Path) -> None:
    payload = read_plan(plan_dir, designs_dir, rubrics_dir)
    present = {k: [d for d in v if d in payload["docs"]]
               for k, v in GATE_DOCS.items()}
    gate, doc, pending = current_doc(payload["gates"])
    blob = json.dumps(payload).replace("</", r"<\/")

    lines = page.read_text().split("\n")
    for i, line in enumerate(lines):
        if line.startswith("<script>window.BUILD="):
            lines[i] = f"<script>window.BUILD={blob};</script>"
        elif line.startswith("var GATEDOC="):
            lines[i] = f"var GATEDOC={json.dumps(present)};"
        elif line.startswith("var TITLE="):
            titles = {k: v for k, v in TITLES.items() if k in payload["docs"]}
            lines[i] = f"var TITLE={json.dumps(titles)};"
        elif line.startswith("var cur="):
            lines[i] = f'var cur={{gate:"{gate}",doc:"{doc}"}};'
        elif line.startswith("var ASKDOC="):
            lines[i] = f'var ASKDOC={json.dumps(doc if pending else "")};'
        elif line.startswith("var ASKGATE="):
            lines[i] = f'var ASKGATE={json.dumps(gate)};'
        elif line.startswith("var ASKNOTE="):
            lines[i] = f'var ASKNOTE={json.dumps(ASK_NOTES.get(gate, "") if pending else "")};'
        elif line.startswith("buildRail(); go("):
            lines[i] = f'buildRail(); go("{gate}","{doc}");'
    page.write_text("\n".join(lines))
    planned = [e for e in payload["epics"] if not e["branch"]]
    print(f"{page}: {len(payload['docs'])} documents, "
          f"{len(payload['gates'])} gates, {len(payload['epics'])} epics "
          f"({len(planned)} in the backlog), opens on gate {gate}, "
          f"{'awaiting approval' if pending else 'all gates approved'}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", default=str(REPO_ROOT / "docs" / "plans" / "cobuilder-family"))
    ap.add_argument("--page", default=str(REPO_ROOT / ".cobuilder-architect" / "self" / "pages" / "builds-view.html"))
    ap.add_argument("--designs", default=str(REPO_ROOT / "docs" / "architecture" / "designs"))
    ap.add_argument("--rubrics", default=str(REPO_ROOT / ".cobuilder" / "rubrics" / "cobuilder-family"))
    a = ap.parse_args()
    render(Path(a.page), Path(a.plan), Path(a.designs), Path(a.rubrics))


if __name__ == "__main__":
    main()