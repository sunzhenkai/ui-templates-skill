from __future__ import annotations

import argparse
import hashlib
import json
import platform
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

RUNNER_VERSION = "1.0.0"
DEFAULT_CASES = (
    "skills/ui-template-author/evals/cases.yaml",
    "skills/ui-template-author/evals/fidelity-cases.yaml",
    "skills/ui-template-apply/evals/cases.yaml",
    "skills/ui-template-apply/evals/fidelity-cases.yaml",
)
LEGACY_CASES = (
    "skills/ui-template-author/evals/cases.yaml",
    "skills/ui-template-apply/evals/cases.yaml",
)
DEFAULT_BASELINE = "governance/eval/deterministic-baseline.json"
RESOURCE_MAPPINGS = (
    ("schemas/", "schemas/"),
    ("tests/fixtures/eval/", "fixtures/eval/"),
    ("tests/fixtures/fidelity/", "fixtures/fidelity/"),
    ("tests/fixtures/repo-capture/", "fixtures/repo-capture/"),
    ("governance/eval/deterministic-baseline.json", "deterministic-baseline.json"),
    ("scripts/check_template_apply_state.py", "check_template_apply_state.py"),
    ("scripts/contract_eval/runner.py", "contract_eval/runner.py"),
    ("scripts/validate_templates.py", "validate_templates.py"),
    ("scripts/capture_repo_fidelity.py", "capture_repo_fidelity.py"),
    ("scripts/manage_template_index.py", "manage_template_index.py"),
)
COMMAND_PROGRAMS = {
    "validate_templates": "scripts/validate_templates.py",
    "capture_repo_fidelity": "scripts/capture_repo_fidelity.py",
}
PYTHON_OPERATIONS = frozenset({
    "portable_validate",
    "canonical_digest_file",
    "validate_mutated_profile",
    "capture_reproducibility",
    "capture_error",
    "project_ids",
    "facet_recovery",
    "example_path_rejected",
    "index_require_published",
    "changeset_undeclared_stable",
    "catalog_zero_drift",
    "catalog_seed_contracts",
})


class UniqueKeyLoader(yaml.SafeLoader):
    pass


def _construct_mapping(loader: UniqueKeyLoader, node: yaml.MappingNode, deep: bool = False) -> dict[str, Any]:
    mapping: dict[str, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.YAMLError(f"duplicate mapping key: {key}")
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping)


@dataclass(frozen=True)
class LoadedCase:
    data: dict[str, Any]
    source: str


class EvalFailure(Exception):
    pass


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_yaml(path: Path) -> Any:
    return yaml.load(path.read_text(encoding="utf-8"), Loader=UniqueKeyLoader)


def confined(root: Path, relative: str) -> Path:
    if not relative or Path(relative).is_absolute() or ".." in Path(relative).parts:
        raise EvalFailure(f"UNSAFE_PATH: {relative}")
    path = (root / relative).resolve()
    try:
        path.relative_to(root.resolve())
    except ValueError as exc:
        raise EvalFailure(f"UNSAFE_PATH: {relative}") from exc
    return path


def resource_path(root: Path, relative: str) -> Path:
    """解析仓库资源；安装后仅回退到 bundle 内固定 portable runtime。"""
    direct = confined(root, relative)
    if direct.exists():
        return direct
    runtime = confined(root, "skills/ui-template-author/runtime")
    for source_prefix, runtime_prefix in RESOURCE_MAPPINGS:
        if relative == source_prefix or relative.startswith(source_prefix):
            suffix = relative[len(source_prefix):]
            candidate = (runtime / runtime_prefix / suffix).resolve() if runtime_prefix.endswith("/") else (runtime / runtime_prefix).resolve()
            try:
                candidate.relative_to(runtime.resolve())
            except ValueError as exc:
                raise EvalFailure(f"UNSAFE_PORTABLE_RESOURCE: {relative}") from exc
            if candidate.exists():
                return candidate
    raise EvalFailure(f"RESOURCE_MISSING: {relative}")


def lookup_path(data: Any, path: list[Any]) -> Any:
    current = data
    for key in path:
        if isinstance(current, list) and isinstance(key, int):
            current = current[key]
        elif isinstance(current, dict):
            current = current[key]
        else:
            raise KeyError(key)
    return current


def json_checks(payload: Any, assertion: dict[str, Any]) -> tuple[bool, str]:
    details: list[str] = []
    ok = True
    for item in assertion.get("json_path_equals") or []:
        if not isinstance(item, dict) or "path" not in item:
            return False, "json_path_equals items must include path"
        try:
            actual = lookup_path(payload, item["path"])
        except (KeyError, IndexError, TypeError) as exc:
            ok = False
            details.append(f"{item['path']} missing: {exc}")
            continue
        if actual != item.get("value"):
            ok = False
            details.append(f"{item['path']} expected={item.get('value')!r} actual={actual!r}")
    for item in assertion.get("json_path_gte") or []:
        if not isinstance(item, dict) or "path" not in item:
            return False, "json_path_gte items must include path"
        try:
            actual = lookup_path(payload, item["path"])
        except (KeyError, IndexError, TypeError) as exc:
            ok = False
            details.append(f"{item['path']} missing: {exc}")
            continue
        if not isinstance(actual, (int, float)) or actual < item.get("value", 0):
            ok = False
            details.append(f"{item['path']} expected>={item.get('value')!r} actual={actual!r}")
    for item in assertion.get("json_path_contains") or []:
        if not isinstance(item, dict) or "path" not in item:
            return False, "json_path_contains items must include path"
        try:
            actual = lookup_path(payload, item["path"])
        except (KeyError, IndexError, TypeError) as exc:
            ok = False
            details.append(f"{item['path']} missing: {exc}")
            continue
        value = item.get("value")
        present = value in actual if isinstance(actual, (list, str, dict)) else False
        if not present:
            ok = False
            details.append(f"{item['path']} missing {value!r}")
    return ok, "json checks" if ok else "; ".join(details)


