---
title: Agent-Legible Codebase Principles
description: Detailed Python examples for each Agent-Legible principle.
status: active
---

# Agent-Legible Codebase Principles

## Principle 1: Clear Module Boundaries

A module should have one reason to change. If you have to open two files to understand why a method exists, the boundary is wrong.

**Before** — mixed concerns in one class:
```python
class DagOrchestrator:
    # State machine logic
    def _transition(self, node_id, new_status): ...
    def _main_loop(self): ...

    # Context building (separate concern)
    def _build_epic_context(self): ...
    def _build_signal_history(self): ...
    def _build_sd_fidelity_context(self): ...

    # Scoring (separate concern)
    def _load_score_history(self): ...
    def _detect_score_plateau(self): ...
```

**After** — each class has one reason to change:
```python
class DagOrchestrator:          # only: state transitions, dispatch
    def _transition(self, node_id, new_status): ...
    def _main_loop(self): ...

class ContextBuilder:          # only: assemble context dicts
    def build_epic(self, graph, node): ...
    def build_signal_history(self, signal_dir): ...

class ScoreTracker:            # only: score persistence and analysis
    def load(self, signal_dir): ...
    def detect_plateau(self, node_id): ...
```

## Principle 2: Known Patterns

Use patterns that engineers recognise without explanation.

**Handler Protocol + Registry** (a clean example of the pattern):
```python
class Handler(Protocol):
    async def execute(self, request: HandlerRequest) -> Outcome: ...

class HandlerRegistry:
    def dispatch(self, node: Node) -> Handler: ...
```

**Avoid** home-grown dispatch tables that aren't obviously a registry:
```python
# Bad — magic string → method dispatch hidden in __init__
HANDLER_MAP = {"codergen": "_handle_worker", "tool": "_handle_tool"}
method = getattr(self, HANDLER_MAP[handler_type])
```

## Principle 3: Simple Core

The state machine core should read like a description of the process:
```python
async def _main_loop(self):
    while not self._is_complete():
        dispatchable = self._find_dispatchable_nodes()
        for node in dispatchable:
            await self._dispatch(node)
        signals = await self._poll_signals()
        for signal in signals:
            self._apply(signal)
```

Each method called from the core loop should be a clear abstraction. The complexity lives in those abstracted methods, not in the loop itself.

## Principle 4: No Hidden Magic

**Hidden global** → constructor injection:
```python
# Bad
_ROOT: Path | None = None
def get_root():
    global _ROOT
    if _ROOT is None:
        _ROOT = _find()
    return _ROOT

# Good
@functools.lru_cache(maxsize=None)
def find_project_root() -> Path | None:
    for parent in Path(__file__).parents:
        if (parent / "src").is_dir() and (parent / "pyproject.toml").is_file():
            return parent
    return None
```

**Lazy import hidden inside method** → top-level import with explicit fallback:
```python
# Bad — reader can't see the dependency
def execute(self, request):
    import claude_code_sdk
    ...

# Good — dependency visible at module top
try:
    import claude_code_sdk
    _SDK_AVAILABLE = True
except ImportError:
    _SDK_AVAILABLE = False

def execute(self, request):
    if not _SDK_AVAILABLE:
        raise HandlerError("claude_code_sdk not installed")
    ...
```
