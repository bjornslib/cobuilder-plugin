---
title: "Bounded Context Canvas — priority-dev"
status: draft
type: architecture
id: BCC-PRIORITY-DEV-001
last_verified: 2026-11-23
owner: bjoerns
related:
  - ../../standard.md
  - "docs/architecture/contexts/priority-dev/boundary.yaml"
---

# Bounded Context Canvas — priority-dev

> Documents `priority-dev/` to the [Architecture Documentation Standard](../../standard.md). Grounded in code as of 2026-11-23 (commit `d5e49a42`, branch `design/priority-dev-spike`).

## 1. Name & purpose

**priority.dev** (`priority-dev`). It turns one coding session into a stop brief, then scores, optimises, and replays the interpreter that writes it. It reads transcripts and labels. It does not touch the plugin marketplace, the bundle, or `shared/`.

## 2. Strategic classification

- **Support domain.** It supports the design work of the family. It does not decide a design.
- **Model trait:** a Python package with one console script, `priority`. The package has 50 modules and 4924 lines.

## 3. Ubiquitous language

| Term | Meaning inside this context |
|------|-----------------------------|
| [**Stop brief**](../../../../DDD-VOCABULARY.md#stop-brief) | The summary of one coding turn, built by `priority.brief`. |
| [**Interpreter**](../../../../DDD-VOCABULARY.md#interpreter) | The dspy module that turns a stop brief into a reading. |
| [**Label**](../../../../DDD-VOCABULARY.md#label) | The reference answer that `evaluation` scores against. |
| [**Optimiser run**](../../../../DDD-VOCABULARY.md#optimiser-run) | One GEPA search, run by `priority.optimise`. |

## 4. Inbound and outbound

- **Inbound.** No Python import. No module outside `priority-dev/` imports `priority.*`. The `priority` command is the only entry point. `plugins/cobuilder-priority` (hooks `cli.ts`, `reader.ts`, `ask.ts`) starts `uv run priority ...` as a process in the folder that its `priority_dev_dir` option names, and parses stdout as JSON. Integration pattern: Open Host Service, with the plugin as a downstream client.
- **Outbound.** Third-party packages only: `dspy==3.4.1`, plus `litellm` and `pydantic` through dspy. No plugin, no `shared/` path.

## 5. Boundary facts (checked in code)

- **Zero path references.** A grep of every `.py` file in `src`, `tools`, and `tests` finds no `plugins/` or `shared/` path.
- **Config is read at call time.** `config.py` names `priority-dev/.env`. Many modules call `config` at import time for model names, so `.env` loads on first import, not on each call.
- **Fixtures.** `cli.py` defaults `--labels` to `fixtures/real`. The context never reads that folder in this review.
- **Leaves.** `run_folder`, `brief/models`, `brief/redact`, `brief/questions`, `interpreter/models`, `evaluation/labels`, `evaluation/split`, `evaluation/payload_rules`, `evaluation/judge_probe`, `evaluation/judge_check_store`, `replay/store`, `replay/figures`, `replay/options` import no other priority module.
- **Layer order.** `brief` imports `interpreter` (`brief/shrink.py` takes `CallRecorder`, `Abstain`, and `shorten`). `interpreter` never imports `brief`. `evaluation` imports `brief`, `interpreter`, and `config`. The optimiser modules import `evaluation`, `brief`, `interpreter`, `config`, and `run_folder`. `replay` imports `brief`, `interpreter`, and `digest_store`. `digest_store` imports `interpreter`. No cycle was found.
- **Config readers.** `interpreter/module.py`, `interpreter/digest.py`, `evaluation/judge.py`, `gepa_log.py`, `optimise.py`, and `optimise_report.py` import `config`. `brief` and `replay` do not.
- **Eager and lazy imports.** `cli.py` imports `brief`, `brief.questions`, `digest_store` (so `interpreter` and dspy), `replay.options`, and `valset` at module level. It imports `interpreter`, `evaluation`, `optimise`, and `replay.runner` inside each command.

## 5a. Transcript input contract

`priority/brief/transcript.py` is the only reader of the session transcript. It assumes the **Claude Code JSONL record shape**. A transcript from another harness must be converted to this shape first, or `transcript.py` needs a second reader.

- **File.** One JSON object per line. A blank line or a line that is not JSON is skipped. The session id is the file stem (`transcript.stem`), and it keys the stored digest.
- **Record filter.** `read_records` keeps `type` `user` and `assistant`. It drops a record with `isSidechain` or `isMeta` set to true, and every other `type`.
- **User record.** `message.content` is a string (a human line), or a list of blocks. A list with any `text` block is a human line (the text blocks joined). A list with only `tool_result` blocks is a tool result. A `tool_result` block has `tool_use_id`, `content` (a string, or a list of `{text}` parts), and an optional `is_error`.
- **Assistant record.** `message.content` is a list of blocks (`text`, `tool_use` with `id`, `name`, `input`), or a string. `message.id` (else `uuid`) groups the blocks of one message, and a block that repeats inside one id is dropped. `message.model` of `<synthetic>`, or `isApiErrorMessage`, makes a client line, not an agent message.
- **Stops.** A stop is the last agent message between two human or client lines. `find_ask` takes the last human line before it that is not a bare `continue`.
- **Redaction.** `brief/redact.py` redacts the text of the ask and the after-stop lines.

## 5b. CLI contract

The `priority` command is the contract that `plugins/cobuilder-priority` uses. Output is JSON on stdout, and the command exits 0 on success, including an Abstain.

| Command | Input | Output |
|---------|-------|--------|
| `priority digest <transcript> [--stop N] [--log-dir DIR]` | A transcript in the shape of section 5a. `--stop` is a 1-based stop number (default: the last). `--log-dir` holds `calls.jsonl` and `digests/`. | One `RunDigest` or `Abstain` as JSON. It runs the Digest call up to 3 times on `invalid_output` or `model_error`. With `--log-dir`, it saves a `RunDigest` to `<DIR>/digests/<transcript stem>.json`. |
| `priority interpret <transcript> [--stop N] [--log-dir DIR] [--program FILE] [--digest current\|previous] [--open-question FILE]` | As above. `--program` is a saved dspy program to load. `--digest` says whether the stored digest is of the run before (`previous`, default) or of this run (`current`). `--open-question` is a non-empty JSON list of questions in the AskUserQuestion input shape (`question` text, `options` list of `{label}`). | One JSON object: `status`, `needs_human`, `priority`, `steps`, `abstain`, `stop_kind`. `stop_kind` is `question` with `--open-question`, else `turn_end`. An Abstain gives null fields and an `abstain` object. |
| `priority brief <transcript> [--stop N]` | As above. | The stop brief text, or the abstain reason. Not JSON. |

Failures. A missing `--program` file, a program file that fails to load, or a bad `--open-question` file prints `interpret failed: ...` and exits 1. The question file error goes to stderr and the program errors go to stdout. Both happen before the model call.

## 6. Open items

- `replay/drills.py` imports `litellm`. `replay/runner.py` imports `drills`, and `cli.py` imports `replay.runner` lazily. No other module imports `replay`.
- The transcript reader is tied to the Claude Code shape. A later design that feeds it transcripts from another harness must add a converter or a second reader (section 5a).
- `digest_store.py` sits beside the optimiser modules in `src/priority`, but only `cli.py` and `replay/runner.py` import it. Earlier versions of this record listed it in the optimiser.
- `optimise_report.py` probes `optuna` with `find_spec`. It does not import it.
- The `pyproject.toml` declares no `litellm` or `pydantic`. Both arrive through dspy `[INFERENCE]`.
