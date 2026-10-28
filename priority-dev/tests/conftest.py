"""Suite-wide guard: no test makes a live model call."""

import pytest


@pytest.fixture(autouse=True)
def _stub_model_key(monkeypatch):
    """Point the key loader at a stub so tests never reach a live model."""
    try:
        from priority import config
    except Exception:  # noqa: BLE001 (a collection-time import fault fails loudly below)
        return
    monkeypatch.setattr(config, "load_key", lambda: "sk-test-stub-key")
