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
IMAGE_MAGIC_PREFIXES = (
    b"\x89PNG\r\n\x1a\n",
    b"\xff\xd8\xff",
    b"GIF87a",
    b"GIF89a",
)
ORACLE_EVIDENCE_CODES = frozenset({
    "CERT_ORACLE_EVIDENCE_PLACEHOLDER",
    "CERT_ORACLE_MEASUREMENT_INVALID",
    "CERT_ASSERTION_UNANCHORED",
})
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
        self.placement: dict[str, Any] | None = None
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
        if self.placement is not None:
            payload["placement"] = self.placement
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
    declared_revisions: dict[str, set[str]] = {}
    for item in meta.get("sources", []):
        source_id = item.get("id")
        if isinstance(source_id, str):
            declared_revisions.setdefault(source_id, set()).add(str(item.get("revision", "")))
    evidence_path = manifest.get("layers", {}).get("evidence")
    if evidence_path:
        evidence_file = safe_relative(root, evidence_path, report, "manifest.layers.evidence")
        if evidence_file and evidence_file.is_file():
            evidence = load_document(evidence_file)
            for item in evidence.get("items", []):
                where = f"evidence.{item.get('id')}"
                source_id = item.get("source_id")
                revision = item.get("source_revision")
                if source_id and source_id not in sources:
                    report.add("EVIDENCE_SOURCE_DANGLING", where, f"unknown source {source_id}")
                    continue
                if revision and not source_id:
                    report.add(
                        "EVIDENCE_REVISION_UNDECLARED",
                        where,
                        "source_revision present without source_id; cannot resolve against meta.sources",
                    )
                    continue
                if source_id and revision and str(revision) not in declared_revisions.get(str(source_id), set()):
                    report.add(
                        "EVIDENCE_REVISION_UNDECLARED",
                        where,
                        f"source_revision {revision} is not declared by meta.sources[{source_id}]",
                    )


CONFIDENCE_ORDER = {"high": 3, "medium": 2, "low": 1}


def validate_coverage_and_confidence(root: Path, report: Report) -> None:
    """Coverage must be a complete, mutually exclusive partition; confidence must match it."""
    meta_path = root / "meta.yaml"
    if not meta_path.is_file():
        return
    try:
        meta = load_document(meta_path)
    except Exception:
        return
    if not isinstance(meta, dict):
        return
    coverage = meta.get("coverage")
    if isinstance(coverage, dict):
        for dimension, entry in sorted(coverage.items()):
            if not isinstance(entry, dict):
                continue
            declared = {item for item in entry.get("declared", []) if isinstance(item, str)}
            buckets = {
                name: {item for item in entry.get(name, []) if isinstance(item, str)}
                for name in ("observed", "defaulted", "unsupported")
            }
            for item in sorted(declared | set().union(*buckets.values())):
                memberships = sorted(name for name, values in buckets.items() if item in values)
                where = f"meta.coverage.{dimension}.{item}"
                if len(memberships) > 1:
                    report.add(
                        "COVERAGE_PARTITION_INVALID",
                        where,
                        f"item appears in multiple classification buckets: {memberships}",
                    )
                elif item in declared and not memberships:
                    report.add(
                        "COVERAGE_PARTITION_INVALID",
                        where,
                        "declared item is not classified as observed/defaulted/unsupported",
                    )
                elif item in buckets["observed"] and item not in declared:
                    report.add("COVERAGE_PARTITION_INVALID", where, "observed item is not declared")
    confidence = meta.get("confidence")
    if not isinstance(confidence, dict):
        return
    overall = confidence.get("overall")
    required = {
        name: confidence[name]
        for name in ("layout", "visual", "components")
        if isinstance(confidence.get(name), str)
    }
    if isinstance(overall, str) and overall in CONFIDENCE_ORDER and required:
        weakest_name, weakest_value = min(required.items(), key=lambda pair: CONFIDENCE_ORDER.get(pair[1], 99))
        if CONFIDENCE_ORDER.get(overall, 0) > CONFIDENCE_ORDER.get(weakest_value, 99):
            report.add(
                "CONFIDENCE_INCONSISTENT",
                "meta.confidence.overall",
                f"overall {overall} exceeds weakest required dimension {weakest_name}={weakest_value}",
            )
    components_confidence = confidence.get("components")
    if components_confidence == "high" and isinstance(coverage, dict):
        components_coverage = coverage.get("components")
        if isinstance(components_coverage, dict) and components_coverage.get("defaulted"):
            report.add(
                "CONFIDENCE_INCONSISTENT",
                "meta.confidence.components",
                "components confidence cannot be high while coverage.components lists defaulted items",
            )


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


