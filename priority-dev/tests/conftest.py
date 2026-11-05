"""Suite-wide guard: no test makes a live model call."""

import pytest


@pytest.fixture(autouse=True)
def _stub_model_key(monkeypatch, tmp_path_factory):
    """Point the key loaders at stubs so tests never reach a live model.

    litellm's import loads priority-dev/.env through dotenv, which leaves the
    provider keys in os.environ. Delete them here so the judge-key stub below
    always wins over the ambient file; a test that sets a key itself with
    monkeypatch.setenv still overrides the stub."""
    try:
        from priority import config
    except Exception:  # noqa: BLE001 (a collection-time import fault fails loudly below)
        return
    for name in ("LLM_API_KEY", "OPENROUTER_API_KEY", "NVIDIA_API_KEY",
                 "INCEPTION_LABS_API_KEY", "JUDGE_API_KEY", "REFLECTION_PROVIDER",
                 "REFLECTION_MODEL", "REFLECTION_BASE_URL", "REFLECTION_API_KEY", "META_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(config, "load_key", lambda: "sk-test-stub-key")
    monkeypatch.setattr(config, "judge_key", lambda: "sk-test-stub-judge-key", raising=False)
    # An empty .env, so no test reads the real priority-dev/.env.
    env_file = tmp_path_factory.mktemp("env") / ".env"
    env_file.write_text("")
    monkeypatch.setattr(config, "ENV_PATH", env_file)
