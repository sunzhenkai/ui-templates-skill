from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any

import yaml

CAPTURE_SCHEMA_VERSION = 1
CAPTURE_PROFILE = "repo-literal-graph-v1"
GRAPH_TYPE = "ui-template-literal-source-graph"
SUPPORTED_SUFFIXES = {".json", ".yaml", ".yml"}
ID_CHARS = frozenset("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._:-")
FACT_FACETS = {"layout_scenes", "component_geometry", "state_presentations"}
FACT_PROPERTIES = {
    "arrangement", "wrap", "shrink", "scroll_inline", "scroll_block", "root_scroll",
    "overlay_scope", "overlay_anchor", "padding_block_start", "padding_inline_end",
    "padding_block_end", "padding_inline_start", "gap", "inset_block_start",
    "inset_inline_end", "inset_block_end", "inset_inline_start", "size", "radius",
    "surface", "border", "shadow", "background", "text", "text_decoration",
    "visibility", "container_presentation",
}
SEMANTIC_VALUES = {
    "none", "zero", "auto", "intrinsic", "fill", "non-wrap", "non-shrink",
    "underline", "visible", "hidden", "viewport", "region", "inline", "block",
    "horizontal", "vertical", "overlay",
}
NEGATIVE_VALUES = {"none", "zero", "non-wrap", "non-shrink", "hidden"}
HARD_LIMITS = {
    "max_graph_bytes": 10_000_000,
    "max_definitions": 100_000,
    "max_imports": 200_000,
    "max_usages": 200_000,
    "max_facts": 500_000,
}


class CaptureError(ValueError):
    def __init__(self, code: str, message: str, **details: Any) -> None:
        super().__init__(message)
        self.code = code
        self.details = details


class _UniqueLoader(yaml.SafeLoader):
    pass


def _mapping(loader: _UniqueLoader, node: yaml.MappingNode, deep: bool = False) -> dict[Any, Any]:
    result: dict[Any, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise CaptureError("DUPLICATE_KEY", f"duplicate mapping key: {key!r}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


_UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _mapping)


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value: Any) -> str:
    return "sha256:" + hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def _json_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise CaptureError("DUPLICATE_KEY", f"duplicate object key: {key!r}")
        result[key] = value
    return result


def load_document(path: Path) -> Any:
    try:
        text = path.read_text(encoding="utf-8")
        if path.suffix.lower() == ".json":
            return json.loads(text, object_pairs_hook=_json_pairs)
        return yaml.load(text, Loader=_UniqueLoader)
    except CaptureError:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError, yaml.YAMLError) as exc:
        raise CaptureError("DATA_LOAD_ERROR", str(exc), path=str(path)) from exc


def _closed(value: Any, where: str, required: set[str], optional: set[str] = frozenset()) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where} must be an object")
    keys = set(value)
    missing = required - keys
    extra = keys - required - set(optional)
    if missing or extra:
        raise CaptureError(
            "SOURCE_GRAPH_SCHEMA", f"{where} closed-object mismatch",
            where=where, missing=sorted(missing), extra=sorted(extra),
        )
    return value


def _id(value: Any, where: str) -> str:
    if not isinstance(value, str) or not value or any(char not in ID_CHARS for char in value):
        raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where} must be a non-empty stable ID")
    return value


def _strings(value: Any, where: str, *, nonempty: bool = False) -> list[str]:
    if not isinstance(value, list) or (nonempty and not value):
        raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where} must be {'non-empty ' if nonempty else ''}array")
    if any(not isinstance(item, str) or not item for item in value) or len(value) != len(set(value)):
        raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where} must contain unique non-empty strings")
    return value


def _safe_relative(value: Any, where: str) -> str:
    if not isinstance(value, str) or not value:
        raise CaptureError("UNSAFE_SOURCE_PATH", f"{where} must be a non-empty relative path")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts or "example" in path.parts:
        raise CaptureError("UNSAFE_SOURCE_PATH", f"unsafe or excluded path: {value}")
    return value


