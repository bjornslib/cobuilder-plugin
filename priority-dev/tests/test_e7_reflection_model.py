"""RED, slice 23 (epic E7): the reflection model has its own settings, and a proposal is kept whole.

1. A guided proposal longer than 4000 characters reaches the candidate unchanged. The cap is gone.
2. The `REFLECTION_*` settings pick the reflection model. Its default is the NVIDIA Mistral model.
   Its key is `REFLECTION_API_KEY`, then the provider key, and never the judge key.
3. `optimise._reflection_lm()` ignores the judge settings. A judge set to Mercury 3 leaves the
   reflection model unchanged.
4. `priority optimise --optimiser gepa` prints the reflection model id once. It saves a proposal
   longer than 4000 characters whole.

Every model here is a stub. No test makes a live model call. No test reads a real key.
"""
import contextlib
import io
import itertools
import time

import pytest

from eval_support import write_eval_world
from fixtures_support import require
from interpret_support import DummyLM, dspy, propose, step
from judge_ref_support import install_judge

REFLECTION_MODEL = "nvidia_nim/mistralai/mistral-large-4-1t-a52b"
REFLECTION_BASE_URL = "https://integrate.api.nvidia.com/v1"
TASK_MODEL = "openai/mercury-3"
LONG_BODY = ("Made-up instruction words. " * 240).strip()  # about 6479 characters, no newlines
CLEARED = ("LLM_PROVIDER", "LLM_MODEL", "LLM_BASE_URL", "LLM_API_KEY", "NVIDIA_API_KEY",
           "OPENROUTER_API_KEY", "INCEPTION_LABS_API_KEY", "JUDGE_PROVIDER", "JUDGE_MODEL",
           "JUDGE_BASE_URL", "JUDGE_API_KEY", "REFLECTION_PROVIDER", "REFLECTION_MODEL",
           "REFLECTION_BASE_URL", "REFLECTION_API_KEY")


@pytest.fixture(autouse=True)
def clean_env(monkeypatch, tmp_path):
    """Point the settings at an empty `.env` and clear every model and key variable."""
    empty = tmp_path / "made-up-empty.env"
    empty.write_text("")
    monkeypatch.setattr(require("priority.config"), "ENV_PATH", empty)
    for name in CLEARED:
        monkeypatch.delenv(name, raising=False)
    return monkeypatch


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    """Sleep for none: the metric's injected hook and the retry waits."""
    monkeypatch.setattr(require("priority.evaluation.metric"), "sleep", lambda seconds: None, raising=False)
    monkeypatch.setattr(time, "sleep", lambda seconds: None)


def config_api():
    """The config module, with each reflection reader present. A missing reader fails on an assertion."""
    config = require("priority.config")
    for name in ("reflection_provider", "reflection_model", "reflection_base_url",
                 "reflection_temperature", "reflection_key"):
        assert hasattr(config, name), f"priority.config has no {name} yet"
    return config


def optimise_api():
    """The optimise module, with the reflection LM builder present."""
    optimise = require("priority.optimise")
    assert hasattr(optimise, "_reflection_lm"), "priority.optimise has no _reflection_lm"
    return optimise


def lm_parts(lm):
    """The model id, base URL, and key of one LM."""
    kwargs = dict(lm.kwargs)
    return {"model": lm.model, "api_base": kwargs.get("api_base"), "api_key": kwargs.get("api_key")}


def stub_instruction_proposer(monkeypatch, body):
    """Replace DSPy's instruction proposer with a stub that returns `body` for each component."""
    gepa = require("dspy.teleprompt.gepa")

    class StubInstructionProposer:
        def __init__(self, *args, **kwargs):
            pass

        def __call__(self, candidate, reflective_dataset, components_to_update):
            return {name: body for name in components_to_update}

    monkeypatch.setattr(gepa, "InstructionProposer", StubInstructionProposer)


# ---- contract 1: a long proposal is kept whole ----

def test_a_long_guided_proposal_reaches_the_candidate_whole(monkeypatch):
    gepa_proposer = require("priority.gepa_proposer")
    stub_instruction_proposer(monkeypatch, LONG_BODY)
    proposed = gepa_proposer.guided_instruction_proposer(
        {"propose": "Made-up seed instruction."}, {"propose": []}, ["propose"])
    text = proposed["propose"]
    assert text.startswith(LONG_BODY), f"the proposal was cut to {len(text)} characters"
    assert text.endswith(gepa_proposer.schema_guard("propose"))


# ---- contract 2: the reflection settings and their defaults ----

def test_reflection_defaults_to_the_nvidia_mistral_model_not_the_task_model():
    config = config_api()
    assert config.reflection_provider() == "nvidia_nim"
    assert config.reflection_model() == REFLECTION_MODEL
    assert config.reflection_base_url() == REFLECTION_BASE_URL
    assert config.reflection_model() != TASK_MODEL


def test_reflection_env_overrides_set_provider_model_base_url_and_key(clean_env):
    clean_env.setenv("REFLECTION_PROVIDER", "openrouter")
    clean_env.setenv("REFLECTION_MODEL", "made-up/refl-small")
    clean_env.setenv("REFLECTION_BASE_URL", "https://made-up.example/v1")
    clean_env.setenv("REFLECTION_API_KEY", "sk-test-refl-made-up")
    config = config_api()
    assert config.reflection_provider() == "openrouter"
    assert config.reflection_model() == "openrouter/made-up/refl-small"
    assert config.reflection_base_url() == "https://made-up.example/v1"
    assert config.reflection_key() == "sk-test-refl-made-up"


