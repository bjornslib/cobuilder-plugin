"""A manifest with full session ids must match labels keyed by short prefix.

The real set keys the manifest by full id (`46ffdc01-3599-...`) and the
labels by 8-char prefix (`46ffdc01`). Slice 16 attempt 1 failed on exactly
this shape, because the made-up worlds used matching ids on both sides.
"""
from __future__ import annotations

import contextlib
import io
import json
import shutil

from eval_support import StubInterpreter, make_prediction
from fixtures_support import make_label, require
from probe_support import FIXTURES


def test_full_manifest_ids_match_short_prefix_labels_keys(monkeypatch, capsys, tmp_path):
    require("priority.evaluation.metric")
    interpreter = require("priority.interpreter")
    config = require("priority.config")
    full_ids = [f"madeup{i:02d}-1111-2222-3333-444444444444" for i in range(4)]
    manifest = [{"session": fid, "stops": [1]} for fid in full_ids]
    labels = {"sessions": {
        fid[:8]: {"stops": {"001": make_label(1, confirmed_by="engineer",
                                              confirmed_on="2026-10-26", payloads=[])}}
        for fid in full_ids}}
    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels.json"
    manifest_path.write_text(json.dumps(manifest) + "\n")
    labels_path.write_text(json.dumps(labels) + "\n")
    for fid in full_ids:
        shutil.copy(FIXTURES / "waiting-question.jsonl", tmp_path / f"{fid}.jsonl")
    predictions = [make_prediction(labels["sessions"][fid[:8]]["stops"]["001"], quotes=[],
                                   payloads=[])
                   for fid in full_ids]
    monkeypatch.setattr(config, "load_key",
                        lambda *a, **k: (_ for _ in ()).throw(
                            AssertionError("a test reached for the real key")))
    monkeypatch.setattr(interpreter, "Interpreter",
                        lambda *a, **k: StubInterpreter(predictions))
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit):
        with contextlib.redirect_stdout(out):
            code = main(["eval", "--split", "train",
                         "--manifest", str(manifest_path),
                         "--labels", str(labels_path),
                         "--real-dir", str(tmp_path)])
    assert code == 0, out.getvalue()
