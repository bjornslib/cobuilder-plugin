"""Slice 14, notify as an action kind.

`notify` stays one of the 13 action kinds after slice 21, and `schemas.md`
names it. Since slice 21 the model writes a notify step and its excerpt like
any other step, so code no longer builds one for a done stop.
"""
from __future__ import annotations

from interpret_support import interpreter_api, no_live_call  # noqa: F401


def test_notify_is_an_action_kind():
    api = interpreter_api()
    assert "notify" in api.ACTION_KINDS, f"ACTION_KINDS lacks notify: {api.ACTION_KINDS!r}"


def test_schemas_md_names_notify():
    from probe_support import PRIORITY_DEV
    text = (PRIORITY_DEV / "docs" / "design" / "schemas.md").read_text()
    assert "`notify`" in text, "schemas.md never names `notify` as an action kind (only `NotifyConfig` exists)"
