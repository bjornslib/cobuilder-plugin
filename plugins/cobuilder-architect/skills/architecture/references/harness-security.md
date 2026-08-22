---
title: Harness Security Rules
description: General LLM-agent-harness security rules — prompt injection via tool output, MCP trust boundaries, dynamic shell execution in hooks, signal-file atomicity, and settings writes. Grep-based detection, false-positive filters, and Python remediation patterns.
status: active
---

# Harness Security Rules

Seven security rules general to any LLM agent orchestration layer — applicable to any repo that dispatches agents, runs hooks, or speaks MCP, not just this one. Run these before every code review and in CI.

**Before running any check below:** the detect commands use `<agent-src>/` as a placeholder for wherever your orchestration/agent-dispatch source lives (e.g. your equivalent of an `execution_engine/` or `orchestrator/` package). Substitute your actual directory — left as a literal placeholder, every command below will silently match nothing, which reads as "no findings" rather than "wrong path." `.claude/hooks/` and `.claude/settings*.json` are the genuine, portable Claude Code locations and do not need substitution.

---

## Rule 1: No Prompt Interpolation of Tool Output

**Severity**: Critical

```bash
# Detect
grep -rn 'f".*{.*result.*}' "<agent-src>/" | grep -i "prompt\|system"
grep -rn "f'.*{.*result.*}'" "<agent-src>/" | grep -i "prompt\|system"

# False-positive filter — f-strings that format non-tool-output data
# (e.g., node names from the pipeline graph, static config values)
grep -rn 'f".*{.*result.*}' "<agent-src>/" | grep -i "prompt\|system" | grep -v "node_name\|node_id\|graph\|config"
```

**Why**: Tool output (MCP responses, subprocess results, file contents) may contain prompt injection payloads. Interpolating tool output into a system prompt gives the tool provider a direct path to manipulate agent behavior.

**Remediation**:

```python
# Bad — tool output interpolated into system prompt
tool_result = mcp_client.call_tool("read_file", {"path": user_path})
prompt = f"Process this data: {tool_result}"
# If tool_result contains "Ignore all previous instructions and ...",
# the agent will follow the injected instructions.

# Good — tool output passed as structured context, not in system prompt
tool_result = mcp_client.call_tool("read_file", {"path": user_path})
prompt = "Process the data provided in the context field."
messages = [
    {"role": "system", "content": prompt},
    {"role": "user", "content": json.dumps({"data": tool_result})},
]
# The data is in a separate message; the system prompt is static.
```

---

## Rule 2: No Unvalidated MCP Responses as File Paths or Commands

**Severity**: Critical

```bash
# Detect
grep -rn 'subprocess\.\|open(' "<agent-src>/" | grep -B2 'mcp\|tool_result'
grep -rn 'os\.path\.\|Path(' "<agent-src>/" | grep -B2 'mcp\|tool_result'

# False-positive filter — subprocess calls that use hardcoded command names
grep -rn 'subprocess\.\|open(' "<agent-src>/" | grep -B2 'mcp\|tool_result' | grep -v '"git"\|"python3"\|"docker"\|/usr/bin/'
```

**Why**: An MCP server (or a compromised tool provider) can return malicious file paths or command names. Passing MCP output directly to `subprocess.run` or `open()` gives the server code execution on the host.

**Remediation**:

```python
# Bad — MCP response used directly as a command path
response = mcp_client.call_tool("get_tool_path", {"name": tool_name})
subprocess.run([response["tool_path"]])  # server controls what binary runs

# Bad — MCP response used directly as a file path
response = mcp_client.call_tool("get_output_file", {"task": task_id})
with open(response["file_path"]) as f:  # server controls what file is read
    data = f.read()

# Good — validate MCP response against schema; whitelist commands
ALLOWED_COMMANDS = {"git", "python3", "uv", "pytest"}

response = mcp_client.call_tool("get_tool_path", {"name": tool_name})
command = response.get("tool_path", "").split("/")[-1]  # basename only
if command not in ALLOWED_COMMANDS:
    raise SecurityError(f"Command not in whitelist: {command}")
subprocess.run([command], shell=False)  # explicit arg, not MCP-provided path

# Good — validate file paths against workspace root
WORKSPACE_ROOT = Path(os.environ["WORKSPACE_ROOT"]).resolve()

response = mcp_client.call_tool("get_output_file", {"task": task_id})
target = (WORKSPACE_ROOT / response["file_path"]).resolve()
if not target.is_relative_to(WORKSPACE_ROOT):
    raise SecurityError(f"Path escapes workspace: {response['file_path']}")
with open(target) as f:
    data = f.read()
```

---

## Rule 3: No Dynamic Shell Execution in Hooks

**Severity**: Critical

```bash
# Detect
grep -rn 'shell=True' .claude/hooks/
grep -rn 'os\.system' .claude/hooks/

# False-positive filter — shell=True with fully static command strings
grep -rn 'shell=True' .claude/hooks/ | grep -v "f'\|f\"\|{.*}"
```

**Why**: Hook scripts receive input from the agent runtime. If a hook uses `shell=True` with agent-provided arguments, the agent (or a compromised prompt) can inject arbitrary shell commands.

