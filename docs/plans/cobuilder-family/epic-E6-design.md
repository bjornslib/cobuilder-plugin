# Epic Technical Solution Design: E6 — The reply channel

Feature: cobuilder-family
Epic ID: plugin-split/E6

This design was written on 2026-08-25, after this epic's three slices were
built and accepted. Gate 4b did not run before implementation, so this
document records the design as built. It did not constrain the work. The
rubrics for this epic in `.cobuilder/rubrics/cobuilder-family/` were
derived without a written 4b design in hand.

## Scope and Intent

E6 adds an append-only comment ledger and its projection, an anchor
computed from the live DOM so a reader can click any element and attach a
comment to it, a `POST /feedback` write endpoint, and a background wake
command an agent polls for new threads. ADR-0019 governs the ledger's
record shape.

## Files Touched

- `shared/ledger.py` — the whole ledger: append, fold, project, and the
  blocking watch function. 260-plus lines.
- `plugins/cobuilder-artifact/scripts/serve_bundle.py` — extends
  `http.server.SimpleHTTPRequestHandler` with a `POST /feedback` route,
  binds `127.0.0.1` only, and returns 403 when `--allow-write` is off.
- `plugins/cobuilder-full-lifecycle/scripts/watch_feedback.py` — the
  background wake command. This is a placement difference from
  `03-program-design.md`, which names `scripts/watch_feedback.py` under
  `cobuilder-artifact`. The shipped file lives under
  `cobuilder-full-lifecycle` instead.
- `plugins/cobuilder-artifact/viewer/index.html` — `computeSelector()`,
  `captureRange()`, and `openDrawer()`, the client side of the anchor and
  comment flow the program design's call stack section names.

## Types & Signatures

Read directly from `shared/ledger.py`:

```python
class LedgerPaths: ...

def append_line(path: Path, obj: dict[str, Any]) -> None: ...
def read_ledger(path: Path) -> list[dict[str, Any]]: ...
def fold_threads(lines: list[dict[str, Any]]) -> dict[str, dict[str, Any]]: ...
def project_threads(lines: list[dict[str, Any]]) -> dict[str, dict[str, Any]]: ...
def write_projection(path: Path, projection: dict[str, dict[str, Any]]) -> None: ...
def load_projection(path: Path) -> dict[str, dict[str, Any]]: ...

def append_comment(paths, anchor: str, text: str, author: str = "human") -> str: ...
def append_reply(paths, thread_ulid: str, text: str, author: str = "human",
                  replies_to: str | None = None) -> str: ...
def append_state(paths, thread_ulid: str, state: str) -> None: ...

def get_thread(paths: LedgerPaths, thread_ulid: str) -> dict[str, Any] | None: ...
def get_all_threads(paths: LedgerPaths) -> dict[str, dict[str, Any]]: ...
def rebuild_projection(paths: LedgerPaths) -> dict[str, dict[str, Any]]: ...

def watch_feedback(ledger_path: Path, since_offset: int = 0,
                    timeout_seconds: float = 30.0) -> tuple[list[dict[str, Any]], int]:
    """Block until new lines appear past since_offset. Returns
    (new_lines, new_offset). Times out with ([], since_offset) after
    timeout_seconds. The caller (watch_feedback.py) exits 2 on an empty
    result and 0 otherwise."""
```

`plugins/cobuilder-artifact/scripts/serve_bundle.py`:

```python
class FeedbackHandler(SimpleHTTPRequestHandler):
    ledger_paths: LedgerPaths | None = None
    allow_write: bool = False
    def do_POST(self) -> None: ...   # only /feedback; 403 when read-only,
                                       # 400 on missing anchor or text,
                                       # 201 with {"ulid": ..., "status": "appended"}

def serve_bundle(bundle_dir: Path, port: int = 0, allow_write: bool = False) -> int: ...
def main() -> None: ...
```

`plugins/cobuilder-full-lifecycle/scripts/watch_feedback.py`'s `main()`
calls `watch_feedback(paths.ledger, args.since, args.timeout)`, prints each
new line as one JSON object per line, and exits 0 or 2 depending on
whether any line came back.

## Slice Decomposition

Per `04-slices.md`:

1. **Slice 12 — the ledger and its projection.** No server involved.
   Append, fold, and project are file operations, tested without HTTP.
   Completed, score 0.92.
2. **Slice 13 — the anchor and the write endpoint.** Depends on slice 12's
   ledger existing for `serve_bundle.py` to append into. Click to anchor a
   sentence, `POST /feedback` appends, and the drawer keeps the text in
   view. Completed, score 1.00.
3. **Slice 14 — the wake command and the whole loop.** Depends on slices
   12 and 13. The background command blocks and returns new threads, and
   the loop runs once end to end. Completed, score 1.00.

## Test Plan

- `tests/test_ledger.py` — twelve tests: `test_append_comment_assigns_
  ulid_and_returns_it`, `test_append_thread_never_rewrites_an_existing_
  line`, `test_two_concurrent_appends_both_survive`, `test_state_change_
  is_a_new_line_not_an_edit`, `test_read_does_not_delete`, `test_thread_
  view_folds_a_reply_under_its_root`, `test_an_agent_reply_carries_author_
  agent_and_replies_to`, `test_projection_state_equals_the_last_
  transition_in_the_ledger`, `test_deleting_the_projection_rebuilds_it_
  from_the_ledger`, `test_projection_records_who_moved_the_state_and_
  when`, `test_get_thread_returns_none_for_missing`, and `test_
  projection_is_disposable_full_rebuild`.
- `tests/test_server_watch.py` — its tests are methods inside three
  classes, so a bare `def test` search at the start of a line misses them.
  Read in full, it carries `TestServer` (`test_post_feedback_appends_to_
  ledger`, `test_post_feedback_returns_403_when_read_only`, `test_post_
  feedback_rejects_other_paths`, `test_post_feedback_validates_required_
  fields`, `test_server_binds_loopback_only`), `TestWatchCommand`
  (`test_watch_exits_0_on_new_lines`, `test_watch_exits_2_on_timeout`,
  `test_watch_tracks_offset_per_reader`), and `TestEndToEndLoop`
  (`test_full_loop_comment_to_reply`, covering comment, wake, agent reply,
  state change, and the projection in one run). This covers every case
  `03-program-design.md`'s test plan names for the ledger's server and
  watch behavior.

## Risks & Open Questions

- **`test_full_loop_comment_to_reply` carries a self-correcting bug in its
  own body**, not in the code it tests: it first checks
  `hasattr(sys.modules[__name__], 'get_all_threads')`, which is always
  false because `get_all_threads` was never imported at module level, then
  falls through to a local `from ledger import get_all_threads` on the
  next line and proceeds correctly. The test passes, but the dead
  `hasattr` branch reads as leftover exploratory code that a review should
  clean up.
- **The wake command's placement under `cobuilder-full-lifecycle` rather
  than `cobuilder-artifact`** was not explained by any commit message or
  ADR this design reviewed. `cobuilder-artifact` owns `serve_bundle.py`,
  the other half of the same feature, so the two scripts a full loop needs
  now live in two different plugins.
- **`select.select()` on a plain file descriptor, inside `watch_feedback`,
  is a Linux-and-BSD idiom that does not reliably signal on every
  filesystem.** The function falls back to a 0.5-second poll when `select`
  raises `OSError`, so the polling path is exercised whenever the fast
  path is unavailable, but no test in the suite forces that fallback path
  specifically.
