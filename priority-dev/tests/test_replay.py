"""Slice 7, the replay report (RED role). Every test uses stub models and makes no live call.

The contract is in the docstring of `replay_support.py`. The scripted world is `PLANS`: ten sessions with
known outcomes (alpha to india, and zulu, whose brief is an Abstain). The main run replays it once, with 5
sessions in flight, and the tests read the report against the stored call rows.
1. Files, and the run
2. The measures of each adapter: valid-output rate, quote-found rate, kinds, steps, abstain reasons
3. The stages: characters, seconds, and cost
4. The digest model
5. The event rate: 5 sessions at the same time, and the rate-limit count
6. The options: adapters, concurrency, folders, and a second run
"""
from __future__ import annotations

from collections import Counter

import pytest

from digest_support import ONE_SHRINK, over_budget
from interpret_support import dspy, no_live_call  # noqa: F401
from probe_support import DIGEST_MODEL, INTERPRETER_MODEL
from replay_support import (CALLS_PER_STAGE, OUTCOMES, PLANS, STAGES, Plan, StubModel, brief_texts, bullet, counts,
                            is_rate_limit, kinds_picked, quote_a, quote_counts, rate, replay, sections, split,
                            stage_figures, table, write_world)

ADAPTERS = ("json", "chat")


@pytest.fixture(scope="module")
def run(tmp_path_factory):
    root = write_world(tmp_path_factory.mktemp("fixtures"))
    return replay(root, tmp_path_factory.mktemp("out"), "--concurrency", "5",
                  log_dir=tmp_path_factory.mktemp("logs"), interp=StubModel("interpreter", delay=0.05))


class LazyReport:
    """The sections of the report, read on first use, so a missing report fails the test and not the setup."""

    def __init__(self, run):
        self.run = run

    def __getitem__(self, key):
        return sections(self.run.report)[key]

    def __iter__(self):
        return iter(sections(self.run.report))


@pytest.fixture(scope="module")
def report(run):
    return LazyReport(run)


# ---- 1. files, and the run ---------------------------------------------------

def test_the_run_ends_with_0_and_writes_each_file(run):
    assert run.code == 0
    for path in (run.out / "report.md", run.out / "results.jsonl", run.log_dir / "json" / "calls.jsonl",
                 run.log_dir / "chat" / "calls.jsonl", run.log_dir / "digest" / "calls.jsonl"):
        assert path.is_file(), f"missing {path}"


def test_the_report_has_its_sections_in_order_and_ends_with_the_go_or_no_go(report):
    assert list(report) == ["Run", "Adapter: json", "Adapter: chat", "Digest model", "Failure drills", "Go or no-go"]


def test_the_run_section_counts_the_transcripts_and_states_the_cost_method(report):
    assert bullet(report["Run"], "sessions") == "10"  # ten transcripts, and notes.txt is ignored
    method = bullet(report["Run"], "cost method")
    for price in ("0.15", "0.60", "0.45", "1.20"):
        assert price in method


def test_each_stage_row_names_the_model_that_ran_it(run):
    assert {r["model_id"] for name in ADAPTERS for r in run.rows(name)} == {INTERPRETER_MODEL}
    assert {r["model_id"] for r in run.rows("digest")} == {DIGEST_MODEL}
    assert {r["stage"] for name in ADAPTERS for r in run.rows(name)} == set(STAGES)
    assert {r["stage"] for r in run.rows("digest")} == {"digest"}


@pytest.mark.parametrize("name", ADAPTERS)
def test_each_adapter_makes_the_scripted_calls(run, name):
    rows = run.rows(name)
    assert {r.get("adapter") for r in rows} == {name}
    assert Counter(r["stage"] for r in rows) == CALLS_PER_STAGE


def test_the_stub_saw_each_adapter_for_its_own_rows(run):
    seen = Counter(adapter for adapter, _, _ in run.interp.seen)
    assert seen == {"JSONAdapter": len(run.rows("json")), "ChatAdapter": len(run.rows("chat"))}


def test_a_session_with_no_stop_brief_makes_no_model_call(run):
    assert run.code == 0 and run.interp.seen and run.digest.seen, "the replay made no model call"
    assert "zulu" not in {name for _, _, name in run.interp.seen}
    assert "zulu" not in {name for _, _, name in run.digest.seen}


def test_the_replay_gives_no_previous_digest_to_the_brief(run):
    assert all("PREVIOUS RUN:" not in r["rendered_input"] for name in ADAPTERS for r in run.rows(name))


# ---- 2. the measures of each adapter -----------------------------------------

@pytest.mark.parametrize("name", ADAPTERS)
def test_results_hold_one_line_for_each_session_and_adapter(run, name):
    lines = [r for r in run.results() if r["adapter"] == name]
    assert {r["session"] for r in lines} == set(PLANS) and len(lines) == len(PLANS)
    for line in lines:
        reason, steps = OUTCOMES[line["session"]]
        assert line["abstain_reason"] == reason, line
        assert line["steps"] == steps, line
        assert line["real"] is False
        assert (line["abstain_detail"] is None) == (reason is None), line
    detail = {r["session"]: r["abstain_detail"] for r in lines}
    assert "429" in detail["delta"] and "429" in detail["india"]
    assert "TimeoutError" in detail["golf"]


