"""Second-template vocabulary evidence: capture accepts instance-declared
chrome/slot/variant/context vocabulary that does not exist in the first
template (workbench-shell).

This is the mechanism-level half of the second-template proof (Phase 3): a
literal capture graph written in a completely different vocabulary must pass
the mandatory question matrix and project to a schema-valid fidelity sidecar
with its own roles preserved.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from template_authoring.capture import CaptureError, capture_from_files  # noqa: E402
from template_authoring.profile import facts_to_fidelity  # noqa: E402
from template_apply_state.fidelity import derive_scenario_ids  # noqa: E402
from template_validation.fidelity import schema_errors  # noqa: E402
from validate_design_system import canonical_digest, load_document  # noqa: E402

GRAPH_PATH = "ui-source-graph.yaml"


def _fact(fid: str, subject: str, *, slot=None, state="default", context=None,
          property: str, value, negative: bool = False, facet: str = "layout_scenes",
          rule_id: str = "LAYOUT-001") -> dict:
    return {
        "id": fid, "facet": facet, "subject": subject, "context": context,
        "slot": slot, "state": state,
        "property": property, "value": value, "negative": negative,
        "rule_id": rule_id,
    }


def _semantic(value: str) -> dict:
    return {"kind": "semantic", "value": value}


def _token(path: str) -> dict:
    return {"kind": "token-ref", "value": path}


def custom_vocabulary_graph() -> dict:
    """A monitoring-console app: banded variant shell with top-nav/account-menu
    chrome, a rail-menu nav column, and a footer-legal-link context. No
    workbench-shell vocabulary anywhere."""
    shell_facts = [
        # variant surface: main-stage (custom slot + custom variant value)
        _fact("f.variant", "shell", slot="main-stage", property="shell_variant", value=_semantic("banded")),
        _fact("f.stage.pad-bs", "shell", slot="main-stage", property="padding_block_start", value=_token("space.md")),
        _fact("f.stage.pad-ie", "shell", slot="main-stage", property="padding_inline_end", value=_token("space.md")),
        _fact("f.stage.pad-be", "shell", slot="main-stage", property="padding_block_end", value=_token("space.md")),
        _fact("f.stage.pad-is", "shell", slot="main-stage", property="padding_inline_start", value=_token("space.md")),
        _fact("f.stage.radius", "shell", slot="main-stage", property="radius", value=_token("radius.lg")),
        _fact("f.stage.border", "shell", slot="main-stage", property="border", value=_token("stroke.subtle")),
        _fact("f.stage.shadow", "shell", slot="main-stage", property="shadow", value=_token("elevation.card")),
        _fact("f.stage.bg", "shell", slot="main-stage", property="background", value=_token("color.stage")),
        # chrome slots (custom roles)
        _fact("f.topnav.role", "shell", slot="top-nav", property="slot_role", value=_semantic("top-nav")),
        _fact("f.topnav.order", "shell", slot="top-nav", property="slot_order", value=_semantic("0")),
        _fact("f.topnav.container", "shell", slot="top-nav", property="container_role", value=_semantic("main-stage")),
        _fact("f.topnav.border", "shell", slot="top-nav", property="border", value=_semantic("none"), negative=True),
        _fact("f.account.role", "shell", slot="account-menu", property="slot_role", value=_semantic("account-menu")),
        _fact("f.account.order", "shell", slot="account-menu", property="slot_order", value=_semantic("1")),
        _fact("f.account.container", "shell", slot="account-menu", property="container_role", value=_semantic("root")),
        _fact("f.account.border", "shell", slot="account-menu", property="border", value=_semantic("none"), negative=True),
    ]
    console_facts = [
        _fact("f.console.root", "console", slot=None, property="root_scroll", value=_semantic("none"), negative=True),
        _fact("f.rail.scroll", "console", slot="rail-menu", property="scroll_block", value=_semantic("vertical")),
        _fact("f.rail.anatomy", "console", slot="rail-menu", property="anatomy", value=_semantic("icon-label")),
        _fact("f.rail.arr", "console", slot="rail-menu", property="arrangement", value=_semantic("vertical")),
        _fact("f.rail.stretch", "console", slot="rail-menu", property="container_presentation", value=_semantic("fill")),
        _fact("f.rail.bg", "console", slot="rail-menu", state="selected", property="background",
              value=_token("color.stage-raised"), facet="state_presentations"),
        _fact("f.stream.scroll", "console", slot="stream", property="scroll_block", value=_semantic("vertical")),
        _fact("f.legal.deco", "link", slot="legal", property="text_decoration", value=_semantic("underline"),
              facet="state_presentations", context="footer-legal-link"),
    ]
    return {
        "schema_version": 1,
        "graph_type": "ui-template-literal-source-graph",
        "platform": "web",
        "closure_complete": True,
        "canonical_candidates": {"themes": ["theme.core"], "entries": ["entry.shell"]},
        "definitions": [
            {"id": "theme.core", "kind": "theme", "name": "core", "exports": ["theme"],
             "locator": f"{GRAPH_PATH}#/definitions/theme.core", "facts": []},
            {"id": "entry.shell", "kind": "entry", "name": "shell-entry", "exports": ["shell"],
             "locator": f"{GRAPH_PATH}#/definitions/entry.shell", "facts": []},
            {"id": "scene.shell", "kind": "scene", "name": "shell", "exports": ["shell-scene"],
             "locator": f"{GRAPH_PATH}#/definitions/scene.shell", "facts": []},
            {"id": "scene.console", "kind": "scene", "name": "console", "exports": ["console-scene"],
             "locator": f"{GRAPH_PATH}#/definitions/scene.console", "facts": []},
            {"id": "component.badge", "kind": "component", "name": "badge", "exports": ["badge"],
             "locator": f"{GRAPH_PATH}#/definitions/component.badge", "facts": []},
            {"id": "context.footer-legal-link", "kind": "context", "name": "footer-legal-link", "exports": [],
             "locator": f"{GRAPH_PATH}#/definitions/context.footer-legal-link", "facts": []},
        ],
        "imports": [
            {"id": "import.theme", "from_definition": "entry.shell", "to_definition": "theme.core",
             "locator": f"{GRAPH_PATH}#/imports/import.theme"},
            {"id": "import.shell", "from_definition": "entry.shell", "to_definition": "scene.shell",
             "locator": f"{GRAPH_PATH}#/imports/import.shell"},
            {"id": "import.console", "from_definition": "entry.shell", "to_definition": "scene.console",
             "locator": f"{GRAPH_PATH}#/imports/import.console"},
            {"id": "import.badge", "from_definition": "entry.shell", "to_definition": "component.badge",
             "locator": f"{GRAPH_PATH}#/imports/import.badge"},
            {"id": "import.legal", "from_definition": "entry.shell", "to_definition": "context.footer-legal-link",
             "locator": f"{GRAPH_PATH}#/imports/import.legal"},
        ],
        "usages": [
            {"id": "usage.shell", "definition_id": "scene.shell", "scene": "shell", "component": None,
             "context": None, "slot": "main-stage", "state": "default",
             "locator": f"{GRAPH_PATH}#/usages/usage.shell", "facts": shell_facts},
            {"id": "usage.console", "definition_id": "scene.console", "scene": "console", "component": None,
             "context": None, "slot": "stream", "state": "default",
             "locator": f"{GRAPH_PATH}#/usages/usage.console", "facts": console_facts},
        ],
        "exclusions": [],
        "dynamic": [],
    }


class CustomVocabularyCaptureTests(unittest.TestCase):
    def materialize(self, temp: str) -> tuple[Path, Path]:
        source = Path(temp) / "source"
        source.mkdir()
        (source / GRAPH_PATH).write_text(
            yaml.safe_dump(custom_vocabulary_graph(), sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )
        for command in (
            ["git", "init", "-q"],
            ["git", "config", "user.name", "UI Fixture"],
            ["git", "config", "user.email", "fixture@example.invalid"],
            ["git", "add", GRAPH_PATH],
        ):
            subprocess.run(command, cwd=source, check=True)
        env = dict(os.environ)
        env.update({"GIT_AUTHOR_DATE": "2026-01-01T00:00:00Z", "GIT_COMMITTER_DATE": "2026-01-01T00:00:00Z"})
        subprocess.run(["git", "commit", "-q", "-m", "custom vocabulary graph"], cwd=source, check=True, env=env)
        revision = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=source, check=True, text=True, capture_output=True,
        ).stdout.strip()
        request = {
            "schema_version": 1,
            "capture_profile": "repo-literal-graph-v1",
            "source_id": "source-custom-vocab",
            "source_revision": revision,
            "graph_path": GRAPH_PATH,
            "platform": "web",
            "conformance": "structural",
            "style_only_reason": None,
            "scope": {"scenes": ["shell", "console"], "components": ["badge"], "contexts": ["footer-legal-link"]},
            "decisions": {"theme_id": "theme.core", "entry_id": "entry.shell", "definition_ids": []},
            "limits": {"max_graph_bytes": 200000, "max_definitions": 100, "max_imports": 100,
                       "max_usages": 100, "max_facts": 200},
        }
        request_path = Path(temp) / "capture-request.yaml"
        request_path.write_text(yaml.safe_dump(request, sort_keys=False), encoding="utf-8")
        return source, request_path

    def test_custom_vocabulary_capture_and_projection(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            source, request_path = self.materialize(temp)
            try:
                receipt = capture_from_files(request_path, source)
            except CaptureError as exc:
                self.fail(f"custom-vocabulary capture must not fail closed: {exc.code} {exc.details}")
            self.assertEqual("captured", receipt["status"])
            self.assertFalse(receipt["unresolved"])

            sidecar = facts_to_fidelity(receipt, captured_at="2026-01-01T00:00:00Z")
            schema_problems = schema_errors(sidecar, ROOT)
            self.assertEqual([], [f"{path}: {message}" for path, message, _ in schema_problems])

            shell_scene = next(item for item in sidecar["layout_scenes"] if item["scene"] == "shell")
            self.assertEqual("banded", shell_scene["shell_variant"])
            roles = {slot["role"] for slot in shell_scene["slots"]}
            self.assertEqual({"top-nav", "account-menu"}, roles)

            console_scene = next(item for item in sidecar["layout_scenes"] if item["scene"] == "console")
            region_roles = {region["role"] for region in console_scene["regions"]}
            self.assertIn("rail-menu", region_roles)

            contexts = {record["context"] for record in sidecar["state_presentations"]}
            self.assertIn("footer-legal-link", contexts)

            # The mandatory matrix was fully answered with custom vocabulary.
            self.assertTrue(all(state != "unresolved" for state in sidecar["mandatory_answers"].values()))


FIXTURE_PACKAGE = ROOT / "tests/fixtures/design-system/packages/page-system-fixture"


def _refresh_digests(target: Path) -> None:
    manifest_path = target / "design-system.yaml"
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    manifest.setdefault("layer_digests", {})
    for name, rel in manifest.get("layers", {}).items():
        manifest["layer_digests"][name] = {
            "algorithm": "sha256-canonical-json-v1",
            "value": canonical_digest(load_document(target / rel)),
        }
    digest_input = dict(manifest)
    digest_input.pop("contract_digest", None)
    manifest["contract_digest"] = {
        "algorithm": "sha256-canonical-json-v1",
        "value": canonical_digest(digest_input),
    }
    manifest_path.write_text(yaml.safe_dump(manifest, sort_keys=False), encoding="utf-8")


class CustomVocabularyPackageChainTests(unittest.TestCase):
    """The custom-vocabulary capture must also feed the full consumer chain:
    a complete design-system/v1 package validates, and Apply-side scenario
    derivation consumes the custom fidelity vocabulary."""

    def _build_package(self, target: Path, sidecar: dict) -> None:
        shutil.copytree(FIXTURE_PACKAGE, target)
        manifest = yaml.safe_load((target / "design-system.yaml").read_text(encoding="utf-8"))
        manifest["id"] = "console-band"
        (target / "design-system.yaml").write_text(
            yaml.safe_dump(manifest, sort_keys=False), encoding="utf-8",
        )
        meta = yaml.safe_load((target / "meta.yaml").read_text(encoding="utf-8"))
        meta["name"] = "console-band"
        meta["description"] = "Monitoring console banded shell with rail navigation."
        meta["coverage"] = {
            "components": {
                "declared": ["status-pill"],
                "observed": ["status-pill"],
                "defaulted": [],
                "unsupported": [],
            },
            "states": {
                "declared": ["default", "hover"],
                "observed": ["hover"],
                "defaulted": ["default"],
                "unsupported": [],
            },
        }
        (target / "meta.yaml").write_text(
            yaml.safe_dump(meta, sort_keys=False), encoding="utf-8",
        )
        tokens = yaml.safe_load((target / "core/tokens.yaml").read_text(encoding="utf-8"))
        bucket = tokens.setdefault("tokens", {})
        bucket.setdefault("color", {})["stage"] = {"value": "#101418", "origin": "source"}
        bucket["color"]["stage-raised"] = {"value": "#1a2027", "origin": "source"}
        bucket.setdefault("stroke", {})["subtle"] = {"value": "#2a323b", "origin": "source"}
        bucket.setdefault("elevation", {})["card"] = {
            "value": "0 8px 24px rgba(0,0,0,0.35)", "origin": "source",
        }
        (target / "core/tokens.yaml").write_text(
            yaml.safe_dump(tokens, sort_keys=False), encoding="utf-8",
        )
        primitives = yaml.safe_load((target / "core/primitives.yaml").read_text(encoding="utf-8"))
        for item in primitives["items"]:
            item["id"] = item["id"].replace("primitive/button", "primitive/status-pill")
            item["name"] = "Status pill"
        (target / "core/primitives.yaml").write_text(
            yaml.safe_dump(primitives, sort_keys=False), encoding="utf-8",
        )
        patterns = yaml.safe_load((target / "core/patterns.yaml").read_text(encoding="utf-8"))
        for item in patterns["items"]:
            item["primitives"] = [
                ref.replace("primitive/button", "primitive/status-pill")
                for ref in item.get("primitives") or []
            ]
        (target / "core/patterns.yaml").write_text(
            yaml.safe_dump(patterns, sort_keys=False), encoding="utf-8",
        )
        (target / "fidelity.yaml").write_text(
            yaml.safe_dump(sidecar, sort_keys=False, allow_unicode=True), encoding="utf-8",
        )
        _refresh_digests(target)

    def test_custom_vocabulary_package_validates_and_derives_scenarios(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, request_path = CustomVocabularyCaptureTests().materialize(temp)
            receipt = capture_from_files(request_path, source)
            sidecar = facts_to_fidelity(receipt, captured_at="2026-01-01T00:00:00Z")
            package = root / "package"
            self._build_package(package, sidecar)

            process = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts/validate_design_system.py"),
                    "validate", str(package), "--kind", "package", "--json",
                ],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            payload = json.loads(process.stdout)
            self.assertEqual(0, process.returncode, payload.get("errors"))

            layout = yaml.safe_load((package / "core/layout.yaml").read_text(encoding="utf-8"))
            primitives = yaml.safe_load((package / "core/primitives.yaml").read_text(encoding="utf-8"))
            scenarios = derive_scenario_ids(sidecar, layout, None, primitives)
            self.assertIn("phase8:shell_variant:scene.shell:banded", scenarios)
            self.assertTrue(any(item.startswith("phase8:slot:") for item in scenarios))


if __name__ == "__main__":
    unittest.main()
