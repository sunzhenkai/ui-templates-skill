#!/usr/bin/env python3
"""Validate portable packages, active instances, migrations and vendor snapshots."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

DESIGN_SYSTEM_VALIDATOR_ROLE = "implementation"


def schema_dir() -> Path:
    here = Path(__file__).resolve()
    for candidate in (here.parent / "schemas/design-system/v1", here.parents[1] / "schemas/design-system/v1"):
        if candidate.is_dir() and any(candidate.glob("*.schema.json")):
            return candidate
    raise SystemExit("SCHEMA_DIR_MISSING: design-system/v1 schemas are not installed")


SCHEMA_DIR = schema_dir()
CANONICAL = "sha256-canonical-json-v1"
RAW = "sha256-file-v1"
INVENTORY_SCHEMA = "design-system-certification-inventory/v1"
MEASURABLE_ASSERTION_METHODS = frozenset({
    "dom-geometry",
    "computed-style",
    "layout-tree",
    "dom-order",
    "framework-a11y-tree",
})
CAPABILITY_LAYERS = {
    "tokens-only": ("tokens", "rules", "evidence"),
    "ui-kit": ("tokens", "primitives", "rules", "evidence"),
    "page-system": ("tokens", "primitives", "patterns", "page-types", "layout", "rules", "evidence"),
}
ENTITY_LAYERS = ("primitives", "patterns", "page-types", "layout")


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


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def canonical_digest(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def load_yaml(path: Path) -> Any:
    return yaml.load(path.read_text(encoding="utf-8"), Loader=UniqueKeyLoader)


def load_document(path: Path) -> Any:
    if path.suffix.lower() == ".json":
        return json.loads(path.read_text(encoding="utf-8"))
    return load_yaml(path)


_SCHEMA_CACHE: dict[str, dict[str, Any]] = {}


def schema(name: str) -> dict[str, Any]:
    if name not in _SCHEMA_CACHE:
        _SCHEMA_CACHE[name] = json.loads((SCHEMA_DIR / name).read_text(encoding="utf-8"))
    return _SCHEMA_CACHE[name]


def registry() -> Registry:
    active = Registry()
    for path in sorted(SCHEMA_DIR.glob("*.schema.json")):
        document = json.loads(path.read_text(encoding="utf-8"))
        resource = Resource.from_contents(document)
        active = active.with_resource(document["$id"], resource)
        active = active.with_resource(path.name, resource)
    return active


def schema_errors(instance: Any, schema_name: str, path: str) -> list[dict[str, str]]:
    validator = Draft202012Validator(schema(schema_name), registry=registry(), format_checker=FormatChecker())
    output: list[dict[str, str]] = []
    for error in sorted(validator.iter_errors(instance), key=lambda item: (tuple(item.absolute_path), item.message)):
        location = ".".join(str(part) for part in error.absolute_path) or path
        output.append({"code": "SCHEMA_INVALID", "path": location, "message": error.message})
    return output


class Report:
    def __init__(self, kind: str, target: Path) -> None:
        self.kind = kind
        self.target = target
        self.errors: list[dict[str, str]] = []
        self.warnings: list[dict[str, str]] = []
        self.digests: dict[str, Any] = {}
        self.component_family: dict[str, Any] = {}
        self.inventory_patterns: list[str] | None = None
        self.inventory_expected_primitives: dict[str, int] = {}

    def add(self, code: str, path: str, message: str) -> None:
        self.errors.append({"code": code, "path": path, "message": message})

    def warn(self, code: str, path: str, message: str) -> None:
        self.warnings.append({"code": code, "path": path, "message": message})

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "schema_version": 1,
            "target": self.target.as_posix(),
            "kind": self.kind,
            "valid": not self.errors,
            "errors": sorted(self.errors, key=lambda item: (item["code"], item["path"], item["message"])),
            "warnings": sorted(self.warnings, key=lambda item: (item["code"], item["path"], item["message"])),
            "digests": self.digests,
        }
        if self.component_family:
            payload["component_family"] = self.component_family
        return payload
        if self.component_family:
            payload["component_family"] = self.component_family
        return payload


def safe_relative(root: Path, value: str, report: Report, where: str) -> Path | None:
    if not value or Path(value).is_absolute() or ".." in Path(value).parts:
        report.add("UNSAFE_PATH", where, f"invalid relative path: {value}")
        return None
    candidate = (root / value).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        report.add("UNSAFE_PATH", where, f"path escapes target root: {value}")
        return None
    return candidate


def verify_file_digest(path: Path, recorded: dict[str, Any], report: Report, where: str) -> None:
    algorithm = recorded.get("algorithm")
    if algorithm == CANONICAL:
        actual = canonical_digest(load_document(path))
    elif algorithm == RAW:
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
    else:
        report.add("DIGEST_ALGORITHM_INVALID", where, f"unsupported digest algorithm: {algorithm}")
        return
    if actual != recorded.get("value"):
        report.add("DIGEST_MISMATCH", where, f"expected {recorded.get('value')}, computed {actual}")


def validate_schema_document(path: Path, schema_name: str, report: Report, where: str) -> Any | None:
    try:
        document = load_document(path)
    except Exception as exc:
        report.add("DOCUMENT_UNREADABLE", where, str(exc))
        return None
    report.errors.extend(schema_errors(document, schema_name, where))
    return document


def validate_manifest(path: Path, report: Report, kind: str) -> tuple[dict[str, Any] | None, dict[str, Path]]:
    manifest = validate_schema_document(path, "manifest.schema.json", report, "manifest")
    if manifest is None:
        return None, {}
    if manifest.get("schema") != "design-system/v1":
        report.add("SCHEMA_UNSUPPORTED", "manifest.schema", "only design-system/v1 is supported")
    layers: dict[str, Path] = {}
    for name, relative in manifest.get("layers", {}).items():
        resolved = safe_relative(path.parent, relative, report, f"manifest.layers.{name}")
        if resolved is None:
            continue
        if not resolved.is_file():
            report.add("LAYER_MISSING", f"manifest.layers.{name}", f"file does not exist: {relative}")
            continue
        layers[name] = resolved

    required = CAPABILITY_LAYERS[manifest.get("capability", "")]
    for name in required:
        if name not in layers:
            report.add("CAPABILITY_LAYER_MISSING", f"manifest.capability.{name}", "required layer is absent")
    for name in manifest.get("layers", {}):
        if name not in CAPABILITY_LAYERS[manifest["capability"]]:
            report.add("CAPABILITY_LAYER_FORBIDDEN", f"manifest.layers.{name}", "layer is outside declared capability")
        if name not in layers:
            continue
        schema_name = {
            "tokens": "tokens.schema.json",
            "primitives": "primitives.schema.json",
            "patterns": "patterns.schema.json",
            "page-types": "page-types.schema.json",
            "layout": "layout.schema.json",
            "rules": "rules.schema.json",
            "evidence": "evidence.schema.json",
        }[name]
        validate_schema_document(layers[name], schema_name, report, f"layers.{name}")
        recorded = manifest.get("layer_digests", {}).get(name)
        if recorded is None:
            if manifest.get("status") == "frozen":
                report.add("DIGEST_MISSING", f"manifest.layer_digests.{name}", "frozen contract requires layer digest")
        else:
            verify_file_digest(layers[name], recorded, report, f"manifest.layer_digests.{name}")

    contract_digest = manifest.get("contract_digest")
    if contract_digest is None:
        if manifest.get("status") == "frozen":
            report.add("DIGEST_MISSING", "manifest.contract_digest", "frozen contract requires contract digest")
    else:
        digest_input = dict(manifest)
        digest_input.pop("contract_digest", None)
        actual = canonical_digest(digest_input)
        if contract_digest.get("value") != actual:
            report.add("DIGEST_MISMATCH", "manifest.contract_digest", f"expected {contract_digest.get('value')}, computed {actual}")
    report.digests["contract"] = {
        "recorded": contract_digest,
        "computed": canonical_digest({**manifest, "contract_digest": None}),
    }
    report.digests["contract"]["computed"] = canonical_digest(digest_input)
    return manifest, layers


def validate_package_identity(root: Path, manifest: dict[str, Any], report: Report) -> None:
    meta_path = root / "meta.yaml"
    if not meta_path.is_file():
        report.add("META_MISSING", "meta.yaml", "package metadata is required")
        return
    meta = validate_schema_document(meta_path, "meta.schema.json", report, "meta")
    if not meta:
        return
    if meta.get("name") != manifest.get("id") or meta.get("version") != manifest.get("version"):
        report.add("IDENTITY_MISMATCH", "meta", "meta name/version must match manifest id/version")
    sources = {item.get("id") for item in meta.get("sources", [])}
    evidence_path = manifest.get("layers", {}).get("evidence")
    if evidence_path:
        evidence_file = safe_relative(root, evidence_path, report, "manifest.layers.evidence")
        if evidence_file and evidence_file.is_file():
            evidence = load_document(evidence_file)
            for item in evidence.get("items", []):
                if item.get("source_id") and item["source_id"] not in sources:
                    report.add("EVIDENCE_SOURCE_DANGLING", f"evidence.{item.get('id')}", f"unknown source {item.get('source_id')}")


def walk_tokens(node: Any, prefix: str = "") -> set[str]:
    found: set[str] = set()
    if isinstance(node, dict):
        for key, value in node.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            if isinstance(value, dict) and ("value" in value or "origin" in value):
                found.add(path)
            elif isinstance(value, dict):
                found.update(walk_tokens(value, path))
    return found


def collect_entities(layers: dict[str, Path], report: Report) -> tuple[dict[str, str], dict[str, list[str]], dict[str, Any]]:
    ids: dict[str, str] = {}
    refs: dict[str, list[str]] = {}
    documents: dict[str, Any] = {}
    for layer in ENTITY_LAYERS + ("rules",):
        path = layers.get(layer)
        if not path or not path.is_file():
            continue
        document = load_document(path)
        documents[layer] = document
        for item in document.get("items", []):
            entity_id = item.get("id")
            if not entity_id:
                continue
            if entity_id in ids:
                report.add("ID_DUPLICATE", f"layers.{layer}.{entity_id}", f"duplicate stable ID: {entity_id}")
            ids[entity_id] = layer
            values: list[str] = []
            for field in ("primitives", "patterns", "page_type", "rule_refs", "token_refs"):
                value = item.get(field)
                if isinstance(value, str):
                    values.append(value)
                elif isinstance(value, list):
                    values.extend(candidate for candidate in value if isinstance(candidate, str))
            refs[entity_id] = values
    return ids, refs, documents


def validate_references(ids: dict[str, str], refs: dict[str, list[str]], report: Report) -> None:
    for source_id, targets in sorted(refs.items()):
        for target in targets:
            if target.startswith("token/"):
                continue
            if target not in ids:
                report.add("REFERENCE_DANGLING", f"entities.{source_id}", f"unknown stable ID: {target}")


def derive_component_family(
    manifest: dict[str, Any],
    layers: dict[str, Path],
    ids: dict[str, str],
) -> dict[str, Any]:
    """Derive Page Type → Pattern → Primitive closure without an eighth layer."""
    capability = manifest.get("capability")
    result: dict[str, Any] = {
        "capability": capability,
        "families": [],
        "dangling": [],
        "unresolved_evidence": [],
    }
    if capability not in {"ui-kit", "page-system"}:
        return result
    evidence_targets: set[str] = set()
    evidence_layer = layers.get("evidence")
    if evidence_layer is not None and evidence_layer.is_file():
        for item in load_document(evidence_layer).get("items", []):
            if not isinstance(item, dict) or item.get("status", "active") != "active":
                continue
            target = item.get("target")
            if isinstance(target, str):
                evidence_targets.add(target)
    primitive_ids: list[str] = []
    primitives_layer = layers.get("primitives")
    if primitives_layer is not None and primitives_layer.is_file():
        primitive_ids = [
            item.get("id")
            for item in load_document(primitives_layer).get("items", [])
            if isinstance(item, dict) and isinstance(item.get("id"), str)
        ]
    pattern_primitives: dict[str, list[str]] = {}
    patterns_layer = layers.get("patterns")
    if patterns_layer is not None and patterns_layer.is_file():
        for item in load_document(patterns_layer).get("items", []):
            if not isinstance(item, dict):
                continue
            pattern_id = item.get("id")
            if isinstance(pattern_id, str):
                pattern_primitives[pattern_id] = [
                    ref for ref in item.get("primitives", []) if isinstance(ref, str)
                ]
    page_types_layer = layers.get("page-types")
    page_types = (
        load_document(page_types_layer).get("items", [])
        if page_types_layer is not None and page_types_layer.is_file()
        else []
    )
    for item in page_types:
        if not isinstance(item, dict):
            continue
        page_type = item.get("id")
        if not isinstance(page_type, str):
            continue
        closure_patterns: list[str] = []
        closure_primitives: set[str] = set()
        for pattern in item.get("patterns", []):
            if not isinstance(pattern, str):
                continue
            if pattern not in ids:
                result["dangling"].append({"source": page_type, "target": pattern})
                continue
            closure_patterns.append(pattern)
            for primitive in pattern_primitives.get(pattern, []):
                if primitive not in ids:
                    result["dangling"].append({"source": pattern, "target": primitive})
                    continue
                closure_primitives.add(primitive)
        members = [page_type, *closure_patterns, *sorted(closure_primitives)]
        result["families"].append({
            "page_type": page_type,
            "patterns": closure_patterns,
            "primitives": sorted(closure_primitives),
            "members": members,
        })
        result["unresolved_evidence"].extend(
            {"entity": member, "page_type": page_type}
            for member in members
            if member not in evidence_targets
        )
    if capability == "ui-kit":
        for primitive in primitive_ids:
            if primitive not in evidence_targets:
                result["unresolved_evidence"].append({"entity": primitive, "page_type": None})
    return result


def enforce_family_closure(component_family: dict[str, Any], report: Report) -> None:
    """Fail closed when a family member cannot enter a published Component Family."""
    for dangling in component_family.get("dangling", []):
        report.add(
            "FAMILY_DANGLING_REFERENCE",
            f"component_family.{dangling.get('source')}",
            f"unknown stable ID: {dangling.get('target')}",
        )
    for item in component_family.get("unresolved_evidence", []):
        report.add(
            "FAMILY_EVIDENCE_MISSING",
            f"component_family.{item.get('entity')}",
            "family member lacks resolvable evidence and cannot enter a published Component Family",
        )


def validate_inventory(path: Path) -> Report:
    report = Report("certification-inventory", path)
    try:
        document = load_document(path)
    except Exception as exc:
        report.add("DOCUMENT_UNREADABLE", "inventory", str(exc))
        return report
    if document.get("schema") != INVENTORY_SCHEMA:
        report.add("SCHEMA_UNSUPPORTED", "schema", f"only {INVENTORY_SCHEMA} is supported")
        return report
    oracle = document.get("oracle")
    revision = oracle.get("revision") if isinstance(oracle, dict) else None
    if not isinstance(revision, str) or not re.fullmatch(r"[0-9a-f]{8,64}", revision):
        report.add("INVENTORY_ORACLE_MISSING", "oracle.revision", "inventory requires a replayable oracle revision")
    patterns = document.get("patterns")
    if not isinstance(patterns, list) or not patterns:
        report.add("INVENTORY_EMPTY", "patterns", "inventory must list at least one pattern")
        patterns = []
    seen: set[str] = set()
    expected_primitives: dict[str, int] = {}
    for index, item in enumerate(patterns):
        where = f"patterns.{index}"
        if not isinstance(item, dict):
            report.add("INVENTORY_PATTERN_INVALID", where, "pattern entry must be an object")
            continue
        pattern_id = item.get("id")
        if not isinstance(pattern_id, str) or not pattern_id.startswith("pattern/"):
            report.add("INVENTORY_PATTERN_INVALID", f"{where}.id", f"invalid pattern id: {pattern_id}")
        elif pattern_id in seen:
            report.add("INVENTORY_DUPLICATE", f"{where}.id", f"duplicate inventory pattern: {pattern_id}")
        else:
            seen.add(pattern_id)
        facts = item.get("source_facts")
        if (
            not isinstance(facts, list)
            or not facts
            or not all(isinstance(fact, str) and fact and not fact.startswith("/") for fact in facts)
        ):
            report.add("INVENTORY_PROVENANCE_MISSING", f"{where}.source_facts", "pattern requires replayable, non-absolute source facts")
        page_type = item.get("page_type")
        if page_type is not None and (not isinstance(page_type, str) or not page_type.startswith("page-type/")):
            report.add("INVENTORY_PATTERN_INVALID", f"{where}.page_type", f"invalid page type id: {page_type}")
        max_primitives = item.get("expected_member_primitives")
        if max_primitives is not None and (not isinstance(max_primitives, int) or isinstance(max_primitives, bool) or max_primitives < 1):
            report.add("INVENTORY_PATTERN_INVALID", f"{where}.expected_member_primitives", "expected_member_primitives must be a positive integer")
        elif isinstance(max_primitives, int) and isinstance(pattern_id, str):
            expected_primitives[pattern_id] = max_primitives
    report.inventory_patterns = sorted(seen)
    report.inventory_expected_primitives = expected_primitives
    return report


def validate_certification(
    path: Path,
    *,
    inventory: Path | None = None,
    package_root: Path | None = None,
    evidence_root: Path | None = None,
) -> dict[str, Any]:
    report = Report("certification", path)
    document = validate_schema_document(path, "fidelity-certification.schema.json", report, "certification")
    if document is None:
        return report.to_dict()
    gate = document["gate"]
    records = document.get("records", [])
    gate_package_digest = gate["package"].get("digest")
    build_identity = gate["build"].get("identity")
    oracle_revision = gate["oracle"].get("revision")

    if package_root is not None:
        manifest_path = package_root / "design-system.yaml"
        if not manifest_path.is_file():
            report.add("MANIFEST_MISSING", "design-system.yaml", "candidate design-system.yaml is required")
        else:
            manifest = load_document(manifest_path)
            if manifest.get("id") != gate["package"]["id"] or manifest.get("version") != gate["package"]["version"]:
                report.add("CERT_PACKAGE_IDENTITY_MISMATCH", "gate.package", "candidate id/version does not match the certification gate")
            digest_input = dict(manifest)
            digest_input.pop("contract_digest", None)
            if gate_package_digest and gate_package_digest.get("value") != canonical_digest(digest_input):
                report.add("CERT_PACKAGE_DIGEST_MISMATCH", "gate.package.digest", "candidate package digest does not match the certification gate")

    inventory_patterns: list[str] | None = None
    inventory_expected_primitives: dict[str, int] = {}
    if inventory is not None:
        inventory_report = validate_inventory(inventory)
        if inventory_report.errors:
            report.add("INVENTORY_INVALID", "inventory", "certification inventory failed validation")
        else:
            inventory_patterns = inventory_report.inventory_patterns
            inventory_expected_primitives = inventory_report.inventory_expected_primitives

    pattern_primitive_counts: dict[str, int] = {}
    if package_root is not None and (package_root / "design-system.yaml").is_file():
        manifest = load_document(package_root / "design-system.yaml")
        layer_paths: dict[str, Path] = {}
        for name, relative in manifest.get("layers", {}).items():
            layer_candidate = safe_relative(package_root, relative, report, f"layers.{name}")
            if layer_candidate is not None and layer_candidate.is_file():
                layer_paths[name] = layer_candidate
        patterns_layer = layer_paths.get("patterns")
        if patterns_layer is not None and patterns_layer.is_file():
            for item in load_document(patterns_layer).get("items", []):
                if isinstance(item, dict) and isinstance(item.get("id"), str):
                    pattern_primitive_counts[item["id"]] = len([
                        ref for ref in item.get("primitives", []) if isinstance(ref, str)
                    ])

    root = (evidence_root or path.parent).resolve()
    passed_patterns: set[str] = set()
    failed_records = False
    for index, record in enumerate(records):
        where = f"records.{index}"
        if gate_package_digest and record.get("package_digest") != gate_package_digest:
            report.add("CERT_RECORD_PACKAGE_DIGEST_MISMATCH", f"{where}.package_digest", "record is bound to a different package digest")
        if record.get("build_identity") != build_identity:
            report.add("CERT_BUILD_STALE", f"{where}.build_identity", "record build identity does not match the gate build")
        if record.get("oracle_revision") != oracle_revision:
            report.add("CERT_ORACLE_STALE", f"{where}.oracle_revision", "record oracle revision does not match the gate oracle")
        assertions = record.get("assertions", [])
        if record.get("verdict") == "passed":
            if not any(isinstance(a, dict) and a.get("method") in MEASURABLE_ASSERTION_METHODS for a in assertions):
                report.add("CERT_ASSERTION_NOT_MEASURABLE", f"{where}.assertions", "screenshot-only evidence cannot pass; at least one measurable assertion is required")
            if any(isinstance(a, dict) and a.get("result") == "failed" for a in assertions):
                report.add("CERT_VERDICT_CONTRADICTED", f"{where}.verdict", "passed record contains failed assertions")
        evidence = record.get("evidence", {})
        for key in ("current_screenshot", "oracle_screenshot"):
            ref = evidence.get(key)
            if not ref:
                report.add("CERT_EVIDENCE_MISSING", f"{where}.evidence.{key}", "screenshot evidence ref is required")
                continue
            candidate = safe_relative(root, ref, report, f"{where}.evidence.{key}")
            if candidate is not None and not candidate.is_file():
                report.add("CERT_EVIDENCE_MISSING", f"{where}.evidence.{key}", f"evidence file does not exist: {ref}")
        if inventory_patterns is not None and record.get("pattern") not in inventory_patterns:
            report.add("CERT_RECORD_NOT_IN_INVENTORY", f"{where}.pattern", "record pattern is not part of the certification inventory")
        pattern_id = record.get("pattern")
        if isinstance(pattern_id, str) and pattern_id in inventory_expected_primitives:
            expected = inventory_expected_primitives[pattern_id]
            actual = pattern_primitive_counts.get(pattern_id, 0)
            if actual > expected:
                report.add(
                    "CERT_OVER_FRAGMENTED",
                    f"{where}.pattern",
                    f"candidate splits one source pattern into {actual} primitives; inventory expects at most {expected}",
                )
        if record.get("verdict") == "passed":
            passed_patterns.add(record.get("pattern"))
        else:
            failed_records = True
    if inventory_patterns is not None:
        for pattern in inventory_patterns:
            if pattern not in passed_patterns:
                report.add("CERT_RECORD_MISSING", f"inventory.{pattern}", "inventory pattern has no passed Pattern Equivalence Record")
    if document.get("status") == "passed" and (failed_records or (inventory_patterns is not None and any(pattern not in passed_patterns for pattern in inventory_patterns))):
        report.add("CERT_STATUS_CONTRADICTED", "status", "passed gate contains failed or missing records")
    return report.to_dict()


def validate_binding(root: Path, manifest: dict[str, Any], layers: dict[str, Path], report: Report) -> dict[str, Any] | None:
    binding_path = root / "binding.yaml"
    if not binding_path.is_file():
        report.add("BINDING_MISSING", "binding.yaml", "active instance requires binding.yaml")
        return None
    binding = validate_schema_document(binding_path, "binding.schema.json", report, "binding")
    if not binding:
        return None
    if binding.get("contract_id") != manifest.get("id") or binding.get("contract_version") != manifest.get("version"):
        report.add("IDENTITY_MISMATCH", "binding", "binding contract identity does not match manifest")
    binding_digest = binding.get("binding_digest")
    if binding_digest is None:
        report.add("DIGEST_MISSING", "binding.binding_digest", "binding digest is required")
    else:
        digest_input = dict(binding)
        digest_input.pop("binding_digest", None)
        actual = canonical_digest(digest_input)
        if binding_digest.get("value") != actual:
            report.add("DIGEST_MISMATCH", "binding.binding_digest", f"expected {binding_digest.get('value')}, computed {actual}")
    report.digests["binding"] = {"recorded": binding_digest, "computed": canonical_digest(dict(binding) | {"binding_digest": None}) if binding_digest is None else actual}

    tokens_doc = load_document(layers["tokens"]) if "tokens" in layers else {}
    token_paths = walk_tokens(tokens_doc.get("tokens", {}))
    for projection in binding.get("projections", []):
        target = safe_relative(root, projection.get("target", ""), report, f"binding.projections.{projection.get('name')}.target")
        if target is None:
            continue
        if not target.is_file():
            report.add("PROJECTION_TARGET_MISSING", f"binding.projections.{projection.get('name')}", f"missing {projection.get('target')}")
        elif projection.get("digest"):
            verify_file_digest(target, projection["digest"], report, f"binding.projections.{projection.get('name')}.digest")
        for mapping in projection.get("mappings", []):
            token = mapping.get("token", "")
            if token.startswith("token/"):
                token = token[len("token/"):]
            current: Any = tokens_doc.get("tokens", {})
            found = True
            for part in token.split("."):
                if not isinstance(current, dict) or part not in current:
                    found = False
                    break
                current = current[part]
            if not found:
                report.add("PROJECTION_TOKEN_DANGLING", f"binding.projections.{projection.get('name')}.mappings", f"unknown token: {mapping.get('token')}")
    return binding


def validate_target(target: Path, kind: str, *, require_component_family: bool = False) -> dict[str, Any]:
    report = Report(kind, target)
    manifest_path = target / "design-system.yaml"
    if not manifest_path.is_file():
        report.add("MANIFEST_MISSING", "design-system.yaml", "design-system.yaml is required")
        return report.to_dict()
    manifest, layers = validate_manifest(manifest_path, report, kind)
    if manifest is None:
        return report.to_dict()
    has_binding = (target / "binding.yaml").is_file()
    if kind == "package" and has_binding:
        report.add("BINDING_FORBIDDEN", "binding.yaml", "portable package must not contain project binding")
    if kind == "active" and not has_binding:
        report.add("BINDING_MISSING", "binding.yaml", "active instance requires binding.yaml")
    validate_package_identity(target, manifest, report)
    ids, refs, _ = collect_entities(layers, report)
    validate_references(ids, refs, report)
    report.component_family = derive_component_family(manifest, layers, ids)
    if require_component_family:
        enforce_family_closure(report.component_family, report)
    if kind == "active":
        validate_binding(target, manifest, layers, report)
    return report.to_dict()


def validate_migration(path: Path, target_root: Path | None = None) -> dict[str, Any]:
    report = Report("migration", path)
    receipt = validate_schema_document(path, "migration.schema.json", report, "receipt")
    if receipt is None:
        return report.to_dict()
    if receipt.get("unresolved"):
        report.add("MIGRATION_UNRESOLVED", "unresolved", f"{len(receipt['unresolved'])} item(s) remain")
    if receipt.get("errors"):
        report.add("MIGRATION_ERROR", "errors", f"{len(receipt['errors'])} error(s) remain")
    if receipt.get("status") == "failed" and not (receipt.get("unresolved") or receipt.get("errors")):
        report.add("MIGRATION_STATUS_INVALID", "status", "failed receipt requires unresolved items or errors")
    if target_root is not None:
        if receipt.get("target", {}).get("kind") == "package" and (target_root / "binding.yaml").exists():
            report.add("MIGRATION_TARGET_INVALID", "target", "package target contains binding.yaml")
        if receipt.get("target", {}).get("kind") == "active-instance" and not (target_root / "binding.yaml").exists():
            report.add("MIGRATION_TARGET_INVALID", "target", "active-instance target lacks binding.yaml")
    report.digests["source"] = receipt.get("source", {}).get("digest")
    report.digests["target"] = receipt.get("target", {}).get("digest")
    return report.to_dict()


def validate_vendor(path: Path) -> dict[str, Any]:
    report = Report("vendor", path)
    manifest = validate_schema_document(path, "vendor.schema.json", report, "manifest")
    if manifest is None:
        return report.to_dict()
    for vendor in manifest.get("vendors", []):
        root = safe_relative(path.parent, vendor.get("path", ""), report, f"vendors.{vendor.get('name')}.path")
        if root is None:
            continue
        if not root.is_dir():
            report.add("VENDOR_PATH_MISSING", f"vendors.{vendor.get('name')}", f"missing directory {vendor.get('path')}")
            continue
        declared = {record.get("path") for record in vendor.get("files", [])}
        for actual in sorted(root.rglob("*")):
            relative = actual.relative_to(root).as_posix()
            if actual.is_file() and relative not in declared:
                report.add("VENDOR_FILE_UNMANIFESTED", f"vendors.{vendor.get('name')}.files.{relative}", "file is not allowlisted")
        for file_record in vendor.get("files", []):
            file_path = safe_relative(root, file_record.get("path", ""), report, f"vendors.{vendor.get('name')}.files")
            if file_path is None:
                continue
            if not file_path.is_file():
                report.add("VENDOR_FILE_MISSING", f"vendors.{vendor.get('name')}.files.{file_record.get('path')}", "file is absent")
                continue
            actual = hashlib.sha256(file_path.read_bytes()).hexdigest()
            if file_record.get("digest", {}).get("algorithm") != RAW or file_record.get("digest", {}).get("value") != actual:
                report.add("DIGEST_MISMATCH", f"vendors.{vendor.get('name')}.files.{file_record.get('path')}", f"expected raw sha256 {actual}")
    return report.to_dict()


def validate_feedback(path: Path, evidence_root: Path | None = None) -> dict[str, Any]:
    report = Report("feedback", path)
    feedback = validate_schema_document(path, "feedback.schema.json", report, "feedback")
    if feedback is None:
        return report.to_dict()
    if feedback.get("ownership") != "package":
        report.add("FEEDBACK_OWNERSHIP_INVALID", "ownership", "only package feedback is accepted by Author")
    if feedback.get("status_history") and feedback["status_history"][0].get("from") is not None:
        report.add("FEEDBACK_HISTORY_INVALID", "status_history.0", "initial transition must start at null")
    for index, transition in enumerate(feedback.get("status_history", [])):
        if index and transition.get("from") != feedback["status_history"][index - 1].get("to"):
            report.add("FEEDBACK_HISTORY_INVALID", f"status_history.{index}", "transition.from does not match previous state")
        if index and not transition.get("reason"):
            report.add("FEEDBACK_HISTORY_INVALID", f"status_history.{index}", "non-initial transition requires reason")
    for reference in feedback.get("evidence_refs", []):
        candidate = safe_relative((path.parent if evidence_root is None else evidence_root), reference, report, "evidence_refs")
        if candidate is not None and not candidate.exists():
            report.add("EVIDENCE_REF_MISSING", f"evidence_refs.{reference}", "evidence path does not exist")
    return report.to_dict()


def compute_manifest_digest(path: Path) -> dict[str, Any]:
    manifest = load_document(path)
    manifest = dict(manifest)
    manifest.pop("contract_digest", None)
    layer_digests: dict[str, str] = {}
    for name, relative in manifest.get("layers", {}).items():
        layer_digests[name] = canonical_digest(load_document(path.parent / relative))
    return {
        "algorithm": CANONICAL,
        "layer_digests": layer_digests,
        "contract_digest": canonical_digest(manifest),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    validate = sub.add_parser("validate")
    validate.add_argument("target", type=Path)
    validate.add_argument("--kind", choices=("package", "active"), required=True)
    validate.add_argument(
        "--require-component-family",
        action="store_true",
        help="fail closed when family members lack evidence or have dangling references",
    )
    validate.add_argument("--migration", type=Path)
    validate.add_argument("--migration-target", type=Path)
    validate.add_argument("--vendor", type=Path)
    validate.add_argument("--json", action="store_true", help="stable JSON output; JSON is also the default")
    compute = sub.add_parser("compute-digest")
    compute.add_argument("manifest", type=Path)
    feedback = sub.add_parser("validate-feedback")
    feedback.add_argument("record", type=Path)
    feedback.add_argument("--evidence-root", type=Path)
    certification = sub.add_parser("validate-certification")
    certification.add_argument("report", type=Path)
    certification.add_argument("--inventory", type=Path)
    certification.add_argument("--package-root", type=Path)
    certification.add_argument("--evidence-root", type=Path)
    inventory = sub.add_parser("validate-inventory")
    inventory.add_argument("document", type=Path)
    args = parser.parse_args(argv)
    if args.command == "compute-digest":
        print(json.dumps(compute_manifest_digest(args.manifest), ensure_ascii=False, sort_keys=True, indent=2))
        return 0
    if args.command == "validate-feedback":
        print(json.dumps(validate_feedback(args.record.resolve(), args.evidence_root.resolve() if args.evidence_root else None), ensure_ascii=False, sort_keys=True, indent=2))
        return 0 if validate_feedback(args.record.resolve(), args.evidence_root.resolve() if args.evidence_root else None)["valid"] else 1
    if args.command == "validate-certification":
        payload = validate_certification(
            args.report.resolve(),
            inventory=args.inventory.resolve() if args.inventory else None,
            package_root=args.package_root.resolve() if args.package_root else None,
            evidence_root=args.evidence_root.resolve() if args.evidence_root else None,
        )
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
        return 0 if payload["valid"] else 1
    if args.command == "validate-inventory":
        payload = validate_inventory(args.document.resolve()).to_dict()
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
        return 0 if payload["valid"] else 1

    reports = [validate_target(args.target.resolve(), args.kind, require_component_family=args.require_component_family)]
    if args.migration:
        reports.append(validate_migration(args.migration.resolve(), args.migration_target.resolve() if args.migration_target else None))
    if args.vendor:
        reports.append(validate_vendor(args.vendor.resolve()))
    valid = all(item["valid"] for item in reports)
    output = reports[0] if len(reports) == 1 else {
        "schema_version": 1,
        "valid": valid,
        "results": reports,
    }
    print(json.dumps(output, ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
