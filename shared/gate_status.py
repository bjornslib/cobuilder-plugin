#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""The one parser for the state text of a ``00-status.md`` gate line.

An authored gate line carries a trailing ``— view: <url>`` from 2026-09-28 on
(ADR-0032), and ``verify_gate.py``'s ``check_links()`` requires the link to
stay in the authored file. The URL is machine-specific — it names a local
server and its port — so the absolute form never enters a derived payload.

Two consumers read the same authored tail: ``build_index.py`` projects a
gate step for the record index, and ``build_builds_view.py`` projects one for
the Builds view page's payload. This module is the one place the tail is
split, on the lesson of ``slice_table.py``: three divergent parsers of one
table needed three edits per format change, and the same failure returns
with two parsers of one line.

The split keeps the portable fact and drops the machine-specific one. A
consumer that shows a link keeps ``view``, the route fragment from the
token's first ``#``, such as ``#/review-link/build/plan/product``. A
consumer that shows no link drops it. Nothing keeps the absolute URL, and
``check_links()`` reads the raw authored line on purpose, because checking
the link is that script's own job.
"""
from __future__ import annotations

import re

# The marker is `view:` preceded by a dash form, with the same `[—–-]`
# tolerance the gate-line regexes use, and the link is one non-space token
# at the end of the text. A `view:` with no dash before it is a word in the
# state, not a link, and it stays.
VIEW_LINK_RE = re.compile(r"\s*[—–-]\s*view:\s*(\S+)\s*$")


def split_gate_state(raw_state: str) -> tuple[str, str | None]:
    """Split one gate line's state text into ``(state, view)``.

    ``view`` is None when the state carries no view link, and the state then
    returns byte-identical to the raw text. A token with no ``#`` is kept
    whole, because a fragment cannot be cut from it.
    """
    match = VIEW_LINK_RE.search(raw_state)
    if match is None:
        return raw_state.strip(), None
    token = match.group(1)
    hash_at = token.find("#")
    view = token[hash_at:] if hash_at >= 0 else token
    state = raw_state[: match.start()].strip()
    return state, view