#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
check_design_svg.py: structure validator for a design's runtime-architecture
SVG (ADR-0036). Mirrors the SVG checks of check_options_report.py (ADR-0035).

Usage:
  uv run check_design_svg.py <runtime-architecture.svg>

Output: one line per result, "ERROR check N: message" or "WARN check N: message".
Exit code: 0 when no error result exists, else 1. A warning never changes it.

Checks:
  1  The root element is <svg>.
  2  The root <svg> carries a viewBox.
  3  Every <g id> anywhere in the document holds a <title> as its first
     child element.
  4  No <script> element anywhere; no href or xlink:href value that is
     external (starts with http:, https:, file:, or //).
  5  Warning only: a <text> longer than 70 characters.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from html.parser import HTMLParser

MAX_TEXT = 70
EXTERNAL_PREFIXES = ("http:", "https:", "file:", "//")


@dataclass(frozen=True)
class Result:
    check: int
    severity: str  # "error" | "warning"
    message: str


class _SvgCheck(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.first_tag: tuple[str, dict] | None = None
        self.viewbox: bool = False
        self.in_svg_depth: int = 0
        self.g_stack: list[dict] = []  # {"id": str, "saw_title": bool}
        self.results: list[Result] = []
        self.script_seen: bool = False
        self.external_href: str | None = None
        self.text_buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        a = dict(attrs)
        if self.first_tag is None:
            self.first_tag = (tag, a)
            self.viewbox = "viewBox" in a or "viewbox" in a
        if tag == "svg":
            self.in_svg_depth += 1
        elif tag == "g":
            self.g_stack.append({"id": a.get("id", ""), "saw_title": False, "child_seen": False})
        elif tag == "title":
            if self.g_stack and not self.g_stack[-1]["child_seen"]:
                self.g_stack[-1]["saw_title"] = True
        elif tag == "script":
            self.script_seen = True
        else:
            if self.g_stack:
                self.g_stack[-1]["child_seen"] = True
        href = a.get("href") or a.get("xlink:href")
        if href and href.startswith(EXTERNAL_PREFIXES) and self.external_href is None:
            self.external_href = href
        if tag == "text":
            self.text_buffer = []

    def handle_startendtag(self, tag: str, attrs) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        self.text_buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "text":
            text = " ".join("".join(self.text_buffer).split())
            if len(text) > MAX_TEXT:
                self.results.append(
                    Result(5, "warning", f"<text> longer than {MAX_TEXT} characters: {text[:60]}…")
                )
            self.text_buffer = []
        if tag == "g" and self.g_stack:
            entry = self.g_stack.pop()
            if entry["id"] and not entry["saw_title"]:
                self.results.append(
                    Result(3, "error", f"<g id=\"{entry['id']}\"> has no <title>")
                )
        if tag == "svg":
            self.in_svg_depth = max(0, self.in_svg_depth - 1)


def check_design_svg(svg: str) -> list[Result]:
    scan = _SvgCheck()
    scan.feed(svg)
    scan.close()
    results: list[Result] = []
    if scan.first_tag is None:
        return [Result(1, "error", "the document holds no element")]
    tag, _attrs = scan.first_tag
    if tag != "svg":
        results.append(Result(1, "error", f"the root element is <{tag}>, not <svg>"))
    if not scan.viewbox:
        results.append(Result(2, "error", "the root <svg> carries no viewBox"))
    # g/title results arrive during parsing; order them after the root checks
    # by rebuilding the list with parse-time errors first, then sorted by check.
    parse_time = [r for r in scan.results if r.check in (3, 5)]
    results.extend(parse_time)
    if scan.script_seen:
        results.insert(
            len([r for r in results if r.check in (1, 2)]),
            Result(4, "error", "the file contains a <script> element"),
        )
    if scan.external_href is not None:
        results.insert(
            len([r for r in results if r.check in (1, 2, 4)]),
            Result(4, "error", f"an external reference is present: {scan.external_href[:60]}…"),
        )
    return results


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print("usage: check_design_svg.py <runtime-architecture.svg>", file=sys.stderr)
        return 2
    try:
        svg = open(args[0], encoding="utf-8", errors="replace").read()
    except OSError as exc:
        print(f"error: cannot read {args[0]}: {exc}", file=sys.stderr)
        return 2
    results = check_design_svg(svg)
    if not results:
        print("ok: all checks passed")
        return 0
    for r in results:
        print(f"{'ERROR' if r.severity == 'error' else 'WARN'} check {r.check}: {r.message}")
    return 1 if any(r.severity == "error" for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())