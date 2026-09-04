from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path
from typing import Any, Iterable

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

from .loading import LoadError, load_data
from .model import ValidationResult

SUPPORTED_SCHEMA_VERSION = 1
SUPPORTED_PROFILE = "repo-structural-v1"
CONFORMANCES = {"structural", "style-only"}
LEGACY = "legacy-baseline"
UNKNOWN = "unknown"
DIGEST_PREFIX = "sha256:"
REQUIRED_PADDING = (
    "padding_block_start", "padding_inline_end", "padding_block_end", "padding_inline_start",
)
NEGATIVE_SEMANTICS = {"none", "zero", "non-wrap", "non-shrink", "hidden"}
ENGINEERING_TEXT = re.compile(
    r"(?:\bsrc/|package\.json|\bnpm\s+install\b|\bpnpm\s+install\b|\bReact\b|\bVue\b|\bTailwind\b|"
    r"\bshadcn\b|\bZustand\b|\buse[A-Z][A-Za-z]+\b|\bimport\s+|from\s+['\"]|"
    r"\bAPI\s*(?:/|与|and)\s*mock\b|\bAPI\s+layer\b|\bdata\s+layer\b|"
    r"\b(flex|grid|hidden|block|inline-flex|px-\d|py-\d|p-\d|gap-\d)\b)",
    re.I,
)
SCALAR_PRECISION = re.compile(
    r"(?:#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?|oklch\([^\n)]+\)|-?\d+(?:\.\d+)?(?:px|rem|em|%|ms|s|deg))",
    re.I,
)


class FidelityError(ValueError):
    def __init__(self, code: str, message: str, **details: Any) -> None:
        super().__init__(message)
        self.code = code
        self.details = details


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value: Any) -> str:
    return DIGEST_PREFIX + hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def path_has_example_prefix(value: str | Path) -> bool:
    posix = Path(value).as_posix().replace("\\", "/").lstrip("./")
    return posix == "example" or posix.startswith("example/") or "example" in Path(value).parts


def fidelity_schema_dir(repo_root: Path | None = None) -> Path:
    here = Path(__file__).resolve()
    candidates = []
    if repo_root is not None:
        candidates.append(repo_root / "schemas/template/fidelity/v1")
    candidates.extend([
        here.parents[1] / "schemas/template/fidelity/v1",
        here.parents[2] / "schemas/template/fidelity/v1",
    ])
    for directory in candidates:
        if directory.is_dir() and (directory / "fidelity.schema.json").is_file():
            return directory
    raise FileNotFoundError("fidelity v1 schema directory not found")


def load_fidelity_schema(repo_root: Path | None = None) -> Draft202012Validator:
    directory = fidelity_schema_dir(repo_root)
    path = directory / "fidelity.schema.json"
    schema = json.loads(path.read_text(encoding="utf-8"))
    registry = Registry().with_resource(schema["$id"], Resource.from_contents(schema))
    registry = registry.with_resource(path.name, Resource.from_contents(schema))
    return Draft202012Validator(schema, registry=registry, format_checker=FormatChecker())


def load_fidelity(path: Path) -> Any:
    return load_data(path)


def _sorted_mapping(value: dict[str, Any]) -> dict[str, Any]:
    return {key: canonicalize(value[key]) for key in sorted(value)}


def canonicalize(value: Any) -> Any:
    if isinstance(value, dict):
        cleaned = {
            key: canonicalize(item)
            for key, item in value.items()
            if key not in {"description", "line"}
        }
        if "locator" in cleaned and isinstance(cleaned["locator"], dict):
            locator = dict(cleaned["locator"])
            locator.pop("line", None)
            cleaned["locator"] = {key: locator[key] for key in sorted(locator)}
        return {key: cleaned[key] for key in sorted(cleaned)}
    if isinstance(value, list):
        items = [canonicalize(item) for item in value]
        if items and all(isinstance(item, dict) and "id" in item for item in items):
            return sorted(items, key=lambda item: str(item.get("id")))
        if items and all(isinstance(item, dict) and {"property", "value"} <= set(item) for item in items):
            return sorted(items, key=lambda item: canonical_json(item))
        if items and all(not isinstance(item, (dict, list)) for item in items):
            return sorted(items, key=lambda item: canonical_json(item))
        return items
    return value


