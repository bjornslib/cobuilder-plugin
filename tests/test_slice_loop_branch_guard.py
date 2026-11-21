"""The scripted slice loop never lets GREEN commit on master, main, or a detached HEAD.

Contract under test:

- RED_SCHEMA requires branch, and the RED prompt asks for git rev-parse --abbrev-ref HEAD.
- When RED reports master, main, HEAD, or no branch, GREEN never runs, the slice ends ERROR, and the run log names the branch.
- When RED reports a feature branch, GREEN runs.
- The GREEN prompt tells GREEN never to commit on master or main.

The cases run slice-loop.js under node with fake agents (see _slice_loop_support.py).
"""
from __future__ import annotations

import pytest

from _slice_loop_support import ARGS, SHA_A, SHA_B, TWO_SLICES, calls, first, run_loop

PROTECTED = ("master", "main", "HEAD")


def test_red_schema_requires_branch(tmp_path):
    record = run_loop(tmp_path, ARGS, {"17": SHA_A})
    schema = first(record, "implement:red", 17)["opts"]["schema"]
    assert "branch" in schema.get("required", []), (
        f"RED_SCHEMA does not require branch, required is {schema.get('required')}"
    )
    assert schema.get("properties", {}).get("branch", {}).get("type") == "string", (
        "RED_SCHEMA has no string property branch"
    )


def test_red_prompt_asks_for_the_branch_name(tmp_path):
    record = run_loop(tmp_path, ARGS, {"17": SHA_A})
    prompt = first(record, "implement:red", 17)["prompt"]
    assert "git rev-parse --abbrev-ref HEAD" in prompt, (
        "the RED prompt does not ask for git rev-parse --abbrev-ref HEAD"
    )


@pytest.mark.parametrize("branch", [*PROTECTED, None])
def test_protected_branch_stops_the_run_before_green(tmp_path, branch):
    record = run_loop(tmp_path, ARGS, {"17": SHA_A}, branches={"17": branch})
    assert not calls(record, "implement:green"), (
        f"GREEN ran although RED reported branch {branch!r}"
    )
    assert not calls(record, "implement:validate"), "VALIDATE ran after the branch guard stopped the run"
    ended = record["result"]["voidedOrErrored"]
    assert [item["verdict"] for item in ended] == ["ERROR"], f"expected one ERROR result, got {ended}"
    if branch is not None:
        assert any(branch in line and "feature branch" in line for line in record["logs"]), (
            f"the run log does not name branch {branch} and the feature branch rule: {record['logs']}"
        )
        assert branch in ended[0]["reason"], f"the ERROR reason does not name {branch}: {ended[0]['reason']}"


def test_the_guard_stops_later_slices_too(tmp_path):
    record = run_loop(tmp_path, TWO_SLICES, {"17": SHA_A, "18": SHA_B}, branches={"17": "master"})
    assert not calls(record, "implement:red", 18), "RED of slice 18 ran after slice 17 stopped on master"
    assert record["result"]["notRun"] == [18], f"expected slice 18 not run, got {record['result']['notRun']}"


def test_feature_branch_lets_green_run(tmp_path):
    record = run_loop(tmp_path, ARGS, {"17": SHA_A}, branches={"17": "design/x"})
    assert calls(record, "implement:green", 17), "GREEN did not run on a feature branch"
    assert record["result"]["passed"], f"the slice did not pass: {record['result']}"


def test_green_prompt_never_commits_on_master_or_main(tmp_path):
    record = run_loop(tmp_path, ARGS, {"17": SHA_A})
    prompt = first(record, "implement:green", 17)["prompt"]
    step = prompt[prompt.index("git commit") - 600 :]
    assert "master" in step and "main" in step, (
        "the GREEN commit step does not name master and main"
    )
