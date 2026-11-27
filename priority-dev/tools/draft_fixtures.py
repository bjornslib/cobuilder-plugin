"""Pick sessions and stops for the labelled fixture set, and write one stop brief for each stop.

Real transcripts and briefs stay local: Git ignores `fixtures/real/`. The manifest lists session ids and
stop numbers only, so it holds no transcript text.

    uv run python tools/draft_fixtures.py --session <path> --session <path> ... [--stops 5]
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from priority.brief import Abstain, build_brief  # noqa: E402
from priority.brief.transcript import classify_records, find_stops, read_records  # noqa: E402

REAL = ROOT / "fixtures" / "real"


def spread(count: int, wanted: int) -> list[int]:
    """1-based stop numbers, spread evenly over a session. The last stop is always in."""
    if count <= wanted:
        return list(range(1, count + 1))
    step = (count - 1) / (wanted - 1)
    return sorted({round(1 + i * step) for i in range(wanted)})


def draft(session: Path, wanted: int) -> dict:
    stops = find_stops(classify_records(read_records(session)))
    target = REAL / session.name
    if not target.exists():
        shutil.copy(session, target)
    briefs = REAL / "briefs"
    briefs.mkdir(exist_ok=True)
    kept, skipped = [], []
    for number in spread(len(stops), wanted):
        brief = build_brief(target, number)
        if isinstance(brief, Abstain):
            skipped.append({"stop": number, "reason": brief.reason})
            continue
        (briefs / f"{session.stem[:8]}-s{number:03d}.txt").write_text(brief.for_model())
        kept.append(number)
    return {"session": session.stem, "stops_in_session": len(stops), "stops": kept, "skipped": skipped}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", action="append", required=True, type=Path)
    parser.add_argument("--stops", type=int, default=5)
    args = parser.parse_args()
    manifest = [draft(path, args.stops) for path in args.session]
    out = ROOT / "fixtures" / "set-manifest.json"
    out.write_text(json.dumps(manifest, indent=2) + "\n")
    for entry in manifest:
        print(entry["session"][:8], entry["stops_in_session"], "stops;", "kept", entry["stops"], entry["skipped"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