def canonical_profile(data: dict[str, Any]) -> dict[str, Any]:
    return canonicalize({
        "schema_version": data.get("schema_version"),
        "profile": data.get("profile"),
        "conformance": data.get("conformance"),
        "platforms": data.get("platforms") or [],
        "scope": data.get("scope") or {},
        "layout_scenes": data.get("layout_scenes") or [],
        "component_geometry": data.get("component_geometry") or [],
        "state_presentations": data.get("state_presentations") or [],
        "unresolved": data.get("unresolved") or [],
        "style_only_reason": data.get("style_only_reason"),
    })


def canonical_digest(data: dict[str, Any]) -> str:
    return digest(canonical_profile(data))


def classify_sidecar(data: Any | None, *, present: bool) -> str:
    if not present:
        return LEGACY
    if not isinstance(data, dict):
        return UNKNOWN
    if data.get("schema_version") != SUPPORTED_SCHEMA_VERSION or data.get("profile") != SUPPORTED_PROFILE:
        return UNKNOWN
    conformance = data.get("conformance")
    if conformance in CONFORMANCES:
        return conformance
    return UNKNOWN


def empty_replay() -> dict[str, Any]:
    return {"status": "not-run", "declared": 0, "resolved": 0, "executed": 0, "passed": 0}


def _count_status(records: Iterable[Any]) -> dict[str, int]:
    counts = {"observed": 0, "defaulted": 0, "unresolved": 0, "total": 0}
    for record in records:
        if not isinstance(record, dict):
            continue
        counts["total"] += 1
        status = record.get("status")
        if status in counts:
            counts[status] += 1
    return counts


def profile_counts(data: dict[str, Any] | None, conformance: str) -> dict[str, Any]:
    if not isinstance(data, dict) or conformance in {LEGACY, UNKNOWN}:
        return {
            "conformance": conformance,
            "layout_scenes": _count_status([]),
            "component_geometry": _count_status([]),
            "state_presentations": _count_status([]),
            "unresolved": 0,
        }
    return {
        "conformance": conformance,
        "layout_scenes": _count_status(data.get("layout_scenes") or []),
        "component_geometry": _count_status(data.get("component_geometry") or []),
        "state_presentations": _count_status(data.get("state_presentations") or []),
        "unresolved": len(data.get("unresolved") or []),
    }


def identity_payload(data: dict[str, Any] | None, *, present: bool, replay: dict[str, Any] | None = None) -> dict[str, Any]:
    conformance = classify_sidecar(data, present=present)
    digest_value = canonical_digest(data) if isinstance(data, dict) and conformance in CONFORMANCES else None
    return {
        "schema_version": data.get("schema_version") if isinstance(data, dict) else None,
        "profile": data.get("profile") if isinstance(data, dict) else None,
        "conformance": conformance,
        "scope": data.get("scope") if isinstance(data, dict) else None,
        "canonical_digest": digest_value,
        "unresolved": data.get("unresolved") if isinstance(data, dict) else [],
        "replay": replay or empty_replay(),
        "counts": profile_counts(data if isinstance(data, dict) else None, conformance),
    }


def schema_errors(data: Any, repo_root: Path | None = None) -> list[tuple[str, str, dict[str, Any]]]:
    validator = load_fidelity_schema(repo_root)
    result = []
    for error in sorted(validator.iter_errors(data), key=lambda e: (list(e.absolute_path), e.validator or "", e.message)):
        path = ".".join(str(part) for part in error.absolute_path)
        result.append((path, error.message, {"validator": error.validator, "schema_path": "/".join(map(str, error.absolute_schema_path))}))
    return result


def _walk_strings(node: Any, path: tuple[str, ...] = ()) -> Iterable[tuple[str, str]]:
    if isinstance(node, str):
        yield ".".join(path), node
    elif isinstance(node, dict):
        for key, child in node.items():
            yield from _walk_strings(child, (*path, str(key)))
    elif isinstance(node, list):
        for index, child in enumerate(node):
            yield from _walk_strings(child, (*path, str(index)))


def _safe_relative(value: str) -> bool:
    path = Path(value)
    return bool(value) and not path.is_absolute() and ".." not in path.parts and "example" not in path.parts


def _token_refs(node: Any) -> list[str]:
    found: list[str] = []
    if isinstance(node, dict):
        if node.get("kind") == "token-ref" and isinstance(node.get("value"), str):
            found.append(node["value"])
        for child in node.values():
            found.extend(_token_refs(child))
    elif isinstance(node, list):
        for child in node:
            found.extend(_token_refs(child))
    return found


