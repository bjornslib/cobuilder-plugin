"""Shared helpers for the slice-loop formula tests. Not a test module."""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import pytest

import _beads_support as support

REPO = Path(__file__).resolve().parent.parent
FORMULA_REL = "shared/tracker_port/formulas/slice-loop.toml"
FORMULA = REPO / FORMULA_REL
SLICE_LOOP_REL = "plugins/implement/skills/build/references/slice-loop.md"
SLICE_LOOP = REPO / SLICE_LOOP_REL
STEP_IDS = ["red", "green", "validate"]


def load_formula() -> dict[str, Any]:
    import tomllib

    assert FORMULA.is_file(), f"{FORMULA_REL} is missing"
    return tomllib.loads(FORMULA.read_text(encoding="utf-8"))


def git_head_text(rel: str) -> str:
    """Return the HEAD text of a repo file, or skip when git or the file is absent."""
    import subprocess

    if shutil.which("git") is None:
        pytest.skip("git is not on PATH")
    done = subprocess.run(["git", "show", f"HEAD:{rel}"], cwd=REPO, capture_output=True, text=True)
    if done.returncode != 0:
        pytest.skip(f"git show HEAD:{rel} failed: {done.stderr.strip()}")
    return done.stdout


def scratch_workspace(root: Path) -> Any:
    """Make a bd workspace in root, with the formula installed. Skip without bd."""
    if shutil.which("bd") is None:
        pytest.skip("bd is not on PATH; the formula needs bd 1.3.0")
    from tracker_port.bd_runner import BdRunner

    runner = BdRunner(cwd=root)
    runner.run(["init", "--quiet", "--prefix", "t", "--skip-agents", "--skip-hooks", "--non-interactive"])
    # bd reads a formula file by the name <formula>.formula.toml in .beads/formulas/.
    target = root / ".beads" / "formulas"
    target.mkdir(parents=True, exist_ok=True)
    assert FORMULA.is_file(), f"{FORMULA_REL} is missing"
    shutil.copy(FORMULA, target / "slice-loop.formula.toml")
    return runner


def pour(runner: Any, slice_id: str) -> dict[str, Any]:
    """Pour the formula. Return the molecule id and a step id for each of red, green, validate."""
    out = json.loads(runner.run(["mol", "pour", "slice-loop", "--var", f"slice_id={slice_id}", "--json"]))
    mapping = out["id_mapping"]
    return {"mol": out["new_epic_id"], **{step: mapping[f"slice-loop.{step}"] for step in STEP_IDS}}


def ready_ids(runner: Any, mol: str) -> list[str]:
    """Ready step ids of one molecule, without the molecule root."""
    out = json.loads(runner.run(["ready", "--mol", mol, "--json"]))
    return [step["issue"]["id"] for step in out["steps"] if step["issue"]["id"] != mol]


def wisp_ids(runner: Any) -> list[str]:
    return [line.split()[0] for line in runner.run(["mol", "wisp", "list"]).splitlines() if line.startswith("t-")]


