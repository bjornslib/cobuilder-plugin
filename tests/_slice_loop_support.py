"""Support for the slice-loop.js tests: a node harness with fake agent(), parallel(), phase(), and log() globals.

The cases skip when node is not on PATH.
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
SLUG = "structure-coaching"
SHA_A = "0123456789abcdef0123456789abcdef01234567"
SHA_B = "fedcba9876543210fedcba9876543210fedcba98"
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
  // A branch map entry of null leaves the field out. A slice with no entry reports a feature branch.
  const branches = scenario.branches || {};
  const branch = sliceIdOf(prompt) in branches ? branches[sliceIdOf(prompt)] : 'design/x';
  if (branch !== null) reply.branch = branch;
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


def run_loop(tmp_path: Path, args: dict, bases: dict, verdicts: tuple = (), branches: dict | None = None) -> dict:
    """Run slice-loop.js under node with fake agents, and return the record of the run."""
    if shutil.which("node") is None:
        pytest.skip("node is not on PATH; skipping the run of slice-loop.js")
    harness = tmp_path / "harness.mjs"
    harness.write_text(HARNESS_JS, encoding="utf-8")
    scenario = tmp_path / "scenario.json"
    scenario.write_text(
        json.dumps({"args": args, "sliceBases": bases, "validateVerdicts": list(verdicts), "branches": branches or {}}),
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


def calls(record: dict, agent_type: str, slice_id: int | None = None) -> list[dict]:
    """Return the agent calls of one type, and of one slice when slice_id is given."""
    found = [call for call in record["calls"] if call["opts"].get("agentType") == agent_type]
    if slice_id is not None:
        found = [call for call in found if re.search(rf"^slice: {slice_id} ", call["prompt"], re.M)]
    return found


def first(record: dict, agent_type: str, slice_id: int) -> dict:
    """Return the first call of one agent type for one slice. Fail with an assertion when none exists."""
    found = calls(record, agent_type, slice_id)
    assert found, f"no {agent_type} call for slice {slice_id} in the run"
    return found[0]
