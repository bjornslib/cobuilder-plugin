# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Start or reuse the View server for a hub on a fixed port.

View mode always uses port 62583, so a recorded review link stays valid
after a restart. `--port N` overrides the default.

- A server that serves this hub's `.cobuilder-architect/` already listens
  on the port: the script reuses it.
- An `http.server` or `serve_bundle.py` process that serves another
  directory holds the port: the script stops that process and starts this
  hub's server.
- Any other program holds the port: the script does not stop it. It
  prints the pid and the command on stderr and exits 2.

The script writes `.view-server.pid` and `.view-server.log` under
`<hub>/.cobuilder-architect/`, the same files that `review_link.py` reads.
"""
from __future__ import annotations

import argparse
import os
import re
import shlex
import signal
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_PORT = 62583


def listener_pid(port: int) -> int | None:
    out = subprocess.run(
        ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
        capture_output=True, text=True,
    ).stdout.split()
    return int(out[0]) if out else None


def command_of(pid: int) -> str:
    return subprocess.run(
        ["ps", "-o", "command=", "-p", str(pid)], capture_output=True, text=True
    ).stdout.strip()


def served_dir(pid: int, command: str) -> Path | None:
    try:
        args = shlex.split(command)
    except ValueError:
        args = command.split()
    for i, arg in enumerate(args):
        if arg in ("--directory", "-d") and i + 1 < len(args):
            return Path(args[i + 1]).resolve()
        if arg.startswith("--directory="):
            return Path(arg.split("=", 1)[1]).resolve()
    out = subprocess.run(
        ["lsof", "-a", "-p", str(pid), "-d", "cwd", "-Fn"],
        capture_output=True, text=True,
    ).stdout
    for line in out.splitlines():
        if line.startswith("n"):
            return Path(line[1:]).resolve()
    return None


def is_view_server(command: str) -> bool:
    return "http.server" in command or "serve_bundle.py" in command


def stop(pid: int, port: int) -> None:
    os.kill(pid, signal.SIGTERM)
    deadline = time.time() + 5
    while time.time() < deadline and listener_pid(port) == pid:
        time.sleep(0.1)
    if listener_pid(port) == pid:
        os.kill(pid, signal.SIGKILL)
        time.sleep(0.2)


def start(store: Path, port: int) -> int:
    pidfile = store / ".view-server.pid"
    logfile = store / ".view-server.log"
    with open(logfile, "w") as log:
        proc = subprocess.Popen(
            [sys.executable, "-u", "-m", "http.server", str(port),
             "--bind", "127.0.0.1", "--directory", str(store)],
            stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
            start_new_session=True,
        )
    pidfile.write_text(f"{proc.pid}\n")
    deadline = time.time() + 10
    while time.time() < deadline:
        if re.search(r"Serving HTTP.*port \d+", logfile.read_text()):
            return proc.pid
        if proc.poll() is not None:
            break
        time.sleep(0.1)
    print(f"error: the server did not start. Log:\n{logfile.read_text()}", file=sys.stderr)
    if proc.poll() is None:
        proc.kill()
    pidfile.unlink(missing_ok=True)
    sys.exit(1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--hub", required=True, help="the hub repo root")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()

    store = (Path(args.hub) / ".cobuilder-architect").resolve()
    if not store.is_dir():
        print(f"error: {store} does not exist.", file=sys.stderr)
        return 1
    port = args.port
    url = f"http://localhost:{port}/active/viewer/"

    pid = listener_pid(port)
    if pid is not None:
        command = command_of(pid)
        if not is_view_server(command):
            print(
                f"error: port {port} is held by pid {pid}, which is not a View server.\n"
                f"command: {command}\n"
                "The script does not stop it. Stop it yourself, or pass --port N.",
                file=sys.stderr,
            )
            return 2
        if served_dir(pid, command) == store:
            (store / ".view-server.pid").write_text(f"{pid}\n")
            logfile = store / ".view-server.log"
            if f"port {port}" not in (logfile.read_text() if logfile.is_file() else ""):
                logfile.write_text(f"Serving HTTP on 127.0.0.1 port {port} (reused pid {pid})\n")
            print(f"reused the running server, pid {pid}. Refresh the browser tab.")
            print(url)
            return 0
        print(f"stopping pid {pid}, which serves another directory: {command}")
        stop(pid, port)

    new_pid = start(store, port)
    print(f"started the server, pid {new_pid}.")
    print(url)
    return 0


if __name__ == "__main__":
    sys.exit(main())
