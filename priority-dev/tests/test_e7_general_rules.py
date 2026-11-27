"""RED, slice 24 (epic E7): the reflection model gets general rules, not trainset details.

1. RED: the rendered `ProposeStop` prompt shows a non-null `agent_recommendation` that names an option label.
2. RED: `optimise --optimiser gepa` gives the instruction proposer general-rule guidance.
3. RED: a proposal that quotes a trainset option label is rejected. Only counts print.
4. RED: a proposal that quotes a trainset file name is rejected. Only counts print.
5. RED: a proposal that quotes no trainset detail passes, with the schema guard added.
6. RED: `blocked_details` keeps long option labels and file names, and drops short labels.
7. RED: end to end, a train label in a proposal is rejected, and a holdout label is not.

Every model here is a stub. No test makes a live model call.
"""
import contextlib
import inspect
import io
import json
import re

from eval_support import write_eval_world
from judge_ref_support import install_judge
from optimise_support import BUDGET, SEED, block_live_calls, install_stub_teleprompters, require

TRAIN_LABEL = "North Shed Tin"
HOLDOUT_LABEL = "Lower Barn Paint"
TRAIN_FILE = "shed_plan.md"
PARENT = "Read the stop brief. Pick the option the rules allow."
TRAIN_TEXT = f"Always pick {TRAIN_LABEL.lower()} first."
HOLDOUT_TEXT = f"Always pick {HOLDOUT_LABEL.lower()} first."
FILE_TEXT = f"Open {TRAIN_FILE} first."
SAFE_TEXT = "Ask one question per stop. Keep each answer short."
BLOCKED = frozenset({TRAIN_LABEL.lower(), TRAIN_FILE})


def stub_proposal(monkeypatch, body: str) -> list:
    """Replace DSPy's instruction proposer with a stub that returns `body` for each component.

    Return the keyword settings that the stub receives when it is built.
    """
    gepa = require("dspy.teleprompt.gepa")
    built: list = []

    class StubInstructionProposer:
        def __init__(self, **settings):
            built.append(settings)

        def __call__(self, candidate, reflective_dataset, components_to_update):
            return {name: body for name in components_to_update}

    monkeypatch.setattr(gepa, "InstructionProposer", StubInstructionProposer)
    return built


def assert_takes_blocked(fn) -> None:
    """Fail on an assertion, not a TypeError, when the proposer takes no blocked set."""
    assert "blocked" in inspect.signature(fn).parameters, "the proposer takes no blocked set of trainset details"


def ask_payload(*labels: str) -> dict:
    """One ask_human reference step whose question offers the made-up option labels."""
    options = [{"label": label, "detail": ""} for label in labels]
    question = {"ask": "Made-up question?", "options": options, "multi_select": False, "free_text": True}
    return {"kind": "ask_human", "detail": {"role": "decide", "questions": [question]},
            "why_escalated": "made-up reason"}


def reply_payload(text: str) -> dict:
    """One reply reference step with made-up text."""
    return {"kind": "reply", "text": text}


def run_cli(argv: list) -> tuple:
    """Run `priority` on argv with output captured. Return (exit code, printed text, raised)."""
    out, code, raised = io.StringIO(), None, None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            code = require("priority.cli").main(argv)
        except SystemExit as exit_:  # argparse exits on a bad flag
            code = exit_.code
        except Exception as error:  # noqa: BLE001 (the test reports what escaped `main`)
            raised = error
    return code, out.getvalue(), raised


def test_rendered_prompt_example_has_a_non_null_agent_recommendation():
    signatures = require("priority.interpreter.signatures")
    dspy = require("dspy")
    messages = dspy.ChatAdapter().format(signatures.ProposeStop, [], {"brief_text": "made-up brief"})
    system = messages[0]["content"]
    assert '"agent_recommendation": null' not in system, \
        "the ProposeStop example still shows a null agent_recommendation"
    recommended = re.findall(r'"agent_recommendation": "([^"]+)"', system)
    assert recommended, "the ProposeStop example shows no non-null agent_recommendation"
    assert recommended[0] in re.findall(r'"label": "([^"]+)"', system), \
        f"agent_recommendation {recommended[0]!r} names no option label in the example"


def test_proposer_is_given_general_rule_guidance(monkeypatch):
    gepa_proposer = require("priority.gepa_proposer")
    assert hasattr(gepa_proposer, "GENERAL_RULES"), "priority.gepa_proposer has no GENERAL_RULES"
    built = stub_proposal(monkeypatch, SAFE_TEXT)
    gepa_proposer.guided_instruction_proposer({"propose": PARENT}, {"propose": []}, ["propose"])
    assert built, "the instruction proposer was never built"
    guidance = built[0].get("additional_instructions")
    assert isinstance(guidance, str) and guidance.strip(), \
        f"the instruction proposer got no additional_instructions, only {sorted(built[0])}"
    assert guidance == gepa_proposer.GENERAL_RULES, "the proposer got guidance other than GENERAL_RULES"


