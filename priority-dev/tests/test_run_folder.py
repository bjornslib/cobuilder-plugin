"""A run that stops on a compile fault saves nothing, and a late row from a call still in flight writes nothing."""
from __future__ import annotations

from eval_support import write_eval_world
from optimise_support import block_live_calls, install_stub_teleprompters, require

optimise = require("priority.optimise")


def test_a_compile_fault_discards_the_run_folder(monkeypatch, tmp_path):
    manifest, labels, real_dir, _ = write_eval_world(tmp_path)
    install_stub_teleprompters(monkeypatch)
    block_live_calls(monkeypatch)
    folders = []

    def broken_compile(cls, settings, student, examples, train):
        folders.append(settings.log_dir)
        raise RuntimeError("made-up compile fault")

    monkeypatch.setattr(optimise, "_compile", broken_compile)
    monkeypatch.chdir(tmp_path)
    code = optimise.run(manifest, labels, real_dir, "gepa", 1, 7)
    folders[0].append("calls.jsonl", "a row from a call still in flight\n")
    assert code == 1
    assert not (tmp_path / "probes").exists(), "a late row from a call in flight wrote a run folder"