def validate_semantics(
    data: dict[str, Any],
    *,
    result: ValidationResult,
    path: Path,
    rel: str,
    token_paths: set[str],
    rule_ids: set[str],
    source_ids: set[str],
) -> None:
    def add(code: str, message: str, subpath: str = "", **details: Any) -> None:
        full = f"{rel}#{subpath}" if subpath else rel
        result.add(code, full, message, **details)

    if classify_sidecar(data, present=True) == UNKNOWN:
        add("FIDELITY_PROFILE_UNSUPPORTED", "未知 fidelity schema 或 profile，fail closed", declared_schema=data.get("schema_version"), declared_profile=data.get("profile"))
        return

    ids: dict[str, str] = {}
    for collection in ("layout_scenes", "component_geometry", "state_presentations"):
        for index, record in enumerate(data.get(collection) or []):
            if not isinstance(record, dict):
                continue
            record_id = record.get("id")
            where = f"{collection}.{index}"
            if isinstance(record_id, str):
                if record_id in ids:
                    add("FIDELITY_ID_DUPLICATE", "profile record ID 重复", f"{where}.id", id=record_id, other=ids[record_id])
                else:
                    ids[record_id] = where
            rule_id = record.get("rule_id")
            if isinstance(rule_id, str) and rule_id not in rule_ids:
                add("FIDELITY_RULE_DANGLING", "sidecar 引用了 core 文档中不存在的 rule ID", f"{where}.rule_id", rule_id=rule_id)
            provenance = record.get("provenance")
            if record.get("status") == "observed" and not isinstance(provenance, dict):
                add("FIDELITY_PROVENANCE_MISSING", "observed record 必须带直接 provenance", where)
            if isinstance(provenance, dict):
                source_id = provenance.get("source_id")
                if isinstance(source_id, str) and source_id not in source_ids:
                    add("FIDELITY_SOURCE_DANGLING", "provenance source_id 不在 meta.sources", f"{where}.provenance.source_id", source_id=source_id)
                locator = provenance.get("locator") if isinstance(provenance.get("locator"), dict) else {}
                locator_path = locator.get("path")
                if isinstance(locator_path, str) and not _safe_relative(locator_path):
                    add("FIDELITY_LOCATOR_UNSAFE", "provenance locator 必须是安全相对路径", f"{where}.provenance.locator.path", path=locator_path)
            for token_path in _token_refs(record):
                if token_path not in token_paths:
                    add("FIDELITY_TOKEN_DANGLING", "token path 不存在于 tokens.yaml", where, token_path=token_path)

    for index, record in enumerate(data.get("layout_scenes") or []):
        if not isinstance(record, dict):
            continue
        where = f"layout_scenes.{index}"
        region_ids = [item.get("id") for item in record.get("regions") or [] if isinstance(item, dict)]
        if len(region_ids) != len(set(region_ids)):
            add("FIDELITY_REGION_ID_DUPLICATE", "scene region ID 重复", f"{where}.regions")
        region_set = {item for item in region_ids if isinstance(item, str)}
        for rel_index, relation in enumerate(record.get("relations") or []):
            if not isinstance(relation, dict):
                continue
            for endpoint in ("from", "to"):
                target = relation.get(endpoint)
                if isinstance(target, str) and target not in region_set:
                    add("FIDELITY_REGION_REF_DANGLING", "relation 引用未知 region", f"{where}.relations.{rel_index}.{endpoint}", region=target)
        owners: dict[str, list[str]] = {}
        domain_ids: list[str] = []
        for domain_index, domain in enumerate(record.get("scroll_domains") or []):
            if not isinstance(domain, dict):
                continue
            domain_id = domain.get("id")
            if isinstance(domain_id, str):
                domain_ids.append(domain_id)
            owner = domain.get("owner")
            if isinstance(owner, str):
                owners.setdefault(str(domain_id), []).append(owner)
                if owner not in region_set:
                    add("FIDELITY_SCROLL_OWNER_UNKNOWN", "scroll domain owner 不是已声明 region", f"{where}.scroll_domains.{domain_index}.owner", owner=owner)
            nested = domain.get("nested_in")
            if nested is not None and nested not in set(domain_ids) and nested != domain_id:
                # nested_in may refer to a domain declared later; check after loop
                pass
        if len(domain_ids) != len(set(domain_ids)):
            add("FIDELITY_SCROLL_DOMAIN_DUPLICATE", "scroll domain ID 重复", f"{where}.scroll_domains")
        nested_ids = {item.get("nested_in") for item in record.get("scroll_domains") or [] if isinstance(item, dict)}
        for nested in nested_ids:
            if nested is not None and nested not in set(domain_ids):
                add("FIDELITY_SCROLL_NESTING_DANGLING", "nested_in 引用未知 scroll domain", f"{where}.scroll_domains", domain=nested)
        for domain_id, owner_list in sorted(owners.items()):
            unique_owners = sorted(set(owner_list))
            if len(unique_owners) != 1:
                add("FIDELITY_SCROLL_OWNER_NOT_UNIQUE", "每个 scroll domain 必须恰好一个 owner", f"{where}.scroll_domains", domain=domain_id, owners=unique_owners)
        for overlay_index, overlay in enumerate(record.get("overlays") or []):
            if not isinstance(overlay, dict):
                continue
            for field in ("anchor", "region"):
                target = overlay.get(field)
                if isinstance(target, str) and target not in region_set:
                    add("FIDELITY_OVERLAY_REF_DANGLING", "overlay 引用未知 region", f"{where}.overlays.{overlay_index}.{field}", region=target)
        negatives = {(item.get("property"), item.get("value")) for item in record.get("negative_facts") or [] if isinstance(item, dict)}
        if record.get("wrap") == "non-wrap" and ("wrap", "non-wrap") not in negatives:
            add("FIDELITY_NEGATIVE_FACT_MISSING", "non-wrap 必须作为 explicit negative fact", f"{where}.negative_facts", property="wrap")
        if record.get("shrink") == "non-shrink" and ("shrink", "non-shrink") not in negatives:
            add("FIDELITY_NEGATIVE_FACT_MISSING", "non-shrink 必须作为 explicit negative fact", f"{where}.negative_facts", property="shrink")
        has_root_scroll = any(domain.get("owner") for domain in record.get("scroll_domains") or [] if isinstance(domain, dict) and "root" in str(domain.get("owner")))
        if not record.get("scroll_domains") and ("root_scroll", "none") not in negatives and not has_root_scroll:
            # scenes may legally have no scroll domains if they record root_scroll none
            if record.get("scene") == "shell" and ("root_scroll", "none") not in negatives:
                add("FIDELITY_NEGATIVE_FACT_MISSING", "无根滚动必须记录 root_scroll none", f"{where}.negative_facts", property="root_scroll")

    for index, record in enumerate(data.get("component_geometry") or []):
        if not isinstance(record, dict):
            continue
        where = f"component_geometry.{index}"
        properties = record.get("properties") if isinstance(record.get("properties"), dict) else {}
        missing = [name for name in REQUIRED_PADDING if name not in properties]
        if missing:
            add("FIDELITY_GEOMETRY_INCOMPLETE", "高保真 component slot 缺少必需逻辑方向 padding", where, missing=missing, component=record.get("component"), slot=record.get("slot"))
        negatives = {(item.get("property"), item.get("value")) for item in record.get("negative_facts") or [] if isinstance(item, dict)}
        shadow = properties.get("shadow")
        if isinstance(shadow, dict) and shadow.get("kind") == "semantic" and shadow.get("value") in NEGATIVE_SEMANTICS:
            if ("shadow", shadow.get("value")) not in negatives:
                add("FIDELITY_NEGATIVE_FACT_MISSING", "none/zero shadow 必须作为 explicit negative fact", f"{where}.negative_facts", property="shadow")

    state_index: dict[tuple[Any, ...], list[tuple[int, str]]] = {}
    for index, record in enumerate(data.get("state_presentations") or []):
        if not isinstance(record, dict):
            continue
        key = (record.get("subject_role"), record.get("context"), record.get("state"), record.get("surface"))
        decoration = record.get("text_decoration")
        state_index.setdefault(key, []).append((index, decoration if isinstance(decoration, str) else ""))
        negatives = {(item.get("property"), item.get("value")) for item in record.get("negative_facts") or [] if isinstance(item, dict)}
        if decoration == "none" and ("text_decoration", "none") not in negatives:
            add("FIDELITY_NEGATIVE_FACT_MISSING", "text_decoration none 必须作为 explicit negative fact", f"state_presentations.{index}.negative_facts")
    for key, entries in sorted(state_index.items(), key=lambda item: canonical_json(item[0])):
        decorations = {item[1] for item in entries}
        if len(entries) > 1 and ("none" in decorations and "underline" in decorations):
            add(
                "FIDELITY_STATE_CONFLICT",
                "相同 subject/context/state/surface 同时声明 none 与 underline",
                "state_presentations",
                identity=list(key),
                records=[f"state_presentations.{item[0]}" for item in entries],
            )
        elif len({canonical_json({"decoration": item[1]}) for item in entries}) > 1 and len(entries) > 1:
            add(
                "FIDELITY_STATE_CONFLICT",
                "相同 subject/context/state/surface 的 presentation 冲突",
                "state_presentations",
                identity=list(key),
            )

    contexts_in_scope = set((data.get("scope") or {}).get("contexts") or [])
    used_contexts = {record.get("context") for record in data.get("state_presentations") or [] if isinstance(record, dict)}
    if data.get("conformance") == "structural" and used_contexts and used_contexts - contexts_in_scope:
        add("FIDELITY_CONTEXT_PROMOTION", "state record 使用了 scope 外 context，禁止跨 context 推广", "state_presentations", extra=sorted(used_contexts - contexts_in_scope))

    unresolved = data.get("unresolved") or []
    if data.get("conformance") == "structural" and unresolved:
        add("FIDELITY_UNRESOLVED", "structural profile 存在 unresolved 项，不得发布", "unresolved", count=len(unresolved))
    observed_ids = {
        record.get("id")
        for collection in ("layout_scenes", "component_geometry", "state_presentations")
        for record in data.get(collection) or []
        if isinstance(record, dict) and record.get("status") == "observed"
    }
    for index, item in enumerate(unresolved if isinstance(unresolved, list) else []):
        identity = item.get("identity") if isinstance(item, dict) else None
        if isinstance(identity, list) and any(part in observed_ids for part in identity if isinstance(part, str)):
            add("FIDELITY_UNRESOLVED_STATUS_CONFLICT", "unresolved 与 observed 状态互斥", f"unresolved.{index}")

    skip_suffixes = (
        ".locator.path", ".locator.symbol", ".locator.selector", ".locator.pointer",
        ".source_id", ".source_revision", ".source_span_sha256", ".rule_id", ".id",
        ".value", ".kind", ".axis", ".owner", ".scene", ".slot", ".component",
        ".subject_role", ".context", ".state", ".surface", ".path", ".role",
        ".from", ".to", ".anchor", ".region", ".scope", ".viewport", ".profile",
        ".conformance", ".method", ".status", ".captured_at", ".confidence",
        ".property", ".wrap", ".shrink", ".fill", ".arrangement", ".nested_in",
        ".text_decoration", ".visibility", ".container_presentation",
    )
    for string_path, text in _walk_strings(data):
        if not string_path.endswith(".description") and "details." not in string_path:
            continue
        if ENGINEERING_TEXT.search(text):
            add("FIDELITY_ENGINEERING_CONTENT", "normative 字段包含禁入工程内容", string_path)
        if SCALAR_PRECISION.search(text):
            add("FIDELITY_PRECISION_DUPLICATION", "sidecar 不得复制精确 scalar token 值", string_path, value=text)


