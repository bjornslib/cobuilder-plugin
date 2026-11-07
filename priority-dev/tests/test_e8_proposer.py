"""RED, slice 28 (epic E8): the proposer prompt, the reference material, and the proposer choice.

The pinned contract:

1. `priority.gepa_proposer.guided_instruction_proposer(..., version="v2")` builds the dspy
   `InstructionProposer` with `base_instructions=PROPOSER_BASE`, `additional_instructions=GENERAL_RULES`,
   `skills=[proposer_reference()]`, and `max_chars=MAX_INSTRUCTION_CHARS` (6000). `version="v1"` builds it
   with `additional_instructions` only, as E7 did. `v2` is the default after E8.
2. `PROPOSER_BASE` exists, is a non-empty string, differs from the dspy `ProposeInstruction` docstring, and
   is the exact string that the v2 proposer passes as `base_instructions`.
3. `proposer_reference()` names every output field of `ProposeStop` with its allowed values, and every step
   kind of `ACTION_KINDS`. It holds no option label of a made-up trainset.
4. `priority optimise --proposer v1|v2` prints `proposer: <version>`, and each `reflection-NNN.json` records it.

Every model here is a stub. No test makes a live model call.
"""
from __future__ import annotations

import contextlib
import importlib
import importlib.util
import inspect
import io
import itertools
import json
import re

import pytest

from eval_support import write_eval_world
from interpret_support import DummyLM, dspy, propose, step
from judge_ref_support import install_judge
from optimise_support import require

PARENT = "Read the stop brief. Pick the option the rules allow."
SAFE_TEXT = "Ask one question per stop. Keep each answer short."
SEED_INSTRUCTION = "Made-up seed instruction."
REFLECTION_BODY = "Made-up improved instruction."

LABEL_LONG = "North Shed Tin"
LABEL_SHORT = "blue"
TRAIN_FILE = "shed_plan.md"

PROPOSER_CASES = (((), "v2"), (("--proposer", "v1"), "v1"), (("--proposer", "v2"), "v2"))
PROPOSER_IDS = ("default", "v1", "v2")


# ---- stubs and helpers -------------------------------------------------------

def stub_instruction_proposer(monkeypatch, body: str) -> list:
    """Replace dspy's instruction proposer with a stub. Return the settings that each build receives."""
    gepa = require("dspy.teleprompt.gepa")
    built: list = []

    class StubInstructionProposer:
        def __init__(self, settings=None, **kwargs):
            built.append(settings if settings is not None else kwargs)

        def __call__(self, candidate, reflective_dataset, components_to_update):
            return {name: body for name in components_to_update}

    monkeypatch.setattr(gepa, "InstructionProposer", StubInstructionProposer)
    return built


def stub_gepa(monkeypatch) -> list:
    """Replace GEPA with a class that records its settings, runs the run's instruction proposer once, and
    returns the student. Return the record list."""
    import dspy.teleprompt as teleprompt

    calls: list = []

    class StubGEPA:
        def __init__(self, **settings):
            calls.append(settings)

        def compile(self, student, trainset=None, valset=None):
            proposer = calls[-1].get("instruction_proposer")
            if callable(proposer):
                proposer({"propose": SEED_INSTRUCTION}, {"propose": []}, ["propose"])
            return student

    monkeypatch.setattr(teleprompt, "GEPA", StubGEPA)
    return calls


def assert_takes_version(fn) -> None:
    """Fail on an assertion, not a TypeError, when the proposer takes no version choice."""
    assert "version" in inspect.signature(fn).parameters, \
        "guided_instruction_proposer takes no `version` keyword (pin: version='v1' or version='v2')"


def existing_module(name: str):
    """The module, or None when it does not exist yet."""
    try:
        found = importlib.util.find_spec(name)
    except ModuleNotFoundError:
        found = None
    return importlib.import_module(name) if found is not None else None


