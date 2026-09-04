from __future__ import annotations

from typing import Any

from .state import Finding

LAYOUT_KEYS = ("arrangement", "fill", "wrap", "shrink", "scroll_domains", "overlays", "responsive_modes", "relations")
GEOMETRY_KEYS = ("properties",)
STATE_KEYS = ("text_decoration", "visibility", "background", "text", "border", "container_presentation")


def _sorted_ids(values: list[str]) -> list[str]:
    return sorted(dict.fromkeys(values))


def project_layout(profile: dict[str, Any] | None) -> list[str]:
    if not isinstance(profile, dict):
        return []
    identities: list[str] = []
    for scene in profile.get("layout_scenes") or []:
        if not isinstance(scene, dict):
            continue
        scene_id = scene.get("id") or scene.get("scene")
        identities.append(f"layout:{scene_id}:arrangement:{scene.get('arrangement')}")
        identities.append(f"layout:{scene_id}:fill:{scene.get('fill')}")
        identities.append(f"layout:{scene_id}:wrap:{scene.get('wrap')}")
        identities.append(f"layout:{scene_id}:shrink:{scene.get('shrink')}")
        if scene.get("shell_variant"):
            identities.append(f"shell_variant:{scene_id}:{scene.get('shell_variant')}")
        for slot in scene.get("slots") or []:
            if isinstance(slot, dict):
                identities.append(f"slot:{slot.get('role')}:{slot.get('order')}")
        for anchor in scene.get("chrome_anchors") or []:
            if isinstance(anchor, dict):
                identities.append(f"anchor:{anchor.get('role')}→{anchor.get('region')}")
        for domain in scene.get("scroll_domains") or []:
            if isinstance(domain, dict):
                identities.append(f"scroll:{scene_id}:{domain.get('id')}:{domain.get('axis')}:{domain.get('owner')}")
        for overlay in scene.get("overlays") or []:
            if isinstance(overlay, dict):
                identities.append(f"overlay:{scene_id}:{overlay.get('id')}:{overlay.get('scope')}:{overlay.get('anchor')}")
        for mode in scene.get("responsive_modes") or []:
            if isinstance(mode, dict):
                identities.append(f"responsive:{scene_id}:{mode.get('id')}:{mode.get('viewport')}")
        for fact in scene.get("negative_facts") or []:
            if isinstance(fact, dict):
                identities.append(f"layout-negative:{scene_id}:{fact.get('property')}:{fact.get('value')}")
    return _sorted_ids(identities)


def project_geometry_state(profile: dict[str, Any] | None) -> list[str]:
    if not isinstance(profile, dict):
        return []
    identities: list[str] = []
    for record in profile.get("component_geometry") or []:
        if not isinstance(record, dict):
            continue
        component = record.get("component")
        slot = record.get("slot")
        properties = record.get("properties") if isinstance(record.get("properties"), dict) else {}
        for name, value in sorted(properties.items()):
            kind = value.get("kind") if isinstance(value, dict) else None
            raw = value.get("value") if isinstance(value, dict) else value
            identities.append(f"geometry:{component}:{slot}:{name}:{kind}:{raw}")
        for fact in record.get("negative_facts") or []:
            if isinstance(fact, dict):
                identities.append(f"geometry-negative:{component}:{slot}:{fact.get('property')}:{fact.get('value')}")
    for record in profile.get("state_presentations") or []:
        if not isinstance(record, dict):
            continue
        prefix = f"state:{record.get('subject_role')}:{record.get('context')}:{record.get('state')}:{record.get('surface')}"
        identities.append(f"{prefix}:text_decoration:{record.get('text_decoration')}")
        identities.append(f"{prefix}:visibility:{record.get('visibility')}")
        for field in ("background", "text", "border"):
            value = record.get(field)
            if isinstance(value, dict):
                identities.append(f"{prefix}:{field}:{value.get('kind')}:{value.get('value')}")
        for fact in record.get("negative_facts") or []:
            if isinstance(fact, dict):
                identities.append(f"{prefix}:negative:{fact.get('property')}:{fact.get('value')}")
    return _sorted_ids(identities)


def derive_scenario_ids(profile: dict[str, Any] | None) -> list[str]:
    if not isinstance(profile, dict) or profile.get("conformance") != "structural":
        return []
    identities: list[str] = []
    for item in project_layout(profile):
        if item.startswith(("scroll:", "overlay:", "layout-negative:", "shell_variant:", "slot:", "anchor:")):
            identities.append(f"phase8:{item}")
    for item in project_geometry_state(profile):
        identities.append(f"phase8:{item}")
    return _sorted_ids(identities)


def required_evidence_kinds() -> list[str]:
    return [
        "computed-style",
        "logical-geometry",
        "scroll-owner",
        "overflow",
        "state-transition",
        "overlay-scope",
        "accessibility-tree",
    ]


def facet_change_phase(previous: dict[str, Any] | None, current: dict[str, Any] | None) -> int | None:
    previous_layout = project_layout(previous)
    current_layout = project_layout(current)
    previous_geometry = project_geometry_state(previous)
    current_geometry = project_geometry_state(current)
    if previous is None and current is None:
        return None
    if (previous is None) != (current is None):
        return 0 if previous is None or current is None and not current_layout and not current_geometry else 2
    if previous_layout != current_layout:
        return 2
    if previous_geometry != current_geometry:
        return 4
    if derive_scenario_ids(previous) != derive_scenario_ids(current):
        return 8
    return None


def fidelity_recovery_findings(
    *,
    previous: dict[str, Any] | None,
    current: dict[str, Any] | None,
) -> list[Finding]:
    phase = facet_change_phase(previous, current)
    if phase is None:
        return []
    code = {
        0: "CHECKPOINT_FIDELITY_IDENTITY",
        2: "CHECKPOINT_FIDELITY_LAYOUT_DRIFT",
        4: "CHECKPOINT_FIDELITY_GEOMETRY_STATE_DRIFT",
        8: "CHECKPOINT_FIDELITY_SCENARIO_DRIFT",
    }[phase]
    return [Finding(code, "fidelity.yaml", "structural profile canonical semantics 已变化", phase)]
