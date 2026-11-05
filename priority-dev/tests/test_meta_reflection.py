"""Meta Muse Wonder as the GEPA reflection provider: settings, LM shape, and one bounded call.

The server below is local. No test reaches a live host.
"""
from __future__ import annotations

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from dspy.clients.backend_selection import select_backend

from priority import config, optimise


@pytest.fixture
def hung_server():
    """A local Responses endpoint. It records each request and never answers until released."""
    seen: list[tuple[str, dict]] = []
    release = threading.Event()

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            seen.append((self.path, json.loads(body)))
            release.wait(30)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/v1", seen
    finally:
        release.set()
        server.shutdown()
        server.server_close()


def test_meta_reflection_model_endpoint_and_temperature(monkeypatch):
    monkeypatch.setenv("REFLECTION_PROVIDER", "meta")
    monkeypatch.setenv("REFLECTION_MODEL", "muse-wonder-1.0")
    assert config.reflection_model() == "openai/muse-wonder-1.0"
    assert config.reflection_base_url() == "https://api.meta.ai/v1"
    assert config.reflection_temperature() == 1.0
    assert config.reflection_model_type() == "responses"


def test_meta_reflection_reads_only_the_meta_key(monkeypatch):
    monkeypatch.setenv("REFLECTION_PROVIDER", "meta")
    monkeypatch.setenv("META_API_KEY", "sk-test-meta")
    monkeypatch.setenv("NVIDIA_API_KEY", "sk-test-nvidia")
    assert config.reflection_key() == "sk-test-meta"


@pytest.mark.parametrize("name", ["LLM_PROVIDER", "JUDGE_PROVIDER"])
def test_meta_is_only_a_reflection_provider(monkeypatch, name):
    monkeypatch.setenv(name, "meta")
    getter = config.provider if name == "LLM_PROVIDER" else config.judge_provider
    with pytest.raises(RuntimeError):
        getter()


def test_meta_reflection_lm_uses_responses_with_muse_settings(monkeypatch):
    monkeypatch.setenv("REFLECTION_PROVIDER", "meta")
    monkeypatch.setenv("REFLECTION_MODEL", "muse-wonder-1.0")
    monkeypatch.setenv("META_API_KEY", "sk-test-meta")
    lm = optimise._reflection_lm()
    assert lm.model == "openai/muse-wonder-1.0"
    assert lm.model_type == "responses"
    assert lm.engine == "lm15"
    assert lm.num_retries == 0
    assert lm.kwargs["api_base"] == "https://api.meta.ai/v1"
    assert lm.kwargs["temperature"] == 1.0
    assert lm.kwargs["max_tokens"] == 32000
    assert lm.kwargs["reasoning_effort"] == "medium"
    assert lm.kwargs["top_p"] == 1.0


def test_nvidia_reflection_lm_stays_chat_without_meta_extras(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "sk-test-nvidia")
    lm = optimise._reflection_lm()
    assert lm.model_type == "chat"
    assert lm.engine == "auto"
    assert lm.num_retries == 0
    assert not select_backend(lm).native
    assert lm.kwargs["max_tokens"] == 16000
    assert "reasoning_effort" not in lm.kwargs
    assert "top_p" not in lm.kwargs


_PROVIDER_KEY = {
    "openrouter": "OPENROUTER_API_KEY",
    "inception": "INCEPTION_LABS_API_KEY",
    "meta": "META_API_KEY",
}


@pytest.mark.parametrize("provider", sorted(_PROVIDER_KEY))
def test_reflection_backend_stays_native_when_openai_base_is_set(monkeypatch, provider):
    """An OPENAI_API_BASE in the environment must not move the call to litellm, which retries on its own."""
    monkeypatch.setenv("OPENAI_API_BASE", "http://127.0.0.1:9/v1")
    monkeypatch.setenv("REFLECTION_PROVIDER", provider)
    monkeypatch.setenv(_PROVIDER_KEY[provider], "sk-test-reflection")
    lm = optimise._reflection_lm()
    assert select_backend(lm).native


def test_one_meta_reflection_call_fails_within_one_timeout(monkeypatch, hung_server):
    url, seen = hung_server
    monkeypatch.setenv("REFLECTION_PROVIDER", "meta")
    monkeypatch.setenv("REFLECTION_MODEL", "muse-wonder-1.0")
    monkeypatch.setenv("REFLECTION_BASE_URL", url)
    monkeypatch.setenv("META_API_KEY", "sk-test-meta")
    monkeypatch.setattr(optimise, "REFLECTION_TIMEOUT", 1)
    lm = optimise._reflection_lm()
    started = time.monotonic()
    with pytest.raises(Exception):
        lm("Propose one instruction.")
    elapsed = time.monotonic() - started
    assert elapsed < 5, f"one attempt should end near the 1 s timeout, took {elapsed:.1f} s"
    assert len(seen) == 1, "no retry: the server must see exactly one request"
    path, body = seen[0]
    assert path == "/v1/responses"
    assert body["model"] == "muse-wonder-1.0"
    assert body["max_output_tokens"] == 32000
    assert body["reasoning"] == {"effort": "medium"}
    assert body["top_p"] == 1.0
    assert body["temperature"] == 1.0
