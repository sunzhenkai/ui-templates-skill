from __future__ import annotations

from collections import defaultdict
from typing import Any

from .capture import digest
from .chrome import ANCHOR_ROLES, CHROME_FACT_PROPERTIES, SHELL_VARIANTS, SLOT_ROLES, scene_kind_for

PROFILE = "repo-structural-v1"
REQUIRED_PADDING = (
    "padding_block_start", "padding_inline_end", "padding_block_end", "padding_inline_start",
)
LAYOUT_PROPERTIES = {
    "arrangement", "fill", "wrap", "shrink", "scroll_inline", "scroll_block", "root_scroll",
    "overlay_scope", "overlay_anchor", *CHROME_FACT_PROPERTIES,
}
GEOMETRY_PROPERTIES = {
    "padding_block_start", "padding_inline_end", "padding_block_end", "padding_inline_start",
    "gap", "inset_block_start", "inset_inline_end", "inset_block_end", "inset_inline_start",
    "size", "radius", "surface", "border", "shadow",
}
STATE_VALUE_FIELDS = {"background", "text", "border"}
NEGATIVE_SEMANTICS = {"none", "zero", "non-wrap", "non-shrink", "hidden"}


def _locator(raw: str) -> dict[str, Any]:
    path, _, fragment = raw.partition("#")
    return {
        "path": path,
        "symbol": None,
        "selector": None,
        "pointer": f"#{fragment}" if fragment else None,
        "line": None,
    }


def _provenance(fact: dict[str, Any], source_id: str, revision: str, captured_at: str) -> dict[str, Any]:
    return {
        "source_id": source_id,
        "source_revision": revision,
        "locator": _locator(str(fact.get("locator") or "")),
        "method": "source-graph",
        "source_span_sha256": fact.get("source_span_sha256") or digest(fact),
        "captured_at": captured_at,
        "confidence": "high",
    }


def _value(raw: dict[str, Any]) -> dict[str, str]:
    return {"kind": raw["kind"], "value": raw["value"]}


def _negatives(facts: list[dict[str, Any]]) -> list[dict[str, str]]:
    items = []
    for fact in facts:
        value = fact.get("value") if isinstance(fact.get("value"), dict) else {}
        if fact.get("negative") or value.get("value") in NEGATIVE_SEMANTICS:
            items.append({"property": fact["property"], "value": value.get("value", "none")})
    return sorted(items, key=lambda item: (item["property"], item["value"]))


