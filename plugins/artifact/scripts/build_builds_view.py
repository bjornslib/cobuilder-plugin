#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Refresh the embedded payload of .cobuilder-architect/self/pages/builds-view.html from docs/plans.

The page carries the plan markdown as text and renders it in the browser, so
there is one file per document on disk and no hand-authored HTML twin. This
script rewrites only the generated lines between the `<!-- BEGIN GENERATED -->`
and `<!-- END GENERATED -->` markers. A line outside the markers is never
inspected and never changed. Everything else in the page is authored by hand
and is left alone.

Usage: uv run plugins/artifact/scripts/build_builds_view.py [--plan docs/plans/cobuilder-family]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))
import slice_table  # noqa: E402

# This script sits at <repo_root>/plugins/artifact/scripts/, so the
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
    # Was: no entry. GATE_DOCS named "interaction-design.md" for gate 2b
    # without a title, so the rail printed the text "undefined".
    "interaction-design.md": "Interaction design",
    "03-program-design.md": "Program design",
    "04-slices.md": "Slices",
    "rubric-manifest": "Manifest",
}
TITLES.update({f"rubric-{n}": f"Slice {n}" for n in range(1, RUBRIC_COUNT + 1)})

GATE_DOCS = {
    "1": ["01-product.md"],
    "2": ["02-architecture.md", "02a-artifact-map.md",
          "02b-view-designs.md", "02c-record-model.md"],
    "2b": ["interaction-design.md"],
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
    # Was: no entry. A page that opened on a pending Gate 2b printed an
    # empty approval prompt.
    "2b": "Approval moves to Gate 3 — program design — where the files, "
          "the type signatures, and the test plan are written before any "
          "implementation exists.",
    "3": "Approval moves to Gate 4, which writes the slice ladder and the "
         "blind rubrics. No implementation code is written before that.",
    "4": "Approval starts the build. Slice 1 is the tracer bullet.",
}

# Was: re.compile(r"- Gate (\d) — ([^:]+): (.+)"). The label group now
# accepts a letter suffix, so "Gate 2b" parses.
GATE_LINE = re.compile(r"- Gate (\d\w?) — ([^:]+): (.+)")

BEGIN_MARKER = "<!-- BEGIN GENERATED -->"
END_MARKER = "<!-- END GENERATED -->"


def find_fence(page: Path, lines: list[str]) -> tuple[int, int]:
    """The line indexes of the BEGIN and END markers, exclusive of both.

    A missing marker, a duplicated marker, or an END that appears before or
    at BEGIN is an error. The fence must be unambiguous, because it is the
    only thing that stops a hand-authored line from being overwritten by
    accident.
    """
    begins = [i for i, line in enumerate(lines) if line.strip() == BEGIN_MARKER]
    ends = [i for i, line in enumerate(lines) if line.strip() == END_MARKER]

    def fail(reason: str) -> None:
        print(
            f"error: {page} {reason}.\n"
            f"remediation: add exactly one `{BEGIN_MARKER}` line before the "
            f"generated block and exactly one `{END_MARKER}` line after it.",
            file=sys.stderr,
        )
        sys.exit(1)

    if len(begins) == 0:
        fail("has no `<!-- BEGIN GENERATED -->` marker")
    if len(begins) > 1:
        fail("has more than one `<!-- BEGIN GENERATED -->` marker")
    if len(ends) == 0:
        fail("has no `<!-- END GENERATED -->` marker")
    if len(ends) > 1:
        fail("has more than one `<!-- END GENERATED -->` marker")
    if ends[0] <= begins[0]:
        fail("has `<!-- END GENERATED -->` before or at `<!-- BEGIN GENERATED -->`")
    return begins[0], ends[0]


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


def is_resolved(state: str) -> bool:
    """A resolved gate needs no answer: it reads APPROVED or n/a.

    The state line holds free text after the colon, so the test reads the
    prefix and not the whole value.
    """
    return state.startswith("APPROVED") or state.startswith("n/a")


def current_doc(
    gates: list[dict], present: dict[str, list[str]]
) -> tuple[str, str | None, bool]:
    """The gate the page opens on, and the document to show with it.

    An open gate is the first gate that still needs an answer. The page
    shows that gate's first document when the plan holds it, and no
    document when it does not.

    Every gate resolved means nothing waits. The page then shows the last
    gate that holds a document.

    `present` is the document map filtered to the files the plan holds, so
    a returned document always exists on disk.

    Returns the gate, its document or None, and whether the gate waits for
    an answer.
    """
    for g in gates:
        if not is_resolved(g["state"]):
            docs = present.get(g["n"], [])
            return g["n"], (docs[0] if docs else None), True
    for g in reversed(gates):
        docs = present.get(g["n"], [])
        if docs:
            return g["n"], docs[0], False
    return (gates[-1]["n"] if gates else "1"), None, False


def render(page: Path, plan_dir: Path, designs_dir: Path, rubrics_dir: Path) -> None:
    payload = read_plan(plan_dir, designs_dir, rubrics_dir)
    present = {k: [d for d in v if d in payload["docs"]]
               for k, v in GATE_DOCS.items()}
    gate, doc, pending = current_doc(payload["gates"], present)
    blob = json.dumps(payload).replace("</", r"<\/")

    lines = page.read_text().split("\n")
    begin, end = find_fence(page, lines)
    for i in range(begin + 1, end):
        line = lines[i]
        if line.startswith("<script>window.BUILD="):
            lines[i] = f"<script>window.BUILD={blob};</script>"
        elif line.startswith("var GATEDOC="):
            lines[i] = f"var GATEDOC={json.dumps(present)};"
        elif line.startswith("var TITLE="):
            # Was: titles = {k: v for k, v in TITLES.items() if k in payload["docs"]}
            # An unlisted document vanished from the map, so the rail printed
            # the text "undefined" for it. Every held document now carries a
            # title, and an unlisted one falls back to its file name.
            titles = {k: TITLES.get(k, k) for k in payload["docs"]}
            lines[i] = f"var TITLE={json.dumps(titles)};"
        elif line.startswith("var cur="):
            # Was: f'var cur={{gate:"{gate}",doc:"{doc}"}};'
            # A missing document must be null, not the text "None".
            lines[i] = f"var cur={{gate:{json.dumps(gate)},doc:{json.dumps(doc)}}};"
        elif line.startswith("var ASKDOC="):
            # Was: doc if pending else "". A missing document must not fire
            # the "rendered from the markdown" note, which names a path.
            lines[i] = f"var ASKDOC={json.dumps(doc if (pending and doc) else '')};"
        elif line.startswith("var ASKGATE="):
            # Was: json.dumps(gate). The ask block keys on the gate, so an
            # empty ask gate is what tells the page that nothing waits.
            lines[i] = f"var ASKGATE={json.dumps(gate if pending else '')};"
        elif line.startswith("var ASKNOTE="):
            lines[i] = f'var ASKNOTE={json.dumps(ASK_NOTES.get(gate, "") if pending else "")};'
        elif line.startswith("buildRail(); go("):
            lines[i] = f"buildRail(); go({json.dumps(gate)}, {json.dumps(doc)});"
    page.write_text("\n".join(lines))
    planned = [e for e in payload["epics"] if not e["branch"]]
    print(f"{page}: {len(payload['docs'])} documents, "
          f"{len(payload['gates'])} gates, {len(payload['epics'])} epics "
          f"({len(planned)} in the backlog), opens on gate {gate}, "
          f"{'awaiting approval' if pending else 'no gate awaiting an answer'}")


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