def test_proposal_quoting_a_train_label_is_rejected(monkeypatch, capsys):
    gepa_proposer = require("priority.gepa_proposer")
    assert_takes_blocked(gepa_proposer.guided_instruction_proposer)
    stub_proposal(monkeypatch, TRAIN_TEXT)
    result = gepa_proposer.guided_instruction_proposer(
        {"propose": PARENT}, {"propose": []}, ["propose"], blocked=frozenset({TRAIN_LABEL.lower()}))
    assert result == {"propose": PARENT}, f"the proposal that quotes a train label was kept: {result}"
    printed = capsys.readouterr().out
    assert "proposal rejected: quotes 1 trainset option labels and 0 file names" in printed, \
        f"no rejection reason was printed: {printed!r}"
    assert TRAIN_LABEL.lower() not in printed.lower(), "the rejection printed the train label"


def test_proposal_quoting_a_train_file_is_rejected(monkeypatch, capsys):
    gepa_proposer = require("priority.gepa_proposer")
    assert_takes_blocked(gepa_proposer.guided_instruction_proposer)
    stub_proposal(monkeypatch, FILE_TEXT)
    result = gepa_proposer.guided_instruction_proposer(
        {"propose": PARENT}, {"propose": []}, ["propose"], blocked=frozenset({TRAIN_FILE}))
    assert result == {"propose": PARENT}, f"the proposal that quotes a train file was kept: {result}"
    printed = capsys.readouterr().out
    assert "proposal rejected: quotes 0 trainset option labels and 1 file names" in printed, \
        f"no rejection reason was printed: {printed!r}"
    assert TRAIN_FILE not in printed, "the rejection printed the train file name"


def test_proposal_with_no_blocked_detail_passes(monkeypatch, capsys):
    gepa_proposer = require("priority.gepa_proposer")
    assert_takes_blocked(gepa_proposer.guided_instruction_proposer)
    stub_proposal(monkeypatch, SAFE_TEXT)
    result = gepa_proposer.guided_instruction_proposer(
        {"propose": PARENT}, {"propose": []}, ["propose"], blocked=BLOCKED)
    assert result == {"propose": SAFE_TEXT + "\n\n" + gepa_proposer.schema_guard("propose")}, \
        f"a proposal with no trainset detail changed: {result}"
    assert "proposal rejected" not in capsys.readouterr().out


def test_blocked_details_keep_long_labels_and_file_names_only():
    gepa_proposer = require("priority.gepa_proposer")
    assert hasattr(gepa_proposer, "blocked_details"), "priority.gepa_proposer has no blocked_details"
    dspy = require("dspy")
    examples = [dspy.Example(expected_payloads=[
        ask_payload(TRAIN_LABEL, "blue", "two words"), reply_payload(FILE_TEXT)])]
    found = gepa_proposer.blocked_details(examples)
    assert TRAIN_LABEL.lower() in found, f"the long option label is missing from {sorted(found)}"
    assert TRAIN_FILE in found, f"the file name is missing from {sorted(found)}"
    assert "blue" not in found and "two words" not in found, f"a short label leaked into {sorted(found)}"


def test_train_label_in_a_proposal_is_rejected_end_to_end(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda brief, predicted, expected: (0.8, ["made-up note"]))
    manifest, labels_path, real_dir, parts = write_eval_world(tmp_path)
    labels = json.loads(labels_path.read_text())
    for part, label_text in (("train", TRAIN_LABEL), ("holdout", HOLDOUT_LABEL)):
        for session_id in parts[part]:
            for stop in labels["sessions"][session_id]["stops"].values():
                stop["payloads"] = [ask_payload(label_text)]
    labels_path.write_text(json.dumps(labels, indent=2) + "\n")
    calls = install_stub_teleprompters(monkeypatch)
    block_live_calls(monkeypatch)
    monkeypatch.chdir(tmp_path)
    argv = ["optimise", "--optimiser", "gepa", "--manifest", str(manifest), "--labels", str(labels_path),
            "--real-dir", str(real_dir), "--budget", str(BUDGET), "--seed", str(SEED)]
    code, printed, raised = run_cli(argv)
    assert raised is None, f"optimise raised {raised!r}"
    assert calls["gepa"], f"the stub GEPA class was never built (exit {code}): {printed}"
    record = calls["gepa"][0]["settings"]["instruction_proposer"]
    gepa_proposer = require("priority.gepa_proposer")

    stub_proposal(monkeypatch, TRAIN_TEXT)
    rejected = record({"propose": PARENT}, {"propose": []}, ["propose"])
    assert rejected == {"propose": PARENT}, "a proposal quoting a train label reached the prompt"

    stub_proposal(monkeypatch, HOLDOUT_TEXT)
    accepted = record({"propose": PARENT}, {"propose": []}, ["propose"])
    assert accepted == {"propose": HOLDOUT_TEXT + "\n\n" + gepa_proposer.schema_guard("propose")}, \
        "a proposal quoting only a holdout label was rejected, so the blocked set reads holdout data"
