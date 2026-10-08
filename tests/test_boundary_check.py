"""boundary_check.py, the verified_at field, and the boundary.stale warning.

Run with: uv run pytest tests/test_boundary_check.py -q
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT = REPO_ROOT / "shared" / "boundary_check.py"
VERIFY = REPO_ROOT / "shared" / "verify_bundle.py"
REFS = REPO_ROOT / "plugins/architect/skills/architecture/references"


def git(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
        cwd=repo, check=True, capture_output=True, text=True,
    ).stdout.strip()


def commit(repo: Path, rel: str, text: str = "x") -> str:
    f = repo / rel
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(text + str(len(list(repo.rglob("*")))))
    git(repo, "add", "-A")
    git(repo, "commit", "-m", f"change {rel}")
    return git(repo, "rev-parse", "HEAD")


def make_repo(tmp_path: Path, verified_at: str | None = "HEAD") -> Path:
    """Repo with context `alpha` at path src/alpha, verified at HEAD by default."""
    repo = tmp_path / "repo"
    repo.mkdir()
    git(repo, "init", "-q")
    commit(repo, "src/alpha/a.py")
    lines = ["id: alpha", "path: src/alpha", 'name: "Alpha"']
    if verified_at is not None:
        sha = git(repo, "rev-parse", "HEAD") if verified_at == "HEAD" else verified_at
        lines.append(f"verified_at: {sha}")
    ctx = repo / "docs/architecture/contexts/alpha"
    ctx.mkdir(parents=True)
    (ctx / "boundary.yaml").write_text("\n".join(lines) + "\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-m", "boundary")
    return repo


def run(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--repo", str(repo), *args],
        capture_output=True, text=True,
    )


def test_current_context_is_ok(tmp_path):
    repo = make_repo(tmp_path)
    r = run(repo)
    assert r.returncode == 0, r.stderr
    assert "ok" in r.stdout and "stale" not in r.stdout


def test_later_commit_under_path_is_stale(tmp_path):
    repo = make_repo(tmp_path)
    commit(repo, "src/alpha/b.py")
    r = run(repo)
    assert "stale" in r.stdout


def test_commit_outside_path_stays_ok(tmp_path):
    repo = make_repo(tmp_path)
    commit(repo, "src/other/c.py")
    r = run(repo)
    assert "stale" not in r.stdout and "ok" in r.stdout


def test_missing_verified_at_is_stale(tmp_path):
    repo = make_repo(tmp_path, verified_at=None)
    r = run(repo)
    assert "stale" in r.stdout, r.stderr


def test_empty_verified_at_is_stale(tmp_path):
    repo = make_repo(tmp_path, verified_at="''")
    r = run(repo)
    assert "stale" in r.stdout, r.stderr


def test_unknown_sha_is_stale_and_does_not_crash(tmp_path):
    repo = make_repo(tmp_path, verified_at="deadbeef" * 5)
    r = run(repo)
    assert "Traceback" not in r.stderr
    assert "stale" in r.stdout


def test_uncovered_path_listed(tmp_path):
    repo = make_repo(tmp_path)
    r = run(repo, "--paths", "src/unknown/z.py")
    assert "uncovered" in r.stdout
    assert "src/unknown/z.py" in r.stdout


def test_ignored_paths_are_not_uncovered(tmp_path):
    repo = make_repo(tmp_path)
    ignored = ["docs/x.md", "tests/t.py", ".cobuilder/r.md", ".cobuilder-architect/s.json"]
    r = run(repo, "--paths", *ignored, "--require")
    assert r.returncode == 0, r.stdout
    for p in ignored:
        assert p not in r.stdout


def test_paths_lists_touched_contexts_only(tmp_path):
    repo = make_repo(tmp_path)
    r = run(repo, "--paths", "src/alpha/a.py")
    assert "alpha" in r.stdout
    assert "src/alpha/a.py" not in json.dumps(
        json.loads(r.stdout).get("uncovered", [])
    ) if r.stdout.strip().startswith("{") else True
    assert "uncovered" in r.stdout or "alpha" in r.stdout  # prints a report
    assert r.returncode == 0


def test_require_exits_1_on_stale_and_default_exits_0(tmp_path):
    repo = make_repo(tmp_path)
    commit(repo, "src/alpha/b.py")
    assert run(repo).returncode == 0
    assert run(repo, "--require").returncode == 1


def test_require_exits_1_on_uncovered(tmp_path):
    repo = make_repo(tmp_path)
    assert run(repo, "--paths", "src/unknown/z.py").returncode == 0
    assert run(repo, "--paths", "src/unknown/z.py", "--require").returncode == 1


def test_require_exits_0_when_all_ok(tmp_path):
    repo = make_repo(tmp_path)
    assert run(repo, "--require").returncode == 0


def test_template_has_verified_at():
    text = (REFS / "templates/boundary-template.yaml").read_text()
    assert "verified_at" in text


def test_procedure_stamps_verified_at_with_rev_parse():
    text = (REFS / "architecture-documentation.md").read_text()
    assert "verified_at" in text
    assert "git rev-parse HEAD" in text


def test_verify_bundle_warns_boundary_stale_without_failing_key(tmp_path):
    repo = make_repo(tmp_path)
    commit(repo, "src/alpha/b.py")
    bundle = repo / ".cobuilder-architect" / "self"
    bundle.mkdir(parents=True)
    r = subprocess.run(
        [sys.executable, str(VERIFY), "--bundle-dir", str(bundle), "--json"],
        capture_output=True, text=True,
    )
    data = json.loads(r.stdout)
    base = data["baseline"]
    assert "boundary.stale" in base
    assert base["boundary.stale"] != "ok"
    assert "boundary.stale" in base["_optional"]


def test_verify_bundle_no_boundary_stale_when_current(tmp_path):
    repo = make_repo(tmp_path)
    bundle = repo / ".cobuilder-architect" / "self"
    bundle.mkdir(parents=True)
    r = subprocess.run(
        [sys.executable, str(VERIFY), "--bundle-dir", str(bundle), "--json"],
        capture_output=True, text=True,
    )
    base = json.loads(r.stdout)["baseline"]
    assert base.get("boundary.stale", "ok") == "ok"
    assert "boundary.stale" in base


def add_beta(repo: Path, stale: bool) -> None:
    """Add context `beta` at src/beta. Stale means no verified_at."""
    commit(repo, "src/beta/b.py")
    lines = ["id: beta", "path: src/beta", 'name: "Beta"']
    if not stale:
        lines.append(f"verified_at: {git(repo, 'rev-parse', 'HEAD')}")
    ctx = repo / "docs/architecture/contexts/beta"
    ctx.mkdir(parents=True)
    (ctx / "boundary.yaml").write_text("\n".join(lines) + "\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-m", "beta boundary")


def test_paths_output_names_only_touched_contexts(tmp_path):
    repo = make_repo(tmp_path)
    add_beta(repo, stale=False)
    both = run(repo)
    assert "alpha" in both.stdout and "beta" in both.stdout
    r = run(repo, "--paths", "src/alpha/x.py")
    assert "alpha" in r.stdout
    assert "beta" not in r.stdout


def test_require_with_paths_considers_only_touched_contexts(tmp_path):
    repo = make_repo(tmp_path)
    add_beta(repo, stale=True)
    assert run(repo, "--paths", "src/alpha/x.py", "--require").returncode == 0
    assert run(repo, "--paths", "src/beta/x.py", "--require").returncode == 1


def test_require_without_paths_considers_every_context(tmp_path):
    repo = make_repo(tmp_path)
    add_beta(repo, stale=True)
    assert run(repo, "--require").returncode == 1


def make_root_repo(tmp_path: Path, path_value: str = ".") -> Path:
    """Repo with one context `root` whose boundary path is the repo root.

    The sha is stamped after the boundary commit and left uncommitted, so
    no commit follows verified_at.
    """
    repo = tmp_path / "rootrepo"
    repo.mkdir()
    git(repo, "init", "-q")
    commit(repo, "src/anything.py")
    ctx = repo / "docs/architecture/contexts/root"
    ctx.mkdir(parents=True)
    boundary = ctx / "boundary.yaml"
    boundary.write_text(f'id: root\npath: {path_value}\nname: "Root"\n')
    git(repo, "add", "-A")
    git(repo, "commit", "-m", "boundary")
    boundary.write_text(
        f'id: root\npath: {path_value}\nname: "Root"\n'
        f"verified_at: {git(repo, 'rev-parse', 'HEAD')}\n"
    )
    return repo


def test_root_path_covers_any_path(tmp_path):
    repo = make_root_repo(tmp_path)
    r = run(repo, "--paths", "src/anything.py")
    assert "root" in r.stdout
    assert "uncovered" not in r.stdout
    assert run(repo, "--paths", "src/anything.py", "--require").returncode == 0


def test_root_path_still_ignores_docs(tmp_path):
    repo = make_root_repo(tmp_path)
    r = run(repo, "--paths", "docs/x.md", "--require")
    assert r.returncode == 0, r.stdout
    assert "docs/x.md" not in r.stdout


def test_root_path_stale_after_commit_anywhere(tmp_path):
    repo = make_root_repo(tmp_path)
    commit(repo, "src/elsewhere/q.py")
    r = run(repo, "--paths", "src/anything.py")
    assert "root: stale" in r.stdout
    assert run(repo, "--paths", "src/anything.py", "--require").returncode == 1


def test_dot_slash_path_behaves_like_dot(tmp_path):
    repo = make_root_repo(tmp_path, "./")
    r = run(repo, "--paths", "src/anything.py")
    assert "root: ok" in r.stdout
    assert "uncovered" not in r.stdout
    commit(repo, "src/elsewhere/q.py")
    assert "root: stale" in run(repo, "--paths", "src/anything.py").stdout


REC = "docs/architecture/contexts/root"


def commit_many(repo: Path, rels: list[str]) -> None:
    for rel in rels:
        f = repo / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        old = f.read_text() if f.exists() else ""
        f.write_text(old + "# " + str(len(list(repo.rglob("*")))) + "\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-m", "multi")


def test_root_record_only_commit_stays_ok(tmp_path):
    repo = make_root_repo(tmp_path)
    commit_many(repo, [f"{REC}/boundary.yaml", f"{REC}/canvas.md"])
    assert "root: ok" in run(repo, "--paths", "src/anything.py").stdout


def test_root_source_commit_after_record_is_stale(tmp_path):
    repo = make_root_repo(tmp_path)
    commit(repo, f"{REC}/canvas.md")
    commit(repo, "src/x.py")
    assert "root: stale" in run(repo, "--paths", "src/anything.py").stdout


def test_root_mixed_record_and_source_commit_is_stale(tmp_path):
    repo = make_root_repo(tmp_path)
    commit_many(repo, [f"{REC}/boundary.yaml", "src/x.py"])
    assert "root: stale" in run(repo, "--paths", "src/anything.py").stdout


def test_non_root_record_only_commit_stays_ok(tmp_path):
    repo = make_repo(tmp_path)
    commit(repo, "docs/architecture/contexts/alpha/canvas.md")
    assert "alpha: ok" in run(repo, "--paths", "src/alpha/x.py").stdout


def test_non_root_path_commit_after_record_is_stale(tmp_path):
    repo = make_repo(tmp_path)
    commit(repo, "docs/architecture/contexts/alpha/canvas.md")
    commit(repo, "src/alpha/b.py")
    assert "alpha: stale" in run(repo, "--paths", "src/alpha/x.py").stdout


def test_root_non_source_files_are_not_uncovered(tmp_path):
    repo = make_repo(tmp_path)
    paths = ["README.md", "CLAUDE.md", "pyproject.toml", ".habit-hooks/config.toml", "scripts/x.sh"]
    r = run(repo, "--paths", *paths, "--require")
    assert "uncovered" not in r.stdout, r.stdout
    assert r.returncode == 0, r.stdout


def test_source_paths_outside_contexts_stay_uncovered(tmp_path):
    repo = make_repo(tmp_path)
    r = run(repo, "--paths", "plugins/x/y.py", "shared/z.py", "--require")
    assert "uncovered: plugins/x/y.py" in r.stdout
    assert "uncovered: shared/z.py" in r.stdout
    assert r.returncode == 1
