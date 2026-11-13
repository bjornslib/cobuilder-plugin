"""The glossary index and the vocabulary leads, for the evidence packet.

glossary_index reads each entry of DDD-VOCABULARY.md. vocabulary_leads compares names with
those entries. A lead holds facts only: an avoided word, a defined term, or a token that no
term and no file name holds. The script never judges a name. The vocabulary agent does.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Optional

from .names import split_tokens

GLOSSARY = "DDD-VOCABULARY.md"
Name = tuple[str, str, Optional[str]]  # the name, the path that holds it, and its context
_ENTRY = re.compile(r"\*\*(?P<term>[^*]+)\*\*\s*\(`(?P<context>[^`]+)`\)")
_AVOID = re.compile(r"_Avoid_:\s*(?P<items>.+)")


def glossary_index(root: Path) -> list[dict[str, Any]]:
    """Return each glossary entry at root, with its term, context, and avoid words.

    Each avoid word holds its word and its reason. A missing glossary gives an empty list.
    """
    path = root / GLOSSARY
    if not path.is_file():
        return []
    entries: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        head = _ENTRY.match(line)
        avoid = _AVOID.match(line)
        if head is not None:
            term, context = head["term"].strip(), head["context"].strip()
            entries.append({"term": term, "context": context, "avoid": []})
        elif avoid is not None and entries:
            entries[-1]["avoid"].extend(_avoid_items(avoid["items"]))
    return entries


def empty_leads() -> dict[str, list[dict[str, Any]]]:
    """Return a leads block with no lead. The packet holds it when no lead is analysed."""
    return {"avoid_candidates": [], "defined_terms_used": [], "new_tokens": []}


def vocabulary_leads(
    names: list[Name], index: list[dict[str, Any]], stems: list[str]
) -> dict[str, list[dict[str, Any]]]:
    """Return the leads of the names. The stems are the file names that the diff does not add."""
    held = _held_tokens(index, stems)
    leads = empty_leads()
    for name in names:
        leads["avoid_candidates"] += _avoid_hits(name, index)
        leads["defined_terms_used"] += _term_hits(name, index)
        leads["new_tokens"] += _new_hits(name, held)
    return leads


def _avoid_items(text: str) -> list[dict[str, str]]:
    """Return each item of an _Avoid_ line as its word and its reason."""
    items = []
    for part in _split_outside_parens(text):
        word, _, rest = part.partition("(")
        reason = rest.rsplit(")", 1)[0].strip()
        items.append({"word": word.replace("`", "").strip(), "reason": reason})
    return [item for item in items if item["word"]]


def _split_outside_parens(text: str) -> list[str]:
    """Return the parts that commas separate. A comma inside parentheses separates nothing."""
    parts: list[str] = []
    depth = start = 0
    for at, char in enumerate(text):
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(depth - 1, 0)
        elif char == "," and depth == 0:
            parts.append(text[start:at])
            start = at + 1
    parts.append(text[start:])
    return [part.strip() for part in parts if part.strip()]


def _avoid_hits(name: Name, index: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return one candidate for each avoided word that the name holds."""
    text, path, context = name
    tokens = split_tokens(text)
    hits: list[dict[str, Any]] = []
    for entry in index:
        for item in entry["avoid"]:
            word = split_tokens(item["word"])
            if _has_run(tokens, word):
                also = any(
                    split_tokens(other["term"]) == word for other in index if other is not entry
                )
                hits.append({
                    "name": text,
                    "path": path,
                    "word": item["word"],
                    "reason": item["reason"],
                    "entry": entry["term"],
                    "entry_context": entry["context"],
                    "also_defined": also,
                    "in_entry_context": context == entry["context"],
                })
    return hits


def _term_hits(name: Name, index: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return one entry for each glossary term that the name holds."""
    text, path, context = name
    tokens = split_tokens(text)
    return [
        {
            "name": text,
            "path": path,
            "term": entry["term"],
            "term_context": entry["context"],
            "cross_context": context != entry["context"],
        }
        for entry in index
        if _has_run(tokens, split_tokens(entry["term"]))
    ]


def _new_hits(name: Name, held: set[str]) -> list[dict[str, str]]:
    """Return one entry for each token of the name that no term and no file name holds."""
    text, path, _ = name
    return [
        {"token": token, "name": text, "path": path}
        for token in dict.fromkeys(split_tokens(text))
        if token not in held
    ]


def _held_tokens(index: list[dict[str, Any]], stems: list[str]) -> set[str]:
    """Return the tokens that a glossary term or a file name holds."""
    held = {token for entry in index for token in split_tokens(entry["term"])}
    return held | {token for stem in stems for token in split_tokens(stem)}


def _has_run(tokens: list[str], run: list[str]) -> bool:
    """Return True when the tokens hold the run as whole tokens, in order and side by side."""
    width = len(run)
    return width > 0 and any(tokens[at:at + width] == run for at in range(len(tokens) - width + 1))
