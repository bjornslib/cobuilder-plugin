"""The finding key of each signal, shared by the coach session record and the repo record.

A key names one finding across runs, so the same finding gives the same key in each run. The
keys follow epic E2, step B3, and epic E6, step D2, for the three whole-repository signals.
"""
from __future__ import annotations

from .types import Finding

NONE_TEXT = "none"
GROUP_SIGNALS = frozenset({"co-change", "duplicate-group"})


def finding_key(finding: Finding) -> str:
    """Return the key of one finding. A missing context name reads as none."""
    signal, path, folder, facts = finding.signal, finding.path, finding.folder, finding.facts
    if signal == "crowded-folder":
        return f"crowded-folder|{folder}"
    if signal == "name-stem-cluster":
        return f"name-stem-cluster|{folder}|{facts['stem']}"
    if signal == "boundary-edge":
        return f"boundary-edge|{path}|{facts.get('to_context') or NONE_TEXT}"
    if signal == "twin-name":
        return f"twin-name|{facts['stem']}"
    if signal in GROUP_SIGNALS:
        return f"{signal}|{', '.join(sorted(facts['members']))}"
    if signal == "contract-drift":
        return f"contract-drift|{path}|{facts['symbol']}|{facts['kind']}"
    # A generic name and a consumer-locality entry key by their path.
    return f"{signal}|{path}"
