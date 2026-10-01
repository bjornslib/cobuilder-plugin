#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
check_options_report.py: structure validator for an options-mode report.

Usage:
  uv run check_options_report.py <report.html>

Output: one line per result, "ERROR check N: message" or "WARN check N: message".
Exit code: 0 when no error result exists, else 1. A warning never changes it.

Checks:
  1  All ten section anchors exist.
  2  fig-current, fig-flow, and fig-proposed are <svg> elements with a viewBox.
  3  Every <g id> inside an <svg> holds a <title>.
  4  Every row-<ID> has a dir-<ID> element, or its text says "no direction".
  5  Every confidence cell holds one of Verified, ADR only, Hypothesis.
     A confidence cell is any element with a data-confidence attribute.
     Each row-<ID> row must hold at least one such cell.
  6  No src or href value starts with http outside the Evidence section.
  7  No <script src> and no <link rel="stylesheet" href>.
  8  The page has a <title>, a .prompt-box, a "Copy all answers" button, and
     no reference to window.lavish.
  9  Warning only: an SVG <text> longer than 70 characters.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from html.parser import HTMLParser

ANCHORS: tuple[str, ...] = (
    "summary", "current", "flow", "inquiries", "directions",
    "proposed", "gaps", "order", "decide", "evidence",
)
FIGURES: tuple[str, ...] = ("fig-current", "fig-flow", "fig-proposed")
CONFIDENCE: frozenset[str] = frozenset({"Verified", "ADR only", "Hypothesis"})
MAX_SVG_TEXT = 70
VOID = frozenset({
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
})


@dataclass(frozen=True)
class Result:
    check: int
    severity: str  # "error" | "warning"
    message: str


class _Scan(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, dict]] = []
        self.ids: dict[str, str] = {}
        self.fig_attrs: dict[str, dict[str, str | None]] = {}
        self.g_ids: list[dict] = []
        self.rows: dict[str, dict] = {}
        self.conf: list[str] = []
        self.external: list[tuple[str, str, str]] = []  # (tag, attr, value)
        self.bad_script: list[str] = []
        self.bad_link: list[str] = []
        self.title_text: list[str] = []
        self.has_title = False
        self.has_prompt_box = False
        self.buttons: list[str] = []
        self.long_text: list[str] = []

    # helpers
    def _open(self, tag: str) -> list[dict]:
        return [info for name, info in self.stack if name == tag]

    def _in_tag(self, tag: str) -> bool:
        return any(name == tag for name, _ in self.stack)

    def _in_evidence(self) -> bool:
        return any(info.get("id") == "evidence" for _, info in self.stack)

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v if v is not None else "") for k, v in attrs}
        info: dict = {"id": a.get("id")}
        if "id" in a:
            self.ids.setdefault(a["id"], tag)
        if a.get("id") in FIGURES:
            self.fig_attrs[a["id"]] = {"tag": tag, "viewbox": a.get("viewbox")}
        for attr in ("src", "href"):
            val = a.get(attr, "").strip()
            if val.lower().startswith("http") and not self._in_evidence():
                self.external.append((tag, attr, val))
        if tag == "script" and "src" in a:
            self.bad_script.append(a["src"])
        if tag == "link" and "stylesheet" in a.get("rel", "").lower() and "href" in a:
            self.bad_link.append(a["href"])
        if tag == "title" and not self._in_tag("svg"):
            self.has_title = True
        if tag == "title":
            for g in self._open("g"):
                g["has_title"] = True
        classes = a.get("class", "").split()
        if "prompt-box" in classes:
            self.has_prompt_box = True
        if tag == "g" and "id" in a and self._in_tag("svg"):
            info["has_title"] = False
            info["g"] = True
            self.g_ids.append(info)
        if tag == "tr" and (a.get("id") or "").startswith("row-"):
            info["row"] = {"id": a["id"][4:], "text": [], "conf": 0}
            self.rows[a["id"][4:]] = info["row"]
        if "data-confidence" in a:
            info["conf"] = []
            for _, parent in self.stack:
                if "row" in parent:
                    parent["row"]["conf"] += 1
        if tag == "button":
            info["button"] = []
        if tag == "text" and self._in_tag("svg"):
            info["svgtext"] = []
        if tag not in VOID:
            self.stack.append((tag, info))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for _, info in self.stack[i:]:
                    self._close(info)
                del self.stack[i:]
                return

    def _close(self, info: dict) -> None:
        if "conf" in info and isinstance(info["conf"], list):
            self.conf.append(" ".join("".join(info["conf"]).split()))
        if "button" in info:
            self.buttons.append(" ".join("".join(info["button"]).split()))
        if "svgtext" in info:
            text = " ".join("".join(info["svgtext"]).split())
            if len(text) > MAX_SVG_TEXT:
                self.long_text.append(text)

    def handle_data(self, data):
        if self._in_tag("title") and not self._in_tag("svg"):
            self.title_text.append(data)
        for _, info in self.stack:
            for key in ("conf", "button", "svgtext"):
                if key in info and isinstance(info[key], list):
                    info[key].append(data)
            if "row" in info:
                info["row"]["text"].append(data)


