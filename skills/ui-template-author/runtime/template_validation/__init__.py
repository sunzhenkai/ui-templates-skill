"""可复用的 UI template v2 校验包。"""

from .colors import Color, composite, contrast_ratio, parse_color
from .model import Finding, ValidationResult
from .validator import TemplateValidator, validate_paths

__all__ = [
    "Color", "Finding", "TemplateValidator", "ValidationResult",
    "composite", "contrast_ratio", "parse_color", "validate_paths",
]
