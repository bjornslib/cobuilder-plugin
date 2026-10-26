"""Equal tool items must not hide each other. A brief whose last three tool items alone exceed the budget is final."""
from brief_support import BUDGET, simple
from digest_support import build_with, dummy, short_reply
from priority.brief.models import Abstain, Ask, StopBrief, ToolItem


def brief_of(count: int) -> StopBrief:
    same = ToolItem(tool="Read", input="IN" * 50, result="OUT" * 50, is_error=False)
    return StopBrief(ask=Ask("go"), items=(same,) * count, final="done", stop_source="agent",
                     client_messages=(), after_stop=())


def test_the_last_three_equal_tool_items_keep_their_payload():
    text = brief_of(5)._render(exclude_older_payloads=True)
    assert text.count("IN" * 50) == 3
    assert text.count("OUT" * 50) == 3
    assert text.count("[tool Read]\n[result]") == 2


def test_four_equal_tool_items_with_protected_parts_over_the_budget_make_no_shrink_call(tmp_path):
    big = BUDGET // 3 + 5_000  # the last three alone are over the budget
    same = ("Read", {"file": "same"}, "x" * big)
    path = simple(tmp_path / "equal.jsonl", exchanges=[same] * 4)
    lm = dummy([short_reply("short")] * 4)
    result = build_with(path, shrink_lm=lm, log_dir=tmp_path / "log")
    assert isinstance(result, Abstain)
    assert result.reason == "brief_too_large"
    assert result.final is True
    assert len(lm.history) == 0
