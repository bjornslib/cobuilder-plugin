"""Slice 21 RED: the judge and the GEPA reflection LM use the NVIDIA Mistral model.

The contract. `priority.config` gains `judge_provider()`, `judge_model()`,
`judge_base_url()`, `judge_temperature()`, and `judge_key()`, reading
`JUDGE_PROVIDER`, `JUDGE_MODEL`, `JUDGE_BASE_URL`, and `JUDGE_API_KEY`. The
defaults are the NVIDIA Mistral judge: provider `nvidia_nim`, model id
`nvidia_nim/mistralai/mistral-large-4-1t-a52b`, base URL
`https://integrate.api.nvidia.com/v1`, key from `NVIDIA_API_KEY`. The task
readers do not change. `priority.evaluation.judge.judge_lm(retries=3)`
builds the judge `dspy.LM` from those readers and the judge token cap, and
`_default_lm()` returns it. `optimise._reflection_lm()` returns the same
judge model id and base URL, not the task model. `tests/conftest.py` stubs
`config.judge_key` like `config.load_key`, so no test reads the real key.
Every test here points `config.ENV_PATH` at a temp file and sets the
variables with `monkeypatch.setenv`, so the real `.env` never decides a
test. No test makes a live model call.
"""
from __future__ import annotations

import pytest

from fixtures_support import require

JUDGE_PROVIDERS = ("openrouter", "nvidia_nim", "inception")
DEFAULT_JUDGE_MODEL = "nvidia_nim/mistralai/mistral-large-4-1t-a52b"
DEFAULT_JUDGE_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_JUDGE_BASE_URL = "https://integrate.api.nvidia.com/v1"
OPENROUTER_JUDGE_BASE_URL = "https://openrouter.ai/api/v1"
INCEPTION_JUDGE_BASE_URL = "https://api.inceptionlabs.ai/v1"
TASK_MODEL = "openai/mercury-3"