@pytest.mark.parametrize("name", ADAPTERS)
def test_the_valid_output_rate_matches_the_rows(run, report, name):
    rows = run.rows(name)
    share, count, total = rate(bullet(report[f"Adapter: {name}"], "valid-output rate"))
    assert (count, total) == (sum(1 for r in rows if r["valid"]), len(rows))
    assert 0 < count < total  # the drills made some calls invalid


@pytest.mark.parametrize("name", ADAPTERS)
def test_the_quote_found_rate_matches_the_pick_rows(run, report, name):
    found, total = quote_counts(run.rows(name), brief_texts(run.root))
    _, count, shown = rate(bullet(report[f"Adapter: {name}"], "quote-found rate"))
    assert (count, shown) == (found, total) == (6, 7)  # the empty quote of foxtrot is the one miss


@pytest.mark.parametrize("name", ADAPTERS)
def test_the_kinds_picked_match_the_pick_rows(run, report, name):
    lines = split(report[f"Adapter: {name}"], "### ")["Kinds picked"]
    assert counts(lines) == dict(kinds_picked(run.rows(name)))
    assert counts(lines) == {"reply": 4, "send_feedback": 2, "approve_gate": 1}


@pytest.mark.parametrize("name", ADAPTERS)
def test_the_proposals_are_counted_by_step_count(run, report, name):
    lines = split(report[f"Adapter: {name}"], "### ")["Proposals by step count"]
    shown = counts(lines, r"- (\d) steps?: (\d+)$")
    from_results = Counter(r["steps"] for r in run.results() if r["adapter"] == name and r["steps"])
    assert {int(k): v for k, v in shown.items()} == {1: 2, 2: 1, 3: 1} == dict(from_results)


@pytest.mark.parametrize("name", ADAPTERS)
def test_the_abstain_reasons_are_counted(run, report, name):
    lines = split(report[f"Adapter: {name}"], "### ")["Abstain reasons"]
    from_results = Counter(r["abstain_reason"] for r in run.results() if r["adapter"] == name and r["abstain_reason"])
    assert counts(lines) == dict(from_results)
    assert counts(lines) == {"model_error": 3, "invalid_output": 1, "quote_not_in_brief": 1, "no_agent_reply": 1}


# ---- 3. the stages -----------------------------------------------------------

@pytest.mark.parametrize("name", ADAPTERS)
def test_the_stage_table_matches_the_rows(run, report, name):
    stages = table(split(report[f"Adapter: {name}"], "### ")["Stages"])
    assert list(stages) == list(STAGES)
    for stage in STAGES:
        figures, cells = stage_figures(run.rows(name), stage, "interpreter"), stages[stage]
        assert int(cells["calls"]) == figures["calls"]
        assert int(cells["chars sent"]) == figures["chars"] > 0
        assert float(cells["seconds"]) == pytest.approx(figures["seconds"], abs=0.001)
        assert float(cells["cost USD"]) == pytest.approx(figures["cost"], abs=0.000001)
        assert figures["cost"] > 0


@pytest.mark.parametrize("name", ADAPTERS)
def test_the_seconds_come_from_the_time_of_each_call(run, name):
    rows = run.rows(name)
    assert all(isinstance(r["seconds"], float) and r["seconds"] >= 0.05 for r in rows)  # the stub sleeps 0.05


# ---- 4. the digest model -----------------------------------------------------

def test_the_digest_table_has_the_digest_and_shrink_stages(run, report):
    stages = table(split(report["Digest model"], "### ")["Stages"])
    assert list(stages) == ["digest", "shrink"]
    for stage in stages:
        figures, cells = stage_figures(run.rows("digest"), stage, "digest"), stages[stage]
        assert int(cells["calls"]) == figures["calls"]
        assert int(cells["chars sent"]) == figures["chars"]
        assert float(cells["seconds"]) == pytest.approx(figures["seconds"], abs=0.001)
        assert float(cells["cost USD"]) == pytest.approx(figures["cost"], abs=0.000001)
    assert int(stages["digest"]["calls"]) == 9 and int(stages["shrink"]["calls"]) == 0
    assert float(stages["digest"]["cost USD"]) > 0


def test_the_digest_valid_rate_and_rate_limits_match_the_rows(run, report):
    rows = run.rows("digest")
    _, count, total = rate(bullet(report["Digest model"], "valid-output rate"))
    assert (count, total) == (sum(1 for r in rows if r["valid"]), len(rows)) == (7, 9)
    assert int(bullet(report["Digest model"], "rate-limit errors")) == sum(map(is_rate_limit, rows)) == 1


def test_a_valid_digest_is_stored_for_each_session_that_has_one(run):
    stored = {p.stem for p in (run.log_dir / "digests").glob("*.json")}
    assert stored == set(PLANS) - {"delta", "echo", "zulu"}