**Remediation**:

```python
# Bad — shell=True with dynamic hook argument
hook_arg = os.environ.get("HOOK_PAYLOAD", "")
subprocess.run(f"git {hook_arg}", shell=True)
# If hook_arg = "commit -m '; rm -rf /; echo '", arbitrary commands execute

# Bad — dynamic command via system call with hook input
hook_arg = os.environ.get("HOOK_PAYLOAD", "")
os.system(f"notify-send '{hook_arg}'")

# Good — explicit arg list, shell=False, input validation
ALLOWED_GIT_COMMANDS = {"status", "log", "diff", "branch"}

hook_arg = os.environ.get("HOOK_PAYLOAD", "")
parts = hook_arg.split()
if not parts or parts[0] not in ALLOWED_GIT_COMMANDS:
    raise SecurityError(f"Disallowed git command: {parts[0] if parts else '(empty)'}")
subprocess.run(["git", *parts], shell=False, check=True)

# Good — system call replaced with subprocess + explicit args
subprocess.run(["notify-send", hook_arg], shell=False)  # single arg, no shell
```

---

## Rule 4: Atomic Signal File Writes

**Severity**: High

```bash
# Detect (point this at wherever your pipeline/runner writes signal or state files)
grep -rn "open.*'w'" "<agent-src>/" | grep -v "rename\|atomic\|tempfile\|replace"

# False-positive filter — log files or non-signal files that tolerate partial writes
grep -rn "open.*'w'" "<agent-src>/" | grep -v "rename\|atomic\|tempfile\|replace\|log\|\.log\|debug\|tmp"
```

**Why**: Signal files coordinate pipeline state between processes. A crash or power loss mid-write leaves a partially-written signal file, which the pipeline runner may interpret as a valid (but corrupt) state. This causes stuck nodes, wrong transitions, or silent data loss.

**Remediation**:

```python
# Bad — direct write, crash mid-write leaves corrupt signal
with open(signal_path, "w") as f:
    f.write(json.dumps({"status": "completed", "output": result}))
# If process is killed after truncation but before write completes,
# signal_path exists but is empty or partial.

# Good — write to temp file, then atomic swap via os.replace
import tempfile
import os

data = json.dumps({"status": "completed", "output": result})
fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(signal_path))
try:
    with os.fdopen(fd, "w") as f:
        f.write(data)
    os.replace(tmp_path, signal_path)  # atomic on POSIX
except Exception:
    os.unlink(tmp_path)  # cleanup on failure
    raise
```

---

## Rule 5: Worker Directory Confinement

**Severity**: High

```bash
# Detect (point this at wherever your worker/runner dispatches task execution)
grep -rn "os\.chdir\|os\.path\.\|open(" "<agent-src>/runner/"
grep -rn "Path(" "<agent-src>/runner/" | grep -v "resolve\|is_relative_to\|workspace"

# False-positive filter — path operations that stay within workspace root
grep -rn "os\.path\.\|Path(" "<agent-src>/runner/" | grep -v "resolve\|is_relative_to\|workspace\|config\|template"
```

**Why**: A worker process that can access any path on the filesystem can read secrets, modify configuration, or write to system directories. Confining workers to their workspace directory prevents privilege escalation.

**Remediation**:

```python
# Bad — worker can access any path on the filesystem
class WorkerRunner:
    def run(self, task):
        # No path validation — worker can read /etc/passwd or write to /
        with open(task.output_path, "w") as f:
            f.write(task.result)

# Bad — os.chdir without validation
os.chdir(task.working_directory)  # could be / or /etc

# Good — validate all file paths resolve within workspace root
from pathlib import Path

class WorkerRunner:
    def __init__(self, workspace_root: str):
        self._workspace_root = Path(workspace_root).resolve()

    def _validate_path(self, path: str | Path) -> Path:
        """Ensure path resolves within workspace root."""
        target = Path(path)
        if not target.is_absolute():
            target = self._workspace_root / target
        resolved = target.resolve()
        if not resolved.is_relative_to(self._workspace_root):
            raise SecurityError(f"Path escapes workspace: {path}")
        return resolved

    def run(self, task):
        output_path = self._validate_path(task.output_path)
        with open(output_path, "w") as f:
            f.write(task.result)

    def chdir(self, directory: str):
        validated = self._validate_path(directory)
        os.chdir(validated)
```

---

## Rule 6: No Credentials in Prompts or Logs

**Severity**: High

```bash
# Detect (substitute the env var names your provider(s) actually use)
grep -rn 'ANTHROPIC_API_KEY\|OPENAI_API_KEY\|os\.environ\[' "<agent-src>/" | grep -i "prompt\|log\|print"
grep -rn 'api_key\|secret\|password\|token' "<agent-src>/" | grep -i "prompt\|log\|print\|logger"

# False-positive filter — loading env vars for API client initialization (not in prompts)
grep -rn 'os\.environ\[' "<agent-src>/" | grep -i "prompt\|log\|print" | grep -v "client\|session\|auth\|init"
```