@pytest.fixture(autouse=True)
def env(monkeypatch, tmp_path):
    """An empty env file, so the real .env never decides a test."""
    config = require("priority.config")
    empty = tmp_path / ".env"
    empty.write_text("")
    monkeypatch.setattr(config, "ENV_PATH", empty)
    for name in ("LLM_PROVIDER", "LLM_MODEL", "LLM_BASE_URL", "LLM_API_KEY",
                 "NVIDIA_API_KEY", "OPENROUTER_API_KEY", "INCEPTION_LABS_API_KEY",
                 "JUDGE_PROVIDER", "JUDGE_MODEL", "JUDGE_BASE_URL", "JUDGE_API_KEY",
                 "REFLECTION_PROVIDER", "REFLECTION_MODEL", "REFLECTION_BASE_URL", "REFLECTION_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    return monkeypatch


def config_api():
    """The config module, or an assertion failure."""
    api = require("priority.config")
    for name in ("judge_provider", "judge_model", "judge_base_url", "judge_temperature", "judge_key"):
        assert hasattr(api, name), f"priority.config has no {name}"
    return api


# ---- the judge provider -------------------------------------------------------

def test_judge_provider_defaults_to_nvidia_nim():
    assert config_api().judge_provider() == "nvidia_nim"


def test_judge_provider_reads_the_env_override(env):
    for name in JUDGE_PROVIDERS:
        env.setenv("JUDGE_PROVIDER", name)
        assert config_api().judge_provider() == name


def test_judge_provider_rejects_a_name_outside_the_task_set():
    env = config_api()
    with pytest.MonkeyPatch.context() as patch:
        patch.setenv("JUDGE_PROVIDER", "made-up-provider")
        with pytest.raises(RuntimeError, match="JUDGE_PROVIDER"):
            env.judge_provider()


# ---- the judge model ------------------------------------------------------------

def test_judge_model_default_is_the_nvidia_mistral_id():
    assert config_api().judge_model() == DEFAULT_JUDGE_MODEL


def test_judge_model_prefixes_the_env_model(env):
    env.setenv("JUDGE_MODEL", "made-up/judge-small")
    assert config_api().judge_model() == "nvidia_nim/made-up/judge-small"


def test_judge_model_prefix_follows_the_provider(env):
    env.setenv("JUDGE_PROVIDER", "openrouter")
    env.setenv("JUDGE_MODEL", "made-up/judge-small")
    assert config_api().judge_model() == "openrouter/made-up/judge-small"


def test_judge_model_stays_off_the_task_model():
    assert config_api().judge_model() != config_api().model()


# ---- the judge base URL -----------------------------------------------------------

def test_judge_base_url_defaults_to_the_nvidia_endpoint():
    assert config_api().judge_base_url() == DEFAULT_JUDGE_BASE_URL


def test_judge_base_url_follows_the_provider_default(env):
    urls = {"nvidia_nim": NVIDIA_JUDGE_BASE_URL, "openrouter": OPENROUTER_JUDGE_BASE_URL,
            "inception": INCEPTION_JUDGE_BASE_URL}
    for name, url in urls.items():
        env.setenv("JUDGE_PROVIDER", name)
        assert config_api().judge_base_url() == url


def test_judge_base_url_reads_the_env_override(env):
    env.setenv("JUDGE_BASE_URL", "https://made-up.example/v1")
    assert config_api().judge_base_url() == "https://made-up.example/v1"


# ---- the judge temperature ----------------------------------------------------------

def test_judge_temperature_is_the_provider_floor(env):
    env.setenv("JUDGE_PROVIDER", "inception")
    assert config_api().judge_temperature() == 0.5
    env.setenv("JUDGE_PROVIDER", "nvidia_nim")
    assert config_api().judge_temperature() == 0.0


# ---- the judge key -------------------------------------------------------------------

def test_judge_key_reads_the_env_override(env):
    env.setenv("JUDGE_API_KEY", "sk-test-judge-env")
    assert config_api().judge_key() == "sk-test-judge-env"


@pytest.mark.parametrize("provider,key_name", [("nvidia_nim", "NVIDIA_API_KEY"),
                                               ("openrouter", "OPENROUTER_API_KEY"),
                                               ("inception", "INCEPTION_LABS_API_KEY")])
def test_judge_key_falls_back_to_the_per_provider_key(env, provider, key_name):
    env.setenv("JUDGE_PROVIDER", provider)
    env.setenv(key_name, f"sk-test-{provider}")
    assert config_api().judge_key() == f"sk-test-{provider}"


def test_judge_key_prefers_judge_api_key_over_the_provider_key(env):
    env.setenv("JUDGE_PROVIDER", "nvidia_nim")
    env.setenv("NVIDIA_API_KEY", "sk-test-nvidia")
    env.setenv("JUDGE_API_KEY", "sk-test-judge")
    assert config_api().judge_key() == "sk-test-judge"


def test_judge_key_raises_without_leaking_the_key_text(env):
    env.setenv("JUDGE_PROVIDER", "nvidia_nim")
    with pytest.raises(RuntimeError) as info:
        config_api().judge_key()
    assert "JUDGE_API_KEY" in str(info.value)
    assert "sk-" not in str(info.value)


# ---- the task readers do not change ---------------------------------------------------

def test_task_readers_keep_their_defaults():
    config = config_api()
    assert config.provider() == "inception"
    assert config.model() == TASK_MODEL
    assert config.base_url() == "https://api.inceptionlabs.ai/v1"
    assert config.temperature() == 0.5


def test_judge_settings_do_not_leak_into_the_task_readers(env):
    env.setenv("JUDGE_PROVIDER", "nvidia_nim")
    env.setenv("JUDGE_MODEL", "made-up/judge-small")
    env.setenv("JUDGE_BASE_URL", "https://made-up.example/v1")
    config = config_api()
    assert config.model() == TASK_MODEL
    assert config.base_url() == "https://api.inceptionlabs.ai/v1"


# ---- the judge LM factory ---------------------------------------------------------------

def judge_api():
    """The judge module with its judge_lm factory, or an assertion failure."""
    api = require("priority.evaluation.judge")
    assert hasattr(api, "judge_lm"), "priority.evaluation.judge has no judge_lm"
    return api


def lm_parts(lm):
    """The model id, base URL, key, temperature, token cap, and retries of one LM."""
    kwargs = dict(lm.kwargs)
    return {"model": lm.model, "api_base": kwargs.get("api_base"), "api_key": kwargs.get("api_key"),
            "temperature": kwargs.get("temperature"), "max_tokens": kwargs.get("max_tokens"),
            "num_retries": lm.num_retries}


def test_judge_lm_builds_the_default_nvidia_mistral_lm(env):
    env.setenv("NVIDIA_API_KEY", "sk-test-nvidia")
    parts = lm_parts(judge_api().judge_lm(retries=3))
    assert parts["model"] == DEFAULT_JUDGE_MODEL
    assert parts["api_base"] == DEFAULT_JUDGE_BASE_URL
    assert parts["api_key"] == "sk-test-nvidia"
    assert parts["temperature"] == 0.0
    assert parts["max_tokens"] == judge_api().JUDGE_MAX_TOKENS
    assert parts["num_retries"] == 3


def test_judge_lm_passes_the_retries_through(env):
    env.setenv("NVIDIA_API_KEY", "sk-test-nvidia")
    assert judge_api().judge_lm(retries=5).num_retries == 5
    assert judge_api().judge_lm().num_retries == 3


def test_judge_lm_reads_the_env_overrides(env):
    env.setenv("JUDGE_PROVIDER", "openrouter")
    env.setenv("JUDGE_MODEL", "made-up/judge-small")
    env.setenv("JUDGE_BASE_URL", "https://made-up.example/v1")
    env.setenv("JUDGE_API_KEY", "sk-test-judge")
    parts = lm_parts(judge_api().judge_lm(retries=3))
    assert parts["model"] == "openrouter/made-up/judge-small"
    assert parts["api_base"] == "https://made-up.example/v1"
    assert parts["api_key"] == "sk-test-judge"


def test_default_lm_returns_the_judge_lm(monkeypatch, env):
    env.setenv("NVIDIA_API_KEY", "sk-test-nvidia")
    api = judge_api()
    lm = api._default_lm()
    assert lm_parts(lm)["model"] == DEFAULT_JUDGE_MODEL
    assert lm_parts(lm)["api_base"] == DEFAULT_JUDGE_BASE_URL
    assert lm_parts(lm)["num_retries"] == 3


# ---- the GEPA reflection LM ----------------------------------------------------------------

def optimise_api():
    """The optimise module, or an assertion failure."""
    return require("priority.optimise")


def test_reflection_lm_uses_the_judge_model_not_the_task_model(env):
    env.setenv("NVIDIA_API_KEY", "sk-test-nvidia")
    lm = optimise_api()._reflection_lm()
    assert lm is not None, "the reflection LM came back None with a stubbed judge key"
    parts = lm_parts(lm)
    assert parts["model"] == DEFAULT_JUDGE_MODEL
    assert parts["model"] != TASK_MODEL
    assert parts["api_base"] == DEFAULT_JUDGE_BASE_URL


def test_reflection_lm_reads_the_env_overrides(env):
    env.setenv("REFLECTION_PROVIDER", "openrouter")
    env.setenv("REFLECTION_MODEL", "made-up/judge-small")
    env.setenv("REFLECTION_BASE_URL", "https://made-up.example/v1")
    env.setenv("REFLECTION_API_KEY", "sk-test-or")
    lm = optimise_api()._reflection_lm()
    assert lm is not None, "_reflection_lm returned None, so no reflection model was built"
    parts = lm_parts(lm)
    assert parts["model"] == "openrouter/made-up/judge-small"
    assert parts["api_base"] == "https://made-up.example/v1"
