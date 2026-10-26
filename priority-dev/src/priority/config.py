"""The readers of the model settings. No other module reads the names below."""
from __future__ import annotations

import os
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
