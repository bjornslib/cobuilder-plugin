#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["ulid-py>=1.0"]
# ///
"""Serve a cobuilder-architect bundle with a feedback endpoint.

Extends python's http.server to handle POST /feedback which appends to
the feedback ledger. Binds to loopback only (127.0.0.1).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))
from ledger import LedgerPaths, append_comment  # noqa: E402


class FeedbackHandler(SimpleHTTPRequestHandler):
    """HTTP request handler with /feedback POST endpoint."""

    ledger_paths: LedgerPaths | None = None
    allow_write: bool = False

    def do_POST(self):
        if self.path != "/feedback":
            self.send_error(404, "Not found")
            return

        if not self.allow_write:
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Writes disabled. Server is read-only."}).encode())
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Invalid JSON: {e}"}).encode())
            return

        # Validate required fields
        anchor = payload.get("anchor")
        text = payload.get("text")
        if not anchor or not text:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing anchor or text"}).encode())
            return

        try:
            ulid_val = append_comment(
                self.ledger_paths,
                anchor=anchor,
                text=text,
                author=payload.get("author", "human"),
            )
            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ulid": ulid_val, "status": "appended"}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, format, *args):
        # Suppress default log messages
        pass


def serve_bundle(
    bundle_dir: Path,
    port: int = 0,
    allow_write: bool = False,
) -> int:
    """Serve the bundle directory on the given port.

    Returns the actual port number the server bound to.
    """
    os.chdir(bundle_dir)

    handler = FeedbackHandler
    handler.ledger_paths = LedgerPaths(bundle_dir)
    handler.allow_write = allow_write

    server = HTTPServer(("127.0.0.1", port), handler)
    actual_port = server.server_address[1]

    print(f"Serving {bundle_dir} on http://127.0.0.1:{actual_port}")
    if allow_write:
        print("  POST /feedback ENABLED (writes to feedback-ledger.jsonl)")
    else:
        print("  Read-only mode (POST /feedback returns 403)")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.server_close()

    return actual_port


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bundle-dir", required=True, help="Bundle directory to serve")
    parser.add_argument("--port", type=int, default=0, help="Port to bind (0 = OS assigned)")
    parser.add_argument("--allow-write", action="store_true", help="Enable POST /feedback endpoint")
    args = parser.parse_args()

    bundle_dir = Path(args.bundle_dir).resolve()
    if not bundle_dir.exists():
        print(f"error: {bundle_dir} does not exist", file=sys.stderr)
        sys.exit(1)

    serve_bundle(bundle_dir, args.port, args.allow_write)


if __name__ == "__main__":
    main()