def _validate_fact(raw: Any, where: str) -> dict[str, Any]:
    fact = _closed(raw, where, {
        "id", "facet", "subject", "context", "slot", "state", "property",
        "value", "negative", "rule_id",
    })
    _id(fact["id"], f"{where}.id")
    _id(fact["subject"], f"{where}.subject")
    _id(fact["rule_id"], f"{where}.rule_id")
    if fact["facet"] not in FACT_FACETS or fact["property"] not in FACT_PROPERTIES:
        raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where} has unsupported facet/property")
    for key in ("context", "slot", "state"):
        if fact[key] is not None:
            _id(fact[key], f"{where}.{key}")
    value = _closed(fact["value"], f"{where}.value", {"kind", "value"})
    if value["kind"] == "semantic":
        if value["value"] not in SEMANTIC_VALUES:
            raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where}.value has unsupported semantic value")
    elif value["kind"] == "token-ref":
        _id(value["value"], f"{where}.value.value")
    else:
        raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where}.value.kind is unsupported")
    if not isinstance(fact["negative"], bool):
        raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where}.negative must be boolean")
    if value["kind"] == "semantic" and value["value"] in NEGATIVE_VALUES and not fact["negative"]:
        raise CaptureError("NEGATIVE_FACT_NOT_EXPLICIT", f"{where} must mark {value['value']} as negative")
    return fact