def test_a_brief_over_the_budget_is_shrunk_by_the_digest_model_before_the_interpreter(tmp_path):
    root = tmp_path / "fixtures"
    root.mkdir()
    final = f"Session yankee is waiting. Should I retry with a fixed delay or use backoff? {quote_a('yankee')}."
    over_budget(root, ONE_SHRINK, name="yankee.jsonl", final=final)
    done = replay(root, tmp_path / "out", "--adapters", "chat", "--concurrency", "1",
                  interp=StubModel("interpreter", {"yankee": Plan()}), digest=StubModel("digest", {"yankee": Plan()}))
    assert done.code == 0
    assert [r["stage"] for r in done.rows("digest")].count("shrink") == 1
    assert [r["abstain_reason"] for r in done.results()] == [None]
    stages = table(split(sections(done.report)["Digest model"], "### ")["Stages"])
    assert int(stages["shrink"]["calls"]) == 1 and float(stages["shrink"]["cost USD"]) > 0


# ---- 5. the event rate -------------------------------------------------------

def test_five_sessions_are_in_flight_at_once_and_never_more(run):
    assert run.interp.max_inflight == 5


@pytest.mark.parametrize("name", ADAPTERS)
def test_the_rate_limit_errors_of_the_event_rate_are_counted(run, report, name):
    rows = run.rows(name)
    shown = int(bullet(report[f"Adapter: {name}"], "rate-limit errors"))
    assert shown == sum(map(is_rate_limit, rows)) == 2  # delta and india got a 429
    assert all(r["valid"] is False and r["stage"] == "pick" for r in rows if is_rate_limit(r))


# ---- no silence --------------------------------------------------------------

def test_each_abstain_is_logged_with_its_session_and_its_reason(run):
    records = [r.getMessage() for r in run.logs.records]
    for session, (reason, _) in OUTCOMES.items():
        if reason:
            assert any(session in text and reason in text for text in records), f"no log for {session}: {reason}"


# ---- 6. the options ----------------------------------------------------------

SMALL = {name: PLANS[name] for name in ("alpha", "bravo", "charlie", "hotel")}


@pytest.mark.parametrize("limit", [1, 2])
def test_the_concurrency_option_sets_the_stops_in_flight(tmp_path, limit):
    root = write_world(tmp_path / "fixtures", SMALL)
    done = replay(root, tmp_path / "out", "--concurrency", str(limit),
                  interp=StubModel("interpreter", SMALL, delay=0.05), digest=StubModel("digest", SMALL))
    assert done.code == 0
    assert done.interp.max_inflight == limit


def test_the_default_concurrency_is_5(tmp_path):
    root = write_world(tmp_path / "fixtures")
    done = replay(root, tmp_path / "out", interp=StubModel("interpreter", delay=0.05))
    assert done.interp.max_inflight == 5


def test_one_adapter_gives_one_section_and_one_folder(tmp_path):
    root = write_world(tmp_path / "fixtures", SMALL)
    done = replay(root, tmp_path / "out", "--adapters", "chat")
    assert list(sections(done.report))[:3] == ["Run", "Adapter: chat", "Digest model"]
    assert not (done.log_dir / "json").exists()
    assert {r["adapter"] for r in done.results()} == {"chat"}
    assert {a for a, _, _ in done.interp.seen} == {"ChatAdapter"}


def test_the_adapters_option_sets_the_order(tmp_path):
    root = write_world(tmp_path / "fixtures", SMALL)
    done = replay(root, tmp_path / "out", "--adapters", "chat,json")
    assert list(sections(done.report))[1:3] == ["Adapter: chat", "Adapter: json"]


def test_an_unknown_adapter_is_an_argument_error(tmp_path):
    root = write_world(tmp_path / "fixtures", SMALL)
    assert replay(root, tmp_path / "good", "--adapters", "json").code == 0  # the same command with a known name
    done = replay(root, tmp_path / "out", "--adapters", "json,xml")
    assert done.code not in (0, None)
    assert not (tmp_path / "out" / "report.md").exists()
    assert not done.interp.seen and not done.digest.seen  # the check comes before any model call


def test_with_no_log_dir_the_rows_go_to_the_out_folder(tmp_path):
    root = write_world(tmp_path / "fixtures", SMALL)
    done = replay(root, tmp_path / "out")
    assert done.code == 0
    for folder in ("json", "chat", "digest"):
        assert (tmp_path / "out" / folder / "calls.jsonl").is_file()


def test_a_second_run_replaces_the_first(tmp_path):
    root = write_world(tmp_path / "fixtures", SMALL)
    first = replay(root, tmp_path / "out")
    counts_first = {f: len(first.rows(f)) for f in ("json", "chat", "digest")}
    results_first = len(first.results())
    second = replay(root, tmp_path / "out")
    assert {f: len(second.rows(f)) for f in counts_first} == counts_first
    assert len(second.results()) == results_first
    for name in ("chat", "json"):
        again, before = sections(second.report)[f"Adapter: {name}"], sections(first.report)[f"Adapter: {name}"]
        assert bullet(again, "valid-output rate") == bullet(before, "valid-output rate")
        assert split(again, "### ")["Abstain reasons"] == split(before, "### ")["Abstain reasons"]