def _git_head(root: Path) -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=root, check=True, text=True,
            capture_output=True, timeout=10,
        )
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None
    return result.stdout.strip()


def _confine(root: Path, relative: str) -> Path:
    if not _safe_relative(relative):
        raise FidelityError("SOURCE_BOUNDARY", "locator escapes authorized source root", path=relative)
    lexical = root / relative
    cursor = lexical
    while cursor != root:
        if cursor.is_symlink():
            raise FidelityError("SOURCE_PATH_SYMLINK", "source path uses symlink", path=relative)
        cursor = cursor.parent
        if cursor == cursor.parent:
            break
    resolved = lexical.resolve(strict=True)
    try:
        resolved.relative_to(root.resolve(strict=True))
    except ValueError as exc:
        raise FidelityError("SOURCE_BOUNDARY", "locator escapes authorized source root", path=relative) from exc
    return resolved


def _pointer_node(document: Any, pointer: str) -> Any:
    if not pointer.startswith("#/"):
        raise FidelityError("SOURCE_POINTER_INVALID", "only JSON pointer locators are supported", pointer=pointer)
    node = document
    for part in pointer[2:].split("/"):
        key = part.replace("~1", "/").replace("~0", "~")
        if isinstance(node, dict) and key in node:
            node = node[key]
            continue
        if isinstance(node, list):
            matches = [item for item in node if isinstance(item, dict) and item.get("id") == key]
            if len(matches) == 1:
                node = matches[0]
                continue
        raise FidelityError("SOURCE_POINTER_MISSING", "locator pointer 未命中 source graph", pointer=pointer)
    return node


