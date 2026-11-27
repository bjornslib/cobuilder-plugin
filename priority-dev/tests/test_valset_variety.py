"""The GEPA valset pick: stratified by repository and stop kind, sized by sessions or by stops, or the old neighbours run.

The made-up world has three repositories of 8, 6, and 4 train sessions, each holding 3 to 5 stops. Sorted ids
group each repository in one block, so a run of neighbours skews to one repository.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from priority import optimise
from priority.gepa_log import print_split
from priority.trainset import split_gepa_valset
from priority.valset import METHODS, ValsetSize, pick_ids, pick_neighbours, pick_stratified, size_error
from priority.valset_mix import counts_of, mix_line, repo_name, stop_tags

SEED = 7
VAL_STOPS = 20
# The largest allowed gap between a valset share and the train share of one tag. A 20-stop valset makes one stop
# worth 0.05 of a share, so 0.10 allows about two stops of slack. The value is fixed; it is not tuned to pass.
SHARE_TOLERANCE = 0.10
REPOS = {"CoBuilder": ("a", 8), "alpha": ("b", 6), "beta": ("c", 4)}
STEP_TEMPLATES = [[["ask_human"]], [["snooze"]], [["continue"]], [["notify"]], [["ask_human", "notify"]], []]
MIX_LINE = r"valset mix: CoBuilder \d+%.*; needs_human \d+%; ask_human \d+%; snooze \d+%; notify-only \d+%; continue \d+%"


def _world() -> tuple[list[dict], list[str]]:
    """Made-up train stops and the train session ids. Each stop carries its repository and its kind tags."""
    examples, train_ids = [], []
    for repo, (prefix, count) in REPOS.items():
        for number in range(count):
            session_id = f"{prefix}{number:02d}"
            train_ids.append(session_id)
            for stop in range(3 + number % 3):
                steps = STEP_TEMPLATES[(number + stop) % len(STEP_TEMPLATES)]
                examples.append({"session_id": session_id, "repo": repo,
                                 "tags": stop_tags(steps, (number + stop) % 4 == 0)})
    return examples, train_ids


def _shares(examples: list) -> dict[str, float]:
    """The share of the stops that carry each tag: the repository tag, then the kind tags."""
    return {tag: count / len(examples) for tag, count in counts_of(examples).items()}


def _picked_stops(examples: list, picked: set[str]) -> list:
    return [example for example in examples if example["session_id"] in picked]


def _gap(examples: list, picked: set[str]) -> float:
    """The sum over tags of the absolute gap between the valset share and the train share."""
    want, got = _shares(examples), _shares(_picked_stops(examples, picked))
    return sum(abs(got.get(tag, 0.0) - want[tag]) for tag in want)


def test_stratified_shares_match_the_train_shares_within_tolerance():
    examples, _ = _world()
    picked = pick_stratified(examples, SEED, ValsetSize(stops=VAL_STOPS))
    want, got = _shares(examples), _shares(_picked_stops(examples, picked))
    for tag in want:
        assert abs(got.get(tag, 0.0) - want[tag]) <= SHARE_TOLERANCE, (tag, got.get(tag, 0.0), want[tag])


def test_stratified_gap_is_smaller_than_neighbours_at_the_same_size():
    examples, train_ids = _world()
    stratified = pick_stratified(examples, SEED, ValsetSize(stops=VAL_STOPS))
    neighbours = pick_neighbours(train_ids, SEED, len(stratified))
    assert _gap(examples, stratified) < _gap(examples, neighbours)


def test_a_session_never_splits_between_train_and_valset():
    examples, train_ids = _world()
    train, val, val_ids = split_gepa_valset(examples, train_ids, SEED, ValsetSize(stops=VAL_STOPS))
    assert {example["session_id"] for example in val} == set(val_ids)
    assert not {example["session_id"] for example in train} & set(val_ids)
    assert len(train) + len(val) == len(examples)


def test_the_same_seed_gives_the_same_valset_whatever_the_example_order():
    examples, train_ids = _world()
    size = ValsetSize(stops=VAL_STOPS)
    first = pick_ids(examples, train_ids, SEED, "stratified", size)
    again = pick_ids(examples, train_ids, SEED, "stratified", size)
    reversed_order = pick_ids(list(reversed(examples)), train_ids, SEED, "stratified", size)
    assert first == again == reversed_order


@pytest.mark.parametrize("count", [1, 2, 5])
def test_neighbours_reproduces_the_old_ring_pick(count):
    _, train_ids = _world()
    ordered = sorted(train_ids)
    for seed in range(12):
        start = seed % len(ordered)
        want = {ordered[(start + offset) % len(ordered)] for offset in range(count)}
        assert pick_neighbours(train_ids, seed, count) == want


def test_neighbours_split_matches_the_old_split_on_session_ids():
    examples, train_ids = _world()
    _, _, val_ids = split_gepa_valset(examples, train_ids, SEED, ValsetSize(sessions=2), method="neighbours")
    ordered = sorted(train_ids)
    start = SEED % len(ordered)
    assert val_ids == sorted(ordered[(start + offset) % len(ordered)] for offset in range(2))


@pytest.mark.parametrize("method", METHODS)
def test_val_stops_reaches_the_target(method):
    examples, train_ids = _world()
    picked = pick_ids(examples, train_ids, SEED, method, ValsetSize(stops=VAL_STOPS))
    stops = len(_picked_stops(examples, picked))
    assert stops >= VAL_STOPS


def test_neighbours_stops_at_the_first_session_that_passes_the_target():
    examples, train_ids = _world()
    picked = pick_ids(examples, train_ids, SEED, "neighbours", ValsetSize(stops=VAL_STOPS))
    largest_session = max(len(_picked_stops(examples, {sid})) for sid in picked)
    assert len(_picked_stops(examples, picked)) < VAL_STOPS + largest_session


@pytest.mark.parametrize("seed", range(5))
@pytest.mark.parametrize("stops", [VAL_STOPS, 40])
def test_every_repository_keeps_a_train_session(seed, stops):
    examples, train_ids = _world()
    train, _, _ = split_gepa_valset(examples, train_ids, seed, ValsetSize(stops=stops))
    assert {example["repo"] for example in train} == set(REPOS)


def test_stops_beyond_what_the_repositories_allow_is_refused():
    examples, train_ids = _world()
    with pytest.raises(ValueError, match="asked for 10000 stops"):
        pick_ids(examples, train_ids, SEED, "stratified", ValsetSize(stops=10_000))


def test_both_size_options_are_refused():
    examples, train_ids = _world()
    both = ValsetSize(sessions=2, stops=10)
    assert size_error("stratified", both) == "give --val-sessions or --val-stops, not both"
    with pytest.raises(ValueError, match="not both"):
        pick_ids(examples, train_ids, SEED, "stratified", both)


def test_the_run_refuses_both_size_options_before_it_reads_any_file(capsys):
    code = optimise.run(Path("missing.json"), Path("missing.json"), Path("missing"), "gepa", 1, SEED,
                        size=ValsetSize(sessions=2, stops=10))
    assert code == 2
    assert "not both" in capsys.readouterr().out


def test_bad_size_values_are_named():
    assert size_error("stratified", ValsetSize()) is None
    assert size_error("ring", ValsetSize()).startswith("unknown valset 'ring'")
    assert size_error("stratified", ValsetSize(stops=0)).startswith("--val-stops must be at least 1")


def test_print_split_prints_the_valset_mix_then_the_trainset_mix_before_the_stops(capsys):
    examples, train_ids = _world()
    train, val, _ = split_gepa_valset(examples, train_ids, SEED, ValsetSize(stops=VAL_STOPS))
    print_split(train, val, None)
    lines = capsys.readouterr().out.splitlines()
    assert lines[0].startswith("trainset: ") and "valset: " in lines[0]
    assert re.fullmatch(MIX_LINE, lines[1]), lines[1]
    assert lines[2].startswith("trainset mix: CoBuilder ")
    assert lines[3].startswith("train stops: ")


def test_mix_line_names_an_empty_set():
    assert mix_line("valset", []) == "valset mix: (none)"


def test_stop_tags_name_each_kind_a_stop_carries():
    assert stop_tags([["ask_human", "notify"]], False) == ["ask_human"]
    assert stop_tags([["notify"]], True) == ["needs_human", "notify-only"]
    assert stop_tags([["continue_until"]], False) == ["continue"]
    assert stop_tags([], False) == []


def test_repo_name_reads_the_manifest_group():
    assert repo_name("first set") == "CoBuilder"
    assert repo_name("train 2 agencheck") == "agencheck"
    assert repo_name(None) == "(no group)"
