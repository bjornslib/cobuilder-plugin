"""Consumer locality from the import graph of the product files.

An added file gets an entry when locality_min_importers or more product files import it, and
all of them sit in one folder. That folder must be neither the folder of the file nor an
ancestor of it. The layer rule drops an entry when the consumer folder imports layer_limit or
more files of the folder of the file. An entry is evidence for the cohesion judgment, and it
never makes a finding. E6 reuses this module for the whole repository.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from .boundary import scan_file
from .config import Config
from .names import folder_of

Graph = dict[str, set[str]]


def import_graph(root: Path, files: list[str]) -> tuple[Graph, list[str]]:
    """Return the repo files that each file imports, and one line for each file that fails.

    The root is the repo top folder. The reader of boundary.py finds the imports. It gives
    a problem line for each file that it cannot read or parse.
    """
    graph: Graph = {}
    notes: list[str] = []
    for rel in files:
        scan = scan_file(rel, root, ())
        graph[rel] = {ref.target for ref in scan.references if ref.kind == "import"}
        if scan.problem is not None:
            notes.append(scan.problem)
    return graph, notes


def consumer_locality(
    graph: Graph, targets: list[str], config: Config | None = None
) -> list[dict[str, Any]]:
    """Return one entry for each target that the rules keep, sorted by path.

    Without a config, the default limits apply.
    """
    limits = config or Config()
    importers = _importers(graph)
    entries = [
        _entry(rel, graph, importers.get(rel, set()), limits) for rel in sorted(targets)
    ]
    return [entry for entry in entries if entry is not None]


def _importers(graph: Graph) -> dict[str, set[str]]:
    """Return the files that import each target of the graph."""
    found: dict[str, set[str]] = {}
    for source, targets in graph.items():
        for target in targets:
            found.setdefault(target, set()).add(source)
    return found


def _entry(rel: str, graph: Graph, sources: set[str], config: Config) -> dict[str, Any] | None:
    """Return the locality entry of one file, or None when a rule drops it."""
    if len(sources) < config.locality_min_importers:
        return None
    folders = {folder_of(source) for source in sources}
    if len(folders) != 1:
        return None
    consumer = folders.pop()
    own = folder_of(rel)
    if _is_ancestor(consumer, own):
        return None
    if _layer_count(graph, consumer, own) >= config.layer_limit:
        return None
    return {
        "path": rel,
        "importers_by_folder": {consumer: len(sources)},
        "sole_consumer_folder": consumer,
    }


def _is_ancestor(folder: str, of: str) -> bool:
    """Return True when folder equals of, or is one of its ancestors. The root folder is '.'."""
    return folder in (".", of) or of.startswith(folder + "/")


def _layer_count(graph: Graph, consumer: str, own: str) -> int:
    """Return how many files of the own folder the consumer folder imports."""
    imported: set[str] = set()
    for source, targets in graph.items():
        if folder_of(source) == consumer:
            imported.update(target for target in targets if folder_of(target) == own)
    return len(imported)