def _validate_graph(raw: Any, graph_path: str) -> dict[str, Any]:
    graph = _closed(raw, "$", {
        "schema_version", "graph_type", "platform", "closure_complete", "canonical_candidates",
        "definitions", "imports", "usages", "exclusions", "dynamic",
    })
    if graph["schema_version"] != 1 or graph["graph_type"] != GRAPH_TYPE or graph["platform"] != "web":
        raise CaptureError("UNSUPPORTED_SOURCE_GRAPH", "only literal source graph v1 for web is supported")
    if graph["closure_complete"] is not True:
        raise CaptureError("SOURCE_GRAPH_INCOMPLETE", "literal graph must attest closure_complete: true")
    candidates = _closed(graph["canonical_candidates"], "$.canonical_candidates", {"themes", "entries"})
    _strings(candidates["themes"], "$.canonical_candidates.themes", nonempty=True)
    _strings(candidates["entries"], "$.canonical_candidates.entries", nonempty=True)
    for collection_name in ("definitions", "imports", "usages", "exclusions", "dynamic"):
        if not isinstance(graph[collection_name], list):
            raise CaptureError("SOURCE_GRAPH_SCHEMA", f"$.{collection_name} must be an array")
    definitions: list[dict[str, Any]] = []
    for index, raw_definition in enumerate(graph["definitions"] if isinstance(graph["definitions"], list) else []):
        where = f"$.definitions[{index}]"
        definition = _closed(raw_definition, where, {"id", "kind", "name", "locator", "exports", "facts"})
        _id(definition["id"], f"{where}.id")
        _id(definition["name"], f"{where}.name")
        if definition["kind"] not in {"theme", "entry", "scene", "component", "context", "primitive"}:
            raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where}.kind is unsupported")
        _strings(definition["exports"], f"{where}.exports")
        if definition["locator"] != f"{graph_path}#/definitions/{definition['id']}":
            raise CaptureError("SOURCE_LOCATOR_MISMATCH", f"{where}.locator is not identity-based")
        if not isinstance(definition["facts"], list):
            raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where}.facts must be an array")
        definition["facts"] = [_validate_fact(item, f"{where}.facts[{i}]") for i, item in enumerate(definition["facts"])]
        definitions.append(definition)
    graph["definitions"] = definitions
    imports: list[dict[str, Any]] = []
    for index, raw_import in enumerate(graph["imports"] if isinstance(graph["imports"], list) else []):
        where = f"$.imports[{index}]"
        edge = _closed(raw_import, where, {"id", "from_definition", "to_definition", "locator"})
        for key in ("id", "from_definition", "to_definition"):
            _id(edge[key], f"{where}.{key}")
        if edge["locator"] != f"{graph_path}#/imports/{edge['id']}":
            raise CaptureError("SOURCE_LOCATOR_MISMATCH", f"{where}.locator is not identity-based")
        imports.append(edge)
    graph["imports"] = imports
    usages: list[dict[str, Any]] = []
    for index, raw_usage in enumerate(graph["usages"] if isinstance(graph["usages"], list) else []):
        where = f"$.usages[{index}]"
        usage = _closed(raw_usage, where, {
            "id", "definition_id", "scene", "component", "context", "slot", "state", "locator", "facts",
        })
        for key in ("id", "definition_id", "scene"):
            _id(usage[key], f"{where}.{key}")
        for key in ("component", "context", "slot", "state"):
            if usage[key] is not None:
                _id(usage[key], f"{where}.{key}")
        if usage["locator"] != f"{graph_path}#/usages/{usage['id']}":
            raise CaptureError("SOURCE_LOCATOR_MISMATCH", f"{where}.locator is not identity-based")
        if not isinstance(usage["facts"], list):
            raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where}.facts must be an array")
        usage["facts"] = [_validate_fact(item, f"{where}.facts[{i}]") for i, item in enumerate(usage["facts"])]
        usages.append(usage)
    graph["usages"] = usages
    exclusions: list[dict[str, Any]] = []
    for index, raw_exclusion in enumerate(graph["exclusions"] if isinstance(graph["exclusions"], list) else []):
        where = f"$.exclusions[{index}]"
        item = _closed(raw_exclusion, where, {"id", "locator", "reason"})
        _id(item["id"], f"{where}.id")
        if item["locator"] != f"{graph_path}#/exclusions/{item['id']}":
            raise CaptureError("SOURCE_LOCATOR_MISMATCH", f"{where}.locator is not identity-based")
        if item["reason"] not in {"out-of-scope", "platform-mismatch", "non-ui"}:
            raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where}.reason is unsupported")
        exclusions.append(item)
    graph["exclusions"] = exclusions
    dynamic: list[dict[str, Any]] = []
    for index, raw_dynamic in enumerate(graph["dynamic"] if isinstance(graph["dynamic"], list) else []):
        where = f"$.dynamic[{index}]"
        item = _closed(raw_dynamic, where, {"id", "locator", "reason", "scene", "component", "context"})
        _id(item["id"], f"{where}.id")
        if item["locator"] != f"{graph_path}#/dynamic/{item['id']}":
            raise CaptureError("SOURCE_LOCATOR_MISMATCH", f"{where}.locator is not identity-based")
        if item["reason"] not in {"runtime-expression", "computed-import", "conditional-definition", "unknown-export"}:
            raise CaptureError("SOURCE_GRAPH_SCHEMA", f"{where}.reason is unsupported")
        for key in ("scene", "component", "context"):
            if item[key] is not None:
                _id(item[key], f"{where}.{key}")
        dynamic.append(item)
    graph["dynamic"] = dynamic
    for collection in (definitions, imports, usages, exclusions, dynamic):
        ids = [item["id"] for item in collection]
        if len(ids) != len(set(ids)):
            raise CaptureError("DUPLICATE_SOURCE_ID", "source graph collection contains duplicate IDs")
    definition_ids = {item["id"] for item in definitions}
    for edge in imports:
        if edge["from_definition"] not in definition_ids or edge["to_definition"] not in definition_ids:
            raise CaptureError("SOURCE_GRAPH_DANGLING_REF", f"import {edge['id']} references unknown definition")
    for usage in usages:
        if usage["definition_id"] not in definition_ids:
            raise CaptureError("SOURCE_GRAPH_DANGLING_REF", f"usage {usage['id']} references unknown definition")
    for key in ("themes", "entries"):
        if any(item not in definition_ids for item in candidates[key]):
            raise CaptureError("SOURCE_GRAPH_DANGLING_REF", f"canonical {key} references unknown definition")
    return graph


