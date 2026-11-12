# Architecture: Structure signals coach GREEN, and VALIDATE reports them beside the slice score

Design record: `docs/architecture/designs/structure-coaching/`, decided in ADR-0048.

## Fit

| Module | Role today | Change |
|---|---|---|
| `shared/structure_signals.py` | None. A new file. | Finds the coach signals for one written file: a crowded folder with its groups, a name family, and a generic name. Standard library only. |
| `shared/structure_boundary.py` | None. A new file. | Reads each `boundary.yaml` and the imports and path strings of a file, and finds each boundary edge. Standard library only. |
| `shared/structure_evidence.py` and its modules | None. New files. | Writes the evidence packet for a slice diff (contract drift, boundary edges, duplicated code, consumer locality, vocabulary leads), and the whole-repository record. Run with `uv run`. |
| `plugins/architect/skills/architecture/` | Review and maintenance modes run the habit-hooks scan. | Run the whole-repository record, report it, and show its trend (E6). |
| `plugins/implement/agents/vocabulary.md` | Checks names against the glossary. | Reads the vocabulary leads from the packet. |
| `plugins/implement/scripts/habit_coach.py` | The `PostToolUse` coach. It filters on `implement:green` and runs habit-hooks on one file. | Gets a second runner. The coach joins the habit-hooks text and the structure text into one message. The GREEN filter stays. |
| `plugins/implement/scripts/structure_runner.py` | None. A new file. | Calls `structure_signals.py`, applies the approved wording, and drops a finding that the session already showed. It keeps the coach file inside the size limit. |
| `plugins/implement/scripts/verify_gate.py` | Checks the gate files before slices start. | Gets an agent-use check for one slice, which runs before the slice closes. |
| `plugins/implement/agents/validate.md` | Scores a slice and writes the attempt file. | Runs `structure_evidence.py` on the slice diff, labels each finding, and adds a `### Structure` block outside the score. |
| `plugins/implement/skills/build/references/slice-loop.md` and `SKILL.md` | The loop procedure for the main agent. | Stronger text on the use of the three agents, and the agent-use check before a slice closes. |
| `plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/` | Installs habit-hooks and checks the coach. | Writes the default `.cobuilder/structure-signals.json`. |
| `docs/architecture/contexts/implement/boundary.yaml` | The implement boundary record. | No new edge. `implement` already depends on `shared`. |

## Endpoints

None. The work changes a hook, two scripts, an agent body, and the loop prose.

## Data

| Store | Owner | Content |
|---|---|---|
| `.cobuilder/structure-signals.json` | The engineer. The install writes the default. | The folder limit, the percentile, the generic-name list, the excluded paths, and the test-name prefixes. Committed. |
| `shared/structure-messages.json` | The plugin. The engineer approves it in slice 3. | One message template for each signal, with the decision that the message asks GREEN to make. |
| `<temp dir>/cobuilder-coach-<session_id>.json` | The coach | The keys of the findings that this session already showed. Outside the repo. |
| `.cobuilder/rubrics/<slug>/evidence/slice-<N>-attempt-<M>.md` | VALIDATE | Gets a `### Structure` block. Git ignores the folder. |
| `docs/plans/structure-coaching/evaluation.md` | The engineer and the main agent | The replay results and the hand labels (E5). |
| `.cobuilder/rubrics/<slug>/evidence/slice-<N>-packet.json` | `structure_evidence.py` | The evidence packet of one slice. Git ignores the folder. |
| `docs/architecture/review/<run>/structure-findings.json` | `structure_evidence.py --repo` | The whole-repository record, beside the review reports (E6). Committed with the reports. |

No database. No schema migration. No change to the bundle format.

## Flow

The primary path is a GREEN write.

1. GREEN calls `Write` or `Edit`.
2. Claude Code runs `habit_coach.py` on `PostToolUse` with the payload.
3. The coach stops when `agent_type` is not `implement:green`, or when the payload has no file path.
4. When the extension is one of the six habit-hooks extensions, the coach runs `habit-hooks --file <path>`. For another extension, it skips habit-hooks and gives no smell output.
5. The coach calls `structure_runner.run(path, session_id)`.
6. `structure_runner` calls `structure_signals.signals_for(path, root, config)`. The script returns findings only when the file is untracked or added since the merge-base.
7. `structure_runner` applies the message templates and removes each finding that the session record already holds. It adds the new keys to the record.
8. The coach joins the two texts and writes one `additionalContext` message. It returns 0, so the write always goes ahead.

The second path is the end of a slice.

1. The main agent spawns VALIDATE and VOCABULARY in parallel.
2. VALIDATE scores the rubric. Then it runs `uv run <structure_evidence.py> --base <slice base> --out <packet>`. The spawn message gives the script path, the slice base that the main agent recorded before RED, and the packet path. VALIDATE does not run `structure_runner.py`, because the runner holds only the coach wording and the session record.
3. VALIDATE writes the `### Structure` block. It labels each finding confirmed, accepted, or dismissed, with one line of reason. Then it reads the diff and the prose rules of the touched boundary records, and judges contract drift, cohesion, and each new dependency. The vocabulary agent reads the vocabulary leads of the same packet.
4. On a FAIL, the block goes to the feedback file, and GREEN reads it in the next attempt.
5. Before the slice closes, the main agent runs `verify_gate.py --plan <dir> --slice <N>`. The check fails when the agent-use effect is absent.

## External

| Item | Use |
|---|---|
| habit-hooks CLI | Unchanged. The coach still runs it for the six extensions. |
| git | `git ls-files`, `git merge-base`, `git diff`, `git show`, and `git log` give the file list, the new files, the slice diff, the base side of a file, and the change count. The epic designs give each call. |
| uv and PyPI | `structure_evidence.py` declares `pyyaml` in its PEP 723 header. The first run needs a network. The coach needs neither. |
| Environment | No new variable. The coach reads `session_id` from the hook payload and the temp folder from `tempfile.gettempdir()`. |
| Webhooks | None. |
