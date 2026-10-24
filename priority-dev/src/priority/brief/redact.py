"""Redaction of keys, tokens, and secrets from transcript text."""
from __future__ import annotations

import re

_SECRET = re.compile("|".join((
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----",
    r"sk-[A-Za-z0-9_-]{20,}",
    r"gh[pousr]_[A-Za-z0-9]{20,}",
    r"github_pat_[A-Za-z0-9_]{20,}",
    r"AKIA[0-9A-Z]{16}",
    r"xox[abprs]-[A-Za-z0-9-]{10,}",
    r"AIza[0-9A-Za-z_-]{35}",
    r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}",
    r"(?i:Bearer)\s+[A-Za-z0-9._~+/=-]{20,}",
    r"(?<=://)[^/\s:@\"'\\]+:[^/\s@\"'\\]+@",
)), re.DOTALL)

_ASSIGNED = re.compile(
    r"""(?i)(\b[A-Za-z0-9_]*(?:api[_-]?key|secret|token|passw(?:or)?d|credential)[A-Za-z0-9_]*"?\s*[=:]\s*["']?)"""
    r"""([^\s"'\\,;]{12,})"""
)


def redact_with_count(text: str) -> tuple[str, int]:
    """Replace secrets with a marker and return the number of replacements."""
    if not text:
        return text, 0
    value, secret_count = _SECRET.subn("[redacted]", text)
    value, assigned_count = _ASSIGNED.subn(r"\1[redacted]", value)
    return value, secret_count + assigned_count


def redact(text: str) -> str:
    """Replace each secret in the text with [redacted]."""
    return redact_with_count(text)[0]