def _validate_request(raw: Any) -> dict[str, Any]:
    request = _closed(raw, "$request", {
        "schema_version", "capture_profile", "source_id", "source_revision", "graph_path",
        "platform", "conformance", "style_only_reason", "scope", "decisions", "limits",
    })
    if request["schema_version"] != 1 or request["capture_profile"] != CAPTURE_PROFILE:
        raise CaptureError("UNSUPPORTED_CAPTURE_PROFILE", "only repo-literal-graph-v1 schema v1 is supported")
    _id(request["source_id"], "$request.source_id")
    if not isinstance(request["source_revision"], str) or len(request["source_revision"]) != 40 or any(c not in "0123456789abcdef" for c in request["source_revision"]):
        raise CaptureError("SOURCE_REVISION_REQUIRED", "source_revision must be a full lowercase git commit")
    graph_path = _safe_relative(request["graph_path"], "$request.graph_path")
    if Path(graph_path).suffix.lower() not in SUPPORTED_SUFFIXES:
        raise CaptureError("UNSUPPORTED_SOURCE_FORMAT", "capture accepts only closed JSON/YAML literal source graphs")
    if request["platform"] != "web" or request["conformance"] not in {"structural", "style-only"}:
        raise CaptureError("UNSUPPORTED_CAPTURE_SCOPE", "only web structural/style-only intake is supported")
    if request["conformance"] == "style-only":
        if not isinstance(request["style_only_reason"], str) or not request["style_only_reason"].strip():
            raise CaptureError("STYLE_ONLY_REASON_REQUIRED", "style-only requires an explicit reason")
    elif request["style_only_reason"] is not None:
        raise CaptureError("SOURCE_GRAPH_SCHEMA", "structural intake must set style_only_reason to null")
    scope = _closed(request["scope"], "$request.scope", {"scenes", "components", "contexts"})
    for key in ("scenes", "components", "contexts"):
        _strings(scope[key], f"$request.scope.{key}", nonempty=request["conformance"] == "structural")
    decisions = _closed(request["decisions"], "$request.decisions", {"theme_id", "entry_id", "definition_ids"})
    for key in ("theme_id", "entry_id"):
        if decisions[key] is not None:
            _id(decisions[key], f"$request.decisions.{key}")
    _strings(decisions["definition_ids"], "$request.decisions.definition_ids")
    limits = _closed(request["limits"], "$request.limits", set(HARD_LIMITS))
    for key, hard_max in HARD_LIMITS.items():
        value = limits[key]
        if not isinstance(value, int) or isinstance(value, bool) or value < 1 or value > hard_max:
            raise CaptureError("UNSAFE_CAPTURE_LIMIT", f"{key} must be within 1..{hard_max}")
    return request


def _root_and_graph(source_root: Path, relative: str) -> tuple[Path, Path]:
    lexical_root = source_root.absolute()
    if "example" in lexical_root.parts:
        raise CaptureError("EXCLUDED_SOURCE_ROOT", "example/** cannot be a capture source")
    root = source_root.resolve(strict=True)
    if source_root.is_symlink():
        raise CaptureError("SOURCE_ROOT_SYMLINK", "source root must not be a symlink")
    graph = root / relative
    cursor = graph
    while cursor != root:
        if cursor.is_symlink():
            raise CaptureError("SOURCE_PATH_SYMLINK", f"source path uses symlink: {relative}")
        cursor = cursor.parent
    graph = graph.resolve(strict=True)
    try:
        graph.relative_to(root)
    except ValueError as exc:
        raise CaptureError("SOURCE_BOUNDARY", "graph escapes authorized source root") from exc
    if not graph.is_file():
        raise CaptureError("SOURCE_GRAPH_MISSING", f"graph is not a file: {relative}")
    return root, graph


