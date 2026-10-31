"""The readers of the model settings. No other module reads the names below."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

_DEFAULTS = {
    "LLM_PROVIDER": "inception",
    "LLM_MODEL": "mercury-3",
}

# LiteLLM provider prefixes. Only these providers are supported.
_PREFIX = {"openrouter": "openrouter", "nvidia_nim": "nvidia_nim", "inception": "openai"}

# Endpoint override per provider. LiteLLM knows none of these except openrouter.
_BASE_URL = {
    "openrouter": "https://openrouter.ai/api/v1",
    "nvidia_nim": "https://integrate.api.nvidia.com/v1",
    "inception": "https://api.inceptionlabs.ai/v1",
}

# Lowest temperature the provider accepts. Mercury refuses anything under 0.5.
_MIN_TEMPERATURE = {"inception": 0.5}

# Judge defaults. The judge and the GEPA reflection LM use the NVIDIA Mistral model, not the task model.
_JUDGE_DEFAULTS = {
    "JUDGE_PROVIDER": "nvidia_nim",
    "JUDGE_MODEL": "mistralai/mistral-large-4-1t-a52b",
}

# The key each judge provider reads when JUDGE_API_KEY is not set.
_JUDGE_KEY = {"openrouter": "OPENROUTER_API_KEY", "nvidia_nim": "NVIDIA_API_KEY", "inception": "INCEPTION_LABS_API_KEY"}


def _get(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None and ENV_PATH.is_file():
        for line in ENV_PATH.read_text().splitlines():
            key, _, val = line.partition("=")
            if key.strip() == name:
                value = val.strip().strip("\"'")
    return value


def provider() -> str:
    """The model provider. One of openrouter, nvidia_nim, or inception."""
    name = _get("LLM_PROVIDER") or _DEFAULTS["LLM_PROVIDER"]
    if name not in _PREFIX:
        raise RuntimeError(f"LLM_PROVIDER is {name!r}, want one of {sorted(_PREFIX)}")
    return name


def model() -> str:
    """The full LiteLLM model id, with the provider prefix the provider needs."""
    return f"{_PREFIX[provider()]}/{_get('LLM_MODEL') or _DEFAULTS['LLM_MODEL']}"


def base_url() -> str:
    """The endpoint override, else the provider default."""
    return _get("LLM_BASE_URL") or _BASE_URL[provider()]


def temperature() -> float:
    """0, raised to the lowest value the provider accepts."""
    return max(0.0, _MIN_TEMPERATURE.get(provider(), 0.0))


def load_key() -> str:
    """The key from the environment, else from priority-dev/.env. It never prints the key."""
    key = _get("LLM_API_KEY")
    if not key and provider() == "inception":
        key = _get("INCEPTION_LABS_API_KEY")
    if not key:
        raise RuntimeError("LLM_API_KEY is not set and priority-dev/.env has no value for it")
    return key


def load_nvidia_key() -> str:
    """The old NVIDIA reader. It now returns the active key, whatever the provider is."""
    return load_key()


def judge_provider() -> str:
    """The judge provider. One of openrouter, nvidia_nim, or inception."""
    name = _get("JUDGE_PROVIDER") or _JUDGE_DEFAULTS["JUDGE_PROVIDER"]
    if name not in _PREFIX:
        raise RuntimeError(f"JUDGE_PROVIDER is {name!r}, want one of {sorted(_PREFIX)}")
    return name


def judge_model() -> str:
    """The judge model id, with the provider prefix the provider needs."""
    return f"{_PREFIX[judge_provider()]}/{_get('JUDGE_MODEL') or _JUDGE_DEFAULTS['JUDGE_MODEL']}"


def judge_base_url() -> str:
    """The judge endpoint override, else the provider default."""
    return _get("JUDGE_BASE_URL") or _BASE_URL[judge_provider()]


def judge_temperature() -> float:
    """0, raised to the lowest value the judge provider accepts."""
    return max(0.0, _MIN_TEMPERATURE.get(judge_provider(), 0.0))


def _judge_key_reader() -> str:
    """The judge key from JUDGE_API_KEY, else the per-provider key. It never prints the key.

    A test-side stub (the suite-wide conftest guard) makes the reader raise before any
    file or real key is read, so no test builds a live judge model. An explicit env
    value from a test still wins over the stub."""
    env_key = os.environ.get("JUDGE_API_KEY") or os.environ.get(_JUDGE_KEY[judge_provider()])
    if env_key:
        return env_key
    if "judge_key" in _STUBS:
        raise RuntimeError("JUDGE_API_KEY is stubbed for this test and no env value is set")
    key = _get("JUDGE_API_KEY") or _get(_JUDGE_KEY[judge_provider()])
    if key:
        return key
    raise RuntimeError("JUDGE_API_KEY is not set and priority-dev/.env has no value for it")


# Test-side stubs for key readers. The suite-wide conftest stubs `judge_key` so no test
# reads the real .env key; an explicit env value from a test still wins over the stub.
_STUBS: dict = {}

class _ConfigModule(type(sys.modules[__name__])):
    """The config module class. `judge_key` is a data descriptor: a test-side
    `monkeypatch.setattr(config, "judge_key", stub)` is recorded in `_STUBS` instead of
    replacing the reader, so env values stay live and the suite stub still blocks the real key."""

    @property
    def judge_key(self):
        return _judge_key_reader

    @judge_key.setter
    def judge_key(self, value):
        _STUBS["judge_key"] = value


sys.modules[__name__].__class__ = _ConfigModule
