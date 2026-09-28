#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Print a checked viewer link to one page of the running View server.

The script reads the View server's pid and log files under
<hub>/.cobuilder-architect/. It checks that the server process is live,
that the work id in the route is in the active bundle's index, and that the
viewer page answers with HTTP 200. Then it prints one line, the link.

On any failure it prints the reason on stderr, prints nothing on stdout,
and exits 1. It never prints a link that it did not check.

Usage:
    uv run review_link.py --hub <path> --route '#/<work>/<rest>'
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HOST = "127.0.0.1"


class LinkError(Exception):
    """A check failed. The message tells the user why."""


def read_pid(store: Path) -> int:
    pid_file = store / ".view-server.pid"
    if not pid_file.is_file():
        raise LinkError(f"no View server: {pid_file} does not exist. Run /artifact:view first.")
    text = pid_file.read_text().strip()
    if not text.isdigit():
        raise LinkError(f"the pid file {pid_file} does not hold a process id.")
    return int(text)


def check_live_server(pid: int) -> None:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        raise LinkError(f"the View server (pid {pid}) is not running. Run /artifact:view again.")
    except PermissionError:
        pass
    result = subprocess.run(
        ["ps", "-p", str(pid), "-o", "command="], capture_output=True, text=True
    )
    command = result.stdout.strip()
    if result.returncode != 0 or not command:
        raise LinkError(f"the View server (pid {pid}) is not running. Run /artifact:view again.")
    if "http.server" not in command and "serve_bundle" not in command:
        raise LinkError(f"pid {pid} is not a View server. It runs: {command}")


def read_port(store: Path) -> int:
    log_file = store / ".view-server.log"
    if not log_file.is_file():
        raise LinkError(f"the log file {log_file} does not exist.")
    ports = re.findall(r"port (\d+)", log_file.read_text())
    if not ports:
        raise LinkError(f"the log file {log_file} names no port.")
    return int(ports[-1])


def work_id_of(route: str) -> str:
    match = re.fullmatch(r"#/([^/]+)(/.*)?", route)
    if not match:
        raise LinkError(f"the route {route!r} does not have the form '#/<work>/<rest>'.")
    return match.group(1)


def check_work_id(store: Path, work: str) -> None:
    index_file = store / "active" / "data" / "index.json"
    if not index_file.is_file():
        raise LinkError(f"the index {index_file} does not exist.")
    try:
        index = json.loads(index_file.read_text())
    except json.JSONDecodeError as exc:
        raise LinkError(f"the index {index_file} is not valid JSON: {exc}")
    ids = set()
    for rows in (index.get("entities") or {}).values():
        if isinstance(rows, list):
            ids.update(str(row.get("id")) for row in rows if isinstance(row, dict))
    if work not in ids:
        raise LinkError(f"the work id {work!r} is not in {index_file}.")


def check_page(url: str) -> None:
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            status = response.status
    except urllib.error.HTTPError as exc:
        status = exc.code
    except (urllib.error.URLError, OSError) as exc:
        raise LinkError(f"the View server did not answer at {url}: {exc}")
    if status != 200:
        raise LinkError(f"the View server answered {status} for {url}.")


def build_link(hub: Path, route: str) -> str:
    store = hub / ".cobuilder-architect"
    work = work_id_of(route)
    check_live_server(read_pid(store))
    port = read_port(store)
    check_work_id(store, work)
    page = f"http://{HOST}:{port}/active/viewer/index.html"
    check_page(page)
    return page + route


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--hub", required=True, type=Path, help="the hub repo root")
    parser.add_argument("--route", required=True, help="the viewer route, '#/<work>/<rest>'")
    args = parser.parse_args()
    try:
        link = build_link(args.hub.resolve(), args.route)
    except LinkError as exc:
        print(f"review_link: {exc}", file=sys.stderr)
        return 1
    print(link)
    return 0


if __name__ == "__main__":
    sys.exit(main())