def test_reflection_key_is_the_provider_key_then_the_reflection_key_never_the_judge_key(clean_env):
    clean_env.setenv("JUDGE_API_KEY", "sk-test-judge-made-up")
    clean_env.setenv("NVIDIA_API_KEY", "sk-test-nvidia-made-up")
    config = config_api()
    assert config.reflection_key() == "sk-test-nvidia-made-up"
    clean_env.setenv("REFLECTION_API_KEY", "sk-test-refl-made-up")
    assert config.reflection_key() == "sk-test-refl-made-up"


# ---- contract 3: the reflection LM ignores the judge settings ----

def test_reflection_lm_keeps_the_nvidia_model_when_the_judge_is_mercury(clean_env):
    clean_env.setenv("JUDGE_PROVIDER", "inception")
    clean_env.setenv("JUDGE_MODEL", "mercury-3")
    clean_env.setenv("INCEPTION_LABS_API_KEY", "sk-test-inception-made-up")
    clean_env.setenv("NVIDIA_API_KEY", "sk-test-nvidia-made-up")
    lm = optimise_api()._reflection_lm()
    assert lm is not None, "_reflection_lm returned None, so no reflection model was built"
    parts = lm_parts(lm)
    assert parts["model"] == REFLECTION_MODEL, f"the reflection model moved to {parts['model']}"
    assert parts["api_base"] == REFLECTION_BASE_URL
    assert parts["api_key"] == "sk-test-nvidia-made-up"


# ---- contract 4: the CLI prints the reflection model and saves the whole proposal ----

def judge_ok(monkeypatch):
    """Stub judge: every stop scores 0.8 with one note."""
    install_judge(monkeypatch, lambda brief, predicted, expected: (0.8, ["payload: the made-up parts match."]))


def gepa_world(monkeypatch, tmp_path):
    """Stub the task and reflection models, and move into `tmp_path`. Return the paths."""
    optimise = optimise_api()
    manifest, labels, real_dir, _ = write_eval_world(tmp_path, payloads=[step("reply")])
    task_lm = DummyLM(itertools.cycle([propose([step("reply")])]))
    reflection_lm = DummyLM(itertools.cycle([{"new_instruction": "Made-up better instruction."}]),
                            adapter=dspy.JSONAdapter())
    monkeypatch.setattr(require("priority.interpreter"), "interpreter_lm", lambda retries=0: task_lm)
    monkeypatch.setattr(optimise, "_reflection_lm", lambda: reflection_lm)
    monkeypatch.chdir(tmp_path)
    return manifest, labels, real_dir


def stub_gepa(monkeypatch):
    """Replace GEPA with a class that records its settings and returns the student. Return the record list."""
    import dspy.teleprompt as teleprompt

    calls: list = []

    class StubGEPA:
        def __init__(self, **settings):
            calls.append(settings)

        def compile(self, student, trainset=None, valset=None):
            return student

    monkeypatch.setattr(teleprompt, "GEPA", StubGEPA)
    return calls


def run_cli(monkeypatch, tmp_path):
    """Run `priority optimise --optimiser gepa` on stub models. Return (code, printed, raised)."""
    judge_ok(monkeypatch)
    manifest, labels, real_dir = gepa_world(monkeypatch, tmp_path)
    argv = ["optimise", "--optimiser", "gepa", "--manifest", str(manifest), "--labels", str(labels),
            "--real-dir", str(real_dir), "--budget", "2", "--seed", "7", "--threads", "1",
            "--minibatch", "3"]
    out, code, raised = io.StringIO(), None, None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            code = require("priority.cli").main(argv)
        except SystemExit as exit_:  # argparse exits on an unknown flag
            code = exit_.code
        except Exception as error:  # the test reports what escaped `main`
            raised = error
    return code, out.getvalue(), raised


def test_optimise_prints_the_reflection_model_once_with_a_mercury_judge(monkeypatch, tmp_path):
    monkeypatch.setenv("JUDGE_PROVIDER", "inception")
    monkeypatch.setenv("JUDGE_MODEL", "mercury-3")
    monkeypatch.setenv("NVIDIA_API_KEY", "sk-test-nvidia-made-up")
    stub_gepa(monkeypatch)
    code, printed, raised = run_cli(monkeypatch, tmp_path)
    assert raised is None, f"optimise raised {raised!r}"
    assert code in (0, None), f"optimise exited with {code!r}"
    lines = [line for line in printed.splitlines() if "reflection model" in line.lower()]
    assert len(lines) == 1, f"expected one reflection model line, got {lines!r}"
    assert REFLECTION_MODEL in lines[0], f"the line is {lines[0]!r}"


def test_optimise_saves_a_proposal_longer_than_4000_characters_whole(monkeypatch, tmp_path):
    calls = stub_gepa(monkeypatch)
    stub_instruction_proposer(monkeypatch, LONG_BODY)
    code, printed, raised = run_cli(monkeypatch, tmp_path)
    assert raised is None, f"optimise raised {raised!r}"
    assert calls, "the stub GEPA class was never built, so the run skipped the compile"
    proposer = calls[0].get("instruction_proposer")
    assert proposer is not None, f"no instruction_proposer in {sorted(calls[0])}"
    proposer(candidate={"propose": "Made-up seed instruction."},
             reflective_dataset={"propose": []}, components_to_update=["propose"])
    saved = [path.read_text() for path in tmp_path.rglob("reflection-*.json")]
    assert saved, "no reflection-NNN.json was written"
    assert any(LONG_BODY in text for text in saved), \
        f"the saved proposal is not the whole {len(LONG_BODY)}-character body"
