from __future__ import annotations

from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

SCHEMA_FILES = {
    "meta": "meta.schema.json",
    "tokens": "tokens.schema.json",
    "evidence": "evidence.schema.json",
    "feedback": "feedback.schema.json",
    "checkpoint": "checkpoint.schema.json",
    "verification": "verification.schema.json",
    "skills-manifest": "skills-manifest.schema.json",
}


class SchemaStore:
    def __init__(self, directory: Path):
        self.directory = directory
        self.schemas: dict[str, dict[str, Any]] = {}
        registry = Registry()
        import json
        for path in sorted(directory.glob("*.schema.json")):
            schema = json.loads(path.read_text(encoding="utf-8"))
            self.schemas[path.name] = schema
            resource = Resource.from_contents(schema)
            registry = registry.with_resource(schema["$id"], resource)
            registry = registry.with_resource(path.name, resource)
        self.registry = registry

    def errors(self, kind: str, instance: Any) -> list[tuple[str, str, dict[str, Any]]]:
        filename = SCHEMA_FILES[kind]
        validator = Draft202012Validator(
            self.schemas[filename], registry=self.registry, format_checker=FormatChecker(),
        )
        result = []
        for error in sorted(validator.iter_errors(instance), key=lambda e: (list(e.absolute_path), e.validator or "", e.message)):
            path = ".".join(str(part) for part in error.absolute_path)
            result.append((path, error.message, {"validator": error.validator, "schema_path": "/".join(map(str, error.absolute_schema_path))}))
        # JSON Schema 的 uniqueItems 只能比较完整对象；manifest 契约要求 path 键本身唯一。
        if kind == "skills-manifest" and isinstance(instance, dict):
            seen: dict[str, int] = {}
            for index, item in enumerate(instance.get("files", [])):
                if not isinstance(item, dict) or not isinstance(item.get("path"), str):
                    continue
                path_value = item["path"]
                if path_value in seen:
                    result.append((
                        f"files.{index}.path",
                        f"manifest file path duplicates files.{seen[path_value]}.path",
                        {"validator": "uniquePath", "schema_path": "properties/files/uniquePath"},
                    ))
                else:
                    seen[path_value] = index
        return sorted(result, key=lambda item: (item[0], item[2]["validator"], item[1]))
