"""可复用的 UI template v2 校验包。

延迟导出 validator 相关名字：loading/schema 的消费方（apply 状态校验）
不得被迫加载 validator → template_authoring 的跨包依赖链。
"""

_EXPORTS = {
    "Color": "colors",
    "composite": "colors",
    "contrast_ratio": "colors",
    "parse_color": "colors",
    "Finding": "model",
    "ValidationResult": "model",
    "TemplateValidator": "validator",
    "validate_paths": "validator",
}


def __getattr__(name):
    module = _EXPORTS.get(name)
    if module is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    import importlib

    attribute = getattr(importlib.import_module(f".{module}", __name__), name)
    globals()[name] = attribute
    return attribute


__all__ = [
    "Color", "Finding", "TemplateValidator", "ValidationResult",
    "composite", "contrast_ratio", "parse_color", "validate_paths",
]
