from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml


class LoadError(ValueError):
    pass


class UniqueKeySafeLoader(yaml.SafeLoader):
    pass


def _construct_mapping(loader: UniqueKeySafeLoader, node: yaml.MappingNode, deep: bool = False) -> dict[Any, Any]:
    mapping: dict[Any, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise LoadError(f"duplicate mapping key: {key!r}")
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeySafeLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _construct_mapping)


def load_data(path: Path) -> Any:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise LoadError(str(exc)) from exc
    try:
        if path.suffix.lower() == ".json":
            return json.loads(text, object_pairs_hook=_unique_pairs)
        return yaml.load(text, Loader=UniqueKeySafeLoader)
    except (json.JSONDecodeError, yaml.YAMLError, LoadError) as exc:
        raise LoadError(str(exc)) from exc


def _unique_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise LoadError(f"duplicate object key: {key!r}")
        result[key] = value
    return result