def proposer_reference_fn():
    """`proposer_reference`, from `priority.proposer_reference` or from `priority.gepa_proposer`."""
    for name in ("priority.proposer_reference", "priority.gepa_proposer"):
        module = existing_module(name)
        fn = getattr(module, "proposer_reference", None) if module is not None else None
        if callable(fn):
            return fn
    assert False, "no proposer_reference() in priority.proposer_reference or priority.gepa_proposer"


def proposer_reference_text() -> str:
    """The schema reference text for the reflection model."""
    text = proposer_reference_fn()()
    assert isinstance(text, str) and text.strip(), f"proposer_reference() returned {type(text).__name__}"
    return text


def dspy_propose_instruction_text() -> str:
    """The docstring of the dspy signature that the new base prompt replaces."""
    instruction = require("dspy.teleprompt.gepa.instruction_proposal")
    docstring = getattr(instruction.ProposeInstruction, "__doc__", None)
    assert isinstance(docstring, str) and docstring.strip(), \
        f"dspy ProposeInstruction has no docstring, only {docstring!r}"
    return docstring


def output_fields() -> dict:
    """The output fields of `ProposeStop`, as name to field info."""
    return dict(require("priority.interpreter.signatures").ProposeStop.output_fields)


def action_kinds() -> tuple:
    """Every step kind of the interpreter."""
    return tuple(require("priority.interpreter.models").ACTION_KINDS)


def ask_payload(*labels: str) -> dict:
    """One ask_human reference step whose question offers the made-up option labels."""
    options = [{"label": label, "detail": ""} for label in labels]
    question = {"ask": "Made-up question?", "options": options, "multi_select": False, "free_text": True}
    return {"kind": "ask_human", "detail": {"role": "decide", "questions": [question]},
            "why_escalated": "made-up reason"}


def reply_payload(text: str) -> dict:
    """One reply reference step with made-up text."""
    return {"kind": "reply", "text": text}


# ---- contract 1: the proposer choice -----------------------------------------

def test_v2_proposer_builds_the_base_prompt_general_rules_one_skills_text_and_max_chars(monkeypatch):
    gepa_proposer = require("priority.gepa_proposer")
    assert_takes_version(gepa_proposer.guided_instruction_proposer)
    for name in ("PROPOSER_BASE", "GENERAL_RULES", "MAX_INSTRUCTION_CHARS"):
        assert hasattr(gepa_proposer, name), f"priority.gepa_proposer has no {name}"
    assert gepa_proposer.MAX_INSTRUCTION_CHARS == 6000, \
        f"MAX_INSTRUCTION_CHARS is {gepa_proposer.MAX_INSTRUCTION_CHARS!r}, not 6000"
    built = stub_instruction_proposer(monkeypatch, SAFE_TEXT)
    gepa_proposer.guided_instruction_proposer({"propose": PARENT}, {"propose": []}, ["propose"], version="v2")
    assert built, "the instruction proposer was never built"
    settings = built[0]
    assert settings.get("base_instructions") == gepa_proposer.PROPOSER_BASE, \
        f"the v2 base_instructions are {settings.get('base_instructions')!r}"
    assert settings.get("additional_instructions") == gepa_proposer.GENERAL_RULES, \
        f"the v2 additional_instructions are {settings.get('additional_instructions')!r}"
    assert settings.get("max_chars") == 6000, f"the v2 max_chars are {settings.get('max_chars')!r}"
    skills = settings.get("skills")
    assert isinstance(skills, list) and len(skills) == 1, f"the v2 skills are {skills!r}, not one source"
    assert skills[0] == proposer_reference_text(), "the one skills text is not proposer_reference()"
    assert set(settings) == {"base_instructions", "additional_instructions", "skills", "max_chars"}, \
        f"the v2 proposer settings are {sorted(settings)}"


def test_v1_proposer_passes_only_additional_instructions(monkeypatch):
    gepa_proposer = require("priority.gepa_proposer")
    assert_takes_version(gepa_proposer.guided_instruction_proposer)
    built = stub_instruction_proposer(monkeypatch, SAFE_TEXT)
    gepa_proposer.guided_instruction_proposer({"propose": PARENT}, {"propose": []}, ["propose"], version="v1")
    assert built, "the instruction proposer was never built"
    assert built[0] == {"additional_instructions": gepa_proposer.GENERAL_RULES}, \
        f"the v1 proposer settings are {sorted(built[0])}, not additional_instructions alone"