def replay_profile(
    data: dict[str, Any],
    *,
    source_roots: dict[str, Path],
    candidate_template: Path | None = None,
    capture_receipt: dict[str, Any] | None = None,
) -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    for collection in ("layout_scenes", "component_geometry", "state_presentations"):
        for record in data.get(collection) or []:
            if isinstance(record, dict) and record.get("status") == "observed" and isinstance(record.get("provenance"), dict):
                records.append(record)
    declared = len(records)
    if not source_roots:
        return empty_replay()
    resolved = 0
    executed = 0
    passed = 0
    errors: list[dict[str, Any]] = []
    candidate = candidate_template.resolve() if candidate_template is not None else None
    for record in records:
        provenance = record["provenance"]
        source_id = provenance.get("source_id")
        locator = provenance.get("locator") if isinstance(provenance.get("locator"), dict) else {}
        relative = locator.get("path")
        root = source_roots.get(source_id) if isinstance(source_id, str) else None
        if root is None:
            errors.append({"code": "SOURCE_ROOT_UNBOUND", "record": record.get("id"), "source_id": source_id})
            continue
        resolved += 1
        try:
            if path_has_example_prefix(root) or (isinstance(relative, str) and path_has_example_prefix(relative)):
                raise FidelityError("EXCLUDED_SOURCE_ROOT", "example/** cannot be a replay source")
            if root.is_symlink():
                raise FidelityError("SOURCE_ROOT_SYMLINK", "source root must not be a symlink")
            bound = root.resolve(strict=True)
            if not isinstance(relative, str):
                raise FidelityError("SOURCE_LOCATOR_MISSING", "observed record 缺少 locator.path")
            target = _confine(bound, relative)
            if candidate is not None:
                try:
                    target.relative_to(candidate)
                    raise FidelityError("SOURCE_BOUNDARY", "locator 指向候选模板或旧 snapshot 而非 session source")
                except ValueError:
                    pass
            head = _git_head(bound)
            expected_revision = provenance.get("source_revision")
            if head != expected_revision:
                raise FidelityError("SOURCE_REVISION_MISMATCH", "checkout revision 与 provenance 不一致", expected=expected_revision, actual=head)
            executed += 1
            document = load_data(target)
            pointer = locator.get("pointer")
            span_source = _pointer_node(document, pointer) if isinstance(pointer, str) and pointer else document
            actual_span = digest(span_source)
            expected_span = provenance.get("source_span_sha256")
            if actual_span != expected_span:
                raise FidelityError("SOURCE_SPAN_MISMATCH", "source-span digest 不匹配", expected=expected_span, actual=actual_span, record=record.get("id"))
            if capture_receipt is not None:
                fact_ids = {item.get("id") for item in capture_receipt.get("facts") or [] if isinstance(item, dict)}
                if record.get("id") not in fact_ids and not any(
                    item.get("id") == record.get("id") or item.get("subject") == record.get("scene") or item.get("subject") == record.get("component")
                    for item in capture_receipt.get("facts") or []
                    if isinstance(item, dict)
                ):
                    # published scene/geometry/state IDs may differ from fact IDs; require receipt closure digest presence
                    if not capture_receipt.get("closure_digest"):
                        raise FidelityError("CAPTURE_RECEIPT_MISSING", "replay 需要 usage closure receipt")
            passed += 1
        except (FidelityError, LoadError, OSError, FileNotFoundError) as exc:
            code = getattr(exc, "code", "SOURCE_REPLAY_FAILED")
            details = getattr(exc, "details", {})
            errors.append({"code": code, "record": record.get("id"), "message": str(exc), **details})
    status = "passed" if declared > 0 and declared == resolved == executed == passed and not errors else "failed"
    if declared == 0 and not errors:
        status = "passed"
    return {
        "status": status,
        "declared": declared,
        "resolved": resolved,
        "executed": executed,
        "passed": passed,
        "errors": sorted(errors, key=lambda item: canonical_json(item)),
    }


def parse_source_roots(values: list[str] | None) -> dict[str, Path]:
    bindings: dict[str, Path] = {}
    for raw in values or []:
        if "=" not in raw:
            raise FidelityError("SOURCE_ROOT_BINDING_INVALID", "expected source-id=path", value=raw)
        source_id, _, location = raw.partition("=")
        if not source_id or not location:
            raise FidelityError("SOURCE_ROOT_BINDING_INVALID", "expected source-id=path", value=raw)
        if path_has_example_prefix(location):
            raise FidelityError("EXCLUDED_SOURCE_ROOT", "example/** cannot be a session source", path=location)
        bindings[source_id] = Path(location)
    return bindings
