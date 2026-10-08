"""The prose budget has one source (shared/prose_budget.py) and three consumers: the
build_index warning, the verify_bundle key, and the authoring references. A reference
that does not name the budget is a step with no mechanical consumer, so a test reads
each one."""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "shared"))

import build_index  # noqa: E402
import prose_budget as pb  # noqa: E402
import verify_bundle  # noqa: E402


def text(n: int) -> str:
    return " ".join(["word"] * n)


def test_a_field_at_its_cap_passes_and_one_word_over_fails():
    assert pb.intent_overages({"approach": text(100)}) == []
    assert pb.intent_overages({"approach": text(101)}) == ["approach: 101 words, cap 100"]


def test_a_list_caps_each_item_and_never_the_number_of_items():
    assert pb.goal_overages({"done_when": [text(30)] * 12}) == []
    assert pb.goal_overages({"done_when": [text(31)]}) == ["done_when[0]: 31 words, cap 30"]


def test_an_alternative_counts_option_and_reason_together_and_there_is_no_item_cap():
    assert pb.intent_overages({"alternatives": [{"option": text(20), "rejected_because": text(20)}] * 9}) == []
    alt = {"option": text(20), "rejected_because": text(21)}
    assert pb.intent_overages({"alternatives": [alt]}) == ["alternatives[0]: 41 words, cap 40"]


def test_an_assessment_answer_and_summary_have_caps():
    over = pb.assessment_overages({"summary": text(81), "sensible": {"answer": text(101)}})
    assert over == ["summary: 81 words, cap 80", "sensible.answer: 101 words, cap 100"]


def test_a_level_caps_narration_voice_and_each_beat_but_not_the_beat_count():
    level = {"narration": text(46), "voice": text(221), "beats": [{"text": text(91)}] + [{"text": "ok"}] * 9}
    assert pb.level_overages(level) == [
        "narration: 46 words, cap 45",
        "voice: 221 words, cap 220",
        "beats[0]: 91 words, cap 90",
    ]


def test_a_change_with_two_designs_gets_the_text_caps_twice():
    two = {"design": [{"name": "a"}, {"name": "b"}], "approach": text(200)}
    assert pb.intent_overages(two) == []
    assert pb.intent_overages({**two, "approach": text(201)}) == ["approach: 201 words, cap 200"]
    assert pb.intent_overages({"approach": text(101)}) == ["approach: 101 words, cap 100"]


def test_story_overages_name_the_pull_request():
    story = {"timeline": [{"pr": 12, "intent": {"approach": text(101)}}]}
    assert pb.story_overages(story) == ["pr12.intent.approach: 101 words, cap 100"]


def test_the_worked_example_passes_its_own_budget():
    """PR 79 is the example story-mode.md holds up as a good STE narrative. A cap that
    fails it is a cap that would cut the explanation the guidance asks for."""
    story = json.loads(
        (REPO / ".cobuilder-architect" / "cobuilder-harness-a103a550" / "data" / "story.json").read_text()
    )
    story["timeline"] = [e for e in story["timeline"] if e["pr"] == 79]
    assert pb.story_overages(story) == []


def test_check_warns_over_the_cap_and_fails_only_over_the_ceiling(tmp_path, capsys):
    soft = tmp_path / "intent.json"
    soft.write_text(json.dumps({"problem": text(61)}))  # over the cap of 60, under 120
    assert pb.main(["prose_budget.py", "check", str(soft)]) == 0
    assert "over the cap" in capsys.readouterr().out
    hard = tmp_path / "goal.json"
    hard.write_text(json.dumps({"outcome": text(101)}))  # over twice the cap of 50
    assert pb.main(["prose_budget.py", "check", str(hard)]) == 1
    assert "OVER THE CEILING" in capsys.readouterr().out
    clean = tmp_path / "assessment.json"
    clean.write_text(json.dumps({"summary": text(80)}))
    assert pb.main(["prose_budget.py", "check", str(clean)]) == 0
    assert capsys.readouterr().out.strip().endswith("ok")


def test_split_overages_puts_twice_the_cap_on_the_hard_side():
    soft, hard = pb.split_overages(["a: 100 words, cap 50", "b: 101 words, cap 50", "c: 51 words, cap 50"])
    assert hard == ["b: 101 words, cap 50"]
    assert soft == ["a: 100 words, cap 50", "c: 51 words, cap 50"]


def test_show_prints_every_cap(capsys):
    assert pb.main(["prose_budget.py", "show"]) == 0
    out = capsys.readouterr().out
    for cap in (pb.GOAL["outcome"], pb.INTENT["approach"], pb.ASSESSMENT_SUMMARY, pb.LEVEL["voice"]):
        assert str(cap) in out