def test_v2_is_the_default_proposer(monkeypatch):
    gepa_proposer = require("priority.gepa_proposer")
    assert_takes_version(gepa_proposer.guided_instruction_proposer)
    built = stub_instruction_proposer(monkeypatch, SAFE_TEXT)
    gepa_proposer.guided_instruction_proposer({"propose": PARENT}, {"propose": []}, ["propose"])
    assert built, "the instruction proposer was never built"
    assert built[0].get("base_instructions") == gepa_proposer.PROPOSER_BASE, \
        f"the default proposer settings are {sorted(built[0])}, so v2 is not the default"


# ---- contract 2: PROPOSER_BASE ------------------------------------------------

def test_proposer_base_is_a_non_empty_string(monkeypatch):
    gepa_proposer = require("priority.gepa_proposer")
    assert hasattr(gepa_proposer, "PROPOSER_BASE"), "priority.gepa_proposer has no PROPOSER_BASE"
    text = gepa_proposer.PROPOSER_BASE
    assert isinstance(text, str), f"PROPOSER_BASE is a {type(text).__name__}, not a string"
    assert text.strip(), "PROPOSER_BASE is empty"


def test_proposer_base_differs_from_the_dspy_propose_instruction_text():
    gepa_proposer = require("priority.gepa_proposer")
    assert hasattr(gepa_proposer, "PROPOSER_BASE"), "priority.gepa_proposer has no PROPOSER_BASE"
    dspy_text = dspy_propose_instruction_text()
    text = gepa_proposer.PROPOSER_BASE
    assert isinstance(text, str), f"PROPOSER_BASE is a {type(text).__name__}, not a string"
    assert text.strip() != dspy_text.strip(), \
        "PROPOSER_BASE is the dspy ProposeInstruction docstring, so dspy's own text still reaches the model"


def test_proposer_base_is_the_exact_base_instructions_of_the_v2_proposer(monkeypatch):
    gepa_proposer = require("priority.gepa_proposer")
    assert hasattr(gepa_proposer, "PROPOSER_BASE"), "priority.gepa_proposer has no PROPOSER_BASE"
    assert_takes_version(gepa_proposer.guided_instruction_proposer)
    built = stub_instruction_proposer(monkeypatch, SAFE_TEXT)
    gepa_proposer.guided_instruction_proposer({"propose": PARENT}, {"propose": []}, ["propose"], version="v2")
    gepa_proposer.guided_instruction_proposer({"propose": PARENT}, {"propose": []}, ["propose"], version="v1")
    assert len(built) == 2, f"the instruction proposer was built {len(built)} times, not twice"
    assert built[0].get("base_instructions") == gepa_proposer.PROPOSER_BASE, \
        f"the v2 base_instructions are {built[0].get('base_instructions')!r}"
    assert "base_instructions" not in built[1], \
        f"the v1 proposer passes a base prompt after all: {sorted(built[1])}"


# ---- contract 3: proposer_reference() ----------------------------------------

def test_proposer_reference_names_every_output_field_of_propose_stop():
    reference = proposer_reference_text().lower()
    missing = [name for name in output_fields() if name.lower() not in reference]
    assert not missing, f"proposer_reference() does not name the output fields {missing}"


def test_proposer_reference_names_the_allowed_values_of_the_literal_fields():
    from typing import get_args

    reference = proposer_reference_text().lower()
    values = [str(value) for info in output_fields().values() for value in get_args(info.annotation)]
    assert values, "ProposeStop has no literal output field, so the check is empty"
    missing = [value for value in values if value.lower() not in reference]
    assert not missing, f"proposer_reference() does not name the allowed values {missing}"


def test_proposer_reference_names_every_step_kind_of_action_kinds():
    reference = proposer_reference_text().lower()
    missing = [kind for kind in action_kinds() if kind.lower() not in reference]
    assert not missing, f"proposer_reference() does not name the step kinds {missing}"


