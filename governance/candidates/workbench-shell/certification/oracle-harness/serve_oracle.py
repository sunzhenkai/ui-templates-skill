#!/usr/bin/env python3
"""Serve the pinned upstream web app with a deterministic test API and seed routes.

This is a deployment harness for Template Certification only. It never changes
the pinned checkout; it injects the minimum browser state needed to render the
real shell with deterministic data.
"""
from __future__ import annotations

import json
import os
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


CHECKOUT = Path(os.environ.get("ORACLE_CHECKOUT", Path.cwd())).resolve()
NEXT_PORT = 3000
WRAPPER_PORT = 3100
API_PORT = 18080


def _json_response(handler: BaseHTTPRequestHandler, payload, status: int = 200) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    origin = handler.headers.get("Origin")
    if origin:
        handler.send_header("Access-Control-Allow-Origin", origin)
        handler.send_header("Access-Control-Allow-Credentials", "true")
        handler.send_header("Vary", "Origin")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class MockApiHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/config":
            return _json_response(self, {"allow_signup": True, "feature_flags": {}})
        if path == "/api/me":
            return _json_response(self, {
                "id": "user-1", "name": "Demo User", "email": "demo@example.com",
                "avatar_url": None, "onboarded_at": "2026-01-01T00:00:00Z",
                "onboarding_questionnaire": {}, "starter_content_state": "imported",
                "language": "en", "profile_description": "", "timezone": "UTC",
                "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
            })
        if path == "/api/workspaces":
            return _json_response(self, [{
                "id": "ws-1", "name": "Demo Workspace", "slug": "demo",
                "description": None, "context": None, "settings": {}, "repos": [],
                "issue_prefix": "DEMO", "avatar_url": None,
                "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
            }])
        if path == "/api/workspaces/ws-1":
            return _json_response(self, {
                "id": "ws-1", "name": "Demo Workspace", "slug": "demo",
                "description": None, "context": None, "settings": {}, "repos": [],
                "issue_prefix": "DEMO", "avatar_url": None,
                "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
            })
        if path == "/api/issue-statuses" or path == "/api/issue-statuses":
            return _json_response(self, {
                "statuses": [{
                    "id": "status-todo", "workspace_id": "ws-1", "key": "todo",
                    "name": "Todo", "description": "", "category": "todo",
                    "color": "#6b7280", "is_system": True, "position": 0,
                    "archived_at": None, "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                }],
                "categories": ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"],
                "total": 1,
            })
        if path == "/api/inbox/unread-summary":
            return _json_response(self, [])
        if path == "/api/issues":
            return _json_response(self, {"issues": []})
        if path.startswith("/api/issues/") and path.endswith("/pull-requests"):
            return _json_response(self, {"pull_requests": []})
        if path.startswith("/api/issues/") and path.endswith("/children"):
            return _json_response(self, {"issues": []})
        if path.startswith("/api/issues/") and path.endswith("/labels"):
            return _json_response(self, {"labels": []})
        if path.startswith("/api/issues/") and path.count("/") == 3:
            return _json_response(self, {
                "id": "issue-1", "workspace_id": "ws-1", "number": 1,
                "identifier": "DEMO-1", "title": "Investigate login latency",
                "description": "A demo issue used for visual certification.",
                "status": "todo", "priority": "high", "assignee_type": "member",
                "assignee_id": "user-1", "creator_type": "member", "creator_id": "user-1",
                "parent_issue_id": None, "project_id": None, "position": 0,
                "stage": None, "start_date": None, "due_date": None,
                "metadata": {}, "properties": {}, "labels": [],
                "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
            })
        if path == "/api/properties":
            return _json_response(self, {"properties": []})
        if path == "/api/quick-actions":
            return _json_response(self, {"quick_actions": []})
        return _json_response(self, [])

    def do_OPTIONS(self):
        origin = self.headers.get("Origin")
        self.send_response(204)
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
        requested_headers = self.headers.get("Access-Control-Request-Headers")
        self.send_header(
            "Access-Control-Allow-Headers",
            requested_headers or "Content-Type,Authorization,X-Request-ID,X-Workspace-Slug",
        )
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length:
            self.rfile.read(length)
        return _json_response(self, {}, 204)


SEED_TARGETS = {
    "app-shell": "/demo/issues",
    "workspace-board": "/demo/issues?__oracle_action=board",
    "settings-section-nav": "/demo/settings",
    "master-detail": "/demo/issues/1",
    "overlay-dialog": "/demo/issues?__oracle_action=open-new-issue",
}

INJECT = r"""
<script>
(() => {
  const action = new URLSearchParams(location.search).get('__oracle_action');
  if (!action) return;
  const clickByText = (text) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find((item) => (item.innerText || '').trim().startsWith(text));
    if (button) { button.click(); return true; }
    return false;
  };
  const run = () => {
    if (action === 'open-new-issue') clickByText('New Issue');
    if (action === 'board') clickByText('Board');
  };
  window.addEventListener('load', () => { run(); setTimeout(run, 1200); setTimeout(run, 2600); });
})();
</script>
"""


class WrapperHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def _seed(self, route_id: str):
        target = SEED_TARGETS.get(route_id)
        if target is None:
            self.send_error(404)
            return
        body = f"""<!doctype html><meta charset="utf-8"><script>
localStorage.setItem('multica_token','demo-token');
localStorage.setItem('theme','light');
location.replace({json.dumps(target)});
</script>""".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        split = urlsplit(self.path)
        if split.path == "/ready":
            body = b"ready"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if split.path.startswith("/seed/"):
            self._seed(split.path.split("/", 2)[2])
            return
        upstream = f"http://127.0.0.1:{NEXT_PORT}{self.path}"
        request = urllib.request.Request(upstream, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                body = response.read()
                content_type = response.headers.get("Content-Type", "")
                if "text/html" in content_type:
                    text = body.decode("utf-8", errors="replace")
                    if "</body>" in text:
                        text = text.replace("</body>", INJECT + "</body>", 1)
                    else:
                        text += INJECT
                    body = text.encode("utf-8")
                self.send_response(response.status)
                for key, value in response.headers.items():
                    if key.lower() in {"transfer-encoding", "connection", "content-length"}:
                        continue
                    self.send_header(key, value)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        except Exception:
            self.send_error(502)

    def do_POST(self):
        self.send_error(405)


def _wait_port(port: int, timeout: float = 180.0) -> None:
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return
        except OSError as exc:
            last = exc
            time.sleep(0.5)
    raise RuntimeError(f"port {port} did not become ready: {last}")


def main() -> int:
    api = ThreadingHTTPServer(("127.0.0.1", API_PORT), MockApiHandler)
    threading.Thread(target=api.serve_forever, daemon=True).start()

    env = os.environ.copy()
    env.update({
        "PORT": str(NEXT_PORT),
        "NEXT_PUBLIC_API_URL": f"http://127.0.0.1:{API_PORT}",
        "NEXT_TELEMETRY_DISABLED": "1",
    })
    next_proc = subprocess.Popen(
        ["corepack", "pnpm@10.28.2", "--filter", "@multica/web", "start"],
        cwd=str(CHECKOUT), env=env,
    )
    try:
        _wait_port(NEXT_PORT)
        wrapper = ThreadingHTTPServer(("127.0.0.1", WRAPPER_PORT), WrapperHandler)
        wrapper.serve_forever()
    finally:
        next_proc.terminate()
        try:
            next_proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            next_proc.kill()


if __name__ == "__main__":
    raise SystemExit(main())
