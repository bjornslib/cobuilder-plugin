"""Digest caps and clipping (RED role). Every test uses DummyLM.

The contract that these tests pin.

- `RunDigest` allows `ran` up to 2400 characters, `result` up to 1200, and `open_items` and `decisions`
  up to 10 items each.
- `DigestRun` does not reject a reply that is over a cap. It clips the text. A clipped text is at most the
  cap long, it ends at a word boundary, and it is a prefix of the original. A trailing ellipsis "…" is
  allowed and not required. The ellipsis counts in the cap. A list over 10 keeps its first 10 items.
- The caps are in the schema of `RunDigest`, and so in the prompt that the model reads.
- A reply that does not parse gives a log row with `valid: false` and an `error` that names the fault.
"""
from __future__ import annotations

import json

from pydantic import ValidationError

from digest_support import DIGEST, digest_api, digest_reply, dummy, read_calls, run_digest

ELLIPSIS = "…"


def words(count: int, tag: str = "wd") -> str:
    """Count words of different length, such as `wd0001x wd0002xwd0002x`, so a cut inside a word shows."""
    return " ".join(f"{tag}{i:04d}x" * (1 + i % 3) for i in range(count))


def clipped(original: str, stored: str, cap: int) -> None:
    assert len(stored) <= cap, f"the stored text has {len(stored)} characters, over the cap {cap}"
    assert len(stored) > cap - 60, f"the stored text has {len(stored)} characters: it is clipped too short"
    body = stored[:-1] if stored.endswith(ELLIPSIS) else stored
    assert original.startswith(body), "the stored text is not a prefix of the original"
    assert original[len(body)].isspace() or body.endswith(" "), "the clip cut a word in half"


def long_reply():
    return digest_reply(ran=words(600), result=words(300, "rs"), open_items=[f"q{i}" for i in range(12)],
                        decisions=[f"d{i}" for i in range(12)])


# ---- 1. The caps --------------------------------------------------------------

def test_a_run_digest_at_the_new_limits_validates():
    try:
        value = digest_api().RunDigest(ran="x" * 2400, result="y" * 1200, open_items=["a"] * 10, decisions=["b"] * 10)
    except ValidationError as error:
        assert False, f"RunDigest rejects values at the new caps: {error.error_count()} errors"
    assert len(value.ran) == 2400 and len(value.result) == 1200
    assert len(value.open_items) == 10 and len(value.decisions) == 10


def test_a_long_reply_gives_a_run_digest_and_not_an_abstain():
    out = run_digest(dummy([long_reply()]))
    assert isinstance(out, digest_api().RunDigest), f"expected a RunDigest, got {out!r:.150}"


def test_a_long_reply_costs_one_model_call():
    lm = dummy([long_reply(), long_reply()])
    run_digest(lm)
    assert len(lm.history) == 1


def test_ran_is_clipped_at_a_word_boundary():
    original = words(600)
    assert len(original) > 2400
    out = run_digest(dummy([digest_reply(ran=original)]))
    assert isinstance(out, digest_api().RunDigest), f"expected a RunDigest, got {out!r:.150}"
    clipped(original, out.ran, 2400)


def test_result_is_clipped_at_a_word_boundary():
    original = words(300, "rs")
    assert len(original) > 1200
    out = run_digest(dummy([digest_reply(result=original)]))
    assert isinstance(out, digest_api().RunDigest), f"expected a RunDigest, got {out!r:.150}"
    clipped(original, out.result, 1200)


def test_a_text_inside_the_cap_stays_as_it_is():
    out = run_digest(dummy([digest_reply(ran=words(100), result=DIGEST["result"])]))
    assert isinstance(out, digest_api().RunDigest), f"expected a RunDigest, got {out!r:.150}"
    assert out.ran == words(100) and out.result == DIGEST["result"]


def test_a_list_over_ten_keeps_its_first_ten_items():
    out = run_digest(dummy([long_reply()]))
    assert isinstance(out, digest_api().RunDigest), f"expected a RunDigest, got {out!r:.150}"
    assert out.open_items == tuple(f"q{i}" for i in range(10))
    assert out.decisions == tuple(f"d{i}" for i in range(10))


# ---- 2. The caps in the prompt ------------------------------------------------

def test_the_schema_of_run_digest_holds_the_new_caps():
    props = digest_api().RunDigest.model_json_schema()["properties"]
    assert props["ran"]["maxLength"] == 2400
    assert props["result"]["maxLength"] == 1200
    assert props["open_items"]["maxItems"] == 10
    assert props["decisions"]["maxItems"] == 10


def test_the_rendered_digest_prompt_states_the_caps(tmp_path):
    run_digest(dummy([digest_reply()]), log_dir=tmp_path)
    sent = [c["rendered_input"] for c in read_calls(tmp_path) if c["stage"] == "digest"][0]
    for number in ("2400", "1200"):
        assert number in sent, f"the digest prompt does not state {number}"


# ---- 3. The logged error ------------------------------------------------------

def test_a_bad_reply_logs_valid_false_and_an_error_that_names_the_fault(tmp_path):
    out = run_digest(dummy([{"digest": "this is not JSON"}]), log_dir=tmp_path)
    assert out.reason == "invalid_output"
    rows = read_calls(tmp_path)
    assert len(rows) == 1 and rows[0]["valid"] is False
    assert rows[0].get("error"), f"the row has no error: {json.dumps(rows[0])[:200]}"
    fault = out.detail.split(": ")[1]  # the detail is "digest: <ErrorType>: <text>"
    assert fault in rows[0]["error"]


def test_a_reply_with_a_missing_field_logs_an_error(tmp_path):
    out = run_digest(dummy([{"digest": json.dumps({"ran": "Built it."})}]), log_dir=tmp_path)
    assert out.reason == "invalid_output"
    rows = read_calls(tmp_path)
    assert rows[0]["valid"] is False and rows[0].get("error"), f"the row has no error: {rows[0]!r:.200}"


def test_a_good_reply_logs_no_error(tmp_path):
    run_digest(dummy([digest_reply()]), log_dir=tmp_path)
    row = read_calls(tmp_path)[0]
    assert row["valid"] is True and "error" not in row


def test_a_cut_right_after_a_space_keeps_the_last_whole_word():
    from priority.interpreter.digest import clip
    assert clip("ab cd ef", 6) == "ab cd"


def test_leading_spaces_never_clip_to_an_empty_text():
    from priority.interpreter.digest import clip
    assert clip("   abcdefghij", 6).strip() != ""