def apply_mutation(data: Any, mutation: dict[str, Any]) -> Any:
    payload = json.loads(json.dumps(data))
    kind = mutation.get("kind")
    if kind == "delete":
        parent = lookup_path(payload, mutation["path"][:-1])
        del parent[mutation["path"][-1]]
    elif kind == "set":
        parent = lookup_path(payload, mutation["path"][:-1])
        parent[mutation["path"][-1]] = mutation["value"]
    elif kind == "append_scroll_owner":
        scene = lookup_path(payload, mutation.get("path") or ["layout_scenes", 1])
        scene.setdefault("scroll_domains", []).append(mutation["value"])
    elif kind == "append_state_conflict":
        extra = json.loads(json.dumps(payload["state_presentations"][0]))
        extra["id"] = mutation.get("id", "state.link.navigation-link.hover.item.conflict")
        extra["text_decoration"] = mutation.get("text_decoration", "underline")
        extra["negative_facts"] = []
        payload["state_presentations"].append(extra)
    else:
        raise EvalFailure(f"UNKNOWN_MUTATION {kind}")
    return payload


def load_yaml_resource(root: Path, relative: str) -> Any:
    return load_yaml(resource_path(root, relative))


def python_operation(root: Path, assertion: dict[str, Any]) -> dict[str, Any]:
    operation = assertion.get("operation")
    if operation not in PYTHON_OPERATIONS:
        raise EvalFailure(f"UNKNOWN_PYTHON_OPERATION {operation}")
    if operation == "portable_validate":
        from template_validation.validator import validate_paths

        template_root = resource_path(root, assertion["path"])
        index = resource_path(root, assertion["index"]) if assertion.get("index") else None
        return validate_paths([template_root], root, index=index).to_dict()
    if operation == "canonical_digest_file":
        from template_validation.fidelity import canonical_digest, load_fidelity

        data = load_fidelity(resource_path(root, assertion["path"]))
        noisy = json.loads(json.dumps(data))
        if noisy.get("layout_scenes"):
            noisy["layout_scenes"][0]["description"] = "eval noise"
            locator = noisy["layout_scenes"][0].get("provenance", {}).get("locator")
            if isinstance(locator, dict):
                locator["line"] = 99
            noisy["layout_scenes"] = list(reversed(noisy["layout_scenes"]))
        return {
            "digest": canonical_digest(data),
            "noisy_digest": canonical_digest(noisy),
            "stable": canonical_digest(data) == canonical_digest(noisy),
        }
    if operation == "validate_mutated_profile":
        import tempfile
        import shutil
        from template_validation.validator import validate_paths

        source = resource_path(root, assertion["path"])
        results = []
        with tempfile.TemporaryDirectory() as temp:
            dest = Path(temp) / "templates"
            shutil.copytree(source, dest)
            template_dir = next(path for path in dest.iterdir() if path.is_dir() and (path / "fidelity.yaml").is_file())
            original = load_yaml(template_dir / "fidelity.yaml")
            original_spec = (template_dir / "spec.md").read_text(encoding="utf-8") if (template_dir / "spec.md").is_file() else None
            original_meta = (template_dir / "meta.yaml").read_bytes() if (template_dir / "meta.yaml").is_file() else None
            for mutation in assertion.get("mutations") or []:
                kind = mutation.get("kind")
                if kind == "delete_sidecar":
                    (template_dir / "fidelity.yaml").unlink(missing_ok=True)
                    spec = template_dir / "spec.md"
                    if spec.is_file():
                        spec.write_text(
                            spec.read_text(encoding="utf-8").replace("[fidelity.yaml](fidelity.yaml)", "core v2 files"),
                            encoding="utf-8",
                        )
                    if mutation.get("layout_confidence") and (template_dir / "meta.yaml").is_file():
                        meta = load_yaml(template_dir / "meta.yaml")
                        confidence = meta.setdefault("confidence", {})
                        confidence["layout"] = mutation["layout_confidence"]
                        if mutation.get("overall_confidence"):
                            confidence["overall"] = mutation["overall_confidence"]
                        (template_dir / "meta.yaml").write_text(
                            yaml.safe_dump(meta, sort_keys=False, allow_unicode=True), encoding="utf-8",
                        )
                elif kind == "replace_sidecar":
                    sidecar = load_yaml(resource_path(root, mutation["sidecar"]))
                    (template_dir / "fidelity.yaml").write_text(
                        yaml.safe_dump(sidecar, sort_keys=False, allow_unicode=True), encoding="utf-8",
                    )
                else:
                    mutated = apply_mutation(original, mutation)
                    (template_dir / "fidelity.yaml").write_text(
                        yaml.safe_dump(mutated, sort_keys=False, allow_unicode=True), encoding="utf-8",
                    )
                payload = validate_paths([dest], root).to_dict()
                codes = [item["code"] for item in payload.get("findings") or []]
                conformance = None
                templates = payload.get("templates") or []
                if templates:
                    conformance = (templates[0].get("fidelity") or {}).get("conformance")
                results.append({
                    "id": mutation.get("id") or kind,
                    "failed": payload.get("exit_code", 1) != 0,
                    "finding": mutation.get("finding"),
                    "present": mutation.get("finding") in codes if mutation.get("finding") else True,
                    "conformance": conformance,
                    "codes": codes,
                })
                (template_dir / "fidelity.yaml").write_text(
                    yaml.safe_dump(original, sort_keys=False, allow_unicode=True), encoding="utf-8",
                )
                if original_spec is not None:
                    (template_dir / "spec.md").write_text(original_spec, encoding="utf-8")
                if original_meta is not None:
                    (template_dir / "meta.yaml").write_bytes(original_meta)
        return {"results": results, "all_failed": all(item["failed"] and item["present"] for item in results)}
    if operation == "capture_reproducibility":
        import os
        import tempfile
        import shutil
        from template_authoring.capture import capture_from_files
        from template_authoring.profile import facts_to_fidelity
        from template_validation.fidelity import canonical_digest

        source_fixture = resource_path(root, assertion["source"])
        request_fixture = resource_path(root, assertion["request"])
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "source"
            shutil.copytree(source_fixture, source)
            graph = next(source.glob("ui-source-graph.*"))
            subprocess.run(["git", "init", "-q"], cwd=source, check=True)
            subprocess.run(["git", "config", "user.name", "UI Fixture"], cwd=source, check=True)
            subprocess.run(["git", "config", "user.email", "fixture@example.invalid"], cwd=source, check=True)
            subprocess.run(["git", "add", graph.name], cwd=source, check=True)
            env = dict(os.environ)
            env.update({"GIT_AUTHOR_DATE": "2026-01-01T00:00:00Z", "GIT_COMMITTER_DATE": "2026-01-01T00:00:00Z"})
            subprocess.run(["git", "commit", "-q", "-m", "fixed literal graph fixture"], cwd=source, check=True, env=env)
            revision = subprocess.run(
                ["git", "rev-parse", "HEAD"], cwd=source, check=True, text=True, capture_output=True,
            ).stdout.strip()
            request = load_yaml(request_fixture)
            request["source_revision"] = revision
            request["graph_path"] = graph.name
            request_path = Path(temp) / "capture-request.yaml"
            request_path.write_text(yaml.safe_dump(request, sort_keys=False), encoding="utf-8")
            first = capture_from_files(request_path, source)
            second = capture_from_files(request_path, source)
            profile = facts_to_fidelity(first)
            again = facts_to_fidelity(second)
            return {
                "status": first.get("status"),
                "repeatable": first == second,
                "profile_digest": canonical_digest(profile),
                "profile_repeatable": canonical_digest(profile) == canonical_digest(again),
                "unresolved": bool(profile.get("unresolved")),
                "conformance": profile.get("conformance"),
                "revision": revision,
            }
    if operation == "capture_error":
        import os
        import tempfile
        import shutil
        from template_authoring.capture import CaptureError, capture_from_files

        source_fixture = resource_path(root, assertion["source"])
        request_fixture = resource_path(root, assertion["request"])
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "source"
            shutil.copytree(source_fixture, source)
            graphs = list(source.glob("ui-source-graph.*"))
            graph = graphs[0] if graphs else None
            if assertion.get("drop_graph") and graph is not None:
                graph.unlink()
                graph = None
            if assertion.get("drop_chrome") and graph is not None:
                document = load_yaml(graph)
                for usage in document.get("usages") or []:
                    if usage.get("id") == "usage.shell":
                        usage["facts"] = [
                            item for item in usage.get("facts") or []
                            if item.get("property") in {"root_scroll", "arrangement"}
                        ]
                graph.write_text(yaml.safe_dump(document, sort_keys=False, allow_unicode=True), encoding="utf-8")
            if graph is not None:
                subprocess.run(["git", "init", "-q"], cwd=source, check=True)
                subprocess.run(["git", "config", "user.name", "UI Fixture"], cwd=source, check=True)
                subprocess.run(["git", "config", "user.email", "fixture@example.invalid"], cwd=source, check=True)
                subprocess.run(["git", "add", graph.name], cwd=source, check=True)
                env = dict(os.environ)
                env.update({"GIT_AUTHOR_DATE": "2026-01-01T00:00:00Z", "GIT_COMMITTER_DATE": "2026-01-01T00:00:00Z"})
                subprocess.run(["git", "commit", "-q", "-m", "fixed literal graph fixture"], cwd=source, check=True, env=env)
                revision = subprocess.run(
                    ["git", "rev-parse", "HEAD"], cwd=source, check=True, text=True, capture_output=True,
                ).stdout.strip()
            else:
                subprocess.run(["git", "init", "-q"], cwd=source, check=True)
                subprocess.run(["git", "config", "user.name", "UI Fixture"], cwd=source, check=True)
                subprocess.run(["git", "config", "user.email", "fixture@example.invalid"], cwd=source, check=True)
                (source / "README.md").write_text("empty source\n", encoding="utf-8")
                subprocess.run(["git", "add", "README.md"], cwd=source, check=True)
                env = dict(os.environ)
                env.update({"GIT_AUTHOR_DATE": "2026-01-01T00:00:00Z", "GIT_COMMITTER_DATE": "2026-01-01T00:00:00Z"})
                subprocess.run(["git", "commit", "-q", "-m", "empty source"], cwd=source, check=True, env=env)
                revision = subprocess.run(
                    ["git", "rev-parse", "HEAD"], cwd=source, check=True, text=True, capture_output=True,
                ).stdout.strip()
            request = load_yaml(request_fixture)
            request["source_revision"] = revision
            request["graph_path"] = assertion.get("graph_path") or (graph.name if graph is not None else "ui-source-graph.yaml")
            request_path = Path(temp) / "capture-request.yaml"
            request_path.write_text(yaml.safe_dump(request, sort_keys=False), encoding="utf-8")
            try:
                capture_from_files(request_path, source)
            except CaptureError as exc:
                return {"status": "failed", "code": exc.code, "raised": True}
            return {"status": "captured", "code": None, "raised": False}
    if operation == "project_ids":
        from template_apply_state.fidelity import derive_scenario_ids, project_geometry_state, project_layout
        from template_validation.fidelity import canonicalize, load_fidelity

        data = load_fidelity(resource_path(root, assertion["path"]))
        layout = project_layout(data)
        geometry = project_geometry_state(data)
        scenarios = derive_scenario_ids(data)
        return {
            "layout": layout,
            "geometry": geometry,
            "scenarios": scenarios,
            "layout_stable": layout == project_layout(canonicalize(data)),
            "scenario_stable": scenarios == derive_scenario_ids(canonicalize(data)),
            "has_chrome": any(item.startswith("shell_variant:") or item.startswith("slot:") or item.startswith("anchor:") for item in layout),
        }
    if operation == "facet_recovery":
        from template_apply_state.fidelity import facet_change_phase
        from template_validation.fidelity import load_fidelity

        data = load_fidelity(resource_path(root, assertion["path"]))
        layout_changed = json.loads(json.dumps(data))
        layout_changed["layout_scenes"][1]["wrap"] = "wrap"
        state_changed = json.loads(json.dumps(data))
        state_changed["state_presentations"][0]["text_decoration"] = "underline"
        chrome_changed = json.loads(json.dumps(data))
        if chrome_changed.get("layout_scenes"):
            chrome_changed["layout_scenes"][0]["shell_variant"] = "flush"
        return {
            "unchanged": facet_change_phase(data, data),
            "layout_phase": facet_change_phase(data, layout_changed),
            "state_phase": facet_change_phase(data, state_changed),
            "chrome_phase": facet_change_phase(data, chrome_changed),
        }
    if operation == "index_require_published":
        import importlib.util
        import tempfile

        module_path = resource_path(root, "scripts/manage_template_index.py")
        spec = importlib.util.spec_from_file_location("manage_template_index", module_path)
        if spec is None or spec.loader is None:
            raise EvalFailure("MANAGE_TEMPLATE_INDEX_UNIMPORTABLE")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        published = (
            "# 模板索引\n\n| 名称 | 风格描述 | 来源类型 | 采集日期 | 状态 |\n"
            "| --- | --- | --- | --- | --- |\n| demo | d | doc | 2026-09-03 | published |\n"
        )
        with tempfile.TemporaryDirectory() as temp:
            pub = Path(temp) / "published.md"
            ret = Path(temp) / "retired.md"
            pub.write_text(published, encoding="utf-8")
            ret.write_text(published.replace("published", "retired"), encoding="utf-8")
            ok = module.require_published(pub, "demo")
            blocked = module.require_published(ret, "demo")
            missing = module.require_published(pub, "missing")
        return {
            "missing_blocked": not missing["ok"],
            "published_ok": ok["ok"],
            "retired_blocked": not blocked["ok"],
            "retired_code": blocked["code"],
        }
    if operation == "catalog_zero_drift":
        import importlib.util
        import tempfile

        module_path = resource_path(root, "scripts/manage_template_index.py")
        spec = importlib.util.spec_from_file_location("manage_template_index", module_path)
        if spec is None or spec.loader is None:
            raise EvalFailure("MANAGE_TEMPLATE_INDEX_UNIMPORTABLE")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        core = {
            "spec.md": "# demo\n",
            "tokens.yaml": "schema_version: 2\n",
            "meta.yaml": "schema_version: 2\nname: demo\n",
            "evidence.yaml": "schema_version: 2\nentries: []\n",
        }
        index_text = (
            "# 模板索引\n\n| 名称 | 风格描述 | 来源类型 | 采集日期 | 状态 |\n"
            "| --- | --- | --- | --- | --- |\n| demo | d | doc | 2026-09-03 | published |\n"
        )
        with tempfile.TemporaryDirectory() as temp:
            repo = Path(temp) / "repo"
            production = repo / "templates/demo"
            catalog = repo / "skills/ui-template-author/catalog/demo"
            production.mkdir(parents=True)
            catalog.mkdir(parents=True)
            (repo / "templates/INDEX.md").write_text(index_text, encoding="utf-8")
            (repo / "skills/ui-template-author/catalog/INDEX.md").write_text(index_text, encoding="utf-8")
            for name, value in core.items():
                (production / name).write_text(value, encoding="utf-8")
                (catalog / name).write_text(value, encoding="utf-8")
            matched = module._tree_bytes(production) == module._tree_bytes(catalog)
            (catalog / "spec.md").write_text("# drifted\n", encoding="utf-8")
            drifted = module._tree_bytes(production) != module._tree_bytes(catalog)
        return {"matched": matched, "drift_detected": drifted}
    if operation == "catalog_seed_contracts":
        import importlib.util
        import tempfile

        module_path = resource_path(root, "scripts/manage_template_index.py")
        spec = importlib.util.spec_from_file_location("manage_template_index", module_path)
        if spec is None or spec.loader is None:
            raise EvalFailure("MANAGE_TEMPLATE_INDEX_UNIMPORTABLE")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        index_text = (
            "# 模板索引\n\n| 名称 | 风格描述 | 来源类型 | 采集日期 | 状态 |\n"
            "| --- | --- | --- | --- | --- |\n| demo | d | doc | 2026-09-03 | published |\n"
        )
        with tempfile.TemporaryDirectory() as temp:
            catalog = Path(temp) / "catalog"
            (catalog / "demo").mkdir(parents=True)
            (catalog / "INDEX.md").write_text(index_text, encoding="utf-8")
            for name in ("spec.md", "tokens.yaml", "meta.yaml", "evidence.yaml"):
                (catalog / "demo" / name).write_text(f"{name}\n", encoding="utf-8")
            empty = Path(temp) / "empty"
            empty_index = empty / "INDEX.md"
            first = module.ensure_published(empty_index, empty, "demo", catalog)
            again = module.seed_from_catalog(catalog, empty_index, empty, ["demo"])
            (empty / "demo" / "spec.md").write_text("user-owned\n", encoding="utf-8")
            after_skip = (empty / "demo" / "spec.md").read_text(encoding="utf-8")
            retired_root = Path(temp) / "retired"
            retired_index = retired_root / "INDEX.md"
            retired_index.parent.mkdir(parents=True)
            retired_index.write_text(index_text.replace("published", "retired"), encoding="utf-8")
            (retired_root / "demo").mkdir()
            (retired_root / "demo" / "spec.md").write_text("retired-copy\n", encoding="utf-8")
            retired = module.ensure_published(retired_index, retired_root, "demo", catalog)
            missing = module.ensure_published(empty_index, empty, "missing", catalog)
        return {
            "empty_seeded": first["ok"] and first["code"] == "INDEX_PUBLISHED",
            "second_seed_skipped": "demo" in {item["name"] for item in again["skipped"]},
            "existing_not_overwritten": after_skip == "user-owned\n",
            "retired_blocked": (not retired["ok"]) and retired["code"] == "INDEX_NOT_PUBLISHED",
            "missing_handoff": (not missing["ok"]) and missing["code"] == "TEMPLATE_NOT_IN_CATALOG",
        }
    if operation == "changeset_undeclared_stable":
        import importlib.util
        import tempfile

        module_path = resource_path(root, "scripts/manage_template_index.py")
        spec = importlib.util.spec_from_file_location("manage_template_index", module_path)
        if spec is None or spec.loader is None:
            raise EvalFailure("MANAGE_TEMPLATE_INDEX_UNIMPORTABLE")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as temp:
            before = Path(temp) / "before" / "tmpl"
            allowed = Path(temp) / "allowed" / "tmpl"
            undeclared = Path(temp) / "undeclared" / "tmpl"
            for directory in (before, allowed, undeclared):
                directory.mkdir(parents=True)
                (directory / "tokens.yaml").write_text("a: 1\n", encoding="utf-8")
                (directory / "spec.md").write_text("old\n", encoding="utf-8")
            (allowed / "spec.md").write_text("new\n", encoding="utf-8")
            (undeclared / "spec.md").write_text("new\n", encoding="utf-8")
            (undeclared / "tokens.yaml").write_text("a: 2\n", encoding="utf-8")
            ok = module.check_changeset(before.parent, allowed.parent, ["tmpl/spec.md"])
            bad = module.check_changeset(before.parent, undeclared.parent, ["tmpl/spec.md"])
        return {
            "allowed_ok": ok["ok"],
            "undeclared": bad["undeclared"],
            "undeclared_blocked": not bad["ok"],
        }
    from template_validation.validator import validate_paths

    payload = validate_paths([Path("example") / "workbench-shell" / "web-v3"], root).to_dict()
    return {
        "exit_code": payload.get("exit_code"),
        "code": (payload.get("findings") or [{}])[0].get("code"),
        "exclusions": payload.get("discovery", {}).get("exclusions"),
    }


