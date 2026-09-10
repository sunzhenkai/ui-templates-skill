from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True, order=True)
class Finding:
    path: str
    code: str
    severity: str
    message: str
    details: dict[str, Any] = field(default_factory=dict, compare=False)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ValidationResult:
    findings: list[Finding] = field(default_factory=list)
    templates: list[dict[str, Any]] = field(default_factory=list)
    contrast: dict[str, dict[str, int]] = field(default_factory=dict)
    discovery: dict[str, Any] = field(default_factory=dict)

    def add(self, code: str, path: str, message: str, *, severity: str = "error", **details: Any) -> None:
        self.findings.append(Finding(path=path, code=code, severity=severity, message=message, details=details))

    def ordered_findings(self) -> list[Finding]:
        return sorted(self.findings)

    @property
    def failed(self) -> bool:
        return any(f.severity == "error" for f in self.findings)

    def to_dict(self) -> dict[str, Any]:
        ordered = self.ordered_findings()
        fidelity = {
            "legacy_baseline": sum(1 for item in self.templates if (item.get("fidelity") or {}).get("conformance") == "legacy-baseline"),
            "style_only": sum(1 for item in self.templates if (item.get("fidelity") or {}).get("conformance") == "style-only"),
            "structural": sum(1 for item in self.templates if (item.get("fidelity") or {}).get("conformance") == "structural"),
            "unknown": sum(1 for item in self.templates if (item.get("fidelity") or {}).get("conformance") == "unknown"),
        }
        discovery = {
            "example_excluded": True,
            "exclusions": ["example/**"],
            **self.discovery,
        }
        return {
            "result_schema_version": 1,
            "templates": sorted(self.templates, key=lambda item: (item.get("name", ""), item.get("path", ""))),
            "findings": [f.to_dict() for f in ordered],
            "contrast": {key: self.contrast[key] for key in sorted(self.contrast)},
            "fidelity": fidelity,
            "discovery": discovery,
            "counts": {
                "templates": len(self.templates),
                "findings": len(ordered),
                "errors": sum(f.severity == "error" for f in ordered),
                "warnings": sum(f.severity == "warning" for f in ordered),
            },
            "exit_code": 1 if self.failed else 0,
        }
