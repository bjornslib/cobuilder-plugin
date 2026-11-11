---
title: "Bounded Context Canvas — priority-dev"
status: draft
type: architecture
id: BCC-PRIORITY-DEV-001
last_verified: 2026-11-10
owner: bjoerns
related:
  - ../../standard.md
  - "docs/architecture/contexts/priority-dev/boundary.yaml"
---

# Bounded Context Canvas — priority-dev

> Documents `priority-dev/` to the [Architecture Documentation Standard](../../standard.md). Grounded in code as of 2026-11-10 (commit `4cf849b`, branch `design/priority-dev-cc-plugin`).

## 1. Name & purpose

**priority.dev** (`priority-dev`). It turns one coding session into a stop brief, then scores, optimises, and replays the interpreter that writes it. It reads transcripts and labels. It does not touch the plugin marketplace, the bundle, or `shared/`.

## 2. Strategic classification

- **Support domain.** It supports the design work of the family. It does not decide a design.
- **Model trait:** a Python package with one console script, `priority`. The package has 49 modules and 4773 lines.

## 3. Ubiquitous language

| Term | Meaning inside this context |
|------|-----------------------------|
| [**Stop brief**](../../../../DDD-VOCABULARY.md#stop-brief) | The summary of one coding turn, built by `priority.brief`. |
| [**Interpreter**](../../../../DDD-VOCABULARY.md#interpreter) | The dspy module that turns a stop brief into a reading. |
| [**Label**](../../../../DDD-VOCABULARY.md#label) | The reference answer that `evaluation` scores against. |
| [**Optimiser run**](../../../../DDD-VOCABULARY.md#optimiser-run) | One GEPA search, run by `priority.optimise`. |

## 4. Inbound and outbound

- **Inbound.** None. No module outside `priority-dev/` imports `priority.*`. The `priority` command is the only entry point.
- **Outbound.** Third-party packages only: `dspy==3.4.1`, plus `litellm` and `pydantic` through dspy. No plugin, no `shared/` path.

## 5. Boundary facts (checked in code)

- **Zero path references.** A grep of every `.py` file in `src`, `tools`, and `tests` finds no `plugins/` or `shared/` path.
- **Config is read at call time.** `config.py` names `priority-dev/.env`. Many modules call `config` at import time for model names, so `.env` loads on first import, not on each call.
- **Fixtures.** `cli.py` defaults `--labels` to `fixtures/real`. The context never reads that folder in this review.
- **Leaves.** `run_folder`, `redact`, `models`, `labels`, `split`, `payload_rules`, `judge_probe`, `judge_check_store`, `replay/store` import no other priority module.

## 6. Open items

- `replay/drills.py` imports `litellm`. Its importers are not traced in this record.
- `optimise_report.py` probes `optuna` with `find_spec`. It does not import it.
- The `pyproject.toml` declares no `litellm` or `pydantic`. Both arrive through dspy `[INFERENCE]`.