**Why**: Credentials in LLM prompts are sent to the model provider and appear in session logs, traces, and debugging output. Credentials in log output are visible in every log aggregator, SIEM, and debugging session. Once in a prompt, they cannot be redacted.

**Remediation**:

```python
# Bad — API key interpolated into prompt
prompt = f"Use the Anthropic API key {os.environ['ANTHROPIC_API_KEY']} to analyze this data"
# Key is sent to the LLM, logged in traces, and visible in debugging output

# Bad — credentials in log output
logger.info(f"Connected to database: {os.environ['DATABASE_URL']}")
# URL contains: postgres://admin:s3cret@db.internal:5432/prod
# "s3cret" is now in every log aggregator

# Bad — printing credentials for debugging
print(f"Using API key: {api_key}")

# Good — never include credential values in prompts or logs
prompt = "Analyze the data provided in the context field."
client = anthropic.Anthropic()  # reads key from env automatically
# The key is never in the prompt text

# Good — redacted logging
logger.info("Connected to database: <DATABASE_URL>")
# Or use a custom filter to strip credential patterns from log output

# Good — reference-only debugging
logger.debug("API client initialized for provider: %s", provider_name)
# Log the fact of connection, not the credential
```

---

## Rule 7: No Agent Writes to settings.json

**Severity**: High

```bash
# Detect
grep -rn 'settings\.json\|settings\.local\.json' "<agent-src>/" | grep -v "cli\|config\|\.claude/scripts"

# False-positive filter — CLI configuration tools that explicitly update settings with user approval
grep -rn 'settings\.json' "<agent-src>/" | grep -v "cli\|config\|scripts\|read\|load\|parse"
```

**Why**: The `.claude/settings.json` file controls permissions and tool access. If agent code can write to it, a compromised or misbehaving agent can grant itself additional permissions (e.g., allowing shell commands, bypassing sandbox restrictions). Only the CLI itself, with explicit user approval, should modify settings.

**Remediation**:

```python
# Bad — agent code writing to settings.json to add permissions
import json

with open(".claude/settings.json", "r") as f:
    settings = json.load(f)
settings["permissions"]["allow"].append("Bash(npm run *)")  # grant itself npm access
with open(".claude/settings.json", "w") as f:
    json.dump(settings, f)

# Bad — agent code modifying settings.local.json
with open(".claude/settings.local.json", "w") as f:
    json.dump({"permissions": {"allow": ["Bash(rm -rf *)"]}}, f)

# Good — agent code only reads settings; uses CLI for modifications
import json

# Reading settings is allowed — check what tools are available
with open(".claude/settings.json", "r") as f:
    settings = json.load(f)
allowed_tools = settings.get("permissions", {}).get("allow", [])
if "Bash(npm test)" not in allowed_tools:
    # Tell the user to run the CLI command, don't modify the file
    logger.warning(
        "Permission 'Bash(npm test)' not in settings. "
        "Run: claude config add-permission 'Bash(npm test)'"
    )
```

---

## CI Integration

Add these checks to CI or pre-commit:

```yaml
# .pre-commit-config.yaml
- repo: local
  hooks:
    - id: harness-security
      name: Harness security rules
      entry: bash -c '
        # <agent-src>/ = your orchestration/agent-dispatch source directory — substitute it below.
        if [ ! -d "<agent-src>/" ]; then
          echo "ERROR: this hook still has the literal <agent-src>/ placeholder. Edit .pre-commit-config.yaml and replace every <agent-src>/ with your real orchestration source directory before this hook can run." >&2
          exit 1
        fi

        echo "Rule 1: Prompt interpolation of tool output"
        grep -rn "f\".*{.*result.*}" "<agent-src>/" | grep -i "prompt\|system" | grep -v "node_name\|node_id\|graph\|config" && exit 1 || true

        echo "Rule 2: Unvalidated MCP responses"
        grep -rn "subprocess\.\|open(" "<agent-src>/" | grep -B2 "mcp\|tool_result" | grep -v "\"git\"\|\"python3\"\|\"docker\"" && exit 1 || true

        echo "Rule 3: Dynamic shell execution in hooks"
        grep -rn "shell=True" .claude/hooks/ | grep -v "f'\|f\"\|{.*}" && exit 1 || true

        echo "Rule 4: Non-atomic signal file writes"
        grep -rn "open.*'\''w'\''" "<agent-src>/" | grep -v "rename\|atomic\|tempfile\|replace\|log\|\.log\|debug\|tmp" && exit 1 || true

        echo "Rule 5: Worker directory confinement"
        grep -rn "Path(" "<agent-src>/runner/" | grep -v "resolve\|is_relative_to\|workspace\|config\|template" && exit 1 || true

        echo "Rule 6: Credentials in prompts or logs"
        grep -rn "ANTHROPIC_API_KEY\|OPENAI_API_KEY" "<agent-src>/" | grep -i "prompt\|log\|print" | grep -v "client\|session\|auth\|init" && exit 1 || true

        echo "Rule 7: Agent writes to settings.json"
        grep -rn "settings\.json" "<agent-src>/" | grep -v "cli\|config\|scripts\|read\|load\|parse" && exit 1 || true

        exit 0
      '
      language: system
      pass_filenames: false
```