def _head(root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=root, check=True, text=True,
            capture_output=True, timeout=10,
        )
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        raise CaptureError("SOURCE_REVISION_UNAVAILABLE", "authorized root is not a readable fixed git checkout") from exc
    return result.stdout.strip()


def _select(candidates: list[str], decision: str | None, kind: str, unresolved: list[dict[str, Any]]) -> str | None:
    if decision is not None:
        if decision in candidates:
            return decision
        unresolved.append({"code": f"unknown-{kind}", "candidates": sorted(candidates), "selected": decision})
        return None
    if len(candidates) == 1:
        return candidates[0]
    unresolved.append({"code": f"ambiguous-{kind}", "candidates": sorted(candidates)})
    return None


def _in_scope(item: dict[str, Any], scope: dict[str, list[str]]) -> bool:
    return (
        item.get("scene") in scope["scenes"]
        and (item.get("component") is None or item.get("component") in scope["components"])
        and (item.get("context") is None or item.get("context") in scope["contexts"])
    )



def _verify_graph_at_revision(root: Path, relative: str) -> None:
    commands = (
        ["git", "ls-files", "--error-unmatch", "--", relative],
        ["git", "diff", "--quiet", "--no-ext-diff", "--no-textconv", "HEAD", "--", relative],
    )
    for command in commands:
        try:
            subprocess.run(command, cwd=root, check=True, text=True, capture_output=True, timeout=10)
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            raise CaptureError(
                "SOURCE_GRAPH_NOT_AT_REVISION",
                "literal graph must be tracked and byte-identical to the fixed revision",
                graph_path=relative,
            ) from exc

