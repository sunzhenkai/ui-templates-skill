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
    "skills/ui-template/evals/cases.yaml",
    "skills/ui-template-apply/evals/cases.yaml",
)
DEFAULT_BASELINE = "governance/eval/deterministic-baseline.json"


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
    runtime = confined(root, "skills/ui-template/runtime")
    mappings = (
        ("schemas/", "schemas/"),
        ("tests/fixtures/eval/", "fixtures/eval/"),
        ("governance/eval/deterministic-baseline.json", "deterministic-baseline.json"),
        ("scripts/check_template_apply_state.py", "check_template_apply_state.py"),
        ("scripts/contract_eval/runner.py", "contract_eval/runner.py"),
    )
    for source_prefix, runtime_prefix in mappings:
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
    for path in sorted({p.resolve() for p in paths if p.exists()}, key=lambda p: str(p)):
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
                        for key in ("path", "schema"):
                            if isinstance(assertion.get(key), str):
                                revision_inputs.append(resource_path(root, assertion[key]))
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
    parser.add_argument("--skill", action="append", choices=["ui-template", "ui-template-apply"])
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
