"""RED, epic E8: a billing or auth failure in the reflection model stops `priority optimise`. A validation error does not.

The pinned contract:

1. A reflection model that raises `LMBillingError` or `LMAuthError` stops the run. The run exits 1 and prints a line
   that starts `optimise failed: the reflection model failed: <error name>`. It saves no program under
   `probes/programs/`, and it leaves no GEPA log folder.
2. A reflection model that raises `pydantic.ValidationError` does not stop the run. The run exits 0.

Every model here is a stub. The stub GEPA calls the instruction proposer three times and ignores each failure, as
real GEPA does. No test makes a live model call.
"""
from __future__ import annotations

import contextlib
import io
import itertools

import pydantic
import pytest
from dspy.utils.exceptions import LMAuthError, LMBillingError

from eval_support import write_eval_world
from interpret_support import DummyLM, dspy, propose, step
from judge_ref_support import install_judge
from optimise_support import require

REFLECTION_BODY = "Made-up improved instruction."
SEED_INSTRUCTION = "Made-up seed instruction."

FATAL_CASES = ((LMBillingError, "billing"), (LMAuthError, "auth"))
FATAL_IDS = ("billing", "auth")


# ---- stubs and helpers -------------------------------------------------------

def stub_instruction_proposer(monkeypatch, body: str, error: BaseException | None = None) -> list:
    """Replace dspy's instruction proposer with a stub. Its call raises `error` when one is given. Return the settings
    that each build receives."""
    gepa = require("dspy.teleprompt.gepa")
    built: list = []

    class StubInstructionProposer:
        def __init__(self, settings=None, **kwargs):
            built.append(settings if settings is not None else kwargs)

        def __call__(self, candidate, reflective_dataset, components_to_update):
            if error is not None:
                raise error
            return {name: body for name in components_to_update}

    monkeypatch.setattr(gepa, "InstructionProposer", StubInstructionProposer)
    return built


def stub_gepa(monkeypatch) -> list:
    """Replace GEPA with a class that records its settings. Its `compile` calls the run's instruction proposer three
    times and ignores each failure, as real GEPA does. Then it returns the student. Return the record list."""
    import dspy.teleprompt as teleprompt

    calls: list = []

    class StubGEPA:
        def __init__(self, **settings):
            calls.append(settings)

        def compile(self, student, trainset=None, valset=None):
            proposer = calls[-1].get("instruction_proposer")
            if callable(proposer):
                for _ in range(3):
                    try:
                        proposer({"propose": SEED_INSTRUCTION}, {"propose": []}, ["propose"])
                    except Exception:  # real GEPA logs "Reflective mutation did not propose a new candidate"
                        pass
            return student

    monkeypatch.setattr(teleprompt, "GEPA", StubGEPA)
    return calls


def validation_error() -> pydantic.ValidationError:
    """A real `pydantic.ValidationError`: a four-character string breaks a three-character limit."""
    try:
        pydantic.TypeAdapter(pydantic.constr(max_length=3)).validate_python("long")
    except pydantic.ValidationError as error:
        return error
    raise AssertionError("the made-up string passed the made-up limit")


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


def run_proposer_cli(monkeypatch, tmp_path, extra_args=(), reflection_error=None):
    """Run `priority optimise --optimiser gepa` on stub models. The reflection model raises `reflection_error` when one
    is given. Return (code, printed, raised, run dir)."""
    install_judge(monkeypatch, lambda brief, predicted, expected: (0.8, ["made-up note"]))
    manifest, labels, real_dir = gepa_world(monkeypatch, tmp_path)
    stub_gepa(monkeypatch)
    stub_instruction_proposer(monkeypatch, REFLECTION_BODY, reflection_error)
    argv = ["optimise", "--optimiser", "gepa", "--manifest", str(manifest), "--labels", str(labels),
            "--real-dir", str(real_dir), "--budget", "2", "--seed", "7", "--threads", "1",
            "--minibatch", "3", "--gepa-log-dir", "made-up-log", *extra_args]
    out, code, raised = io.StringIO(), None, None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            code = require("priority.cli").main(argv)
        except SystemExit as exit_:  # a run that calls sys.exit ends here
            code = exit_.code
        except Exception as error:  # noqa: BLE001 (the test reports what escaped `main`)
            raised = error
    return code, out.getvalue(), raised, tmp_path / "made-up-log"


# ---- contract 1: a billing or auth failure stops the run ---------------------

@pytest.mark.parametrize("error_type,message", FATAL_CASES, ids=FATAL_IDS)
def test_optimise_stops_with_exit_1_when_the_reflection_model_raises_a_billing_or_auth_error(
        monkeypatch, tmp_path, error_type, message):
    code, printed, raised, run_dir = run_proposer_cli(monkeypatch, tmp_path,
                                                      reflection_error=error_type(message))
    line = f"optimise failed: the reflection model failed: {error_type.__name__}"
    assert raised is None, f"optimise raised {raised!r}"
    assert code == 1, f"optimise exited {code}, not 1: {printed[-400:]!r}"
    assert any(text.startswith(line) for text in printed.splitlines()), \
        f"the run printed no line that starts with {line!r}: {printed[-400:]!r}"
    programs = tmp_path / "probes" / "programs"
    saved = sorted(path.relative_to(tmp_path).as_posix() for path in programs.rglob("*")) if programs.is_dir() else []
    assert not saved, f"the run saved a program under probes/programs: {saved}"
    assert not run_dir.exists(), f"the run left {run_dir.name} behind in {tmp_path}"


# ---- contract 2: a validation error does not stop the run --------------------

def test_optimise_does_not_stop_when_the_reflection_model_raises_a_validation_error(monkeypatch, tmp_path):
    code, printed, raised, _ = run_proposer_cli(monkeypatch, tmp_path, reflection_error=validation_error())
    assert raised is None, f"optimise raised {raised!r}"
    assert code == 0, f"optimise exited {code}, not 0: {printed[-400:]!r}"
