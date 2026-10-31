"""Slice 21 RED: labelled demos for the one predictor.

The contract. `optimise.pick_demos(examples, k=4)` returns up to k train
examples. It prefers the shortest briefs, takes at most one example for each
distinct sequence of reference step kinds, and gives the same answer for the
same examples. It prints one line for each demo that names the session and
the stop. `priority optimise --optimiser labeled` compiles the program with
those demos (the brief in, the full reference out) and saves it. A program
with demos, given to `eval --program` or as the GEPA seed, keeps its demo
stops out of the scores and out of the GEPA train set and valset, and prints
the count. A holdout stop never becomes a demo. Everything here is made up.
"""
from __future__ import annotations

import random
import re

import dspy
import pytest

from fixtures_support import require
from interpret_support import no_live_call  # noqa: F401
from optimise_support import BUDGET, SEED, block_live_calls, install_stub_teleprompters
from propose_support import (World, count_line, field, propose_of, run_cli, save_program_with_demos,
                             scored_sessions)

# ---- The picker --------------------------------------------------------------


def made_example(session: str, length: int, kinds: tuple[str, ...]):
    payloads = [{"kind": kind} for kind in kinds]
    return dspy.Example(session_id=session, stop="001", brief_text="x" * length, status="waiting_answer",
                        needs_human=True, priority="P2", steps=list(kinds),
                        expected_payloads=payloads).with_inputs("brief_text")


EXAMPLES = [made_example("made-up-ask-long", 50, ("ask_human",)), made_example("made-up-ask-short", 10, ("ask_human",)),
            made_example("made-up-continue", 30, ("continue",)), made_example("made-up-empty", 20, ()),
            made_example("made-up-pair", 40, ("reply", "notify")), made_example("made-up-snooze", 5, ("snooze",))]
SHORTEST_PER_SHAPE = {"made-up-snooze", "made-up-ask-short", "made-up-empty", "made-up-continue"}


def pick(examples, k=4):
    optimise = require("priority.optimise")
    assert callable(getattr(optimise, "pick_demos", None)), "optimise has no pick_demos"
    return optimise.pick_demos(examples, k=k)


def test_the_picker_takes_the_shortest_brief_of_each_shape_up_to_k():
    picked = pick(list(EXAMPLES))
    assert {example.session_id for example in picked} == SHORTEST_PER_SHAPE


@pytest.mark.parametrize("k", [1, 2, 6])
def test_the_picker_returns_at_most_k_with_one_per_shape(k):
    picked = pick(list(EXAMPLES), k=k)
    shapes = [tuple(step["kind"] for step in example.expected_payloads) for example in picked]
    assert 1 <= len(picked) <= k
    assert len(set(shapes)) == len(shapes), f"two demos share a shape: {shapes}"
    assert all(example in EXAMPLES for example in picked)


def test_the_picker_is_deterministic():
    shuffled = list(EXAMPLES)
    random.Random(SEED).shuffle(shuffled)
    first = {example.session_id for example in pick(list(EXAMPLES))}
    assert {example.session_id for example in pick(shuffled)} == first
    assert {example.session_id for example in pick(list(EXAMPLES))} == first


def test_the_picker_prints_one_line_per_demo_naming_session_and_stop(capsys):
    picked = pick(list(EXAMPLES))
    lines = capsys.readouterr().out.splitlines()
    for example in picked:
        named = [line for line in lines if example.session_id in line and "001" in line]
        assert len(named) == 1, f"no single printed line names {example.session_id} stop 001: {lines}"


# ---- optimise --optimiser labeled --------------------------------------------


def labeled_run(monkeypatch, tmp_path):
    world = World(tmp_path)
    block_live_calls(monkeypatch)
    monkeypatch.chdir(tmp_path)
    code, printed = run_cli(monkeypatch, ["optimise", "--optimiser", "labeled", *world.args(),
                                          "--budget", str(BUDGET), "--seed", str(SEED)])
    return world, code, printed