def facts_to_fidelity(receipt: dict[str, Any], *, captured_at: str = "2026-01-01T00:00:00Z") -> dict[str, Any]:
    request = receipt.get("request") if isinstance(receipt.get("request"), dict) else {}
    source = receipt.get("source") if isinstance(receipt.get("source"), dict) else {}
    source_id = str(request.get("source_id") or "source-001")
    revision = str(source.get("revision") or request.get("source_revision") or "")
    conformance = request.get("conformance") if request.get("conformance") in {"structural", "style-only"} else "structural"
    scope = request.get("scope") if isinstance(request.get("scope"), dict) else {"scenes": [], "components": [], "contexts": []}
    if conformance == "style-only":
        return {
            "schema_version": 1,
            "profile": PROFILE,
            "conformance": "style-only",
            "platforms": [request.get("platform") or "web"],
            "style_only_reason": receipt.get("style_only_reason"),
            "scope": {key: list(scope.get(key) or []) for key in ("scenes", "components", "contexts")},
            "layout_scenes": [],
            "component_geometry": [],
            "state_presentations": [],
            "unresolved": list(receipt.get("unresolved") or []),
        }
    facts = [item for item in receipt.get("facts") or [] if isinstance(item, dict)]
    layout_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    geometry_groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    state_groups: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for fact in facts:
        facet = fact.get("facet")
        if facet == "layout_scenes":
            layout_groups[str(fact.get("subject"))].append(fact)
        elif facet == "component_geometry":
            geometry_groups[(str(fact.get("subject")), str(fact.get("slot") or "default"))].append(fact)
        elif facet == "state_presentations":
            state_groups[(
                str(fact.get("subject")),
                str(fact.get("context") or "navigation-link"),
                str(fact.get("state") or "default"),
                str(fact.get("slot") or "item"),
            )].append(fact)
    layout_scenes = []
    for scene, group in sorted(layout_groups.items()):
        properties = {item["property"]: item for item in group}
        regions = []
        seen_regions: set[str] = set()
        for fact in group:
            slot = fact.get("slot") or "root"
            region_id = f"region.{scene}.{slot}"
            if region_id not in seen_regions:
                regions.append({"id": region_id, "role": slot})
                seen_regions.add(region_id)
        if f"region.{scene}.root" not in seen_regions:
            regions.insert(0, {"id": f"region.{scene}.root", "role": "root"})
        relations = [
            {"type": "contains", "from": f"region.{scene}.root", "to": item["id"]}
            for item in regions
            if item["id"] != f"region.{scene}.root"
        ]
        scroll_domains = []
        for fact in group:
            if fact["property"] == "scroll_inline":
                owner = f"region.{scene}.{fact.get('slot') or 'root'}"
                scroll_domains.append({"id": f"scroll.{scene}.inline", "axis": "inline", "owner": owner, "nested_in": None})
            elif fact["property"] == "scroll_block":
                owner = f"region.{scene}.{fact.get('slot') or 'root'}"
                scroll_domains.append({"id": f"scroll.{scene}.{fact.get('slot') or 'block'}", "axis": "block", "owner": owner, "nested_in": None})
        overlays = []
        if "overlay_scope" in properties or "overlay_anchor" in properties:
            overlay_region = f"region.{scene}.{properties.get('overlay_scope', group[0]).get('slot') or 'overlay'}"
            if overlay_region not in seen_regions:
                regions.append({"id": overlay_region, "role": "overlay"})
                seen_regions.add(overlay_region)
                relations.append({"type": "overlay", "from": f"region.{scene}.root", "to": overlay_region})
            scope_value = properties.get("overlay_scope", {}).get("value", {}).get("value", "region")
            overlays.append({
                "id": f"overlay.{scene}",
                "scope": scope_value if scope_value in {"viewport", "region"} else "region",
                "anchor": f"region.{scene}.root",
                "region": overlay_region,
            })
        wrap = properties.get("wrap", {}).get("value", {}).get("value", "wrap")
        shrink = properties.get("shrink", {}).get("value", {}).get("value", "shrink")
        arrangement = properties.get("arrangement", {}).get("value", {}).get("value", "vertical")
        fill = properties.get("fill", {}).get("value", {}).get("value", "intrinsic")
        negatives = _negatives(group)
        if wrap == "non-wrap" and not any(item["property"] == "wrap" for item in negatives):
            negatives.append({"property": "wrap", "value": "non-wrap"})
        if shrink == "non-shrink" and not any(item["property"] == "shrink" for item in negatives):
            negatives.append({"property": "shrink", "value": "non-shrink"})
        if "root_scroll" in properties and properties["root_scroll"].get("value", {}).get("value") == "none":
            if not any(item["property"] == "root_scroll" for item in negatives):
                negatives.append({"property": "root_scroll", "value": "none"})
        slot_orders: dict[Any, int] = {}
        for fact in group:
            if fact["property"] != "slot_order":
                continue
            raw = fact.get("value", {}).get("value")
            try:
                slot_orders[fact.get("slot")] = int(raw)
            except (TypeError, ValueError):
                slot_orders[fact.get("slot")] = 0
        slots = []
        for fact in sorted(
            (item for item in group if item["property"] == "slot_role"),
            key=lambda item: (slot_orders.get(item.get("slot"), 0), str(item.get("slot"))),
        ):
            role = fact.get("value", {}).get("value")
            slot = fact.get("slot") or role
            region_id = f"region.{scene}.{slot}"
            if region_id not in seen_regions:
                regions.append({"id": region_id, "role": slot})
                seen_regions.add(region_id)
            slots.append({
                "id": f"slot.{scene}.{role}",
                "role": role if role in SLOT_ROLES else role,
                "region": region_id,
                "order": slot_orders.get(slot, 0),
            })
        chrome_anchors = []
        for fact in group:
            if fact["property"] != "anchor_role":
                continue
            role = fact.get("value", {}).get("value")
            slot = fact.get("slot") or "canvas"
            region_id = f"region.{scene}.{slot}"
            if region_id not in seen_regions:
                regions.append({"id": region_id, "role": slot})
                seen_regions.add(region_id)
            chrome_anchors.append({
                "id": f"anchor.{scene}.{role}",
                "role": role if role in ANCHOR_ROLES else role,
                "region": region_id,
            })
        relations = []
        for item in regions:
            if item["id"] == f"region.{scene}.root":
                continue
            relation = {"type": "contains", "from": f"region.{scene}.root", "to": item["id"]}
            matching = next((slot for slot in slots if slot["region"] == item["id"]), None)
            if matching is not None:
                relation["order"] = matching["order"]
            relations.append(relation)
        if overlays:
            relations.append({
                "type": "overlay",
                "from": f"region.{scene}.root",
                "to": overlays[0]["region"],
            })
        scene_kind = scene_kind_for(scene)
        record = {
            "id": f"scene.{scene}",
            "scene": scene,
            "scene_kind": scene_kind,
            "rule_id": group[0]["rule_id"],
            "status": "observed",
            "regions": regions,
            "relations": relations,
            "arrangement": arrangement if arrangement in {"horizontal", "vertical", "overlay"} else "vertical",
            "fill": fill if fill in {"fill", "intrinsic"} else "intrinsic",
            "wrap": wrap if wrap in {"wrap", "non-wrap"} else "wrap",
            "shrink": shrink if shrink in {"shrink", "non-shrink"} else "shrink",
            "scroll_domains": scroll_domains,
            "overlays": overlays,
            "responsive_modes": [{"id": "mode.desktop", "viewport": "desktop"}],
            "negative_facts": sorted(negatives, key=lambda item: (item["property"], item["value"])),
            "provenance": _provenance(group[0], source_id, revision, captured_at),
        }
        if scene_kind == "shell" or scene == "shell":
            variant = properties.get("shell_variant", {}).get("value", {}).get("value")
            record["shell_variant"] = variant if variant in SHELL_VARIANTS else variant
            record["slots"] = slots
            record["chrome_anchors"] = chrome_anchors
        layout_scenes.append(record)
    component_geometry = []
    for (component, slot), group in sorted(geometry_groups.items()):
        properties = {item["property"]: _value(item["value"]) for item in group if item["property"] in GEOMETRY_PROPERTIES}
        component_geometry.append({
            "id": f"geometry.{component}.{slot}",
            "component": component,
            "slot": slot,
            "rule_id": group[0]["rule_id"],
            "status": "observed",
            "properties": properties,
            "negative_facts": _negatives(group),
            "provenance": _provenance(group[0], source_id, revision, captured_at),
        })
    state_presentations = []
    for (subject, context, state, slot), group in sorted(state_groups.items()):
        values = {item["property"]: item for item in group}
        decoration = values.get("text_decoration", {}).get("value", {}).get("value", "none")
        visibility = values.get("visibility", {}).get("value", {}).get("value", "visible")
        record = {
            "id": f"state.{subject}.{context}.{state}.{slot}",
            "subject_role": subject,
            "context": context if context in {"navigation-link", "entity-row-link", "button-link", "inline-prose-link"} else "navigation-link",
            "state": state if state in {"default", "hover", "focus-visible", "active", "disabled", "open"} else "hover",
            "surface": slot,
            "rule_id": group[0]["rule_id"],
            "status": "observed",
            "background": _value(values["background"]["value"]) if "background" in values else None,
            "text": _value(values["text"]["value"]) if "text" in values else None,
            "border": _value(values["border"]["value"]) if "border" in values else None,
            "text_decoration": decoration if decoration in {"none", "underline"} else "none",
            "visibility": visibility if visibility in {"visible", "hidden"} else "visible",
            "container_presentation": "none",
            "negative_facts": _negatives(group),
            "provenance": _provenance(group[0], source_id, revision, captured_at),
        }
        if record["text_decoration"] == "none" and not any(item["property"] == "text_decoration" for item in record["negative_facts"]):
            record["negative_facts"].append({"property": "text_decoration", "value": "none"})
        state_presentations.append(record)
    unresolved = []
    for item in receipt.get("unresolved") or []:
        if isinstance(item, dict):
            unresolved.append({
                "code": str(item.get("code") or "unresolved").replace("_", "-"),
                "identity": list(item.get("identity") or [item.get("id") or item.get("code")]),
                "details": {key: value for key, value in item.items() if key not in {"code", "identity"}},
            })
    return {
        "schema_version": 1,
        "profile": PROFILE,
        "conformance": "structural",
        "platforms": [request.get("platform") or "web"],
        "style_only_reason": None,
        "scope": {key: list(scope.get(key) or []) for key in ("scenes", "components", "contexts")},
        "layout_scenes": layout_scenes,
        "component_geometry": component_geometry,
        "state_presentations": state_presentations,
        "unresolved": unresolved,
    }