def test_proposer_reference_holds_no_option_label_of_a_made_up_trainset(tmp_path):
    manifest, labels, real_dir, _ = write_eval_world(
        tmp_path, payloads=[ask_payload(LABEL_LONG, LABEL_SHORT), reply_payload(f"Open {TRAIN_FILE} first.")])
    examples, _ = require("priority.trainset").build_trainset(manifest, labels, real_dir)
    blocked = require("priority.gepa_proposer").blocked_details(examples)
    assert LABEL_LONG.lower() in blocked and TRAIN_FILE in blocked, \
        f"the made-up trainset holds no blocked detail, only {sorted(blocked)}"
    reference = proposer_reference_text().lower()
    leaked = sorted(detail for detail in blocked if detail in reference)
    assert not leaked, f"proposer_reference() holds the made-up trainset details {leaked}"


# ---- contract 4: the run prints the proposer and records it -------------------

def gepa_world(monkeypatch, tmp_path):
    """Stub the task and reflection models, and move into `tmp_path`. Return the paths."""
    optimise = require("priority.optimise")
    manifest, labels, real_dir, _ = write_eval_world(tmp_path, payloads=[step("reply")])
    task_lm = DummyLM(itertools.cycle([propose([step("reply")])]))
    reflection_lm = DummyLM(itertools.cycle([{"new_instruction": REFLECTION_BODY}]),
                            adapter=dspy.JSONAdapter())
    monkeypatch.setattr(require("priority.interpreter"), "interpreter_lm", lambda retries=0: task_lm)
    monkeypatch.setattr(optimise, "_reflection_lm", lambda: reflection_lm)
    monkeypatch.chdir(tmp_path)
    return manifest, labels, real_dir


def run_proposer_cli(monkeypatch, tmp_path, extra_args=()):
    """Run `priority optimise --optimiser gepa` on stub models. Return (code, printed, raised, run dir)."""
    install_judge(monkeypatch, lambda brief, predicted, expected: (0.8, ["made-up note"]))
    manifest, labels, real_dir = gepa_world(monkeypatch, tmp_path)
    stub_gepa(monkeypatch)
    stub_instruction_proposer(monkeypatch, REFLECTION_BODY)
    argv = ["optimise", "--optimiser", "gepa", "--manifest", str(manifest), "--labels", str(labels),
            "--real-dir", str(real_dir), "--budget", "2", "--seed", "7", "--threads", "1",
            "--minibatch", "3", "--gepa-log-dir", "made-up-log", *extra_args]
    out, code, raised = io.StringIO(), None, None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            code = require("priority.cli").main(argv)
        except SystemExit as exit_:  # argparse exits on an unknown flag
            code = exit_.code
        except Exception as error:  # noqa: BLE001 (the test reports what escaped `main`)
            raised = error
    return code, out.getvalue(), raised, tmp_path / "made-up-log"


@pytest.mark.parametrize("extra_args,expected", PROPOSER_CASES, ids=PROPOSER_IDS)
def test_optimise_prints_the_proposer_and_records_it_in_the_reflection_file(monkeypatch, tmp_path, extra_args, expected):
    code, printed, raised, run_dir = run_proposer_cli(monkeypatch, tmp_path, extra_args)
    assert raised is None, f"optimise raised {raised!r}"
    assert code == 0, f"optimise exited {code}: {printed[-400:]!r}"
    printed_proposers = re.findall(r"^proposer: (v\d)$", printed, re.M)
    assert printed_proposers == [expected], f"the run printed {printed_proposers}, not [{expected!r}]"
    reflections = sorted(run_dir.glob("reflection-*.json"))
    assert reflections, f"no reflection file in {run_dir}: {sorted(path.name for path in run_dir.iterdir())}"
    for path in reflections:
        record = json.loads(path.read_text())
        assert record.get("proposer") == expected, \
            f"{path.name} records proposer {record.get('proposer')!r}, not {expected!r}"
