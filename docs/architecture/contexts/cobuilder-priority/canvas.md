---
title: "Bounded Context Canvas — cobuilder-priority"
status: draft
type: architecture
id: BCC-COBUILDER-PRIORITY-001
last_verified: 2026-11-11
owner: bjoerns
related:
  - ../../standard.md
  - "docs/architecture/contexts/cobuilder-priority/boundary.yaml"
  - "docs/architecture/adr/ADR-0049-cobuilder-priority-reads-each-stop-of-a-live-session.md"
---

# Bounded Context Canvas — cobuilder-priority

> Documents `plugins/cobuilder-priority/` to the [Architecture Documentation Standard](../../standard.md). Grounded in code as of 2026-11-11, branch `design/priority-dev-cc-plugin`.

## 1. Name & purpose

**cobuilder-priority**. An opt-in mod that reads each main-loop stop of a session that the person switched on, with the priority-dev interpreter. It shows each reading in a pane and keeps the person's marks. It carries out no step of a reading.

## 2. Strategic classification

- **Support domain.** It feeds the improvement of the priority-dev interpreter. It decides nothing for the session.
- **Model trait:** one TypeScript hooks module of three files, with its tests.

## 3. Ubiquitous language

| Term | Meaning inside this context |
|------|-----------------------------|
| [**Live reading**](../../../../DDD-VOCABULARY.md#live-reading) | What `priority interpret` prints for one stop, stored with its brief shape. |
| [**Reader switch**](../../../../DDD-VOCABULARY.md#reader-switch) | The per-session value that `/priority-on` and `/priority-off` set. |
| [**Reading mark**](../../../../DDD-VOCABULARY.md#reading-mark) | The person's right or wrong verdict and note on one live reading. |
| [**Reader pane**](../../../../DDD-VOCABULARY.md#reader-pane) | The side pane with one card per live reading. |

## 4. Inbound and outbound

- **Inbound.** The engine: the `classic.Stop` event, three slash commands, and the pane render.
- **Outbound.** One process per CLI command: `uv run priority digest`, then `uv run priority interpret`, in the priority-dev folder. `$.store` holds the readings and the marks.

## 5. Boundary facts (checked in code)

- **No import of priority-dev.** The hooks import only `claude-code` and their own files.
- **One reading at a time.** `reader.ts` keeps a busy flag and one waiting stop as module values.
- **The label follows the digest.** When the digest command abstains, the module runs interpret with `--digest previous`.

## 6. Open items

- A hot reload clears the queue. A reading in flight still stores its result.
- The transcript lag behind `Stop` is not measured (adapter-host.md section 7, question 3).
