---
title: Mechanical Enforcement Rules
description: Grep commands and remediation steps for each antipattern rule.
status: active
---

# Mechanical Enforcement Rules

Run these checks before every code review. Add to pre-commit or CI. `<src>/` below is a
placeholder for your own source directory — substitute it before running any command, or every
grep silently matches nothing and reads as "no findings" instead of "wrong path".

## Rule 1: No Bare Catch-Alls

```bash
# Detect
grep -rn "except:" "<src>/" tests/
grep -rn "except Exception:" "<src>/" tests/

# False-positive filter — these are intentional re-raises
grep -rn "except Exception.*:" "<src>/" | grep -v "raise\|logger"
```

**Remediation**: Catch the specific exception. If you genuinely need to catch all, log and re-raise:
```python
# Bad
try:
    result = subprocess.run(cmd, ...)
except Exception:
    return FAILURE

# Good
try:
    result = subprocess.run(cmd, ...)
except subprocess.TimeoutExpired as exc:
    return Outcome(status=FAILURE, metadata={"error": "TIMEOUT"})
except OSError as exc:
    raise HandlerError(f"Cannot run '{cmd}': {exc}", cause=exc)
```

## Rule 2: No Imports Inside Functions

```bash
# Detect (4-space and 8-space indented imports)
grep -Prn "^( {4}| {8})import " "<src>/"
grep -Prn "^( {4}| {8})from .* import" "<src>/"
```

**Exception** — optional dependency with explicit fallback (document the pattern):
```python
# Acceptable — optional dep at top of method with fallback documented
def execute(self, request):
    try:
        from jinja2 import Environment  # optional dep — graceful degradation below
    except ImportError:
        logger.warning("jinja2 not installed; falling back to node.prompt")
        return node.prompt
    ...
```

## Rule 3: No Unnamed Utility Modules

```bash
# Detect files that should be renamed
find . -name "utils.py" -o -name "helpers.py" -o -name "misc.py"
```

**Remediation**: Rename by domain responsibility.
- `utils.py` → `_utils.py` (internal) or split into `signal_protocol.py`, `checkpoint.py`, etc.
- `helpers.py` → name by what kind of help: `prompt_renderer.py`, `context_builder.py`

## Rule 4: No Manual Class-Level Singletons

```bash
# Detect — class variables initialised to None (likely lazy singleton)
grep -Prn "^\s+_\w+ = None" "<src>/"
```

**Remediation**: Use `@functools.lru_cache`:
```python
# Before
class MyHandler:
    _cache: dict | None = None
    def _get_cache(self):
        if self._cache is None:
            self._cache = load_expensive()
        return self._cache

# After
@functools.lru_cache(maxsize=None)
def _load_cache(path: Path | None = None) -> dict:
    return load_expensive(path)

class MyHandler:
    # No class variable. Call _load_cache() directly.
    # Tests call _load_cache.cache_clear() between cases.
```

## Rule 5: Missing Type Annotations

```bash
# Public functions/methods missing return type
grep -rn "^def \|^    def " "<src>/" | grep -v " -> "

# Public functions missing parameter types (harder to grep — use mypy)
mypy "<src>/" --ignore-missing-imports --no-strict-optional
```

**Remediation**: Annotate incrementally, starting with new code and recently-modified files.

## CI Integration

Add to `.pre-commit-config.yaml`:
```yaml
- repo: local
  hooks:
    - id: no-bare-except
      name: No bare except clauses
      entry: bash -c '[ -d "<src>/" ] || { echo "ERROR: replace <src>/ in this hook with your real source directory" >&2; exit 1; }; grep -rn "except:" "<src>/" && exit 1 || exit 0'
      language: system
      pass_filenames: false

    - id: no-utils-files
      name: No utils.py files
      entry: bash -c '[ -d "<src>/" ] || { echo "ERROR: replace <src>/ in this hook with your real source directory" >&2; exit 1; }; find "<src>/" -name "utils.py" | grep . && exit 1 || exit 0'
      language: system
      pass_filenames: false
```