def check_report(html: str) -> list[Result]:
    scan = _Scan()
    scan.feed(html)
    scan.close()
    out: list[Result] = []

    def err(n: int, msg: str) -> None:
        out.append(Result(n, "error", msg))

    for anchor in ANCHORS:
        if anchor not in scan.ids:
            err(1, f"missing anchor id=\"{anchor}\"")

    for fig in FIGURES:
        found = scan.fig_attrs.get(fig)
        if found is None:
            err(2, f"missing element id=\"{fig}\"")
        elif found["tag"] != "svg":
            err(2, f"id=\"{fig}\" is <{found['tag']}>, not <svg>")
        elif not (found["viewbox"] or "").strip():
            err(2, f"id=\"{fig}\" has no viewBox")

    for g in scan.g_ids:
        if not g["has_title"]:
            err(3, f"<g id=\"{g['id']}\"> has no <title>")

    for rid, row in scan.rows.items():
        text = " ".join("".join(row["text"]).split()).lower()
        if f"dir-{rid}" not in scan.ids and "no direction" not in text:
            err(4, f"row-{rid} has no dir-{rid} element and no \"no direction\" text")
        if row["conf"] == 0:
            err(5, f"row-{rid} has no confidence cell (data-confidence)")

    for value in scan.conf:
        if value not in CONFIDENCE:
            err(5, f"confidence value \"{value}\" is not one of "
                   f"{', '.join(sorted(CONFIDENCE))}")

    for tag, attr, value in scan.external:
        err(6, f"<{tag} {attr}=\"{value}\"> is external outside Evidence")

    for src in scan.bad_script:
        err(7, f"<script src=\"{src}\"> loads an external script")
    for href in scan.bad_link:
        err(7, f"<link rel=\"stylesheet\" href=\"{href}\"> loads an external stylesheet")

    if not "".join(scan.title_text).strip():
        err(8, "the page has no <title>")
    if not scan.has_prompt_box:
        err(8, "the page has no .prompt-box")
    if "Copy all answers" not in scan.buttons:
        err(8, "the page has no \"Copy all answers\" button")
    if "window.lavish" in html.lower():
        err(8, "the page refers to window.lavish")

    for text in scan.long_text:
        out.append(Result(9, "warning",
                          f"SVG text of {len(text)} characters (limit {MAX_SVG_TEXT}): "
                          f"\"{text[:40]}...\""))
    return out


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print("usage: check_options_report.py <report.html>", file=sys.stderr)
        return 2
    try:
        with open(args[0], encoding="utf-8") as fh:
            html = fh.read()
    except OSError as exc:
        print(f"cannot read {args[0]}: {exc}", file=sys.stderr)
        return 2
    results = check_report(html)
    for r in results:
        label = "ERROR" if r.severity == "error" else "WARN"
        print(f"{label} check {r.check}: {r.message}")
    return 1 if any(r.severity == "error" for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
