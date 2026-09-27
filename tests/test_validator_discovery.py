from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import design_system_validator_discovery as discovery  # noqa: E402
from skill_distribution.builder import build_bundle  # noqa: E402
from skill_distribution.config import DistributionError  # noqa: E402

AUTHOR = ROOT / "skills/ui-template-author/runtime"
DESIGN = ROOT / "skills/ui-template-design/runtime"
APPLY = ROOT / "skills/ui-template-apply/runtime"
FIXTURES = ROOT / "tests/fixtures/design-system"


class ValidatorDiscoveryTests(unittest.TestCase):
    def test_self_env_does_not_call_subprocess(self) -> None:
        wrapper = AUTHOR / "validate_design_system.py"
        env = {**os.environ, discovery.ENV_VAR: str(wrapper)}
        with mock.patch.dict(os.environ, env, clear=False):
            with mock.patch.object(discovery.subprocess, "run") as run:
                with self.assertRaises(SystemExit) as raised:
                    discovery.run_validator(wrapper, ["validate", ".", "--kind", "package"])
        self.assertIn(discovery.SELF_INVOCATION, str(raised.exception))
        run.assert_not_called()

    def test_other_wrapper_env_does_not_call_subprocess(self) -> None:
        wrapper = DESIGN / "check_active_instance.py"
        other = AUTHOR / "validate_design_system.py"
        env = {**os.environ, discovery.ENV_VAR: str(other)}
        with mock.patch.dict(os.environ, env, clear=False):
            with mock.patch.object(discovery.subprocess, "run") as run:
                with self.assertRaises(SystemExit) as raised:
                    discovery.run_validator(wrapper, ["validate", ".", "--kind", "active"])
        self.assertIn(discovery.SELF_INVOCATION, str(raised.exception))
        run.assert_not_called()

    def test_implementation_env_starts_once(self) -> None:
        wrapper = APPLY / "check_active_instance.py"
        target = ROOT / "scripts/validate_design_system.py"
        env = {**os.environ, discovery.ENV_VAR: str(target)}
        with mock.patch.dict(os.environ, env, clear=False):
            with mock.patch.object(discovery.subprocess, "run", return_value=mock.Mock(returncode=0)) as run:
                code = discovery.run_validator(wrapper, ["validate", ".", "--kind", "active", "--json"])
        self.assertEqual(0, code)
        run.assert_called_once()
        command, passed_env = run.call_args.args[0], run.call_args.kwargs["env"]
        self.assertEqual(str(target), command[1])
        self.assertEqual(str(target), passed_env[discovery.ENV_VAR])

    def test_design_only_install_tree_validates_active_instance(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            skill = root / "ui-template-design"
            shutil.copytree(ROOT / "skills/ui-template-design", skill)
            self.assertFalse((root / "scripts/validate_design_system.py").exists())
            self.assertFalse((root / "ui-template-author").exists())
            target = root / "active"
            adopt = subprocess.run(
                [
                    sys.executable, str(skill / "runtime/adopt_package.py"),
                    "--package", str(FIXTURES / "packages/page-system-fixture"),
                    "--design-root", str(target),
                    "--output-root", "app",
                    "--language", "typescript",
                    "--ui-framework", "react",
                    "--styling", "tailwind",
                    "--component-system", "shadcn",
                ],
                cwd=root, text=True, capture_output=True, check=False,
            )
            self.assertEqual(0, adopt.returncode, adopt.stdout + adopt.stderr)
            env = {key: value for key, value in os.environ.items() if key != discovery.ENV_VAR}
            process = subprocess.run(
                [
                    sys.executable, str(skill / "runtime/check_active_instance.py"),
                    "validate", str(target), "--kind", "active", "--json",
                ],
                cwd=root, env=env, text=True, capture_output=True, check=False,
            )
            self.assertTrue(process.stdout, process.stderr)
            report = json.loads(process.stdout)
            self.assertEqual(0, process.returncode, report)
            self.assertTrue(report["valid"], report)

    def test_bundle_fails_without_shared_validator(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            repo = base / "repo"
            repo.mkdir()
            shutil.copytree(ROOT / "skills/ui-template-author", repo / "skills/ui-template-author")
            shutil.copytree(ROOT / "skills/ui-template-apply", repo / "skills/ui-template-apply")
            shutil.copytree(ROOT / "skills/ui-template-design", repo / "skills/ui-template-design")
            shutil.copytree(ROOT / "governance/release", repo / "governance/release")
            shutil.copy2(ROOT / "LICENSE", repo / "LICENSE")
            (repo / "skills/ui-template-design/runtime/shared_validate_design_system.py").unlink()
            with self.assertRaises(DistributionError) as raised:
                build_bundle(repo, base / "dist")
            self.assertIn("ALLOWLIST_PATTERN_EMPTY", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
