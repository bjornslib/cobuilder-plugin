# Slice plan: Review link

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`review-link/E1` — A viewer link for each document under review.** View mode prints a checked deep link, the viewer shows the plan documents, and every presentation point prints the link before the question. | | | | |
| 1 | `review-link/E1` | Tracer bullet: review_link.py prints a checked deep link | `uv run plugins/artifact/scripts/review_link.py --hub <hub> --route '#/<work>/build/epics'` prints the link after an HTTP 200, and exits 1 for an unknown work id or a dead server. View mode takes `--route`. `tests/test_review_link.py` passes against a real temporary server | 0.92 | accepted |
| 2 | `review-link/E1` | Plan documents in the index and a plan page in the viewer | `data/index.json` carries `product_doc` and `architecture_doc` entities. `#/<work>/build/plan` renders the three plan documents with gate names, and an empty state for an absent one. The committed viewer is rebuilt. Pytest and vitest pass | 1.00 | accepted |
| 3 | `review-link/E1` | Present for review procedure and the link check | Every presentation point names Present for review before its question. `verify_gate.py` fails an APPROVED line dated on or after 2026-09-28 with no link. This plan's own gate lines carry links | 0.92 | accepted |

## Route for each gate

| Gate or point | Route |
|---|---|
| Gate 1 — Product | `#/<work>/build/plan/product` |
| Gate 2 — Architecture | `#/<work>/build/plan/architecture` |
| Gate 2b — Interaction design | none. The gate gives the file path (ADR-0032, decision 6) |
| Gate 3 — Program design | `#/<work>/build/plan/program` |
| Gate 4a and 4b | `#/<work>/build/epics` |
| Gate 4c | none. The rubrics are blind, and the user approves the set by count |
| After a slice, and ESCALATE | `#/<work>/build/epics` |
| Design mode stage 5 and stage 6 | `#/<work>/intent` |
| Decisions mode and describe mode | the record's own page, or `#/<work>/intent` |

## Rubric note for slice 3

Slice 3 changes agent procedure in skill files. Most of its result is
behavior, not code. Its rubric is therefore behavioral, as a Gate 4c special
case. The rubric checks that each named presentation point references
Present for review before its question, and that the order of steps is
correct. A pytest covers the one code change, the link check in
`verify_gate.py`.
