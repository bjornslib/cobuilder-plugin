"""The figures must read the raw reply of a live model. A live LM stores it as a JSON list, `[{"text": ...}]`."""
import json

from priority.replay.figures import kinds_picked, picked_steps, quote_found

BRIEF = "HUMAN ASKED:\nmove the loaders\nFINAL REPLY:\nI will do the last one next."
STEPS = [
    {"kind": "continue", "confidence": 0.8, "evidence_quote": "I will do the last one next."},
    {"kind": "snooze", "confidence": 0.9, "evidence_quote": "not in the brief"},
]


def live_row(text: str) -> dict:
    return {"stage": "pick", "valid": True, "rendered_input": BRIEF, "raw_reply": json.dumps([{"text": text}])}


def test_a_live_chat_reply_gives_its_steps_kinds_and_quotes():
    row = live_row("[[ ## steps ## ]]\n" + json.dumps(STEPS) + "\n[[ ## completed ## ]]")
    assert [s["kind"] for s in picked_steps(row)] == ["continue", "snooze"]
    assert dict(kinds_picked([row])) == {"continue": 1, "snooze": 1}
    assert quote_found([row], [BRIEF]) == (1, 2)


def test_a_live_json_reply_gives_its_steps():
    row = live_row(json.dumps({"steps": STEPS}))
    assert len(picked_steps(row)) == 2
    assert quote_found([row], [BRIEF]) == (1, 2)