VISUAL_COLOR_ROLES = {
    "canvas": ("color.app-shell", "color.page-canvas"),
    "surface": ("color.surface",),
    "surface-hover": ("color.surface-hover",),
    "surface-selected": ("color.surface-selected",),
    "border": ("color.surface-border",),
    "divider": ("color.divider",),
    "text-primary": ("color.text-primary",),
    "text-secondary": ("color.text-secondary",),
    "text-muted": ("color.text-muted",),
    "text-disabled": ("color.text-disabled",),
    "text-on-primary": ("color.text-on-primary",),
    "link": ("color.link",),
    "brand-primary": ("color.primary",),
    "brand-hover": ("color.primary-hover",),
    "status-success": ("color.status-success",),
    "status-warning": ("color.status-warning",),
    "status-danger": ("color.status-danger",),
}
VISUAL_TYPE_ROLES = ("typography.heading", "typography.body", "typography.secondary")


def _token_record(tokens: dict[str, Any], path: str) -> dict[str, Any] | None:
    current: Any = tokens
    for segment in path.split("."):
        if not isinstance(current, dict) or segment not in current:
            return None
        current = current[segment]
    return current if isinstance(current, dict) and "value" in current and "origin" in current else None


def validate_visual_role_closure(layers: dict[str, Path], report: Report) -> None:
    """High-fidelity packages must expose visual roles, not only sampled values."""
    token_path = layers.get("tokens")
    token_document = load_document(token_path) if token_path and token_path.is_file() else {}
    tokens = token_document.get("tokens")
    if not isinstance(tokens, dict):
        report.add("VISUAL_ROLE_MISSING", "layers.tokens", "visual role closure requires a token document")
        return
    for role, paths in VISUAL_COLOR_ROLES.items():
        present = [(path, record) for path in paths if (record := _token_record(tokens, path)) is not None]
        if not present:
            report.add("VISUAL_ROLE_MISSING", f"tokens.{role}", f"missing required visual role: {role}")
        elif all(record.get("origin") == "default" for _, record in present):
            report.add(
                "VISUAL_ROLE_DEFAULTED",
                f"tokens.{role}",
                f"visual role {role} cannot be satisfied only by default tokens",
            )
    for role in VISUAL_TYPE_ROLES:
        record = _token_record(tokens, role)
        if record is None:
            report.add("TYPOGRAPHY_ROLE_MISSING", f"tokens.{role}", f"missing required typography role: {role}")
        elif record.get("origin") == "default":
            report.add(
                "TYPOGRAPHY_ROLE_DEFAULTED",
                f"tokens.{role}",
                f"typography role {role} cannot be satisfied by a default token",
            )


def _declared_token_paths(node: Any, prefix: str = "") -> set[str]:
    """All dotted token paths, including group paths, not just leaves."""
    paths: set[str] = set()
    if isinstance(node, dict):
        for key, value in node.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            paths.add(path)
            if isinstance(value, dict) and "value" not in value:
                paths |= _declared_token_paths(value, path)
    return paths


def _evidence_target_resolves(target: Any, surfaces: set[str]) -> bool:
    if not isinstance(target, str) or not target.strip():
        return False
    if target in surfaces:
        return True
    parts = [part for part in target.split("/") if part]
    return bool(parts) and all(part in surfaces for part in parts)


def _declared_surfaces(layers: dict[str, Path], ids: dict[str, str]) -> set[str]:
    surfaces: set[str] = set(ids)
    tokens_path = layers.get("tokens")
    if tokens_path and tokens_path.is_file():
        for path in _declared_token_paths(load_document(tokens_path).get("tokens", {})):
            surfaces.add(path)
            surfaces.add(f"token/{path}")
    return surfaces


def _evidence_items(layers: dict[str, Path]) -> list[dict[str, Any]]:
    path = layers.get("evidence")
    if not path or not path.is_file():
        return []
    document = load_document(path)
    if not isinstance(document, dict):
        return []
    return [item for item in document.get("items", []) if isinstance(item, dict)]


