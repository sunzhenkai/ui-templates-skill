from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from oracle_capture import _free_port, main  # noqa: E402


def _browser_available() -> bool:
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as playwright:
            playwright.chromium.launch().close()
    except Exception:
        return False
    return True


BROWSER_AVAILABLE = _browser_available()

PAGE = """<!doctype html>
<html><head><style>
  body { margin: 0; font-family: sans-serif; }
  #hero { width: 320px; height: 48px; background: #2563eb; }
</style></head>
<body><div id="hero">oracle stub</div></body></html>
"""


@unittest.skipUnless(BROWSER_AVAILABLE, "playwright chromium is not installed; run: python -m playwright install chromium")
class OracleCaptureTests(unittest.TestCase):
    def _stub_checkout(self, root: Path) -> str:
        checkout = root / "oracle"
        checkout.mkdir(parents=True)
        (checkout / "index.html").write_text(PAGE, encoding="utf-8")
        subprocess.run(["git", "init", "-q"], cwd=checkout, check=True)
        subprocess.run(["git", "config", "user.email", "oracle@example.invalid"], cwd=checkout, check=True)
        subprocess.run(["git", "config", "user.name", "Oracle Stub"], cwd=checkout, check=True)
        subprocess.run(["git", "add", "."], cwd=checkout, check=True)
        subprocess.run(["git", "commit", "-q", "-m", "oracle stub"], cwd=checkout, check=True)
        return subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=checkout, text=True, capture_output=True, check=True,
        ).stdout.strip()

    def test_capture_writes_real_screenshots_and_measurements(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            revision = self._stub_checkout(root)
            port = _free_port()
            descriptor = root / "oracle-deployment.yaml"
            descriptor.write_text(yaml.safe_dump({
                "schema": "oracle-deployment/v1",
                "oracle": {"kind": "git-revision", "revision": revision, "checkout": str(root / "oracle")},
                "deployment": {
                    "serve": f"{sys.executable} -m http.server {port} --bind 127.0.0.1 --directory .",
                    "ready_url": f"http://127.0.0.1:{port}/",
                    "ready_timeout_seconds": 30,
                },
                "capture": {
                    "routes": [{"id": "home", "path": "/"}],
                    "viewports": [{"id": "desktop", "width": 800, "height": 600}],
                    "themes": ["light"],
                    "settle_ms": 100,
                    "measurements": [{
                        "id": "measurement-hero-width",
                        "route": "home",
                        "viewport": "desktop",
                        "theme": "light",
                        "selector": "#hero",
                        "property": "width",
                        "dimension": "spacing",
                        "unit": "px",
                    }],
                },
            }, sort_keys=False), encoding="utf-8")

            output = root / "output"
            code = main([
                "capture",
                "--descriptor", str(descriptor),
                "--output-root", str(output),
                "--build-identity", "oracle-capture-test",
                "--checkout", str(root / "oracle"),
            ])
            self.assertEqual(0, code)

            screenshot = output / "evidence/oracle-home-desktop-light.png"
            self.assertTrue(screenshot.is_file())
            self.assertTrue(screenshot.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"))

            evidence = yaml.safe_load((output / "oracle-evidence.json").read_text(encoding="utf-8"))
            self.assertEqual(revision, evidence["oracle"]["revision"])
            self.assertEqual(1, len(evidence["screenshots"]))
            self.assertEqual(1, len(evidence["measurements"]))
            self.assertEqual("320px", evidence["measurements"][0]["value"])
            self.assertEqual("spacing", evidence["measurements"][0]["dimension"])

    def test_revision_mismatch_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            self._stub_checkout(root)
            port = _free_port()
            descriptor = root / "oracle-deployment.yaml"
            descriptor.write_text(yaml.safe_dump({
                "schema": "oracle-deployment/v1",
                "oracle": {"kind": "git-revision", "revision": "a" * 40},
                "deployment": {
                    "serve": f"{sys.executable} -m http.server {port} --directory .",
                    "ready_url": f"http://127.0.0.1:{port}/",
                },
                "capture": {
                    "routes": [{"id": "home", "path": "/"}],
                    "viewports": [{"id": "desktop", "width": 800, "height": 600}],
                    "themes": ["light"],
                },
            }, sort_keys=False), encoding="utf-8")
            with self.assertRaises(SystemExit) as context:
                main([
                    "capture",
                    "--descriptor", str(descriptor),
                    "--output-root", str(root / "output"),
                    "--build-identity", "oracle-capture-test",
                    "--checkout", str(root / "oracle"),
                ])
            self.assertIn("ORACLE_REVISION_MISMATCH", str(context.exception))


if __name__ == "__main__":
    unittest.main()
