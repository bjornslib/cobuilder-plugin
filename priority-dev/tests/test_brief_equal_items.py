"""Equal tool items must not hide each other: only the older ones lose their payload in the protected render."""
from priority.brief.models import Ask, StopBrief, ToolItem


def brief_of(count: int) -> StopBrief:
    same = ToolItem(tool="Read", input="IN" * 50, result="OUT" * 50, is_error=False)
    return StopBrief(ask=Ask("go"), items=(same,) * count, final="done", stop_source="agent",
                     client_messages=(), after_stop=())


def test_the_last_three_equal_tool_items_keep_their_payload():
    text = brief_of(5)._render(exclude_older_payloads=True)
    assert text.count("IN" * 50) == 3
    assert text.count("OUT" * 50) == 3
    assert text.count("[tool Read]\n[result]") == 2
