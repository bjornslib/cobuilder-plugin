#!/usr/bin/env python3
"""Check that canvas mode can run, and resolve the design folder.

Prints one JSON object. Exit code 0 when canvas mode can run, 1 when it cannot.

Hard requirements (exit 1 if missing):
  - the design folder holds goal.json
  - the tldraw-offline skill is installed (tq.mjs)
  - the tldraw Desktop app is running and answers on its local port
Soft requirements (reported in "images_ok", do not change the exit code):
  - npx and Google Chrome, needed to render the diagram images

Standard library only.
"""
import argparse
import json
import os
import shutil
import socket
import sys
from pathlib import Path

SERVER_JSON = Path.home() / "Library/Application Support/tldraw/server.json"
CHROME = os.environ.get("CHROME_PATH", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


def find_tldraw_skills():
    """Return the directory that holds tq.mjs, or None."""
    candidates = [os.environ.get("TLDRAW_SKILLS"), str(Path.home() / "skills/tldraw-offline")]
    for c in candidates:
        if c and (Path(c) / "tq.mjs").is_file():
            return c
    return None


def tldraw_is_running():
    try:
        port = json.loads(SERVER_JSON.read_text())["port"]
        with socket.create_connection(("127.0.0.1", port), timeout=2):
            return True
    except (OSError, KeyError, ValueError):
        return False


def resolve_design(design, repo):
    p = Path(design).expanduser()
    if p.is_absolute() or p.exists():
        return p.resolve()
    return (Path(repo).expanduser() / "docs/architecture/designs" / design).resolve()


def main():
    ap = argparse.ArgumentParser(description="Check that canvas mode can run.")
    ap.add_argument("--design", required=True, help="design name, or a path to a design folder")
    ap.add_argument("--repo", default=".", help="repo root that holds docs/architecture/designs")
    args = ap.parse_args()

    design_dir = resolve_design(args.design, args.repo)
    skills = find_tldraw_skills()
    problems = []

    if not (design_dir / "goal.json").is_file():
        problems.append(f"No goal.json in {design_dir}. Pass a design folder under docs/architecture/designs/.")
    if skills is None:
        problems.append("The tldraw-offline skill is not installed (no tq.mjs in ~/skills/tldraw-offline). Set TLDRAW_SKILLS if it lives elsewhere.")
    if not tldraw_is_running():
        problems.append("The tldraw Desktop app is not running, or it does not answer. Start the app and retry.")

    image_problems = []
    if shutil.which("npx") is None:
        image_problems.append("npx is not on PATH.")
    if not Path(CHROME).is_file():
        image_problems.append(f"Google Chrome not found at {CHROME}. Set CHROME_PATH.")
    has_diagrams = all((design_dir / "diagrams" / f"level-{n}.mmd").is_file() for n in (2, 3))

    print(json.dumps({
        "ok": not problems,
        "design_dir": str(design_dir),
        "design_name": design_dir.name,
        "tldraw_skills": skills,
        "problems": problems,
        "images_ok": not image_problems and has_diagrams,
        "image_problems": image_problems + ([] if has_diagrams else ["level-2.mmd or level-3.mmd is missing."]),
    }, indent=2))
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main())