def _evidence_surface(item: dict[str, Any]) -> str | None:
    for key in ("surface", "locator", "target"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def validate_claim_admission(
    layers: dict[str, Path],
    ids: dict[str, str],
    report: Report,
) -> None:
    """Three-proof admission: Observation, Basis and Consequence per evidence item."""
    items = _evidence_items(layers)
    if not items:
        return
    by_id = {item.get("id"): item for item in items if isinstance(item.get("id"), str)}
    surfaces = _declared_surfaces(layers, ids)
    for evidence_id in sorted(by_id):
        item = by_id[evidence_id]
        where = f"evidence.{evidence_id}"
        origin = item.get("origin")
        kind = item.get("kind")
        if origin == "default":
            if not (item.get("basis") or item.get("decision_id")):
                report.add(
                    "CLAIM_ADMISSION_INCOMPLETE",
                    where,
                    "default evidence requires basis or decision_id",
                )
            continue
        if kind in ("basis", "default"):
            continue
        if origin not in ("source", "computed"):
            continue
        if not item.get("locator"):
            report.add("CLAIM_ADMISSION_INCOMPLETE", where, "observed evidence requires a locator (Observation)")
        if not (item.get("method") or item.get("basis")):
            report.add("CLAIM_ADMISSION_INCOMPLETE", where, "observed evidence requires method or basis (Basis)")
        if not _evidence_target_resolves(item.get("target"), surfaces):
            report.add(
                "CLAIM_ADMISSION_INCOMPLETE",
                where,
                "evidence target does not resolve to a declared token path or stable entity (Consequence)",
            )
    for evidence_id in sorted(by_id):
        item = by_id[evidence_id]
        if item.get("scope") != "product":
            continue
        where = f"evidence.{evidence_id}"
        references = [ref for ref in item.get("recurrence_refs", []) if isinstance(ref, str)]
        problems: list[str] = []
        recurrence_surfaces: set[str] = set()
        for reference in references:
            target_item = by_id.get(reference)
            if target_item is None or target_item.get("status") == "superseded":
                problems.append(f"recurrence_ref {reference} does not resolve to active evidence")
                continue
            surface = _evidence_surface(target_item)
            if surface:
                recurrence_surfaces.add(surface)
        if len(recurrence_surfaces) < 2:
            problems.append("product scope requires at least two distinct sampled surfaces")
        if problems:
            report.add("RECURRENCE_UNSUPPORTED", where, "; ".join(problems))


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


def validate_primitive_contracts(
    layers: dict[str, Path],
    documents: dict[str, Any],
    report: Report,
) -> None:
    """Variant styling contracts: resolve tokens/rules and bind contexts."""
    primitives = documents.get("primitives")
    if not isinstance(primitives, dict):
        return
    token_paths = walk_tokens((documents.get("tokens") or {}).get("tokens", {})) if "tokens" in documents else set()
    if not token_paths and layers.get("tokens") and layers["tokens"].is_file():
        token_paths = walk_tokens(load_document(layers["tokens"]).get("tokens", {}))
    rule_ids = {
        item.get("id")
        for item in (documents.get("rules") or {}).get("items", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    for item in primitives.get("items", []):
        if not isinstance(item, dict):
            continue
        pid = item.get("id", "<primitive>")
        variants = [v for v in item.get("variants") or [] if isinstance(v, str)]
        contracts = item.get("variant_contracts")
        if not isinstance(contracts, dict):
            continue
        for variant, contract in sorted(contracts.items()):
            where = f"layers.primitives.{pid}.variant_contracts.{variant}"
            if variants and variant not in variants and variant != "default":
                report.add("PRIMITIVE_CONTRACT_INVALID", where, "contract variant is not a declared variant", variant=variant)
                continue
            if not isinstance(contract, dict):
                continue
            for field in ("radius", "control_height", "hover", "active"):
                ref = contract.get(field)
                if isinstance(ref, str) and ref.removeprefix("token/") not in token_paths:
                    report.add("PRIMITIVE_CONTRACT_INVALID", f"{where}.{field}", f"token path is dangling: {ref}")
            focus = contract.get("focus_ref")
            if isinstance(focus, str) and focus.startswith("rule/") and focus not in rule_ids:
                report.add("PRIMITIVE_CONTRACT_INVALID", f"{where}.focus_ref", f"focus rule ref is dangling: {focus}")
        bindings = item.get("context_bindings")
        if isinstance(bindings, dict):
            for context, binding in sorted(bindings.items()):
                where = f"layers.primitives.{pid}.context_bindings.{context}"
                if not isinstance(binding, dict):
                    continue
                for field in ("selected", "hover"):
                    ref = binding.get(field)
                    if isinstance(ref, str) and ref.removeprefix("token/") not in token_paths:
                        report.add("PRIMITIVE_CONTRACT_INVALID", f"{where}.{field}", f"token path is dangling: {ref}")


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


def validate_placement(
    manifest: dict[str, Any],
    layers: dict[str, Path],
    ids: dict[str, str],
    documents: dict[str, Any],
    report: Report,
) -> dict[str, Any]:
    """Validate optional generic topology and its Page Type/evidence closure."""
    result: dict[str, Any] = {"scenes": 0, "scenes_with_placement": 0, "errors": 0}
    layouts = layers.get("layout")
    if layouts is None or not layouts.is_file():
        report.placement = result
        return result
    layout_document = documents.get("layout") or load_document(layouts)
    evidence_layer = layers.get("evidence")
    evidence_document = documents.get("evidence") or (
        load_document(evidence_layer) if evidence_layer is not None and evidence_layer.is_file() else {}
    )
    evidence_ids = {
        item.get("id")
        for item in evidence_document.get("items", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    tokens_layer = layers.get("tokens")
    tokens_document = documents.get("tokens") or (
        load_document(tokens_layer) if tokens_layer is not None and tokens_layer.is_file() else {}
    )
    token_paths = walk_tokens(tokens_document.get("tokens", {}))
    page_type_patterns = {
        item.get("id"): [value for value in item.get("patterns", []) if isinstance(value, str)]
        for item in documents.get("page-types", {}).get("items", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }

    def fail(path: str, message: str, **details: Any) -> None:
        result["errors"] += 1
        rendered = message if not details else f"{message}: {canonical_json(details)}"
        report.add("PLACEMENT_CLOSURE_INVALID", path, rendered)

    for item in layout_document.get("items", []):
        if not isinstance(item, dict) or not isinstance(item.get("placement"), dict):
            continue
        result["scenes_with_placement"] += 1
        scene = item["placement"]
        route_id = item.get("id", "<route>")
        page_type = item.get("page_type")
        scene_id = scene.get("id", "<scene>")
        result["scenes"] += 1
        regions = scene.get("regions", [])
        region_ids = {
            region.get("id")
            for region in regions
            if isinstance(region, dict) and isinstance(region.get("id"), str)
        }
        if len(region_ids) != len(regions):
            fail(f"layers.layout.{route_id}.placement.regions", "region IDs must be unique", scene=scene_id)
        for region in regions:
            if not isinstance(region, dict) or not isinstance(region.get("id"), str):
                continue
            parent = region.get("parent")
            if parent is not None and parent not in region_ids:
                fail(
                    f"layers.layout.{route_id}.placement.regions.{region['id']}.parent",
                    "placement region parent is dangling",
                    parent=parent,
                )
        slot_ids: set[str] = set()
        for slot in scene.get("slots", []):
            if not isinstance(slot, dict) or not isinstance(slot.get("id"), str):
                continue
            if slot["id"] in slot_ids:
                fail(f"layers.layout.{route_id}.placement.slots.{slot['id']}", "slot ID is duplicate")
            slot_ids.add(slot["id"])
            if slot.get("region") not in region_ids:
                fail(
                    f"layers.layout.{route_id}.placement.slots.{slot['id']}.region",
                    "placement slot region is dangling",
                    region=slot.get("region"),
                )
        for relation in scene.get("relations", []):
            if not isinstance(relation, dict):
                continue
            missing = [endpoint for endpoint in (relation.get("from"), relation.get("to")) if endpoint not in region_ids]
            if missing:
                fail(
                    f"layers.layout.{route_id}.placement.relations",
                    "placement relation endpoint is dangling",
                    missing=missing,
                )
        for relation in scene.get("relations", []):
            if not (isinstance(relation, dict) and relation.get("type") in ("contains", "owns")):
                continue
            declared_parent = next(
                (
                    item.get("parent")
                    for item in regions
                    if isinstance(item, dict) and item.get("id") == relation.get("to")
                ),
                None,
            )
            if declared_parent is not None and declared_parent != relation.get("from"):
                fail(
                    f"layers.layout.{route_id}.placement.relations",
                    "contains/owns relation from contradicts region parent",
                    region=relation.get("to"),
                    edge_from=relation.get("from"),
                    declared_parent=declared_parent,
                )
        for domain in scene.get("scroll_domains", []):
            if isinstance(domain, dict) and domain.get("owner") not in region_ids:
                fail(
                    f"layers.layout.{route_id}.placement.scroll_domains.{domain.get('id')}",
                    "scroll owner is not a declared region",
                    owner=domain.get("owner"),
                )
        for geometry in scene.get("geometry", []):
            token = geometry.get("token") if isinstance(geometry, dict) else None
            if token and token.removeprefix("token/") not in token_paths:
                fail(
                    f"layers.layout.{route_id}.placement.geometry.{geometry.get('id')}",
                    "placement geometry token is dangling",
                    token=token,
                )
        pattern_refs = scene.get("pattern_refs", [])
        allowed_patterns = set(page_type_patterns.get(page_type, []))
        for target in pattern_refs:
            if target not in ids:
                fail(
                    f"layers.layout.{route_id}.placement.pattern_refs",
                    "placement pattern reference is dangling",
                    target=target,
                )
            elif target not in allowed_patterns:
                fail(
                    f"layers.layout.{route_id}.placement.pattern_refs",
                    "placement pattern is outside the bound Page Type closure",
                    target=target,
                    page_type=page_type,
                )
        for target in scene.get("evidence_refs", []):
            if target not in evidence_ids:
                fail(
                    f"layers.layout.{route_id}.placement.evidence_refs",
                    "placement evidence reference is dangling",
                    target=target,
                )
    report.placement = result
    return result


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


def _is_image_file(path: Path) -> bool:
    try:
        head = path.read_bytes()[:16]
    except OSError:
        return False
    if any(head.startswith(prefix) for prefix in IMAGE_MAGIC_PREFIXES):
        return True
    return len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP"


def _validate_oracle_measurements(measurements: Any, where: str, report: Report) -> int:
    """Return the number of structurally valid inline oracle measurements."""
    valid = 0
    if not isinstance(measurements, list):
        return 0
    for index, measurement in enumerate(measurements):
        entry = f"{where}.{index}"
        if not isinstance(measurement, dict):
            report.add("CERT_ORACLE_MEASUREMENT_INVALID", entry, "measurement entry must be a mapping")
            continue
        missing = [
            field
            for field in ("id", "method", "dimension", "unit", "oracle_revision")
            if not isinstance(measurement.get(field), str) or not measurement.get(field)
        ]
        if "value" not in measurement:
            missing.append("value")
        if missing:
            report.add("CERT_ORACLE_MEASUREMENT_INVALID", entry, f"measurement is missing required fields: {missing}")
            continue
        valid += 1
    return valid


def validate_expectations(path: Path, package_root: Path | None = None) -> dict[str, Any]:
    """Validate an oracle-anchored measured expectation set and its package binding."""
    report = Report("expectations", path)
    document = validate_schema_document(path, "measured-expectations.schema.json", report, "expectations")
    if document is None:
        return report.to_dict()
    if package_root is not None:
        manifest_path = package_root / "design-system.yaml"
        if not manifest_path.is_file():
            report.add("MANIFEST_MISSING", "design-system.yaml", "package root for expectation binding is missing")
            return report.to_dict()
        manifest = load_document(manifest_path)
        digest_input = dict(manifest)
        digest_input.pop("contract_digest", None)
        digest = canonical_digest(digest_input)
        package = document.get("package") or {}
        if package.get("id") != manifest.get("id") or package.get("version") != manifest.get("version"):
            report.add(
                "EXPECTATION_DIGEST_MISMATCH",
                "package",
                f"expectation set binds {package.get('id')}@{package.get('version')} "
                f"but the package is {manifest.get('id')}@{manifest.get('version')}",
            )
        elif (package.get("digest") or {}).get("value") != digest:
            report.add(
                "EXPECTATION_DIGEST_MISMATCH",
                "package.digest",
                "expectation set does not bind the current package contract digest",
            )
    return report.to_dict()


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
    active_instance = gate.get("active_instance", {})
    if not isinstance(active_instance, dict) or active_instance.get("status") != "frozen":
        report.add(
            "CERT_ACTIVE_INSTANCE_REQUIRED",
            "gate.active_instance",
            "high-fidelity certification requires a frozen Active Instance",
        )
    feedback = gate.get("feedback", {})
    if not isinstance(feedback, dict) or feedback.get("package_feedback") != "closed":
        report.add(
            "CERT_PACKAGE_FEEDBACK_OPEN",
            "gate.feedback.package_feedback",
            "all package-owned feedback must be closed before high-fidelity certification",
        )

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
            assertion_dimensions = {
                assertion.get("dimension")
                for assertion in assertions
                if isinstance(assertion, dict) and assertion.get("result") == "passed"
            }
            required_dimension_groups = (
                {"structure", "hierarchy"},
                {"spacing", "density"},
                {"typography"},
                {"color", "surface"},
                {"border", "divider"},
            )
            if any(not dimensions & assertion_dimensions for dimensions in required_dimension_groups):
                report.add(
                    "CERT_ASSERTION_COVERAGE_INCOMPLETE",
                    f"{where}.assertions",
                    "a passed high-fidelity record must cover structure, spacing/density, typography, "
                    "color/surface, and border/divider",
                )
            if not any(isinstance(a, dict) and a.get("method") in MEASURABLE_ASSERTION_METHODS for a in assertions):
                report.add("CERT_ASSERTION_NOT_MEASURABLE", f"{where}.assertions", "screenshot-only evidence cannot pass; at least one measurable assertion is required")
            if any(isinstance(a, dict) and a.get("result") == "failed" for a in assertions):
                report.add("CERT_VERDICT_CONTRADICTED", f"{where}.verdict", "passed record contains failed assertions")
        evidence = record.get("evidence", {})
        oracle_anchored = False
        current_ref = evidence.get("current_screenshot")
        if not current_ref:
            report.add(
                "CERT_EVIDENCE_MISSING",
                f"{where}.evidence.current_screenshot",
                "current-build screenshot evidence ref is required",
            )
        else:
            current_file = safe_relative(root, current_ref, report, f"{where}.evidence.current_screenshot")
            if current_file is not None:
                if not current_file.is_file():
                    report.add(
                        "CERT_EVIDENCE_MISSING",
                        f"{where}.evidence.current_screenshot",
                        f"evidence file does not exist: {current_ref}",
                    )
                elif not _is_image_file(current_file):
                    report.add(
                        "CERT_ORACLE_EVIDENCE_PLACEHOLDER",
                        f"{where}.evidence.current_screenshot",
                        "current-build evidence is not an image artifact",
                    )
        oracle_ref = evidence.get("oracle_screenshot")
        measurements = evidence.get("oracle_measurements")
        if oracle_ref:
            oracle_file = safe_relative(root, oracle_ref, report, f"{where}.evidence.oracle_screenshot")
            if oracle_file is not None:
                if not oracle_file.is_file():
                    report.add(
                        "CERT_EVIDENCE_MISSING",
                        f"{where}.evidence.oracle_screenshot",
                        f"evidence file does not exist: {oracle_ref}",
                    )
                elif not _is_image_file(oracle_file):
                    report.add(
                        "CERT_ORACLE_EVIDENCE_PLACEHOLDER",
                        f"{where}.evidence.oracle_screenshot",
                        "oracle evidence is not a real screenshot; supply oracle_measurements when no screenshot exists",
                    )
                else:
                    oracle_anchored = True
        if _validate_oracle_measurements(measurements, f"{where}.evidence.oracle_measurements", report):
            oracle_anchored = True
        if not oracle_ref and not measurements:
            report.add(
                "CERT_EVIDENCE_MISSING",
                f"{where}.evidence.oracle_screenshot",
                "oracle_screenshot or oracle_measurements is required",
            )
        if record.get("verdict") == "passed" and not oracle_anchored:
            report.add(
                "CERT_ASSERTION_UNANCHORED",
                f"{where}.assertions",
                "passed record carries no oracle-anchored evidence: a real oracle screenshot or a structural oracle measurement is required",
            )
        if record.get("verdict") == "passed":
            measurement_ids = {
                measurement.get("id")
                for measurement in (measurements if isinstance(measurements, list) else [])
                if isinstance(measurement, dict) and isinstance(measurement.get("id"), str)
            }
            for assertion_index, assertion in enumerate(assertions):
                if not isinstance(assertion, dict) or assertion.get("result") != "passed":
                    continue
                reference = assertion.get("oracle_measurement_ref")
                if reference not in measurement_ids:
                    report.add(
                        "CERT_ASSERTION_UNANCHORED",
                        f"{where}.assertions.{assertion_index}.oracle_measurement_ref",
                        "each passed assertion must reference an oracle measurement in this record",
                    )
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


def validate_fidelity_sidecar(target: Path, report: Report) -> None:
    """Minimal closed semantics for the optional structural fidelity sidecar.

    The sidecar is the source of Apply's derived expectations; self-contradictory
    records (e.g. underline recorded as a negative fact) pass through as valid
    expectations and defeat the gate, so they fail closed here.
    """
    path = target / "fidelity.yaml"
    if not path.is_file():
        return
    data = load_document(path)
    if not isinstance(data, dict) or data.get("conformance") != "structural":
        return
    for index, record in enumerate(data.get("state_presentations") or []):
        if not isinstance(record, dict):
            continue
        decoration = record.get("text_decoration")
        negatives = {
            item.get("property")
            for item in record.get("negative_facts") or []
            if isinstance(item, dict)
        }
        if decoration == "underline" and "text_decoration" in negatives:
            report.add(
                "FIDELITY_STATE_DECORATION_CONFLICT",
                f"fidelity.state_presentations.{index}.text_decoration",
                f"underline cannot also be a negative fact; absence is none + negative (record {record.get('id')})",
            )
    for index, scene in enumerate(data.get("layout_scenes") or []):
        if not isinstance(scene, dict):
            continue
        regions = [item for item in scene.get("regions") or [] if isinstance(item, dict)]
        region_ids = {item.get("id") for item in regions if isinstance(item.get("id"), str)}
        for region in regions:
            parent = region.get("parent")
            if isinstance(parent, str) and parent not in region_ids:
                report.add(
                    "FIDELITY_REGION_PARENT_DANGLING",
                    f"fidelity.layout_scenes.{index}.regions",
                    f"fidelity region parent is dangling (parent {parent}, region {region.get('id')})",
                )
        for relation in scene.get("relations") or []:
            if not (isinstance(relation, dict) and relation.get("type") in ("contains", "owns")):
                continue
            declared = next(
                (item.get("parent") for item in regions if item.get("id") == relation.get("to")),
                None,
            )
            if declared is not None and declared != relation.get("from"):
                report.add(
                    "FIDELITY_CONTAINMENT_CONFLICT",
                    f"fidelity.layout_scenes.{index}.relations",
                    f"contains/owns relation from contradicts region parent (region {relation.get('to')})",
                )


def validate_target(
    target: Path,
    kind: str,
    *,
    require_component_family: bool = False,
    require_visual_role_closure: bool = False,
) -> dict[str, Any]:
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
    validate_coverage_and_confidence(target, report)
    ids, refs, documents = collect_entities(layers, report)
    validate_references(ids, refs, report)
    validate_claim_admission(layers, ids, report)
    validate_primitive_contracts(layers, documents, report)
    validate_placement(manifest, layers, ids, documents, report)
    validate_fidelity_sidecar(target, report)
    report.component_family = derive_component_family(manifest, layers, ids)
    if require_component_family:
        enforce_family_closure(report.component_family, report)
    if require_visual_role_closure:
        validate_visual_role_closure(layers, report)
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
    validate.add_argument(
        "--require-visual-role-closure",
        action="store_true",
        help="require source-derived visual color and typography roles for high-fidelity use",
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
    expectations = sub.add_parser("validate-expectations")
    expectations.add_argument("document", type=Path)
    expectations.add_argument("--package-root", type=Path)
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
    if args.command == "validate-expectations":
        payload = validate_expectations(
            args.document.resolve(),
            args.package_root.resolve() if args.package_root else None,
        )
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
        return 0 if payload["valid"] else 1

    reports = [
        validate_target(
            args.target.resolve(),
            args.kind,
            require_component_family=args.require_component_family,
            require_visual_role_closure=args.require_visual_role_closure,
        )
    ]
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
