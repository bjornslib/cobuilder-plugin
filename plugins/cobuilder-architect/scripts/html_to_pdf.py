#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright>=1.40"]
# ///
"""Convert architecture review HTML reports to PDF.

Usage:
    python3 html_to_pdf.py <path> [--output-dir <dir>]

    <path>  A single HTML file or a directory containing HTML files.
            If a directory, all *.html files are converted.
    --output-dir <dir>  Directory for PDF output (default: same as input files).

The script uses Playwright's Chromium browser to render each HTML file
and save it as a PDF with print-quality settings (A4, backgrounds enabled).

Exit codes:
    0  All files converted successfully
    1  One or more conversions failed
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def convert_html_to_pdf(html_path: Path, pdf_path: Path) -> bool:
    """Convert a single HTML file to PDF using Playwright.

    Args:
        html_path: Path to the source HTML file.
        pdf_path: Path for the output PDF file.

    Returns:
        True if conversion succeeded, False otherwise.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("ERROR: playwright is not installed. Run: pip install playwright && playwright install chromium", file=sys.stderr)
        return False

    html_url = html_path.as_uri()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(html_url, wait_until="networkidle")
            page.pdf(
                path=str(pdf_path),
                format="A4",
                print_background=True,
                margin={"top": "15mm", "bottom": "15mm", "left": "15mm", "right": "15mm"},
            )
            browser.close()
    except Exception as exc:
        print(f"ERROR converting {html_path.name}: {exc}", file=sys.stderr)
        return False

    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert HTML reports to PDF")
    parser.add_argument("path", type=Path, help="HTML file or directory of HTML files")
    parser.add_argument("--output-dir", type=Path, default=None, help="Output directory for PDFs (default: same as input)")
    args = parser.parse_args()

    source = args.path.resolve()

    if source.is_file():
        html_files = [source]
    elif source.is_dir():
        html_files = sorted(source.glob("*.html"))
        if not html_files:
            print(f"No HTML files found in {source}", file=sys.stderr)
            return 1
    else:
        print(f"Path not found: {source}", file=sys.stderr)
        return 1

    output_dir = args.output_dir.resolve() if args.output_dir else None
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)

    successes = 0
    failures = 0

    for html_file in html_files:
        pdf_dir = output_dir or html_file.parent
        pdf_name = html_file.stem + ".pdf"
        pdf_path = pdf_dir / pdf_name

        print(f"Converting {html_file.name} -> {pdf_path.name} ...", file=sys.stderr)
        if convert_html_to_pdf(html_file, pdf_path):
            print(f"  OK: {pdf_path}", file=sys.stderr)
            successes += 1
        else:
            failures += 1

    total = successes + failures
    print(f"Converted {successes}/{total} files", file=sys.stderr)

    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())