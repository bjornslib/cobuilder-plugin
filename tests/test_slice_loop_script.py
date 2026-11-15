"""Slice 17 (structure-coaching/E9): the scripted loop gives VALIDATE and the vocabulary agent a slice base and a packet path.

Contract under test (docs/plans/structure-coaching/epic-E9-design.md, the slice 17 part and the Risks section):

- RED_SCHEMA requires sliceBase, the output of git rev-parse HEAD. RED runs that command before it writes a file.
- The GREEN prompt holds a git commit step for each attempt.
- The VALIDATE and vocabulary prompts name structure_evidence.py, --base <the sha RED returned>, and the packet path.
- The vocabulary diff command diffs from the slice base. HEAD holds nothing new after GREEN commits.
- Each slice takes its base from its own RED.
- The dirty files that RED reports are named in the run log.
- A packet of the second slice holds only that slice. This case may pass before the change, because it pins the mechanism that the loop relies on.
- The Scripted paragraph of slice-loop.md names the commit step and sliceBase. It no longer says that the script passes no structure values.

The node cases run slice-loop.js under node. The harness gives fake agent(), parallel(), phase(), and log() globals. The cases skip when node is not on PATH.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
BUILD_DIR = REPO_ROOT / "plugins" / "implement" / "skills" / "build"
SLICE_LOOP_JS = BUILD_DIR / "workflows" / "slice-loop.js"
SLICE_LOOP_MD = BUILD_DIR / "references" / "slice-loop.md"
EVIDENCE_PATH = REPO_ROOT / "shared" / "structure_evidence.py"

SLUG = "structure-coaching"
SHA_A = "0123456789abcdef0123456789abcdef01234567"
SHA_B = "fedcba9876543210fedcba9876543210fedcba98"
PACKET_17 = f".cobuilder/rubrics/{SLUG}/evidence/slice-17-packet.json"
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")
ALPHA = "def alpha():\n    return 1\n"
BETA = "def beta():\n    return 2\n"
SLICE_17 = "The scripted loop gives VALIDATE and the vocabulary agent a slice base and a packet path"
SLICE_18 = "No duplicate vocabulary leads"

# The harness removes the export keyword from the script, and it runs the body as an async function.
# Each fake agent replies from the agent type and the schema that the script sends.
HARNESS_JS = r"""
import { readFileSync } from 'node:fs';

const [scriptPath, scenarioPath] = process.argv.slice(2);
const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'));
const source = readFileSync(scriptPath, 'utf8').replace(/^export /gm, '');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const verdicts = [...(scenario.validateVerdicts || [])];
const calls = [];
const phases = [];
const logs = [];

const sliceIdOf = (prompt) => {
  const found = prompt.match(/^slice: (\S+) /m);
  return found ? found[1] : null;
};

function redReply(schema, prompt) {
  const reply = {
    testFiles: ['t.py'],
    newFailingTests: 1,
    failuresAreAssertions: true,
    preexistingPassCount: 0,
    sliceBase: scenario.sliceBases[sliceIdOf(prompt)],
  };
  for (const [key, spec] of Object.entries((schema && schema.properties) || {})) {
    if (/dirty/i.test(key)) reply[key] = spec.type === 'array' ? ['notes.md'] : 'notes.md';
  }
  return reply;
}

function answer(opts, prompt) {
  if (opts.agentType === 'implement:red') return redReply(opts.schema, prompt);
  if (opts.agentType === 'implement:green') {
    return { filesChanged: ['t.py'], testsPassed: 1, testsFailed: 0, touchedATestFile: false };
  }
  if (opts.agentType === 'implement:validate') {
    const verdict = verdicts.shift() || 'PASS';
    return {
      verdict,
      overallScore: verdict === 'PASS' ? 0.95 : 0.6,
      voided: false,
      criteria: [],
      guidance: verdict === 'PASS' ? '' : 'fix the gap',
    };
  }
  return { verdict: 'CLEAN', findings: [] };
}

async function agent(prompt, opts = {}) {
  calls.push({ prompt, opts: JSON.parse(JSON.stringify(opts)) });
  return answer(opts, prompt);
}

const parallel = (thunks) => Promise.all(thunks.map((thunk) => thunk()));
const phase = (name) => { phases.push(String(name)); };
const log = (message) => { logs.push(String(message)); };

