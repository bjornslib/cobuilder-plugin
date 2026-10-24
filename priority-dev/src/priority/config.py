"""The one reader of the OpenRouter key. No other module reads OPENROUTER_API_KEY."""
from __future__ import annotations

import os
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


def load_key() -> str:
    """The key from the environment, else from priority-dev/.env. It never prints the key."""
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key and ENV_PATH.is_file():
        for line in ENV_PATH.read_text().splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "OPENROUTER_API_KEY":
                key = value.strip().strip("\"'")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY is not set and priority-dev/.env has no value for it")
    return key
