"""The replay: build each brief once, digest it, interpret it with each adapter, and run the drills."""
from __future__ import annotations

import json
import shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from priority import interpreter
from priority.brief import Abstain, StopBrief, build_brief
from priority.digest_store import digest_path, save_digest
from priority.replay import drills, gate, report
from priority.replay.store import FOLDERS, Measured, log, log_abstain, read_rows

REAL = "real"


def transcripts(root: Path) -> list[Path]:
    """Each `*.jsonl` file under the folder, at any depth, in path order."""
    return sorted(path for path in root.rglob("*.jsonl") if path.is_file())


def clean(out: Path, log_dir: Path, paths: list[Path]) -> None:
    """Remove what an earlier run left, so rows never add up. A digest file goes only for a session of this run."""
    for name in FOLDERS:
        shutil.rmtree(log_dir / name, ignore_errors=True)
    for path in paths:
        digest_path(log_dir, path.stem).unlink(missing_ok=True)
    for name in ("report.md", "results.jsonl"):
        (out / name).unlink(missing_ok=True)


def pooled(function, items: list, size: int) -> list:
    """The results of `function` for each item, in order, with at most `size` calls at the same time."""
    with ThreadPoolExecutor(max_workers=size) as pool:
        return list(pool.map(function, items))


def result_line(adapter: str, session: str, real: bool, outcome) -> dict:
    """One line of results.jsonl for a Prediction or for the Abstain of a brief."""
    if isinstance(outcome, Abstain):
        reason, detail, steps = outcome.reason, outcome.detail, 0
    else:
        abstain = outcome.abstain or {}
        reason, detail, steps = abstain.get("reason"), abstain.get("detail"), len(outcome.steps)
    return {"adapter": adapter, "session": session, "real": real, "abstain_reason": reason,
            "abstain_detail": (detail or reason) if reason else None, "steps": steps}


def digest_all(briefs: dict[Path, StopBrief], model, log_dir: Path, size: int) -> set[str]:
    """Run Digest once for each brief. Returns the sessions that have a stored digest."""
    def one(item: tuple[Path, StopBrief]):
        path, brief = item
        digest = interpreter.DigestRun(model, log_dir=log_dir / "digest")(brief)
        if isinstance(digest, interpreter.RunDigest):
            save_digest(log_dir, path.stem, digest)
            return path.stem
        return None
    return {stem for stem in pooled(one, list(briefs.items()), size) if stem}


def interpret_all(adapter: str, briefs: dict[Path, StopBrief], model, log_dir: Path, size: int) -> list:
    def one(item: tuple[Path, StopBrief]):
        path, brief = item
        return interpreter.Interpreter(model, log_dir=log_dir / adapter, session_id=path.stem, adapter=adapter,
                                       waits=())(brief_text=brief.for_model())  # the replay counts each fault
    return pooled(one, list(briefs.items()), size)


def run(root: Path, out: Path, log_dir: Path, adapters: tuple[str, ...], size: int, goal: Path) -> int:
    """The whole replay. Returns the exit code."""
    conditions = gate.read_conditions(goal)
    paths = transcripts(root)
    clean(out, log_dir, paths)
    out.mkdir(parents=True, exist_ok=True)
    digest_model, interpreter_model = interpreter.digest_lm(), interpreter.interpreter_lm()
    built = {path: build_brief(path, shrink_lm=digest_model, log_dir=log_dir / "digest") for path in paths}
    briefs = {path: found for path, found in built.items() if isinstance(found, StopBrief)}
    stored = digest_all(briefs, digest_model, log_dir, size)
    results = [result_line(name, path.stem, REAL in path.relative_to(root).parts[:-1], found)
               for name in adapters for path, found in built.items() if not isinstance(found, StopBrief)]
    for name in adapters:
        for path, outcome in zip(briefs, interpret_all(name, briefs, interpreter_model, log_dir, size)):
            results.append(result_line(name, path.stem, REAL in path.relative_to(root).parts[:-1], outcome))
    results.sort(key=lambda line: (adapters.index(line["adapter"]), line["session"]))
    for line in results:
        if line["abstain_reason"]:
            log_abstain(line["session"], line["abstain_reason"], line["abstain_detail"])
    first = next(iter(briefs), None)
    drilled = drills.run_drills(first.stem, briefs[first], log_dir) if first else {}
    measured = Measured(
        sessions=len(paths), adapters=adapters, concurrency=size, results=results,
        rows={**{name: read_rows(log_dir / name) for name in adapters}, "digest": read_rows(log_dir / "digest")},
        drills=drilled, conditions=conditions, stored=stored)
    (out / "results.jsonl").write_text("".join(json.dumps(line) + "\n" for line in results))
    (out / "report.md").write_text(report.build(measured))
    log.info("replayed %d sessions into %s", len(paths), out)
    return 0