def test_verify_bundle_fails_the_ceiling_and_only_warns_over_a_cap(tmp_path):
    soft_story = {"timeline": [{"pr": 3, "intent": {"approach": text(110)}}]}  # over 100, under 200
    ceiling, soft = verify_bundle.check_prose_budget(tmp_path, soft_story)
    assert ceiling == "ok" and soft.startswith("over:1 pr3.intent.approach")
    hard_story = {"timeline": [{"pr": 3, "intent": {"approach": text(210)}}]}
    ceiling, soft = verify_bundle.check_prose_budget(tmp_path, hard_story)
    assert ceiling.startswith("over:1 pr3.intent.approach") and soft == "ok"
    assert verify_bundle.check_prose_budget(tmp_path, {"timeline": []}) == ("ok", "ok")


def test_the_ceiling_key_is_required_and_the_soft_key_is_optional():
    assert not "prose.budget".startswith(verify_bundle.REVIEW_PREFIXES)
    assert verify_bundle.all_ok({"prose.soft": "over:3 x"}, ("prose.soft",))
    assert not verify_bundle.all_ok({"prose.budget": "over:1 x"}, ("prose.soft",))


def test_verify_bundle_reads_designs_js(tmp_path):
    data = tmp_path / "data"
    data.mkdir()
    record = {"goal": {"outcome": text(101)}}
    (data / "designs.js").write_text("window.DESIGNS = " + json.dumps({"d1": record}) + ";")
    assert verify_bundle.check_prose_budget(tmp_path, None)[0].startswith("over:1 d1.goal.outcome")


def test_build_index_warns_but_still_builds(tmp_path, capsys):
    repo = tmp_path / "repo"
    design = repo / "docs" / "architecture" / "designs" / "d1"
    design.mkdir(parents=True)
    (design / "goal.json").write_text(
        json.dumps({"name": "d1", "outcome": text(60), "stage": "backlog"})
    )
    bundle = repo / ".cobuilder-architect" / "self"
    (bundle / "data").mkdir(parents=True)
    _, _, _, failures = build_index.build_index(repo, bundle)
    assert failures == []
    assert "over the prose budget: docs/architecture/designs/d1/goal.outcome: 60 words, cap 50" in capsys.readouterr().err


AUTHORING_REFERENCES = [
    "plugins/architect/skills/architecture/references/design-mode.md",
    "plugins/architect/skills/architecture/SKILL.md",
    "plugins/pr/skills/odyssey/references/interview-guide.md",
    "plugins/pr/skills/odyssey/references/review-mode.md",
    "plugins/pr/skills/odyssey/references/story-mode.md",
    "CLAUDE.md",
]


def test_every_authoring_reference_names_the_budget_and_the_checker():
    for rel in AUTHORING_REFERENCES:
        body = (REPO / rel).read_text(encoding="utf-8")
        assert "prose-budget" in body or "prose budget" in body.lower(), rel
        assert "prose_budget.py" in body or rel.endswith("story-mode.md") or "prose-budget.md" in body, rel


def test_no_second_register_remains():
    for rel in (
        "plugins/pr/skills/odyssey/SKILL.md",
        "plugins/pr/commands/review.md",
        "plugins/pr/skills/odyssey/references/story-mode.md",
    ):
        body = (REPO / rel).read_text(encoding="utf-8")
        assert "--style kleppmann" not in body and "kleppmann|ste" not in body, rel
    assert "reduced strictness" not in (REPO / "CLAUDE.md").read_text(encoding="utf-8")


def test_story_mode_keeps_the_explaining_method_and_the_worked_example():
    body = (REPO / "plugins/pr/skills/odyssey/references/story-mode.md").read_text(encoding="utf-8")
    for needle in (
        "Background starts deep, narrows to the change",
        "one concrete toy example",
        "Explain who runs which computation and why",
        "PR #79",
    ):
        assert needle in body, needle


def test_the_budget_never_asks_an_author_to_drop_meaning():
    body = (REPO / "shared/prose-budget.md").read_text(encoding="utf-8")
    assert "Cut words, not meaning" in body
    assert "Never delete a" in body


def test_story_mode_asks_for_the_simple_present():
    body = (REPO / "plugins/pr/skills/odyssey/references/story-mode.md").read_text(encoding="utf-8")
    assert "Tense: present, always." in body
    assert "Write past tense" not in body


def test_the_budget_suggests_a_standalone_first_sentence():
    body = (REPO / "shared/prose-budget.md").read_text(encoding="utf-8")
    assert "first sentence of a long field stand alone" in body