def command_json(root: Path, assertion: dict[str, Any]) -> tuple[int, Any]:
    program = assertion.get("program")
    if program not in COMMAND_PROGRAMS:
        raise EvalFailure(f"UNKNOWN_COMMAND_PROGRAM {program}")
    argv = [sys.executable, str(resource_path(root, COMMAND_PROGRAMS[program]))]
    if assertion.get("json", True):
        argv.append("--json")
    for relative in assertion.get("paths") or []:
        argv.append(str(resource_path(root, relative)))
    if assertion.get("index"):
        argv.extend(["--index", str(resource_path(root, assertion["index"]))])
    proc = subprocess.run(argv, text=True, capture_output=True, check=False)
    try:
        payload = json.loads(proc.stdout) if proc.stdout.strip() else None
    except json.JSONDecodeError as exc:
        raise EvalFailure(f"COMMAND_JSON_PARSE_FAILURE {program}: {exc}: {proc.stdout[:300]}") from exc
    return proc.returncode, payload


def runtime_fingerprint() -> str:
    identity = {
        "implementation": platform.python_implementation(),
        "python": platform.python_version(),
        "platform": platform.platform(),
        "runner": RUNNER_VERSION,
    }
    return "sha256:" + sha256_bytes(canonical_json(identity).encode("utf-8"))