def capture(request_data: Any, source_root: Path) -> dict[str, Any]:
    request = _validate_request(request_data)
    root, graph_file = _root_and_graph(source_root, request["graph_path"])
    head = _head(root)
    if head != request["source_revision"]:
        raise CaptureError("SOURCE_REVISION_MISMATCH", "checkout revision does not match intake", expected=request["source_revision"], actual=head)
    _verify_graph_at_revision(root, request["graph_path"])
    graph_bytes = graph_file.read_bytes()
    if len(graph_bytes) > request["limits"]["max_graph_bytes"]:
        return _limit_receipt(request, head, "max_graph_bytes", len(graph_bytes))
    graph = _validate_graph(load_document(graph_file), request["graph_path"])
    raw_counts = {
        "definitions": len(graph["definitions"]), "imports": len(graph["imports"]),
        "usages": len(graph["usages"]),
        "facts": sum(len(item["facts"]) for item in graph["definitions"] + graph["usages"]),
    }
    limit_map = {"definitions": "max_definitions", "imports": "max_imports", "usages": "max_usages", "facts": "max_facts"}
    for name, limit_name in limit_map.items():
        if raw_counts[name] > request["limits"][limit_name]:
            return _limit_receipt(request, head, limit_name, raw_counts[name], raw_counts)
    graph_digest = digest(graph)
    base_request = {
        "source_id": request["source_id"], "source_revision": request["source_revision"],
        "graph_path": request["graph_path"], "platform": request["platform"],
        "conformance": request["conformance"], "scope": {k: sorted(v) for k, v in request["scope"].items()},
        "decisions": request["decisions"], "limits": request["limits"],
    }
    if request["conformance"] == "style-only":
        semantic = {
            "capture_schema_version": CAPTURE_SCHEMA_VERSION, "capture_profile": CAPTURE_PROFILE,
            "status": "style-only", "request": base_request,
            "source": {"revision": head, "graph_digest": graph_digest},
            "closure": {"definitions": [], "exports": [], "imports": [], "usages": [], "exclusions": [], "dynamic": []},
            "facts": [], "unresolved": [],
            "summary": {"definitions": 0, "exports": 0, "imports": 0, "usages": 0, "exclusions": 0, "dynamic": 0, "facts": 0, "negative_facts": 0},
            "style_only_reason": request["style_only_reason"].strip(),
        }
        return {**semantic, "closure_digest": digest(semantic)}
    unresolved: list[dict[str, Any]] = []
    selected_theme = _select(graph["canonical_candidates"]["themes"], request["decisions"]["theme_id"], "theme", unresolved)
    selected_entry = _select(graph["canonical_candidates"]["entries"], request["decisions"]["entry_id"], "entry", unresolved)
    definitions_by_id = {item["id"]: item for item in graph["definitions"]}
    selected_ids = set(request["decisions"]["definition_ids"])
    initial: set[str] = {item for item in (selected_theme, selected_entry) if item is not None}
    dimension_kind = {"scenes": "scene", "components": "component", "contexts": "context"}
    for dimension, kind in dimension_kind.items():
        for name in request["scope"][dimension]:
            matches = sorted(item["id"] for item in graph["definitions"] if item["kind"] == kind and item["name"] == name)
            chosen = [item for item in matches if item in selected_ids]
            if len(matches) == 1:
                initial.add(matches[0])
            elif len(chosen) == 1:
                initial.add(chosen[0])
            else:
                unresolved.append({"code": "ambiguous-definition" if matches else "missing-definition", "kind": kind, "name": name, "candidates": matches})
    closure_ids = set(initial)
    changed = True
    while changed:
        changed = False
        for edge in graph["imports"]:
            if edge["from_definition"] in closure_ids and edge["to_definition"] not in closure_ids:
                closure_ids.add(edge["to_definition"])
                changed = True
    definitions = [definitions_by_id[item] for item in sorted(closure_ids)]
    imports = sorted(
        (item for item in graph["imports"] if item["from_definition"] in closure_ids and item["to_definition"] in closure_ids),
        key=lambda item: item["id"],
    )
    usages = sorted(
        (item for item in graph["usages"] if item["definition_id"] in closure_ids and _in_scope(item, request["scope"])),
        key=lambda item: item["id"],
    )
    dynamic = sorted((item for item in graph["dynamic"] if _in_scope(item, request["scope"])), key=lambda item: item["id"])
    for item in dynamic:
        unresolved.append({"code": "dynamic-source", "id": item["id"], "locator": item["locator"], "reason": item["reason"]})
    fact_rows: list[dict[str, Any]] = []
    for owner_kind, owners in (("definition", definitions), ("usage", usages)):
        for owner in owners:
            span_digest = digest(owner)
            for fact in owner["facts"]:
                fact_rows.append({**fact, "owner_kind": owner_kind, "owner_id": owner["id"], "locator": owner["locator"], "source_span_sha256": span_digest, "status": "observed"})
    fact_rows.sort(key=lambda item: item["id"])
    fact_ids = [item["id"] for item in fact_rows]
    if len(fact_ids) != len(set(fact_ids)):
        unresolved.append({"code": "duplicate-fact-id", "ids": sorted({item for item in fact_ids if fact_ids.count(item) > 1})})
    groups: dict[tuple[Any, ...], set[str]] = {}
    group_ids: dict[tuple[Any, ...], list[str]] = {}
    for fact in fact_rows:
        key = (fact["facet"], fact["subject"], fact["context"], fact["slot"], fact["state"], fact["property"])
        groups.setdefault(key, set()).add(canonical_json(fact["value"]))
        group_ids.setdefault(key, []).append(fact["id"])
    for key in sorted(groups, key=lambda item: canonical_json(item)):
        if len(groups[key]) > 1:
            unresolved.append({"code": "context-slot-conflict", "identity": list(key), "fact_ids": sorted(group_ids[key]), "values": sorted(groups[key])})
    exports = sorted(
        ({"definition_id": item["id"], "symbol": symbol} for item in definitions for symbol in item["exports"]),
        key=lambda item: (item["definition_id"], item["symbol"]),
    )
    closure = {
        "definitions": [{**item, "source_span_sha256": digest(item)} for item in definitions],
        "exports": exports,
        "imports": [{**item, "source_span_sha256": digest(item)} for item in imports],
        "usages": [{**item, "source_span_sha256": digest(item)} for item in usages],
        "exclusions": sorted(graph["exclusions"], key=lambda item: item["id"]),
        "dynamic": dynamic,
    }
    summary = {
        "definitions": len(definitions), "exports": len(exports), "imports": len(imports),
        "usages": len(usages), "exclusions": len(closure["exclusions"]), "dynamic": len(dynamic),
        "facts": len(fact_rows), "negative_facts": sum(item["negative"] for item in fact_rows),
    }
    semantic = {
        "capture_schema_version": CAPTURE_SCHEMA_VERSION, "capture_profile": CAPTURE_PROFILE,
        "status": "captured" if not unresolved else "unresolved", "request": base_request,
        "source": {"revision": head, "graph_digest": graph_digest}, "closure": closure,
        "facts": fact_rows, "unresolved": sorted(unresolved, key=canonical_json), "summary": summary,
        "style_only_reason": None,
    }
    return {**semantic, "closure_digest": digest(semantic)}


