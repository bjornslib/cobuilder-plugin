"""generate_prompts.py must produce WebP scene art, not PNG.

Run with: uv run --with pytest pytest tests/test_generate_prompts_webp.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "plugins" / "cobuilder-pr" / "scripts"
SHARED_DIR = REPO_ROOT / "shared"


def _load_generate_prompts():
    for p in (SCRIPTS_DIR, SHARED_DIR):
        if str(p) not in sys.path:
            sys.path.insert(0, str(p))
    import generate_prompts
    return generate_prompts


def test_build_prompts_output_path_is_webp():
    gp = _load_generate_prompts()
    story = {
        "meta": {"levels": ["PR Landscape", "Problem & Solution", "Architecture", "File Changes"]},
        "world": {"districts": []},
        "timeline": [{"pr": 42, "levels": {}, "touched": {}, "size": {"files": 1}}],
    }
    prompts = gp.build_prompts(story, prs_filter=None, levels_filter=[1, 2, 3])
    output_paths = [p["output_path"] for p in prompts]
    assert output_paths == [
        "assets/pr-42/level-1.webp",
        "assets/pr-42/level-2.webp",
        "assets/pr-42/level-3.webp",
    ]
    assert not any(p.endswith(".png") for p in output_paths)


def test_call_gemini_saves_webp_quality_90(monkeypatch):
    gp = _load_generate_prompts()

    class FakePart:
        def __init__(self, text=None, inline_data=None):
            self.text = text
            self.inline_data = inline_data

    class FakeInlineData:
        def __init__(self, data):
            self.data = data

    class FakeResponse:
        def __init__(self, parts):
            self.parts = parts

    from PIL import Image
    from io import BytesIO

    src = Image.new("RGB", (4, 4), (10, 20, 30))
    buf = BytesIO()
    src.save(buf, "PNG")

    class FakeModels:
        def generate_content(self, model, contents, config):
            return FakeResponse([
                FakePart(inline_data=FakeInlineData(buf.getvalue())),
                FakePart(text="a description"),
            ])

    class FakeClient:
        models = FakeModels()

    saved_kwargs = {}
    real_save = Image.Image.save

    def spy_save(self, fp, format=None, **kwargs):
        if format == "WEBP":
            saved_kwargs["format"] = format
            saved_kwargs["quality"] = kwargs.get("quality")
        return real_save(self, fp, format=format, **kwargs)

    monkeypatch.setattr(Image.Image, "save", spy_save)

    image_bytes, text = gp.call_gemini("a prompt", "fake-model", FakeClient())

    assert saved_kwargs.get("format") == "WEBP"
    assert saved_kwargs.get("quality") == 90
    assert text == "a description"

    out = Image.open(BytesIO(image_bytes))
    assert out.format == "WEBP"
