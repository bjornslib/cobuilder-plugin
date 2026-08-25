#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
compute_scores.py — Deterministic scoring engine for architecture-review-design-maintenance

Usage:
  python3 compute_scores.py < scores.json

Input JSON shape (P0/P1/P2 ints, per category):
  {
    "Security":          {"P0": 2, "P1": 3, "P2": 1},
    "Architecture":      {"P0": 0, "P1": 2, "P2": 1},
    "Code Quality":      {"P0": 0, "P1": 0, "P2": 2},
    "Scaling":           {"P0": 0, "P1": 1, "P2": 0},
    "Maintainability":   {"P0": 0, "P1": 0, "P2": 1},
    "Technical Debt":    {"P0": 0, "P1": 0, "P2": 1},
    "Dependency Health": {"P0": 0, "P1": 0, "P2": 0},
    "Testing":           {"P0": 0, "P1": 0, "P2": 0}
  }

Any of the 8 categories may be omitted; an omitted category is treated as
{"P0": 0, "P1": 0, "P2": 0} (score 100) and is listed under "defaulted" in
the output. Category names must match one of the 8 valid names exactly
(case-sensitive) — an unrecognised key is a hard error, not a silent no-op,
since a typo (e.g. "security" instead of "Security") would otherwise produce
a wrong score with no signal.

Output JSON shape:
  {
    "category_scores": {
      "Security": {"deductions": 45, "raw": 45, "capped": true, "score": 55, "tooltip": "(2 P0, 3 P1, 1 P2 → 55/100)"},
      ...
    },
    "defaulted": ["Testing", "Dependency Health"],
    "overall": {
      "weighted_score": 87.6,
      "grade": "B",
      "formula": "weighted average of category scores using: Security 25%, Architecture 20%, Code Quality 15%, Scaling 15%, Maintainability 10%, Technical Debt 5%, Dependency Health 5%, Testing 5%"
    }
  }

Rules enforced exactly per SKILL.md v0.6.0:
  deductions = (P0 * 12) + (P1 * 7) + (P2 * 3)
  deductions = min(deductions, 55)
  score      = 100 - deductions
  grade      = A if >= 90, B if >= 75, C if >= 60, D if >= 50, else F
"""

import json
import sys

# Weight table from SKILL.md
WEIGHTS = {
    "Security":          0.25,
    "Architecture":      0.20,
    "Code Quality":      0.15,
    "Scaling":           0.15,
    "Maintainability":   0.10,
    "Technical Debt":    0.05,
    "Dependency Health": 0.05,
    "Testing":           0.05,
}

def compute_category(name: str, counts: dict) -> dict:
    p0 = int(counts.get("P0", 0))
    p1 = int(counts.get("P1", 0))
    p2 = int(counts.get("P2", 0))

    raw = (p0 * 12) + (p1 * 7) + (p2 * 3)
    capped = raw > 55
    deductions = min(raw, 55)
    score = 100 - deductions

    tooltip = f"({p0} P0, {p1} P1, {p2} P2 → {score}/100)"

    return {
        "deductions": deductions,
        "raw": raw,
        "capped": capped,
        "score": score,
        "tooltip": tooltip,
    }

def compute_grade(weighted_score: float) -> str:
    if weighted_score >= 90.0:
        return "A"
    if weighted_score >= 75.0:
        return "B"
    if weighted_score >= 60.0:
        return "C"
    if weighted_score >= 50.0:
        return "D"
    return "F"

def main():
    data = json.load(sys.stdin)

    unknown = sorted(set(data) - set(WEIGHTS))
    if unknown:
        print(
            f"ERROR: unrecognised categor{'y' if len(unknown) == 1 else 'ies'} "
            f"{unknown} — valid names are (case-sensitive): {sorted(WEIGHTS)}",
            file=sys.stderr,
        )
        sys.exit(1)

    defaulted = sorted(set(WEIGHTS) - set(data))

    category_scores = {}
    for cat in WEIGHTS:
        counts = data.get(cat, {"P0": 0, "P1": 0, "P2": 0})
        category_scores[cat] = compute_category(cat, counts)

    weighted = sum(
        category_scores[cat]["score"] * WEIGHTS[cat]
        for cat in WEIGHTS
    )

    result = {
        "category_scores": category_scores,
        "defaulted": defaulted,
        "overall": {
            "weighted_score": round(weighted, 1),
            "grade": compute_grade(weighted),
            "formula": (
                "weighted average of category scores using: "
                "Security 25%, Architecture 20%, Code Quality 15%, "
                "Scaling 15%, Maintainability 10%, Technical Debt 5%, "
                "Dependency Health 5%, Testing 5%"
            ),
        },
    }

    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