def _limit_receipt(request: dict[str, Any], head: str, limit: str, actual: int, raw_counts: dict[str, int] | None = None) -> dict[str, Any]:
    unresolved = [{"code": "limit-exceeded", "limit": limit, "configured": request["limits"][limit], "actual": actual}]
    semantic = {
        "capture_schema_version": CAPTURE_SCHEMA_VERSION, "capture_profile": CAPTURE_PROFILE,
        "status": "unresolved", "request": {
            "source_id": request["source_id"], "source_revision": request["source_revision"], "graph_path": request["graph_path"],
            "platform": request["platform"], "conformance": request["conformance"],
            "scope": {k: sorted(v) for k, v in request["scope"].items()}, "decisions": request["decisions"], "limits": request["limits"],
        },
        "source": {"revision": head, "graph_digest": None},
        "closure": {"definitions": [], "exports": [], "imports": [], "usages": [], "exclusions": [], "dynamic": []},
        "facts": [], "unresolved": unresolved,
        "summary": {**({"definitions": 0, "imports": 0, "usages": 0, "facts": 0} if raw_counts is None else raw_counts), "exports": 0, "exclusions": 0, "dynamic": 0, "negative_facts": 0},
        "style_only_reason": request["style_only_reason"],
    }
    return {**semantic, "closure_digest": digest(semantic)}


def capture_from_files(request_path: Path, source_root: Path) -> dict[str, Any]:
    if request_path.suffix.lower() not in SUPPORTED_SUFFIXES:
        raise CaptureError("UNSUPPORTED_REQUEST_FORMAT", "request must be JSON or YAML")
    return capture(load_document(request_path), source_root)


def replay(request_data: Any, source_root: Path, expected_receipt: Any) -> dict[str, Any]:
    if not isinstance(expected_receipt, dict):
        raise CaptureError("RECEIPT_INVALID", "expected receipt must be an object")
    try:
        actual = capture(request_data, source_root)
    except CaptureError as exc:
        return {
            "status": "failed", "declared": 1, "resolved": 0, "executed": 0, "passed": 0,
            "expected_closure_digest": expected_receipt.get("closure_digest"),
            "actual_closure_digest": None, "source_revision": None, "source_graph_digest": None,
            "error": {"code": exc.code, "message": str(exc), "details": exc.details},
        }
    expected_digest = expected_receipt.get("closure_digest")
    passed = (
        isinstance(expected_digest, str)
        and expected_receipt.get("status") == actual.get("status")
        and expected_receipt.get("unresolved") == actual.get("unresolved")
        and expected_receipt.get("facts") == actual.get("facts")
        and expected_digest == actual.get("closure_digest")
    )
    return {
        "status": "passed" if passed else "failed", "declared": 1, "resolved": 1,
        "executed": 1, "passed": 1 if passed else 0,
        "expected_closure_digest": expected_digest, "actual_closure_digest": actual.get("closure_digest"),
        "source_revision": actual["source"]["revision"], "source_graph_digest": actual["source"]["graph_digest"],
    }
