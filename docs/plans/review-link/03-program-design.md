# Program Design: Review link

## Files

| File | Change | Slice |
|---|---|---|
| `plugins/artifact/scripts/review_link.py` | New. Finds the server, checks the route, prints the link | 1 |
| `plugins/artifact/skills/cobuilder-artifacts/SKILL.md` | View mode gains `--route`. A new Present for review section | 1, 3 |
| `tests/test_review_link.py` | New. Runs a real temporary server | 1 |
| `shared/build_index.py` | Projects `01-product.md` and `02-architecture.md` | 2 |
| `tests/test_build_index_plan_docs.py` | New. Tests the projection | 2 |
| `plugins/artifact/viewer/src/shell/model.ts` | Adds `plan` to `PROGRAM_KEYS` | 2 |
| `plugins/artifact/viewer/src/data/types.ts`, `data/works.ts` | Read the two new entity lists into a work item | 2 |
| `plugins/artifact/viewer/src/shell/panels/Plan.tsx` | New. The plan page | 2 |
| `plugins/artifact/viewer/src/shell/panels/Plan.test.tsx` | New. Vitest for the page | 2 |
| `plugins/artifact/viewer/index.html` | Rebuilt | 2 |
| `plugins/implement/skills/build/SKILL.md` | Viewer step moves before the question. Gate 4b and after-slice steps link | 3 |
| `plugins/implement/skills/build/references/validation-scoring.md` | ESCALATE links the document | 3 |
| `plugins/architect/skills/architecture/SKILL.md` | Design stage 5 step 6, decisions step 8, describe step 6 | 3 |
| `plugins/architect/skills/architecture/references/design-mode.md` | Stage 6 links each round | 3 |
| `plugins/implement/scripts/verify_gate.py` | Adds the link check | 3 |
| `tests/test_verify_gate_links.py` | New. Tests the link check | 3 |
| `docs/plans/review-link/00-status.md` | Its own gate lines gain a link | 3 |

## Types & signatures

```python
# plugins/artifact/scripts/review_link.py
def read_server_port(hub: Path) -> int            # raises NoServer
def active_bundle(hub: Path) -> Path              # resolves .cobuilder-architect/active
def work_ids(bundle: Path) -> set[str]            # from data/index.json
def parse_route(route: str) -> tuple[str, str]    # "#/<work>/<rest>" -> (work, rest)
def check_page(url: str, timeout: float = 3.0) -> int   # the HTTP status
def main(argv: list[str] | None = None) -> int    # 0 on a printed link, 1 on any failure

# shared/build_index.py
PLAN_DOC_FILES = {"product_doc": "01-product.md", "architecture_doc": "02-architecture.md"}
def project_plan_doc(kind: str, feature_slug: str, path: Path, text: str, repo: Path) -> dict

# plugins/implement/scripts/verify_gate.py
LINK_REQUIRED_FROM = date(2026, 9, 28)
def check_gate_links(status_text: str | None) -> dict[str, str]   # "gate.<n>": "ok" | "n/a" | "missing"
```

```ts
// plugins/artifact/viewer/src/data/types.ts
export interface PlanDoc { id: string; kind: "product" | "architecture" | "program"; title: string; source: string; body_md: string }
// WorkItem gains: plan: Record<"product" | "architecture" | "program", PlanDoc | null>
```

## Call stack

```
build SKILL approval protocol step 2
  -> build_index.py
  -> Skill("cobuilder-artifacts", args="view --route #/<work>/build/plan/product")
       -> View mode steps 1-9 (start or reuse the server)
       -> uv run review_link.py --hub <hub> --route <route>
            -> read_server_port -> active_bundle -> work_ids -> check_page
            -> print http://127.0.0.1:<port>/active/viewer/index.html#/<work>/...
  -> show summary, path, link
  -> ask "Approve Gate N, or what should change?"
  -> write "- Gate 1 — Product: APPROVED <date> — view: <link>"
verify_gate.py --plan docs/plans/<slug>
  -> check_gate_links -> "missing" for a dated line with no link
```

## Test plan

- `test_review_link.py`: start `http.server` on port 0 over a temporary hub.
  Write the pid and log files the way View mode does. Assert the printed link
  for a known work id. Assert exit 1 for an unknown work id, for no server,
  and for a viewer file that returns 404.
- `test_build_index_plan_docs.py`: a temporary repo with the three plan files
  produces the three entity kinds and the gate joins. A repo with none
  produces empty lists.
- `Plan.test.tsx`: renders three blocks in gate order. An absent document
  shows the empty line.
- `test_verify_gate_links.py`: a line dated 2026-09-27 with no link passes. A
  line dated 2026-09-28 with no link fails. A line with a link passes.

## Least confident decisions

- The route for an ADR under review in decisions mode, and for a bounded
  context in describe mode. Slice 3 uses the page the viewer has for that
  record, or the work's Intent page when no record page exists.
- The link format in `00-status.md`. ` — view: <url>` is a new convention
  that no reader other than `verify_gate.py` uses.
- The port in a committed link goes stale when the server restarts. The link
  records what the reviewer opened. It is not a permanent address.
