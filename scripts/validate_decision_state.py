#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml"]
# ///
"""Deterministic pre-push validator for architecture decision records.

Enforces the decision state machine from SD-ARCH-GOVERNANCE-001 §5 Layer A on
every push. Schema authority: the skill template
`skills/architecture/references/templates/adr-template.md`
and `references/decision-records.md`. No LLM, no network — pure git plumbing + YAML.

What it blocks (exit 1):
  1. Invalid records          — missing required fields (incl. `delivers`), bad `id`,
                                unknown `state`, history inconsistent with `state`.
  2. Illegal state jumps      — a pushed edit moves a record between states not
                                allowed by the transition table (e.g. idea → approved).
  3. Agent self-approval      — `state: approved` with empty `approved_by`.
  4. Broken anchors           — `maps_to.context` has no boundary.yaml at the pushed commit.
  5. Deleted records          — records are superseded (`rejected` + `replaces`), never deleted.
  6. Missing decision (opt-in via ARCHKIT_PROTECTED_PATHS) — the push changes a
                                protected format path with no decision-record change
                                in the same range.

What it cannot catch: whether an arbitrary code change *should* have had a decision.
That judgment belongs to the Layer C review agents (and the periodic PR-checking agent).

Entry points:
  --stdin-refs   git pre-push mode: reads "<local_ref> <local_sha> <remote_ref> <remote_sha>"
                 lines from stdin (what git feeds a pre-push hook).
  --range A..B   validate an explicit commit range.
  --auto         infer range: @{upstream}..HEAD, else merge-base with origin/main.

Target repo:
  --repo PATH    validate a different local checkout instead of cwd; normalised to
                 that repo's git toplevel (passing a subdirectory is fine). All git
                 plumbing in this file (git show/diff/cat-file/merge-base) runs
                 against this resolved repo via `git -C`.
  --doc-root PATH  where ADRs and boundary records live, ALWAYS relative to --repo's
                 root (default: $ARCHKIT_DOC_ROOT or docs/architecture) — never
                 relative to cwd, and never absolute (rejected; see _apply_doc_root).

Failure policy: violations exit 1 (push blocked). Internal tool errors exit 0 with a
warning (fail-open) — a tooling bug must not block work; rule violations always block.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # fail-open: can't validate without a YAML parser
    yaml = None

# ---------------------------------------------------------------------------
# Constants (mirrors references/decision-records.md — the schema authority)
# ---------------------------------------------------------------------------

# Doc root is configurable so this validator isn't tied to any one repo's
# layout: the ARCHKIT_DOC_ROOT env var sets it, and --doc-root (parsed in
# main()) overrides that at invocation time. Defaults to docs/architecture.
DOC_ROOT = os.environ.get("ARCHKIT_DOC_ROOT", "docs/architecture")
ADR_DIR = f"{DOC_ROOT}/adr/"
CONTEXTS_DIR = f"{DOC_ROOT}/architecture/contexts/"

# Published format paths: changing any of these without a decision-record
# change in the same push is a missing decision. Empty by default — this is
# specific to each repo's published contracts, so it's opt-in via env var
# (comma-separated path prefixes), not hardcoded to any one project's layout.
PROTECTED_PATHS: tuple[str, ...] = tuple(
    p for p in os.environ.get("ARCHKIT_PROTECTED_PATHS", "").split(",") if p
)

STATES = {"idea", "tentative", "decided", "approved", "challenged", "rejected", "discarded"}

# Legal transitions (van Heesch Appendix C). Identity (same state) is always
# allowed — editing a record's body is not a transition.
TRANSITIONS: dict[str, set[str]] = {
    "idea": {"tentative", "discarded"},
    "tentative": {"decided", "discarded"},
    "decided": {"approved", "challenged", "discarded"},
    "approved": {"challenged"},
    "challenged": {"decided", "approved", "rejected"},
    "rejected": set(),
    "discarded": set(),
}

REQUIRED_FIELDS = (
    "id", "name", "state", "problem", "decision",
    "alternatives", "forces", "history", "maps_to", "delivers",
)
ID_RE = re.compile(r"^ADR-\d{4}$")
ZERO_SHA = "0" * 40
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"  # git's canonical empty tree


# ---------------------------------------------------------------------------
# Git plumbing
# ---------------------------------------------------------------------------

# The target repo. "." (cwd) until main() resolves --repo (or its absence)
# to a git toplevel via resolve_repo(). Every _git() call routes through
# this — it is the single chokepoint that makes the whole file target-aware.
REPO_DIR = "."


def _git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", REPO_DIR, *args], capture_output=True, text=True, timeout=30
    )


def resolve_repo(repo_arg: str | None) -> str:
    """Resolve --repo (or cwd if not given) to its git toplevel.

    Mirrors prodyssey's extract_story.py resolve_repo(): a subdirectory of a
    git repo is accepted and normalised up to the root, so every later path
    (ADR_DIR, CONTEXTS_DIR, changed-paths diffing) is relative to the same
    anchor regardless of where the validator was invoked from within the repo.
    """
    target = repo_arg or "."
    try:
        out = subprocess.check_output(
            ["git", "-C", target, "rev-parse", "--show-toplevel"],
            text=True,
            stderr=subprocess.PIPE,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(
            f"[arch-governance] ERROR: '{target}' is not inside a git repository.\n"
            "remediation: run from inside a git checkout, or pass --repo <path-to-git-repo>",
            file=sys.stderr,
        )
        sys.exit(1)
    return out


def git_show(rev: str, path: str) -> str | None:
    """File content at *rev*, or None if it does not exist there."""
    r = _git("show", f"{rev}:{path}")
    return r.stdout if r.returncode == 0 else None


def git_path_exists(rev: str, path: str) -> bool:
    return _git("cat-file", "-e", f"{rev}:{path}").returncode == 0


def changed_paths(base: str, head: str) -> list[str]:
    r = _git("diff", "--name-only", base, head)
    if r.returncode != 0:
        raise RuntimeError(f"git diff failed: {r.stderr.strip()}")
    return [line for line in r.stdout.splitlines() if line.strip()]


def resolve_base(head: str) -> str:
    """Best-effort base for a range ending at *head* (new-branch friendly)."""
    for candidate in ("@{upstream}", "origin/main", "origin/master"):
        r = _git("merge-base", candidate, head)
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
    return EMPTY_TREE


# ---------------------------------------------------------------------------
# Pure validation logic (unit-tested without git)
# ---------------------------------------------------------------------------

def parse_frontmatter(text: str) -> dict | None:
    """Parse the YAML frontmatter between the first two `---` lines."""
    lines = text.splitlines()
    try:
        start = lines.index("---")
        end = lines.index("---", start + 1)
    except ValueError:
        return None
    if yaml is None:
        raise RuntimeError("PyYAML unavailable")
    data = yaml.safe_load("\n".join(lines[start + 1:end]))
    return data if isinstance(data, dict) else None


def validate_record(d: dict, path: str) -> list[str]:
    """Standalone record checks (schema, approval integrity, history consistency)."""
    v: list[str] = []
    for field in REQUIRED_FIELDS:
        if field not in d or d[field] in (None, "", []):
            v.append(f"{path}: missing/empty required field `{field}`")
    rid = d.get("id", "")
    if rid and not ID_RE.match(str(rid)):
        v.append(f"{path}: `id` must match ADR-NNNN (got {rid!r})")
    state = d.get("state", "")
    if state and state not in STATES:
        v.append(f"{path}: unknown `state` {state!r} (must be one of {sorted(STATES)})")
    if state == "approved" and not d.get("approved_by"):
        v.append(f"{path}: `state: approved` requires non-empty `approved_by` "
                 "(a human; agents must not self-approve)")
    history = d.get("history") or []
    if history:
        last = history[-1]
        last_state = last.get("state") if isinstance(last, dict) else None
        if state and last_state != state:
            v.append(f"{path}: last history entry is {last_state!r} but `state` is "
                     f"{state!r} — record every state change in `history`")
    delivers = d.get("delivers") or {}
    if isinstance(delivers, dict):
        for k in ("capability", "benefit", "beneficiary"):
            if not delivers.get(k):
                v.append(f"{path}: `delivers.{k}` is required (value facet — "
                         "state the benefit, not only the cost)")
    maps_to = d.get("maps_to") or {}
    if isinstance(maps_to, dict):
        for k in ("context", "modules", "rule"):
            if not maps_to.get(k):
                v.append(f"{path}: `maps_to.{k}` is required (the structural anchor)")
    return v


def validate_transition(old_state: str | None, new_state: str, path: str) -> list[str]:
    """Legal-transition check for an edited record. None old_state = new record."""
    if old_state is None or old_state == new_state:
        return []
    if old_state not in STATES:
        return []  # pre-existing bad state; the schema check on the old commit's era owns it
    if new_state not in TRANSITIONS.get(old_state, set()):
        return [f"{path}: illegal state transition {old_state!r} → {new_state!r} "
                f"(legal from {old_state!r}: {sorted(TRANSITIONS[old_state]) or 'none — terminal'})"]
    return []


def missing_decision_violations(paths: list[str]) -> list[str]:
    """Protected-path check: published format paths changed with no record change."""
    hit = [p for p in paths if p.startswith(PROTECTED_PATHS)]
    adr_changed = any(p.startswith(ADR_DIR) and p.endswith(".md") for p in paths)
    if hit and not adr_changed:
        return [
            "missing decision: this push changes published format path(s) "
            f"{hit} with no decision-record change in the same range. These formats are "
            "a published contract — add/update a record under "
            f"{ADR_DIR} describing the format change and naming affected consumers."
        ]
    return []


# ---------------------------------------------------------------------------
# Range validation
# ---------------------------------------------------------------------------

def validate_range(base: str, head: str) -> tuple[list[str], int]:
    """Return (violations, records_examined).

    The count is reported to the user so a run that examined nothing cannot
    look like a run that examined everything and found it clean.
    """
    paths = changed_paths(base, head)
    violations = missing_decision_violations(paths)
    examined = 0

    for path in paths:
        if not (path.startswith(ADR_DIR) and path.endswith(".md")):
            continue
        examined += 1
        new_text = git_show(head, path)
        if new_text is None:
            violations.append(
                f"{path}: decision record deleted. Records are never deleted — mark the "
                "record `rejected` and add a `replaces` edge on its successor."
            )
            continue
        try:
            record = parse_frontmatter(new_text)
        except RuntimeError as exc:
            raise  # PyYAML missing — handled as tool error upstream (fail-open)
        if record is None:
            violations.append(f"{path}: no parseable YAML frontmatter")
            continue

        violations.extend(validate_record(record, path))

        old_text = git_show(base, path) if base != EMPTY_TREE else None
        old_state = None
        if old_text:
            old = parse_frontmatter(old_text)
            old_state = (old or {}).get("state")
        new_state = record.get("state", "")
        if new_state in STATES:
            violations.extend(validate_transition(old_state, new_state, path))

        ctx = (record.get("maps_to") or {}).get("context")
        if ctx and not git_path_exists(head, f"{CONTEXTS_DIR}{ctx}/boundary.yaml"):
            violations.append(
                f"{path}: `maps_to.context: {ctx}` has no boundary record at "
                f"{CONTEXTS_DIR}{ctx}/boundary.yaml — document the context "
                "(describe mode) or fix the anchor."
            )
    return violations, examined


def ranges_from_stdin() -> list[tuple[str, str]]:
    """Parse git pre-push stdin: '<local_ref> <local_sha> <remote_ref> <remote_sha>'."""
    ranges: list[tuple[str, str]] = []
    for line in sys.stdin:
        parts = line.split()
        if len(parts) != 4:
            continue
        _local_ref, local_sha, _remote_ref, remote_sha = parts
        if local_sha == ZERO_SHA:      # branch deletion — nothing to validate
            continue
        base = remote_sha if remote_sha != ZERO_SHA else resolve_base(local_sha)
        ranges.append((base, local_sha))
    return ranges


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def _apply_doc_root(root: str) -> None:
    """Set ADR_DIR/CONTEXTS_DIR from *root*, rejecting absolute paths.

    This validator reads ADRs out of git objects (`git show <rev>:<path>`),
    and git object paths are always relative to the repo root. An absolute
    doc-root would silently match zero paths in every `git show`/`git diff`
    call and report zero ADRs found — a false pass, not an error. So an
    absolute path is rejected outright rather than being made relative for
    the caller; guessing at the intended relative path would be its own
    silent-failure risk.
    """
    global ADR_DIR, CONTEXTS_DIR
    if Path(root).is_absolute():
        print(
            f"[arch-governance] ERROR: doc root must be relative to the target repo's "
            f"root, got absolute path {root!r}. Git object paths (git show <rev>:<path>) "
            "are always repo-root-relative, so an absolute --doc-root/$ARCHKIT_DOC_ROOT "
            "would silently match nothing and report a false pass. Pass a relative path "
            "instead, e.g. --doc-root docs/architecture.",
            file=sys.stderr,
        )
        sys.exit(1)
    ADR_DIR = f"{root}/adr/"
    CONTEXTS_DIR = f"{root}/architecture/contexts/"


def main() -> int:
    skip = os.environ.get("ARCHKIT_GOVERNANCE_SKIP", "").strip().lower()
    if skip in ("1", "true", "yes"):
        print(
            "[arch-governance] *** SKIPPED *** — ARCHKIT_GOVERNANCE_SKIP is set; "
            "decision-record validation was NOT run for this push. This push has "
            "NOT been checked against the decision state machine.",
            file=sys.stderr,
        )
        return 0

    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--stdin-refs", action="store_true",
                      help="git pre-push mode: read ref updates from stdin")
    mode.add_argument("--range", metavar="A..B",
                      help="validate an explicit commit range")
    mode.add_argument("--auto", action="store_true",
                      help="infer range from @{upstream}/origin-main..HEAD")
    ap.add_argument("--repo", metavar="PATH", default=None,
                     help="validate a different local git checkout instead of cwd; "
                          "normalised to that repo's toplevel (a subdirectory is fine). "
                          "Default: cwd's git toplevel.")
    ap.add_argument("--doc-root", metavar="PATH", default=None,
                     help="override the documentation root (default: $ARCHKIT_DOC_ROOT "
                          "or docs/architecture). Always relative to --repo's root — "
                          "git object paths can't be absolute, so an absolute value "
                          "here is rejected rather than silently matching nothing.")
    args = ap.parse_args()

    global REPO_DIR
    REPO_DIR = resolve_repo(args.repo)

    _apply_doc_root(args.doc_root or DOC_ROOT)

    if yaml is None:
        # Fail CLOSED, unlike the transient-error handler at the bottom of this
        # file. A missing parser is a setup fault, not a passing hiccup: it stays
        # broken until someone installs PyYAML, so failing open here would let
        # every push through indefinitely behind a warning nobody reads.
        print("[arch-governance] PUSH BLOCKED — PyYAML unavailable, cannot validate "
              "decision records.\n"
              "  Install it:  pip install pyyaml\n"
              "  Or bypass:   ARCHKIT_GOVERNANCE_SKIP=1 git push", file=sys.stderr)
        return 1

    if args.stdin_refs:
        ranges = ranges_from_stdin()
    elif args.range:
        base, _, head = args.range.partition("..")
        if not head:
            print(f"[arch-governance] invalid --range {args.range!r}; expected A..B")
            return 0
        ranges = [(base, head)]
    else:
        ranges = [(resolve_base("HEAD"), "HEAD")]

    violations: list[str] = []
    examined = 0
    for base, head in ranges:
        range_violations, range_examined = validate_range(base, head)
        violations.extend(range_violations)
        examined += range_examined

    if violations:
        print("[arch-governance] PUSH BLOCKED — decision-record violations:\n")
        for v in violations:
            print(f"  ✗ {v}")
        print(
            "\nFix the record(s) and push again. Schema reference:\n"
            "  skills/architecture/references/decision-records.md\n"
            "Emergency bypass (use sparingly; leaves no record):\n"
            "  ARCHKIT_GOVERNANCE_SKIP=1 git push"
        )
        return 1

    # Report what the run actually examined. A wrong-but-relative --doc-root finds
    # no records and reaches this point with nothing wrong, so a bare "OK" would
    # report a clean pass for a check that read nothing at all.
    if examined:
        print(f"[arch-governance] decision records OK ({examined} examined)")
        return 0

    head_rev = ranges[-1][1] if ranges else "HEAD"
    if _git("cat-file", "-e", f"{head_rev}:{ADR_DIR.rstrip('/')}").returncode == 0:
        print(f"[arch-governance] no decision records changed in this range "
              f"(doc root {ADR_DIR} exists, nothing to check)")
    else:
        print(f"[arch-governance] no decision records examined, and no doc root at "
              f"{ADR_DIR} in {head_rev}.\n"
              f"  This is expected for a repo that has no decision records yet.\n"
              f"  If you expected records here, the doc root is wrong: pass "
              f"--doc-root <path> or set $ARCHKIT_DOC_ROOT.\n"
              f"  The path is relative to the target repo's root.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # fail-open on tool errors — never block work on a tooling bug
        print(f"[arch-governance] WARNING: validator error ({exc}); allowing push (fail-open).")
        sys.exit(0)
