"""The excluding-ambiguous mean must drop the ambiguous stop.

Slice 16 attempt 2 printed the including mean twice: holdout repeat 1 gave
0.609 for both lines while the ambiguous stop scored 0.920 and the other 14
stops averaged 0.587. This test makes the ambiguous stop the outlier and
checks both lines against the per-stop scores.
"""
from __future__ import annotations

import contextlib
import io
import json
import re
import shutil

from eval_support import StubInterpreter, make_prediction
from fixtures_support import make_label, require
from probe_support import FIXTURES


def test_excluding_ambiguous_drops_the_ambiguous_stop(monkeypatch, tmp_path):
    require("priority.evaluation.metric")
    require("priority.evaluation.split")
    interpreter = require("priority.interpreter")
    config = require("priority.config")
    from priority.evaluation.split import split
    full_ids = [f"madeup{i:02d}-1111-2222-3333-444444444444" for i in range(10)]
    manifest = [{"session": fid, "stops": [1]} for fid in full_ids]
    labels = {"sessions": {
        fid[:8]: {"stops": {"001": make_label(1, confirmed_by="engineer",
                                              confirmed_on="2026-10-26", payloads=[])}}
        for fid in full_ids}}
    # The target stop is the outlier: it abstains, so it scores 0 while the
    # rest score 1, and it is the only ambiguous one. It must sit in the
    # train split, so compute the split first.
    wanted_first = sorted(set(split(full_ids)["train"]))[0]
    labels["sessions"][wanted_first[:8]]["stops"]["001"]["ambiguous"] = True
    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels.json"
    manifest_path.write_text(json.dumps(manifest) + "\n")
    labels_path.write_text(json.dumps(labels) + "\n")
    for fid in full_ids:
        shutil.copy(FIXTURES / "waiting-question.jsonl", tmp_path / f"{fid}.jsonl")
    wanted = set(split(full_ids)["train"])
    assert len(wanted) >= 2
    target = wanted_first
    predictions = []
    for fid in full_ids:
        if fid not in wanted:
            continue
        label = labels["sessions"][fid[:8]]["stops"]["001"]
        if fid == target:
            predictions.append(make_prediction(label, abstain={
                "reason": "invalid_output", "detail": "made-up fault", "raw": "made-up reply"}))
        else:
            predictions.append(make_prediction(label))
    monkeypatch.setattr(config, "load_key",
                        lambda *_a, **_k: (_ for _ in ()).throw(
                            AssertionError("a test reached for the real key")))
    monkeypatch.setattr(interpreter, "Interpreter",
                        lambda *_a, **_k: StubInterpreter(predictions))
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", "train",
                     "--manifest", str(manifest_path),
                     "--labels", str(labels_path),
                     "--real-dir", str(tmp_path)])
    printed = out.getvalue()
    assert code == 0, printed
    including = float(re.search(r"overall including ambiguous: ([\d.]+)", printed).group(1))
    excluding = float(re.search(r"overall excluding ambiguous: ([\d.]+)", printed).group(1))
    scores = [(m.group(1), int(m.group(2)), float(m.group(3)))
              for m in re.finditer(r"stop (\S+) 0*(\d+): ([\d.]+)", printed)]
    assert len(scores) == len(wanted), printed
    rest = [s for sid, n, s in scores if (sid, n) != (target, 1)]
    assert abs(including - excluding) > 0.0005
    assert abs(excluding - sum(rest) / len(rest)) < 0.001