def revision(root: Path, paths: Iterable[Path]) -> str:
    try:
        head = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=root, check=True, text=True, capture_output=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        head = "untracked"
    digest = hashlib.sha256()
    for path in sorted({p.resolve() for p in paths if p.exists() and p.is_file()}, key=lambda p: str(p)):
        digest.update(str(path.relative_to(root.resolve())).encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return f"{head}+eval.{digest.hexdigest()[:16]}"


def validators_for(directory: Path) -> tuple[dict[str, dict[str, Any]], Registry]:
    schemas: dict[str, dict[str, Any]] = {}
    registry = Registry()
    for path in sorted(directory.glob("*.schema.json")):
        schema = load_json(path)
        Draft202012Validator.check_schema(schema)
        schemas[path.name] = schema
        resource = Resource.from_contents(schema)
        if "$id" in schema:
            registry = registry.with_resource(schema["$id"], resource)
        registry = registry.with_resource(path.name, resource)
    return schemas, registry


def schema_errors(schema: dict[str, Any], instance: Any, registry: Registry | None = None) -> list[str]:
    validator = Draft202012Validator(
        schema,
        registry=registry or Registry(),
        format_checker=FormatChecker(),
    )
    errors = sorted(
        validator.iter_errors(instance),
        key=lambda error: (list(error.absolute_path), error.validator or "", error.message),
    )
    return [
        f"{'.'.join(map(str, error.absolute_path)) or '$'}: {error.message}"
        for error in errors
    ]


def declared_count(text: str) -> int:
    return len(re.findall(r"^\s*-\s+id:\s*[^\s#]+\s*$", text, flags=re.MULTILINE))


def load_cases(root: Path, paths: list[str]) -> tuple[int, int, list[LoadedCase], list[str]]:
    case_schema = load_json(resource_path(root, "schemas/eval/case.schema.json"))
    declared = 0
    parsed = 0
    loaded: list[LoadedCase] = []
    failures: list[str] = []
    for relative in paths:
        path = resource_path(root, relative)
        if not path.is_file():
            failures.append(f"EVAL_PARSE_FAILURE {relative}: file missing")
            continue
        text = path.read_text(encoding="utf-8")
        lexical_count = declared_count(text)
        try:
            document = yaml.load(text, Loader=UniqueKeyLoader)
        except yaml.YAMLError as exc:
            declared += lexical_count
            failures.append(f"EVAL_PARSE_FAILURE {relative}: {exc}")
            continue
        raw_cases = document.get("cases") if isinstance(document, dict) else None
        declared += len(raw_cases) if isinstance(raw_cases, list) else lexical_count
        errors = schema_errors(case_schema, document)
        if errors:
            failures.extend(f"EVAL_PARSE_FAILURE {relative}: {error}" for error in errors)
            continue
        cases = document["cases"]
        for case in cases:
            if case["skill"] != document["skill"]:
                failures.append(
                    f"EVAL_PARSE_FAILURE {relative}#{case['id']}: skill does not match collection"
                )
                continue
            if case["revision"] != document["revision"]:
                failures.append(
                    f"EVAL_PARSE_FAILURE {relative}#{case['id']}: revision does not match collection"
                )
                continue
            parsed += 1
            loaded.append(LoadedCase(case, relative))
    ids: dict[str, str] = {}
    for case in loaded:
        case_id = case.data["id"]
        if case_id in ids:
            failures.append(
                f"EVAL_DUPLICATE_ID {case_id}: {ids[case_id]} and {case.source}"
            )
        else:
            ids[case_id] = case.source
    return declared, parsed, loaded, failures


def fixture_entry(root: Path, case: dict[str, Any]) -> tuple[dict[str, Any], str, Path]:
    fixture_ref = case["fixture"]
    relative, fragment = fixture_ref.rsplit("#", 1)
    path = resource_path(root, relative)
    if not path.is_file():
        raise EvalFailure(f"FIXTURE_MISSING {fixture_ref}")
    actual_hash = sha256_bytes(path.read_bytes())
    if actual_hash != case["fixture_sha256"]:
        raise EvalFailure(
            f"FIXTURE_HASH_MISMATCH {case['id']}: expected={case['fixture_sha256']} actual={actual_hash}"
        )
    try:
        document = load_yaml(path)
    except (yaml.YAMLError, UnicodeDecodeError) as exc:
        raise EvalFailure(f"FIXTURE_PARSE_FAILURE {fixture_ref}: {exc}") from exc
    if not isinstance(document, dict) or document.get("schema_version") != 1:
        raise EvalFailure(f"FIXTURE_PARSE_FAILURE {fixture_ref}: schema_version must be 1")
    entries = document.get("cases")
    if not isinstance(entries, dict) or fragment not in entries:
        raise EvalFailure(f"FIXTURE_FRAGMENT_MISSING {fixture_ref}")
    entry = entries[fragment]
    if fragment != case["id"] or not isinstance(entry, dict):
        raise EvalFailure(f"FIXTURE_CASE_MISMATCH {fixture_ref}")
    return entry, actual_hash, path


def schema_validity(root: Path, assertion: dict[str, Any]) -> tuple[bool, str]:
    schema_path = resource_path(root, assertion["schema"])
    schemas, registry = validators_for(schema_path.parent)
    schema = schemas[schema_path.name]
    errors = schema_errors(schema, assertion["instance"], registry)
    expected = assertion["valid"]
    valid = not errors
    if valid == expected:
        return True, f"json_schema_validity {assertion['schema']} expected={str(expected).lower()}"
    return False, f"json_schema_validity {assertion['schema']} expected={expected} errors={errors}"


def run_assertion(root: Path, assertion: dict[str, Any]) -> tuple[bool, str]:
    kind = assertion.get("type")
    if kind == "path_exists":
        relative = assertion.get("path", "")
        try:
            exists = resource_path(root, relative).exists()
        except EvalFailure:
            exists = False
        return exists, f"path_exists {relative}" if exists else f"missing path {relative}"
    if kind in {"file_contains", "ordered_contains"}:
        relative = assertion.get("path", "")
        path = resource_path(root, relative)
        if not path.is_file():
            return False, f"missing file {relative}"
        text = path.read_text(encoding="utf-8")
        if kind == "ordered_contains":
            values = assertion.get("values", [])
            if not isinstance(values, list) or not values:
                return False, "ordered_contains requires non-empty values"
            positions = [text.find(str(value)) for value in values]
            ok = all(position >= 0 for position in positions) and positions == sorted(positions)
            return ok, f"ordered_contains {relative}: {values}" if ok else f"ordered_contains failed {relative}: {positions}"
        required = assertion.get("all", [])
        forbidden = assertion.get("none", [])
        if not isinstance(required, list) or not isinstance(forbidden, list):
            return False, "file_contains all/none must be arrays"
        missing = [value for value in required if value not in text]
        present = [value for value in forbidden if value in text]
        ok = not missing and not present
        return ok, f"file_contains {relative}" if ok else f"file_contains failed {relative}: missing={missing} forbidden_present={present}"
    if kind == "json_schema_validity":
        required = {"schema", "instance", "valid"}
        if not required.issubset(assertion):
            return False, f"json_schema_validity missing {sorted(required - set(assertion))}"
        return schema_validity(root, assertion)
    if kind == "command_json":
        code, payload = command_json(root, assertion)
        expected = assertion.get("expected_exit", 0)
        if code != expected:
            return False, f"command_json exit expected={expected} actual={code}"
        if payload is None:
            return False, "command_json produced no JSON"
        ok, detail = json_checks(payload, assertion)
        return ok, f"command_json {assertion.get('program')} {detail}"
    if kind == "python_call":
        payload = python_operation(root, assertion)
        ok, detail = json_checks(payload, assertion)
        return ok, f"python_call {assertion.get('operation')} {detail}"
    return False, f"unknown assertion type: {kind}"


def script_result(root: Path, case: dict[str, Any], entry: dict[str, Any], fixture_hash: str, fingerprint: str) -> dict[str, Any]:
    assertions = entry.get("assertions")
    details: list[str] = []
    passed = isinstance(assertions, list) and bool(assertions)
    if not passed:
        details.append("script fixture requires non-empty assertions")
    else:
        for assertion in assertions:
            if not isinstance(assertion, dict):
                passed = False
                details.append("assertion must be a mapping")
                continue
            ok, detail = run_assertion(root, assertion)
            passed = passed and ok
            details.append(("PASS " if ok else "FAIL ") + detail)
    return make_case_result(
        case, fixture_hash, fingerprint, "script", "passed" if passed else "failed", True, details,
    )


def validate_llm_asset(root: Path, case: dict[str, Any], entry: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    for field in ("prompt", "fixture_response_boundary", "result_schema"):
        if not isinstance(entry.get(field), str) or not entry[field].strip():
            failures.append(f"missing non-empty {field}")
    rubric = entry.get("rubric")
    if rubric != case["expect"]:
        failures.append("fixture rubric differs from case expectation")
    if isinstance(entry.get("result_schema"), str):
        try:
            schema_path = resource_path(root, entry["result_schema"])
            schema = load_json(schema_path)
            Draft202012Validator.check_schema(schema)
        except (EvalFailure, OSError, ValueError, json.JSONDecodeError) as exc:
            failures.append(f"invalid result schema: {exc}")
    boundary = entry.get("fixture_response_boundary", "")
    if not all(term in boundary for term in ("项目源码", "用户数据", "网络")):
        failures.append("fixture boundary must prohibit project code, user data and network context")
    return failures


def make_case_result(
    case: dict[str, Any], fixture_hash: str, fingerprint: str, execution: str,
    status: str, blocking: bool, details: list[str], runtime: str | None = None,
) -> dict[str, Any]:
    return {
        "blocking": blocking,
        "category": case["category"],
        "details": details,
        "execution": execution,
        "fixture": case["fixture"],
        "fixture_sha256": fixture_hash,
        "id": case["id"],
        "judge": case["judge"],
        "revision": case["revision"],
        "runtime_fingerprint": runtime or fingerprint,
        "skill": case["skill"],
        "status": status,
    }


def load_llm_adapter(root: Path, relative: str | None) -> tuple[dict[str, Any] | None, list[str]]:
    if relative is None:
        return None, []
    try:
        path = resource_path(root, relative)
        document = load_json(path)
        schema = load_json(resource_path(root, "schemas/eval/llm-judge-result.schema.json"))
        errors = schema_errors(schema, document)
        if errors:
            return None, [f"LLM_RESULT_PARSE_FAILURE {error}" for error in errors]
        return document, []
    except (EvalFailure, OSError, ValueError, json.JSONDecodeError) as exc:
        return None, [f"LLM_RESULT_PARSE_FAILURE {exc}"]


def baseline_diff(root: Path, relative: str, results: list[dict[str, Any]], selected_ids: set[str]) -> tuple[str, dict[str, list[str]], list[str]]:
    empty = {"added": [], "removed": [], "changed": []}
    try:
        path = resource_path(root, relative)
        baseline = load_json(path)
    except (EvalFailure, OSError, ValueError, json.JSONDecodeError) as exc:
        return "different", empty, [f"BASELINE_PARSE_FAILURE {exc}"]
    expected_all = baseline.get("cases") if isinstance(baseline, dict) else None
    if baseline.get("schema_version") != 1 or baseline.get("runner_version") != RUNNER_VERSION or not isinstance(expected_all, dict):
        return "different", empty, ["BASELINE_PARSE_FAILURE unsupported baseline envelope"]
    expected = {key: value for key, value in expected_all.items() if key in selected_ids}
    actual = {
        item["id"]: {"fixture_sha256": item["fixture_sha256"], "status": item["status"]}
        for item in results if item["judge"] == "script"
    }
    diff = {
        "added": sorted(set(actual) - set(expected)),
        "removed": sorted(set(expected) - set(actual)),
        "changed": sorted(key for key in set(actual) & set(expected) if actual[key] != expected[key]),
    }
    failures = [] if not any(diff.values()) else [f"BASELINE_DIFF {canonical_json(diff)}"]
    return ("matched" if not failures else "different"), diff, failures


def validate_report(root: Path, report: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    counts = report["counts"]
    if not (counts["declared"] == counts["parsed"] == counts["executed"] == len(report["results"])):
        failures.append(
            "EVAL_COUNT_MISMATCH "
            f"declared={counts['declared']} parsed={counts['parsed']} executed={counts['executed']} results={len(report['results'])}"
        )
    discovery = report.get("discovery") if isinstance(report.get("discovery"), dict) else {}
    if not discovery.get("example_excluded", False):
        failures.append("EVAL_EXAMPLE_PATH_IN_SCOPE")
    if "example/**" not in (discovery.get("exclusions") or []):
        failures.append("EVAL_EXAMPLE_EXCLUSION_MISSING")
    inputs = discovery.get("inputs") or []
    if any(item == "example" or str(item).startswith("example/") for item in inputs):
        failures.append("EVAL_EXAMPLE_INPUT_PRESENT")
    ids = [item["id"] for item in report["results"]]
    if len(ids) != len(set(ids)):
        failures.append("EVAL_RESULT_DUPLICATE_ID")
    if set(ids) != set(report["fixture_hashes"]):
        failures.append("EVAL_RESULT_FIXTURE_COUNT_MISMATCH")
    elif any(report["fixture_hashes"][item["id"]] != item["fixture_sha256"] for item in report["results"]):
        failures.append("EVAL_RESULT_FIXTURE_HASH_MISMATCH")
    for judge in ("script", "llm"):
        actual = sum(item["judge"] == judge for item in report["results"])
        if counts[judge] != actual:
            failures.append(f"EVAL_JUDGE_COUNT_MISMATCH {judge}: declared={counts[judge]} results={actual}")
    schema = load_json(resource_path(root, "schemas/eval/result.schema.json"))
    failures.extend(f"RESULT_SCHEMA_INVALID {error}" for error in schema_errors(schema, report))
    return failures


def run(
    root: Path,
    case_paths: list[str] | None = None,
    baseline_path: str = DEFAULT_BASELINE,
    skills: set[str] | None = None,
    case_ids: set[str] | None = None,
    llm_results_path: str | None = None,
    check_baseline: bool = True,
) -> dict[str, Any]:
    root = root.resolve()
    paths = case_paths or list(DEFAULT_CASES)
    declared_all, parsed_all, loaded, failures = load_cases(root, paths)
    selected = [
        item for item in loaded
        if (not skills or item.data["skill"] in skills) and (not case_ids or item.data["id"] in case_ids)
    ]
    if skills or case_ids:
        declared = len(selected) if declared_all == parsed_all else declared_all
        parsed = len(selected) if declared_all == parsed_all else parsed_all
    else:
        declared, parsed = declared_all, parsed_all
    if case_ids:
        missing = sorted(case_ids - {item.data["id"] for item in selected})
        failures.extend(f"EVAL_UNKNOWN_CASE {case_id}" for case_id in missing)
    fingerprint = runtime_fingerprint()
    adapter, adapter_failures = load_llm_adapter(root, llm_results_path)
    failures.extend(adapter_failures)
    adapter_results = {}
    if adapter:
        adapter_results = {item["id"]: item for item in adapter["results"]}
    llm_cases = [item.data for item in selected if item.data["judge"] == "llm"]
    if adapter is not None:
        expected_ids = {case["id"] for case in llm_cases}
        supplied_ids = set(adapter_results)
        expected_revisions = {case["revision"] for case in llm_cases}
        if adapter["revision"] not in expected_revisions or len(expected_revisions) != 1:
            failures.append(
                f"LLM_RESULT_REVISION_MISMATCH expected={sorted(expected_revisions)} supplied={adapter['revision']}"
            )
        if expected_ids != supplied_ids or len(adapter["results"]) != len(supplied_ids):
            failures.append(
                f"LLM_RESULT_COUNT_MISMATCH expected={sorted(expected_ids)} supplied={sorted(supplied_ids)} count={len(adapter['results'])}"
            )
    results: list[dict[str, Any]] = []
    fixture_hashes: dict[str, str] = {}
    executed = 0
    revision_inputs = [resource_path(root, path) for path in paths]
    revision_inputs.extend([
        resource_path(root, "scripts/contract_eval/runner.py"),
        resource_path(root, "schemas/eval/case.schema.json"),
        resource_path(root, "schemas/eval/result.schema.json"),
    ])
    for loaded_case in selected:
        case = loaded_case.data
        executed += 1
        try:
            entry, fixture_hash, fixture_path = fixture_entry(root, case)
            revision_inputs.append(fixture_path)
            fixture_hashes[case["id"]] = fixture_hash
            if case["judge"] == "script":
                for assertion in entry.get("assertions", []):
                    if isinstance(assertion, dict):
                        for key in ("path", "schema", "index", "source", "request", "template"):
                            if isinstance(assertion.get(key), str):
                                revision_inputs.append(resource_path(root, assertion[key]))
                        for key in ("paths",):
                            for item in assertion.get(key) or []:
                                if isinstance(item, str):
                                    revision_inputs.append(resource_path(root, item))
                results.append(script_result(root, case, entry, fixture_hash, fingerprint))
            else:
                if isinstance(entry.get("result_schema"), str):
                    revision_inputs.append(resource_path(root, entry["result_schema"]))
                asset_failures = validate_llm_asset(root, case, entry)
                if asset_failures:
                    results.append(make_case_result(case, fixture_hash, fingerprint, "llm-asset-validation", "failed", True, asset_failures))
                elif adapter is None:
                    results.append(make_case_result(
                        case, fixture_hash, fingerprint, "llm-asset-validation", "asset-valid", False,
                        ["固定 prompt/rubric/result schema 已离线验证；未调用模型或网络"],
                    ))
                elif case["id"] not in adapter_results:
                    results.append(make_case_result(
                        case, fixture_hash, fingerprint, "llm-result-adapter", "failed", True,
                        ["authorized adapter result missing"], runtime=adapter["runtime_fingerprint"],
                    ))
                else:
                    adapted = adapter_results[case["id"]]
                    results.append(make_case_result(
                        case, fixture_hash, fingerprint, "llm-result-adapter", adapted["status"], True,
                        [adapted["rationale"]], runtime=adapter["runtime_fingerprint"],
                    ))
        except (EvalFailure, OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
            failures.append(str(exc))
            fixture_hashes[case["id"]] = case["fixture_sha256"]
            results.append(make_case_result(
                case, case["fixture_sha256"], fingerprint,
                "script" if case["judge"] == "script" else "llm-asset-validation",
                "failed", True, [str(exc)],
            ))
    results.sort(key=lambda item: item["id"])
    selected_ids = {item.data["id"] for item in selected}
    input_paths = list(paths)
    example_inputs = [item for item in input_paths if item == "example" or item.startswith("example/")]
    discovery = {
        "example_excluded": not example_inputs,
        "exclusions": ["example/**"],
        "inputs": sorted(input_paths),
    }
    if check_baseline:
        baseline_status, diff, baseline_failures = baseline_diff(root, baseline_path, results, selected_ids)
        failures.extend(baseline_failures)
    else:
        baseline_status, diff = "not-checked", {"added": [], "removed": [], "changed": []}
    failures.extend(
        f"JUDGE_FAILURE {item['id']}" for item in results
        if item["status"] == "failed" and f"JUDGE_FAILURE {item['id']}" not in failures
    )
    report = {
        "baseline": {"diff": diff, "path": baseline_path, "status": baseline_status},
        "counts": {
            "declared": declared,
            "executed": executed,
            "llm": sum(item.data["judge"] == "llm" for item in selected),
            "parsed": parsed,
            "script": sum(item.data["judge"] == "script" for item in selected),
        },
        "discovery": discovery,
        "failures": sorted(set(failures)),
        "fixture_hashes": dict(sorted(fixture_hashes.items())),
        "results": results,
        "revision": revision(root, revision_inputs),
        "runner_version": RUNNER_VERSION,
        "runtime_fingerprint": fingerprint,
        "schema_version": 1,
        "status": "failed" if failures or any(item["status"] == "failed" for item in results) else "passed",
    }
    invariant_failures = validate_report(root, report)
    if invariant_failures:
        report["failures"] = sorted(set(report["failures"] + invariant_failures))
        report["status"] = "failed"
    return report


def junit(report: dict[str, Any]) -> str:
    has_runner_failure = bool(report["failures"])
    suite = ET.Element("testsuite", {
        "name": "contract-evals",
        "tests": str(len(report["results"]) + int(has_runner_failure)),
        "failures": str(sum(item["status"] == "failed" for item in report["results"]) + int(has_runner_failure)),
    })
    properties = ET.SubElement(suite, "properties")
    for name, value in (
        ("runner_version", report["runner_version"]),
        ("revision", report["revision"]),
        ("runtime_fingerprint", report["runtime_fingerprint"]),
        ("baseline_status", report["baseline"]["status"]),
        ("declared", report["counts"]["declared"]),
        ("parsed", report["counts"]["parsed"]),
        ("executed", report["counts"]["executed"]),
    ):
        ET.SubElement(properties, "property", {"name": name, "value": str(value)})
    for item in report["results"]:
        case = ET.SubElement(suite, "testcase", {"classname": item["skill"], "name": item["id"]})
        case_properties = ET.SubElement(case, "properties")
        for name in ("judge", "execution", "fixture_sha256", "revision", "runtime_fingerprint"):
            ET.SubElement(case_properties, "property", {"name": name, "value": str(item[name])})
        if item["status"] == "failed":
            failure = ET.SubElement(case, "failure", {"message": "contract eval failed"})
            failure.text = "\n".join(item["details"])
        elif item["status"] == "asset-valid":
            ET.SubElement(case_properties, "property", {"name": "llm_status", "value": "asset-valid-no-model-call"})
    if has_runner_failure:
        case = ET.SubElement(suite, "testcase", {"classname": "runner", "name": "invariants"})
        failure = ET.SubElement(case, "failure", {"message": "runner invariant failed"})
        failure.text = "\n".join(report["failures"])
    ET.indent(suite, space="  ")
    return ET.tostring(suite, encoding="unicode", xml_declaration=True) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="运行离线 contract eval；不会调用模型或访问网络")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--cases", action="append", dest="case_paths")
    parser.add_argument("--skill", action="append", choices=["ui-template-author", "ui-template-apply"])
    parser.add_argument("--case", action="append", dest="case_ids")
    parser.add_argument("--baseline", default=DEFAULT_BASELINE)
    parser.add_argument("--no-baseline", action="store_true")
    parser.add_argument("--llm-results", help="显式导入已授权的本地结果；runner 不调用模型")
    parser.add_argument("--json-out")
    parser.add_argument("--junit-out")
    args = parser.parse_args(argv)
    report = run(
        args.root,
        case_paths=args.case_paths,
        baseline_path=args.baseline,
        skills=set(args.skill or []),
        case_ids=set(args.case_ids or []),
        llm_results_path=args.llm_results,
        check_baseline=not args.no_baseline,
    )
    json_text = json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.json_out:
        confined(args.root.resolve(), args.json_out).write_text(json_text, encoding="utf-8")
    if args.junit_out:
        confined(args.root.resolve(), args.junit_out).write_text(junit(report), encoding="utf-8")
    sys.stdout.write(json_text)
    return 0 if report["status"] == "passed" else 1
