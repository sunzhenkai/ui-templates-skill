#!/usr/bin/env python3
"""Compute Impact-based Resume phases for a design-system Apply checkpoint."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import yaml


def load(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def canonical_digest(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


LAYER_PHASES = {
    "tokens": [1, 4, 5, 6, 7, 8],
    "primitives": [4, 5, 6, 7, 8],
    "patterns": [2, 3, 4, 5, 6, 7, 8],
    "page-types": [2, 3, 4, 5, 6, 7, 8],
    "layout": [2, 3, 4, 5, 6, 7, 8],
    "rules": [6, 7, 8],
    "binding": [1, 3, 4, 5, 6, 7, 8],
    "build": [0, 3, 4, 5, 6, 7, 8],
}


def plan(checkpoint_path: Path, design_root: Path) -> dict[str, Any]:
    checkpoint = load(checkpoint_path)
    contract = load(design_root / "design-system.yaml")
    binding = load(design_root / "binding.yaml")
    blockers: list[str] = []
    template_path = design_root / "meta.yaml"
    fidelity_path = design_root / "fidelity.yaml"
    template = load(template_path) if template_path.is_file() else None
    fidelity = load(fidelity_path) if fidelity_path.is_file() else None
    template_identity = template if fidelity is None else {"template": template, "fidelity": fidelity}
    template_digest = canonical_digest(template_identity) if template is not None else None
    if checkpoint.get("contract", {}).get("id") != contract.get("id") or checkpoint.get("contract", {}).get("version") != contract.get("version"):
        blockers.append("CONTRACT_IDENTITY_MISMATCH")
    if checkpoint.get("contract", {}).get("digest", {}).get("value") != contract.get("contract_digest", {}).get("value"):
        blockers.append("CONTRACT_DIGEST_MISMATCH")
    if template is None:
        blockers.append("TEMPLATE_IDENTITY_MISSING")
    elif checkpoint.get("template", {}).get("digest") is not None and checkpoint["template"]["digest"].get("value") != template_digest:
        blockers.append("TEMPLATE_IDENTITY_DIGEST_MISMATCH")
    if checkpoint.get("binding_digest", {}).get("value") != binding.get("binding_digest", {}).get("value"):
        blockers.append("BINDING_DIGEST_MISMATCH")
    recorded = {item["name"]: item["digest"]["value"] for item in checkpoint.get("projection_digests", [])}
    for projection in binding.get("projections", []):
        if recorded.get(projection["name"]) != projection["digest"]["value"]:
            blockers.append("PROJECTION_DIGEST_MISMATCH")
    layers = set(checkpoint.get("change_set", []))
    if blockers:
        phases: list[int] = list(range(10))
    else:
        phases = sorted({phase for layer in layers for phase in LAYER_PHASES.get(layer, list(range(10)))})
    return {
        "schema_version": 1,
        "mode": checkpoint.get("mode"),
        "template_digest": template_digest,
        "fidelity_profile_digest": canonical_digest(fidelity) if fidelity is not None else None,
        "blocked": bool(blockers),
        "blockers": sorted(set(blockers)),
        "reopened_phases": phases,
        "earliest_phase": min(phases) if phases else None,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("--design-root", type=Path, default=Path(".ui-template-design"))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    payload = plan(args.checkpoint.resolve(), args.design_root.resolve())
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if not payload["blocked"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
