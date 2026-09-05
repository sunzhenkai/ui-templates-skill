"""Closed chrome composition for repo-structural-v1 shell scenes."""
from __future__ import annotations

from typing import Any

SCENE_KINDS = ("shell", "board", "master-detail", "dialog", "other")
SHELL_VARIANTS = ("inset", "flush")
SLOT_ROLES = (
    "workspace-switcher",
    "search",
    "compose",
    "nav-group",
    "pin-list",
    "rail",
    "header-trigger",
    "footer-utility",
    "chat-fab",
    "page-header",
    "page-toolbar",
    "page-canvas",
)
ANCHOR_ROLES = ("header-trigger", "chat-fab")
CHROME_FACT_PROPERTIES = ("shell_variant", "slot_role", "slot_order", "anchor_role")
SLOT_ORDER_SEMANTICS = tuple(str(index) for index in range(33))
CHROME_SEMANTIC_VALUES = frozenset(
    (*SHELL_VARIANTS, *SLOT_ROLES, *SLOT_ORDER_SEMANTICS)
)
SCENE_KIND_BY_NAME = {
    "shell": "shell",
    "board": "board",
    "master-detail": "master-detail",
    "dialog": "dialog",
}
CHROME_INCOMPLETE = "CHROME_COMPOSITION_INCOMPLETE"
LAYOUT_HIGH_WITHOUT_CHROME = "LAYOUT_CONFIDENCE_WITHOUT_CHROME"
COVERAGE_TAXONOMY_REPLACES_SHELL = "COVERAGE_TAXONOMY_REPLACES_SHELL"


def scene_kind_for(name: str | None) -> str:
    return SCENE_KIND_BY_NAME.get(str(name or ""), "other")


def is_shell_record(record: dict[str, Any]) -> bool:
    kind = record.get("scene_kind")
    scene = record.get("scene")
    return kind == "shell" or scene == "shell"


def shell_kind_evasion(record: dict[str, Any]) -> bool:
    return record.get("scene") == "shell" and record.get("scene_kind") == "other"


def _value(fact: dict[str, Any]) -> Any:
    raw = fact.get("value")
    if isinstance(raw, dict):
        return raw.get("value")
    return raw


def chrome_fact_gaps(facts: list[dict[str, Any]]) -> list[str]:
    variants: list[str] = []
    slots: list[tuple[Any, Any]] = []
    orders: dict[Any, Any] = {}
    anchors: set[Any] = set()
    for fact in facts:
        if not isinstance(fact, dict):
            continue
        property_name = fact.get("property")
        value = _value(fact)
        slot = fact.get("slot")
        if property_name == "shell_variant":
            variants.append(value)
        elif property_name == "slot_role":
            slots.append((slot, value))
        elif property_name == "slot_order":
            orders[slot] = value
        elif property_name == "anchor_role":
            anchors.add(value)
    gaps: list[str] = []
    if not variants or len(set(variants)) != 1 or variants[0] not in SHELL_VARIANTS:
        gaps.append("shell_variant")
    if not slots:
        gaps.append("slots")
    order_values = []
    for slot, role in slots:
        if role not in SLOT_ROLES:
            gaps.append(f"slot_role:{role}")
        if slot not in orders:
            gaps.append(f"slot_order:{slot}")
        else:
            order_values.append(orders[slot])
    if order_values and len(order_values) != len(set(order_values)):
        gaps.append("slot_order_unique")
    missing_anchors = [role for role in ANCHOR_ROLES if role not in anchors]
    if missing_anchors:
        gaps.extend(f"anchor:{role}" for role in missing_anchors)
    return sorted(set(gaps))


def chrome_record_gaps(record: dict[str, Any]) -> list[str]:
    if shell_kind_evasion(record):
        return ["scene_kind_evasion"]
    if not is_shell_record(record):
        return []
    gaps: list[str] = []
    if record.get("scene_kind") not in {None, "shell"} and record.get("scene") == "shell":
        gaps.append("scene_kind")
    if record.get("scene_kind") is None and record.get("scene") == "shell":
        gaps.append("scene_kind")
    variant = record.get("shell_variant")
    if variant not in SHELL_VARIANTS:
        gaps.append("shell_variant")
    region_ids = {
        item.get("id")
        for item in record.get("regions") or []
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    slots = [item for item in record.get("slots") or [] if isinstance(item, dict)]
    if not slots:
        gaps.append("slots")
    orders: list[Any] = []
    seen_roles: set[Any] = set()
    for slot in slots:
        role = slot.get("role")
        order = slot.get("order")
        region = slot.get("region")
        if role not in SLOT_ROLES:
            gaps.append(f"slot_role:{role}")
        if role in seen_roles:
            gaps.append(f"slot_role_duplicate:{role}")
        seen_roles.add(role)
        if not isinstance(order, int) or isinstance(order, bool) or order < 0 or order > 32:
            gaps.append(f"slot_order:{slot.get('id')}")
        else:
            orders.append(order)
        if isinstance(region, str) and region not in region_ids:
            gaps.append(f"slot_region:{region}")
    if orders and len(orders) != len(set(orders)):
        gaps.append("slot_order_unique")
    anchors = [item for item in record.get("chrome_anchors") or [] if isinstance(item, dict)]
    present_anchors = {item.get("role") for item in anchors}
    for role in ANCHOR_ROLES:
        if role not in present_anchors:
            gaps.append(f"anchor:{role}")
    for anchor in anchors:
        role = anchor.get("role")
        region = anchor.get("region")
        if role not in ANCHOR_ROLES:
            gaps.append(f"anchor_role:{role}")
        if isinstance(region, str) and region not in region_ids:
            gaps.append(f"anchor_region:{region}")
    parent_orders: dict[tuple[Any, Any], list[int]] = {}
    for relation in record.get("relations") or []:
        if not isinstance(relation, dict) or relation.get("type") != "contains":
            continue
        order = relation.get("order")
        if order is None:
            continue
        if not isinstance(order, int) or isinstance(order, bool):
            gaps.append("contains_order")
            continue
        key = (relation.get("type"), relation.get("from"))
        parent_orders.setdefault(key, []).append(order)
    for key, values in parent_orders.items():
        if len(values) != len(set(values)):
            gaps.append(f"contains_order_unique:{key[1]}")
    return sorted(set(gaps))


def chrome_complete_record(record: dict[str, Any]) -> bool:
    return not chrome_record_gaps(record)


def chrome_complete_sidecar(data: dict[str, Any] | None) -> bool:
    if not isinstance(data, dict) or data.get("conformance") != "structural":
        return False
    scenes = [item for item in data.get("layout_scenes") or [] if isinstance(item, dict)]
    shells = [item for item in scenes if is_shell_record(item) or shell_kind_evasion(item)]
    if not shells:
        return True
    return all(chrome_complete_record(item) for item in shells)


def page_modes_replace_shell(declared: Any) -> bool:
    if not isinstance(declared, list):
        return False
    return {"A", "B", "C", "D", "E"}.issubset(set(declared))