let result = null;
let error = null;
try {
  const run = new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', source);
  result = await run(scenario.args, agent, parallel, phase, log);
} catch (thrown) {
  error = String((thrown && thrown.stack) || thrown);
}
process.stdout.write(JSON.stringify({ calls, phases, logs, result, error }));
"""


def _slice(slice_id: int, name: str) -> dict:
    return {
        "id": slice_id,
        "name": name,
        "goal": f"Build slice {slice_id}.",
        "epicId": "E9",
        "epicDesignExists": True,
    }


ARGS = {"slug": SLUG, "testCommand": "uv run pytest tests -q", "slices": [_slice(17, SLICE_17)]}
TWO_SLICES = {**ARGS, "slices": [_slice(17, SLICE_17), _slice(18, SLICE_18)]}


def _run_loop(tmp_path: Path, args: dict, bases: dict, verdicts: tuple = ()) -> dict:
    """Run slice-loop.js under node with fake agents, and return the record of the run."""
    if shutil.which("node") is None:
        pytest.skip("node is not on PATH; skipping the run of slice-loop.js")
    harness = tmp_path / "harness.mjs"
    harness.write_text(HARNESS_JS, encoding="utf-8")
    scenario = tmp_path / "scenario.json"
    scenario.write_text(
        json.dumps({"args": args, "sliceBases": bases, "validateVerdicts": list(verdicts)}),
        encoding="utf-8",
    )
    run = subprocess.run(
        ["node", str(harness), str(SLICE_LOOP_JS), str(scenario)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=120,
        check=False,
    )
    assert run.returncode == 0, f"node exited {run.returncode}: {run.stderr}"
    record = json.loads(run.stdout)
    assert record["error"] is None, f"slice-loop.js raised an error: {record['error']}"
    return record


def _calls(record: dict, agent_type: str, slice_id: int | None = None) -> list[dict]:
    """Return the agent calls of one type, and of one slice when slice_id is given."""
    found = [call for call in record["calls"] if call["opts"].get("agentType") == agent_type]
    if slice_id is not None:
        found = [call for call in found if re.search(rf"^slice: {slice_id} ", call["prompt"], re.M)]
    return found


def _first(record: dict, agent_type: str, slice_id: int) -> dict:
    """Return the first call of one agent type for one slice. Fail with an assertion when none exists."""
    found = _calls(record, agent_type, slice_id)
    assert found, f"no {agent_type} call for slice {slice_id} in the run"
    return found[0]


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], check=True, capture_output=True, text=True
    )
    return result.stdout.strip()


def _commit(repo: Path, files: dict[str, str], message: str) -> str:
    """Write each file, commit all of them, and return the sha of the new commit."""
    for rel, text in files.items():
        (repo / rel).write_text(text, encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", message)
    return _git(repo, "rev-parse", "HEAD")


def _packet_text(repo: Path, base: str, out: Path) -> str:
    """Run the evidence script in the repo for one slice base, and return the packet text."""
    result = subprocess.run(
        ["uv", "run", str(EVIDENCE_PATH), "--base", base, "--out", str(out)],
        cwd=repo,
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    assert result.returncode == 0, f"uv run exited {result.returncode}: {result.stderr}"
    return out.read_text(encoding="utf-8")


def _scripted_paragraph() -> str:
    """Return the Scripted paragraph of the slice loop reference, joined into one line."""
    lines = SLICE_LOOP_MD.read_text(encoding="utf-8").splitlines()
    starts = [index for index, line in enumerate(lines) if line.startswith("**Scripted")]
    assert starts, f"{SLICE_LOOP_MD}: no paragraph starts with **Scripted"
    paragraph = []
    for line in lines[starts[0]:]:
        if not line.strip():
            break
        paragraph.append(line)
    return " ".join(paragraph)


# ---------------------------------------------------------------------------
# Node cases: the workflow script, run with fake agents
# ---------------------------------------------------------------------------


def test_red_schema_requires_slice_base(tmp_path):
    record = _run_loop(tmp_path, ARGS, {"17": SHA_A})
    schema = _first(record, "implement:red", 17)["opts"]["schema"]
    assert "sliceBase" in schema.get("required", []), (
        f"RED_SCHEMA does not require sliceBase, required is {schema.get('required')}"
    )
    assert schema.get("properties", {}).get("sliceBase", {}).get("type") == "string", (
        "RED_SCHEMA has no string property sliceBase"
    )


def _first_write_step(prompt: str) -> int | None:
    """Return the offset of the first write step in the prompt, or None.

    A write word after "before" in the same sentence is a timing clause. It is not a step.
    """
    for match in re.finditer(r"\bwrite\b", prompt, re.IGNORECASE):
        sentence = re.split(r"[.!?\n]", prompt[: match.start()])[-1]
        if not re.search(r"\bbefore\b", sentence, re.IGNORECASE):
            return match.start()
    return None


def test_red_prompt_asks_for_head_before_any_write_step(tmp_path):
    record = _run_loop(tmp_path, ARGS, {"17": SHA_A})
    prompt = _first(record, "implement:red", 17)["prompt"]
    assert "git rev-parse HEAD" in prompt, "the RED prompt does not ask for git rev-parse HEAD"
    # The base comes before the first write step. A prompt with no write step passes this check.
    write = _first_write_step(prompt)
    if write is not None:
        assert prompt.index("git rev-parse HEAD") < write, (
            "the RED prompt names a write step before the git rev-parse HEAD step"
        )


def test_green_prompt_holds_a_commit_step_for_each_attempt(tmp_path):
    record = _run_loop(tmp_path, ARGS, {"17": SHA_A}, verdicts=("FAIL", "PASS"))
    greens = _calls(record, "implement:green", 17)
    assert len(greens) == 2, f"expected two GREEN attempts for slice 17, got {len(greens)}"
    for number, call in enumerate(greens, start=1):
        assert "git commit" in call["prompt"], (
            f"the GREEN prompt of attempt {number} holds no git commit step"
        )


def test_validate_prompt_names_the_script_the_base_and_the_packet(tmp_path):
    record = _run_loop(tmp_path, ARGS, {"17": SHA_A})
    prompt = _first(record, "implement:validate", 17)["prompt"]
    assert "structure_evidence.py" in prompt, "the VALIDATE prompt does not name structure_evidence.py"
    assert f"--base {SHA_A}" in prompt, "the VALIDATE prompt does not pass the sha that RED returned"
    assert f"--out {PACKET_17}" in prompt, f"the VALIDATE prompt does not pass --out {PACKET_17}"


def test_vocabulary_prompt_names_the_script_the_base_and_the_packet(tmp_path):
    record = _run_loop(tmp_path, ARGS, {"17": SHA_A})
    prompt = _first(record, "implement:vocabulary", 17)["prompt"]
    assert "structure_evidence.py" in prompt, "the vocabulary prompt does not name structure_evidence.py"
    assert f"--base {SHA_A}" in prompt, "the vocabulary prompt does not pass the sha that RED returned"
    assert PACKET_17 in prompt, f"the vocabulary prompt does not name the packet {PACKET_17}"


def test_vocabulary_diff_command_diffs_from_the_slice_base(tmp_path):
    record = _run_loop(tmp_path, ARGS, {"17": SHA_A})
    prompt = _first(record, "implement:vocabulary", 17)["prompt"]
    line = re.search(r"^diff command: (.*)$", prompt, re.M)
    assert line is not None, "the vocabulary prompt has no 'diff command:' line"
    command = line.group(1)
    assert "git diff HEAD" not in command, (
        f"the diff command {command!r} diffs from HEAD, which holds nothing new after GREEN commits"
    )
    assert re.search(rf"git diff\s+{SHA_A}\b", command), (
        f"the diff command {command!r} does not diff from the slice base {SHA_A}"
    )


def test_each_slice_takes_its_base_from_its_own_red(tmp_path):
    record = _run_loop(tmp_path, TWO_SLICES, {"17": SHA_A, "18": SHA_B})
    for slice_id, sha, other in ((17, SHA_A, SHA_B), (18, SHA_B, SHA_A)):
        for agent_type in ("implement:validate", "implement:vocabulary"):
            prompt = _first(record, agent_type, slice_id)["prompt"]
            assert f"--base {sha}" in prompt, (
                f"{agent_type} of slice {slice_id} does not pass --base {sha}"
            )
            assert other not in prompt, (
                f"{agent_type} of slice {slice_id} names the base of another slice"
            )


def test_dirty_files_that_red_reports_are_named_in_the_run_log(tmp_path):
    record = _run_loop(tmp_path, ARGS, {"17": SHA_A})
    properties = _first(record, "implement:red", 17)["opts"]["schema"].get("properties", {})
    assert any("dirty" in key.lower() for key in properties), (
        f"RED_SCHEMA has no field for the dirty files, properties are {sorted(properties)}"
    )
    assert any("notes.md" in line for line in record["logs"]), (
        f"the run log does not name the dirty file notes.md: {record['logs']}"
    )


# ---------------------------------------------------------------------------
# Git case: the packet of the second slice, from the base that the loop records
# ---------------------------------------------------------------------------


def test_packet_of_the_second_slice_holds_only_that_slice(tmp_path):
    assert EVIDENCE_PATH.is_file(), f"missing {EVIDENCE_PATH}"
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-q")
    _git(repo, "symbolic-ref", "HEAD", "refs/heads/main")
    base_a = _commit(repo, {"base.py": "BASE = 0\n"}, "base")
    _commit(repo, {"alpha.py": ALPHA}, "slice 1")
    base_b = _git(repo, "rev-parse", "HEAD")
    _commit(repo, {"beta.py": BETA}, "slice 2")
    second = _packet_text(repo, base_b, tmp_path / "second.json")
    assert "beta.py" in second, "the packet of the second slice does not name beta.py"
    assert "alpha.py" not in second, "the packet of the second slice names alpha.py from slice 1"
    first = _packet_text(repo, base_a, tmp_path / "first.json")
    assert "alpha.py" in first, "control: the packet from base A should name alpha.py"


# ---------------------------------------------------------------------------
# Reference case: the Scripted paragraph of slice-loop.md
# ---------------------------------------------------------------------------


def test_scripted_paragraph_names_the_commit_step():
    assert "git commit" in _scripted_paragraph(), (
        f"{SLICE_LOOP_MD}: the Scripted paragraph names no git commit step"
    )


def test_scripted_paragraph_names_the_slice_base():
    assert "sliceBase" in _scripted_paragraph(), (
        f"{SLICE_LOOP_MD}: the Scripted paragraph does not name sliceBase"
    )


def test_scripted_paragraph_no_longer_says_the_script_passes_no_structure_values():
    assert "no structure values" not in _scripted_paragraph(), (
        f"{SLICE_LOOP_MD}: the Scripted paragraph still says the script passes no structure values"
    )
