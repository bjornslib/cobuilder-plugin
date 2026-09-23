# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Score a repository as a corpus for the review-flight-deck spike.

Stages 0 to 2 of spike-plan.md. Read-only. It never writes to the target
repository, and it never touches the working tree or the index.

Usage:

    uv run probe_repo.py --repo /path/to/checkout --pr-refs
    uv run probe_repo.py --repo /path/to/checkout --refs a b c
    uv run probe_repo.py --repo . --pr-refs --derived '.cobuilder-architect/**'

--pr-refs reads GitHub's refs/pull/<n>/head refs. Fetch them first:

    git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'
"""

from __future__ import annotations

import argparse
import fnmatch
import itertools
import json
import subprocess
import sys
import time
from dataclasses import dataclass, field

CLEAN, CONFLICT, DISJOINT, ANCESTOR = "clean", "conflict", "disjoint", "ancestor"


def git(repo: str, *args: str) -> tuple[int, str, str]:
    p = subprocess.run(
        ["git", "-C", repo, *args], capture_output=True, text=True
    )
    return p.returncode, p.stdout.strip(), p.stderr.strip()


@dataclass
class Branch:
    name: str
    sha: str
    files: list[str] = field(default_factory=list)
    created: str = ""


def resolve(repo: str, refs: list[str]) -> list[Branch]:
    out = []
    for r in refs:
        rc, sha, _ = git(repo, "rev-parse", "--verify", f"{r}^{{commit}}")
        if rc != 0:
            print(f"  skip {r}: cannot resolve", file=sys.stderr)
            continue
        rc, when, _ = git(repo, "log", "-1", "--format=%cI", sha)
        out.append(Branch(name=r, sha=sha, created=when))
    return out


def discover_pr_refs(repo: str) -> list[str]:
    rc, out, _ = git(repo, "for-each-ref", "--format=%(refname)",
                     "refs/remotes/origin/pr/*")
    if rc == 0 and out:
        return out.splitlines()
    rc, out, _ = git(repo, "for-each-ref", "--format=%(refname)",
                     "refs/pull/*/head")
    return out.splitlines() if rc == 0 and out else []


def is_ancestor(repo: str, a: str, b: str) -> bool:
    return git(repo, "merge-base", "--is-ancestor", a, b)[0] == 0


def related(repo: str, a: str, b: str) -> bool:
    return git(repo, "merge-base", a, b)[0] == 0


def merge_test(repo: str, a: str, b: str) -> tuple[str, list[str]]:
    """Return (outcome, conflicted files). Never touches the worktree."""
    rc, out, err = git(repo, "merge-tree", "--write-tree", "--name-only", a, b)
    if rc == 0:
        return CLEAN, []
    if rc == 1:
        lines = out.splitlines()
        files = []
        for line in lines[1:]:            # line 0 is the tree oid
            if not line.strip():
                break                     # blank line ends the file list
            files.append(line.strip())
        return CONFLICT, files
    if "unrelated histories" in err:
        return DISJOINT, []
    raise RuntimeError(f"merge-tree failed ({rc}) for {a} {b}: {err}")


def connected_components(repo: str, brs: list[Branch]) -> list[list[Branch]]:
    """Group branches that are pairwise related, directly or through others.

    A component is NOT guaranteed to have a common ancestor. Pairwise
    relatedness is transitive as a graph edge. "This set has a common
    ancestor" is not implied by it. Measured on cobuilder-plugin: pull
    requests 1 and 12 are related, 11 and 12 are related, 1 and 11 are
    not, and the octopus base of all three is empty. Use cobase_split to
    get sets that really do share a base.
    """
    parent = {b.name: b.name for b in brs}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in itertools.combinations(brs, 2):
        if related(repo, a.sha, b.sha):
            ra, rb = find(a.name), find(b.name)
            if ra != rb:
                parent[ra] = rb
    out: dict[str, list[Branch]] = {}
    for b in brs:
        out.setdefault(find(b.name), []).append(b)
    return sorted(out.values(), key=len, reverse=True)


def cobase_split(repo: str, brs: list[Branch]) -> tuple[list[Branch], list[Branch]]:
    """Split a component into a subset with a real base, plus the outliers.

    Greedy. Drop the branch that is unrelated to the most others, and
    repeat until the remainder has an octopus base. The result is one
    valid answer, not the largest possible one.
    """
    keep = list(brs)
    dropped: list[Branch] = []
    while len(keep) > 1 and octopus_base(repo, keep) is None:
        score = {
            b.name: sum(
                1 for o in keep if o.name != b.name
                and not related(repo, b.sha, o.sha)
            )
            for b in keep
        }
        worst = max(keep, key=lambda b: (score[b.name], b.created))
        if score[worst.name] == 0:
            break          # nothing unrelated left, yet still no base
        keep.remove(worst)
        dropped.append(worst)
    return keep, dropped


def octopus_base(repo: str, brs: list[Branch]) -> str | None:
    rc, out, _ = git(repo, "merge-base", "--octopus", *[b.sha for b in brs])
    return out if rc == 0 and out else None


def is_derived(path: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, p) for p in patterns)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=".")
    ap.add_argument("--refs", nargs="*", default=[])
    ap.add_argument("--pr-refs", action="store_true")
    ap.add_argument("--derived", action="append", default=[],
                    help="glob marking a generated path. Repeatable.")
    ap.add_argument("--json", metavar="PATH")
    a = ap.parse_args()

    refs = list(a.refs)
    if a.pr_refs:
        refs += discover_pr_refs(a.repo)
    if not refs:
        print("No refs. Pass --refs or --pr-refs.", file=sys.stderr)
        return 2

    brs = resolve(a.repo, sorted(set(refs)))
    if len(brs) < 2:
        print(f"Only {len(brs)} branch resolved. Need two or more.",
              file=sys.stderr)
        return 2

    groups = connected_components(a.repo, brs)
    bases = {}
    for i, g in enumerate(groups):
        b = octopus_base(a.repo, g) if len(g) > 1 else g[0].sha
        bases[i] = b

    counts = {CLEAN: 0, CONFLICT: 0, DISJOINT: 0, ANCESTOR: 0}
    three_way = 0
    conflicts = []
    t0 = time.time()
    for x, y in itertools.combinations(brs, 2):
        if not related(a.repo, x.sha, y.sha):
            counts[DISJOINT] += 1
            continue
        if is_ancestor(a.repo, x.sha, y.sha) or is_ancestor(a.repo, y.sha, x.sha):
            counts[ANCESTOR] += 1
            continue
        three_way += 1
        outcome, files = merge_test(a.repo, x.sha, y.sha)
        counts[outcome] += 1
        if outcome == CONFLICT:
            der = [f for f in files if is_derived(f, a.derived)]
            conflicts.append({
                "a": x.name, "b": y.name, "files": files,
                "derived": der, "authored": [f for f in files if f not in der],
            })
    elapsed = time.time() - t0

    density = (counts[CONFLICT] / three_way) if three_way else 0.0
    qualifies = {
        "15 or more branches": len(brs) >= 15,
        "5 or more three-way pairs": three_way >= 5,
        "1 or more conflicting pairs": counts[CONFLICT] >= 1,
    }

    print(f"\nRepository: {a.repo}")
    print(f"Branches resolved: {len(brs)}")
    print(f"Ancestry groups:   {len(groups)}"
          + ("  (a disjoint set)" if len(groups) > 1 else ""))
    for i, g in enumerate(groups):
        if bases[i]:
            print(f"  group {i}: {len(g):3d} branches   base {bases[i][:9]}")
        else:
            keep, dropped = cobase_split(a.repo, g)
            kb = octopus_base(a.repo, keep) if len(keep) > 1 else keep[0].sha
            print(f"  group {i}: {len(g):3d} branches   base NONE"
                  "  (connected, but no common ancestor)")
            print(f"      largest co-based subset found: {len(keep)} branches"
                  f"   base {(kb or 'NONE')[:9]}")
            for d in dropped:
                print(f"      no shared base with the rest: {d.name}")
    print(f"\nPairs: {sum(counts.values())}   tested in {elapsed:.1f}s")
    for k in (ANCESTOR, DISJOINT, CLEAN, CONFLICT):
        print(f"  {k:9} {counts[k]}")
    print(f"\nGenuine three-way pairs: {three_way}")
    print(f"Conflict density:        {density:.1%}"
          "   (stage 2 kill is below 5%)")

    if conflicts:
        na = sum(len(c["authored"]) for c in conflicts)
        nd = sum(len(c["derived"]) for c in conflicts)
        print(f"Conflicted files:        {na} authored, {nd} derived")

    print("\nStage 0 suitability:")
    for k, v in qualifies.items():
        print(f"  [{'x' if v else ' '}] {k}")
    verdict = "SUITABLE" if all(qualifies.values()) else "NOT SUITABLE"
    print(f"  -> {verdict}\n")

    if a.json:
        with open(a.json, "w") as fh:
            json.dump({
                "repo": a.repo, "branches": [b.__dict__ for b in brs],
                "groups": [[b.name for b in g] for g in groups],
                "bases": bases, "counts": counts,
                "three_way": three_way, "density": density,
                "conflicts": conflicts, "qualifies": qualifies,
            }, fh, indent=2)
        print(f"Wrote {a.json}")
    return 0 if all(qualifies.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
