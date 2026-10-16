#!/usr/bin/env python3
"""Threaded HTTP Maven proxy — urllib fetches upstream (Gradle TLS is broken)."""
from __future__ import annotations

import http.server
import socketserver
import threading
import time
import urllib.request
from pathlib import Path

PORT = 8765
UPSTREAMS = [
    "https://dl.google.com/dl/android/maven2",
    "https://maven.google.com",
    "https://plugins.gradle.org/m2",
    "https://repo1.maven.org/maven2",
    "https://maven-central.storage-download.googleapis.com/maven2",
    "https://repo.maven.apache.org/maven2",
]
CACHE = Path.home() / ".cache" / "local-maven-proxy"
CACHE.mkdir(parents=True, exist_ok=True)
_path_locks: dict[str, threading.Lock] = {}
_path_locks_guard = threading.Lock()
_opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler())


def path_lock(path: str) -> threading.Lock:
    with _path_locks_guard:
        lock = _path_locks.get(path)
        if lock is None:
            lock = threading.Lock()
            _path_locks[path] = lock
        return lock


def fetch(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "local-maven-proxy/1.0"},
        method="GET",
    )
    with _opener.open(req, timeout=120) as resp:
        data = resp.read()
        if not data and resp.status != 200:
            raise RuntimeError(f"empty {url}")
        return data


def resolve(path: str) -> bytes:
    cache_file = CACHE / path
    if cache_file.exists() and cache_file.stat().st_size > 0:
        return cache_file.read_bytes()

    with path_lock(path):
        if cache_file.exists() and cache_file.stat().st_size > 0:
            return cache_file.read_bytes()
        last_err: Exception | None = None
        for base in UPSTREAMS:
            url = f"{base.rstrip('/')}/{path}"
            for attempt in range(3):
                try:
                    data = fetch(url)
                    if data is not None and len(data) > 0:
                        cache_file.parent.mkdir(parents=True, exist_ok=True)
                        tmp = cache_file.with_suffix(cache_file.suffix + ".tmp")
                        tmp.write_bytes(data)
                        tmp.replace(cache_file)
                        return data
                except Exception as e:  # noqa: BLE001
                    last_err = e
                    time.sleep(0.2 * (attempt + 1))
        raise FileNotFoundError(str(last_err or path))


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[maven-proxy] {args[0]}", flush=True)

    def do_GET(self) -> None:
        self._serve(head=False)

    def do_HEAD(self) -> None:
        self._serve(head=True)

    def _serve(self, head: bool) -> None:
        path = self.path.split("?", 1)[0]
        if path.startswith("/"):
            path = path[1:]
        for prefix in ("maven2/", "dl/android/maven2/", "m2/"):
            if path.startswith(prefix):
                path = path[len(prefix) :]
                break
        try:
            data = resolve(path)
        except Exception as e:  # noqa: BLE001
            msg = str(e)[:200]
            print(f"[maven-proxy] 404 {path} :: {msg}", flush=True)
            self.send_error(404, msg)
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if not head:
            self.wfile.write(data)


class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with ThreadingTCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"local maven proxy on http://127.0.0.1:{PORT}/", flush=True)
        httpd.serve_forever()
