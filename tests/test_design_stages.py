"""The design-stage vocabulary has three readers that must agree: the Work
board's lanes, build_index.py's goal guard, and verify_bundle.py's index check.
`_bundle_meta.DESIGN_STAGES` is the one list."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "shared"))

import verify_bundle  # noqa: E402
from _bundle_meta import DESIGN_STAGES  # noqa: E402

WORK_DECK = REPO / "plugins" / "artifact" / "viewer" / "src" / "shell" / "workDeck.ts"
DESIGN_MODE = REPO / "plugins" / "architect" / "skills" / "architecture" / "references" / "design-mode.md"


def lane_stages() -> list[str]:
    text = WORK_DECK.read_text(encoding="utf-8")
    block = text[text.index("export const LANES"): text.index("export function laneOf")]
    return [s for group in re.findall(r"stages:\s*\[([^\]]*)\]", block) for s in re.findall(r'"([^"]+)"', group)]


def test_lanes_read_exactly_the_design_stages():
    assert sorted(lane_stages()) == sorted(DESIGN_STAGES)


def test_design_mode_names_every_design_stage_and_no_unlisted_one():
    text = DESIGN_MODE.read_text(encoding="utf-8")
    for stage in DESIGN_STAGES:
        assert f"`{stage}`" in text, f"design-mode.md does not name the `{stage}` stage"
    assert "partially-delivered" not in text


def write_index(bundle_dir: Path, stages: dict[str, str | None]) -> None:
    data = bundle_dir / "data"
    data.mkdir(parents=True)
    designs = [{"id": k, "name": k, "stage": v} for k, v in stages.items()]
    (data / "index.json").write_text(json.dumps({"entities": {"design": designs}}))


def test_verify_bundle_passes_when_every_stage_is_a_lane(tmp_path):
    write_index(tmp_path, {"a": "review", "b": "backlog"})
    assert verify_bundle.check_design_stages(tmp_path) == "ok"


def test_verify_bundle_names_each_design_in_no_lane(tmp_path):
    write_index(tmp_path, {"a": "design", "b": None, "c": "review"})
    assert verify_bundle.check_design_stages(tmp_path) == "invalid:a=design,b=None"


def test_verify_bundle_skips_a_bundle_with_no_index(tmp_path):
    assert verify_bundle.check_design_stages(tmp_path) is None


def test_the_stage_check_is_required_not_optional():
    assert not "design.stage".startswith(verify_bundle.REVIEW_PREFIXES)