def saved_demos(printed: str) -> list:
    match = re.search(r"^program: (\S+)$", printed, re.M)
    assert match, f"the run printed no program path: {printed[-500:]}"
    program = require("priority.interpreter").Interpreter(lm=None)
    program.load(match.group(1))
    return list(propose_of(program).demos)


def test_labeled_saves_a_program_whose_demos_are_train_briefs_with_their_full_reference(monkeypatch, tmp_path):
    world, code, printed = labeled_run(monkeypatch, tmp_path)
    assert code == 0, f"optimise --optimiser labeled failed: {printed[-500:]}"
    demos = saved_demos(printed)
    assert 1 <= len(demos) <= 4
    by_brief = {brief: session for session, brief in world.briefs.items()}
    sessions = [by_brief.get(field(demo, "brief_text")) for demo in demos]
    assert None not in sessions, "a demo brief is not the brief of a fixture stop"
    assert set(sessions) <= set(world.parts["train"]), "a holdout stop became a demo"
    for demo, session in zip(demos, sessions):
        label = world.labels[session]
        for name, value in (("status", label["status"]), ("needs_human", label["needs_human"]),
                            ("steps", label["payloads"]), ("priority", label["priority"])):
            assert field(demo, name) == value, f"demo {session} has {name} {field(demo, name)!r}, want {value!r}"
    shapes = [tuple(step["kind"] for step in world.labels[s]["payloads"]) for s in sessions]
    assert len(set(shapes)) == len(shapes), f"two demos share a shape: {shapes}"


def test_labeled_prints_one_line_per_demo(monkeypatch, tmp_path):
    world, code, printed = labeled_run(monkeypatch, tmp_path)
    assert code == 0, f"optimise --optimiser labeled failed: {printed[-500:]}"
    by_brief = {brief: session for session, brief in world.briefs.items()}
    for demo in saved_demos(printed):
        session = by_brief.get(field(demo, "brief_text"))
        assert session and any(session in line for line in printed.splitlines()), \
            f"no printed line names the demo session {session}"


# ---- Demo stops leave the scores ---------------------------------------------


def two_demos(world, tmp_path):
    """A saved program with demos for the first two train stops. Return the path and the sessions."""
    chosen = sorted(world.parts["train"])[:2]
    return save_program_with_demos(tmp_path / "with-demos.json", [world.demo(s) for s in chosen]), set(chosen)


def test_eval_program_with_demos_scores_no_demo_stop_and_prints_the_count(monkeypatch, tmp_path):
    world = World(tmp_path)
    program, chosen = two_demos(world, tmp_path)
    code, printed = run_cli(monkeypatch, ["eval", "--split", "train", *world.args(), "--program", str(program),
                                          "--log-dir", str(tmp_path / "logs")])
    assert code == 0, printed[-500:]
    assert scored_sessions(printed) == set(world.parts["train"]) - chosen
    assert count_line(printed, "demo", 2), f"eval printed no demo count: {printed[-800:]}"


def test_a_gepa_seed_with_demos_keeps_the_demo_stops_out_of_train_and_val(monkeypatch, tmp_path):
    world = World(tmp_path)
    program, chosen = two_demos(world, tmp_path)
    calls = install_stub_teleprompters(monkeypatch)
    block_live_calls(monkeypatch)
    monkeypatch.chdir(tmp_path)
    code, printed = run_cli(monkeypatch, ["optimise", "--optimiser", "gepa", *world.args(), "--budget", str(BUDGET),
                                          "--seed", str(SEED), "--seed-program", str(program)])
    assert code == 0, printed[-500:]
    call = calls["gepa"][0]["inputs"][0]
    sets = [call["kwargs"].get(name) or [] for name in ("trainset", "valset")] + list(call["args"][1:])
    used = [example.session_id for examples in sets for example in examples]
    assert not set(used) & chosen, f"a demo stop reached GEPA: {set(used) & chosen}"
    assert set(used) == set(world.parts["train"]) - chosen
    assert count_line(printed, "demo", 2), f"optimise printed no demo count: {printed[-800:]}"
