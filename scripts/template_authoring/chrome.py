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
# Allowlist of optional chrome anchors; not a required set.
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
    for role in anchors:
        if role not in ANCHOR_ROLES:
            gaps.append(f"anchor_role:{role}")
    declared_anchors = {role for _slot, role in slots if role in ANCHOR_ROLES}
    for role in declared_anchors:
        if role not in anchors:
            gaps.append(f"anchor:{role}")
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
    declared_anchors = {slot.get("role") for slot in slots if slot.get("role") in ANCHOR_ROLES}
    for role in declared_anchors:
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


# ---------------------------------------------------------------------------
# Mandatory question matrix (close-layout-fidelity-blind-spots)
#
# closure_complete attests the questions the authored scope chose to ask; these
# constants make the questions themselves machine-forced. Silence fails closed
# the same way an incomplete chrome composition does; an explicit exclusions
# entry that targets the scene counts as an answer ("known unknown").
# ---------------------------------------------------------------------------

MANDATORY_FACT_MISSING = "MANDATORY_FACT_MISSING"

# shell_variant: inset ⇒ the floating content card (page-canvas slot) must be
# characterised: inset/margin, radius, border, shadow and background. Any fact
# property in each group answers the question; exact values stay in tokens.yaml.
INSET_CANVAS_GEOMETRY: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "inset-or-gap",
        (
            "gap",
            "inset_block_start",
            "inset_inline_end",
            "inset_block_end",
            "inset_inline_start",
            "padding_block_start",
            "padding_inline_end",
            "padding_block_end",
            "padding_inline_start",
        ),
    ),
    ("radius", ("radius",)),
    ("border", ("border",)),
    ("shadow", ("shadow",)),
    ("background", ("background",)),
)

# Multi-section content scenes (board/other) must state where their section
# navigation lives (in-card leading column, top, or none via exclusion).
CONTENT_SCENE_KINDS = ("board", "other")
# Content-surface slot names accepted by the inset geometry question (the
# chrome role stays "page-canvas"; graphs may use the shorter "canvas").
CANVAS_SLOTS = (None, "canvas", "page-canvas")
# Round 2: component names that trigger the focus-treatment question.
INTERACTIVE_CONTROL_NAMES = frozenset({
    "button", "icon-button", "input", "textarea", "select", "combobox",
    "checkbox", "switch", "nav-item", "menu-item", "tabs", "pagination",
})
# Round 3: component names that trigger the trigger-anatomy question
# (whole-row trigger vs separately-clickable affordance icon).
TRIGGER_CONTROL_NAMES = frozenset({"select", "combobox", "dropdown", "dropdown-menu"})
TRIGGER_ANATOMY_VALUES = frozenset({"whole-trigger", "split-trigger"})
# Round 3: link interaction contexts whose default-state text decoration is
# mandatory (the global "no underline unless opt-in" baseline is per-context).
LINK_CONTEXTS = frozenset({"navigation-link", "entity-row-link", "button-link", "inline-prose-link"})
# Round 3: header-like chrome slots whose containing region must be answered
# for inset shells (page-header inside the inset canvas vs outside it), plus
# the nav slot whose own border presence/absence separates chrome from canvas.
HEADER_CONTAINER_SLOTS = ("page-header", "page-toolbar")
NAV_SEPARATION_SLOT = "nav-group"
CONTAINER_ROLE_VALUES = frozenset({"root", "page-canvas", "canvas"})
SECTION_NAV_SLOT = "section-nav"
# Master-detail scenes must place both panes and state the context panel.
DETAIL_PANE_SLOTS = ("master-pane", "detail-pane")
CONTEXT_PANEL_SLOT = "context-panel"


def _scene_definitions(graph: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        item.get("name"): item
        for item in graph.get("definitions") or []
        if isinstance(item, dict) and item.get("kind") == "scene"
    }


def _scene_facts(graph: dict[str, Any], scene: dict[str, Any]) -> list[dict[str, Any]]:
    facts = [item for item in scene.get("facts") or [] if isinstance(item, dict)]
    for usage in graph.get("usages") or []:
        if isinstance(usage, dict) and usage.get("scene") == scene.get("name"):
            facts.extend(item for item in usage.get("facts") or [] if isinstance(item, dict))
    return facts


def _excluded_definition_ids(graph: dict[str, Any], graph_path: str) -> set[str]:
    prefix = f"{graph_path}#/definitions/"
    targets = set()
    for item in graph.get("exclusions") or []:
        if not isinstance(item, dict):
            continue
        locator = item.get("locator") or ""
        if locator.startswith(prefix):
            targets.add(locator[len(prefix):])
    return targets


def _matrix_questions(
    graph: dict[str, Any],
    graph_path: str,
    scene_names: list[str],
    context_names: list[str] | None = None,
) -> dict[str, tuple[str, str]]:
    """Mandatory question matrix (rounds 1-3) -> label -> (state, owner_kind).

    state: observed | excluded | unresolved. owner_kind: scene | component | context.
    """
    scenes = _scene_definitions(graph)
    excluded_ids = _excluded_definition_ids(graph, graph_path)
    usages = [item for item in graph.get("usages") or [] if isinstance(item, dict)]
    definitions = [item for item in graph.get("definitions") or [] if isinstance(item, dict)]
    components = {item.get("name"): item for item in definitions if item.get("kind") == "component"}
    states: dict[str, tuple[str, str]] = {}

    def scene_facts(name: str) -> list[dict[str, Any]]:
        return _scene_facts(graph, scenes.get(name) or {})

    def all_facts() -> list[dict[str, Any]]:
        collected: list[dict[str, Any]] = []
        for item in definitions:
            collected.extend(fact for fact in item.get("facts") or [] if isinstance(fact, dict))
        for usage in usages:
            collected.extend(fact for fact in usage.get("facts") or [] if isinstance(fact, dict))
        return collected

    # ---- round 1: layout placement questions ----
    for name in scene_names:
        scene = scenes.get(name)
        if scene is None:
            continue
        scene_excluded = scene.get("id") in excluded_ids
        facts = scene_facts(name)
        kind = scene_kind_for(name)
        if kind == "shell":
            variants = {
                item.get("value", {}).get("value")
                for item in facts
                if item.get("property") == "shell_variant" and isinstance(item.get("value"), dict)
            }
            if variants == {"inset"}:
                canvas_properties = {
                    item.get("property") for item in facts if item.get("slot") in CANVAS_SLOTS
                }
                for label, options in INSET_CANVAS_GEOMETRY:
                    key = f"inset-canvas:{label}:{name}"
                    answer = "observed" if canvas_properties & set(options) else "unresolved"
                    states[key] = ("excluded" if scene_excluded else answer, "scene")
                # ---- round 3: chrome containment and separation ----
                declared_header_slots = {
                    item.get("slot")
                    for item in facts
                    if item.get("property") == "slot_role"
                    and isinstance(item.get("value"), dict)
                    and item.get("value", {}).get("value") in HEADER_CONTAINER_SLOTS
                }
                if declared_header_slots:
                    contained = {
                        item.get("slot")
                        for item in facts
                        if item.get("property") == "container_role"
                        and isinstance(item.get("value"), dict)
                        and item.get("value", {}).get("value") in CONTAINER_ROLE_VALUES
                    }
                    states[f"chrome-containment:{name}"] = (
                        (
                            "excluded" if scene_excluded
                            else "observed" if declared_header_slots <= contained
                            else "unresolved"
                        ),
                        "scene",
                    )
                declared_nav = any(
                    item.get("property") == "slot_role"
                    and isinstance(item.get("value"), dict)
                    and item.get("value", {}).get("value") == NAV_SEPARATION_SLOT
                    for item in facts
                )
                if declared_nav:
                    nav_border = any(
                        item.get("property") == "border"
                        and item.get("slot") == NAV_SEPARATION_SLOT
                        for item in facts
                    )
                    states[f"chrome-separation:{name}"] = (
                        ("excluded" if scene_excluded else "observed" if nav_border else "unresolved"),
                        "scene",
                    )
        elif kind == "master-detail":
            pane_slots = {item.get("slot") for item in facts}
            states[f"detail-panes:{name}"] = (
                ("excluded" if scene_excluded else "observed" if set(DETAIL_PANE_SLOTS) <= pane_slots else "unresolved"),
                "scene",
            )
            has_context = any(
                usage.get("scene") == name and usage.get("slot") == CONTEXT_PANEL_SLOT for usage in usages
            )
            states[f"context-panel:{name}"] = (
                ("excluded" if scene_excluded else "observed" if has_context else "unresolved"),
                "scene",
            )
        elif kind in CONTENT_SCENE_KINDS:
            has_nav = any(
                usage.get("scene") == name and usage.get("slot") == SECTION_NAV_SLOT for usage in usages
            )
            states[f"section-nav:{name}"] = (
                ("excluded" if scene_excluded else "observed" if has_nav else "unresolved"),
                "scene",
            )

        # ---- round 2: in-card section navigation scenes ----
        nav_usage = any(usage.get("scene") == name and usage.get("slot") == SECTION_NAV_SLOT for usage in usages)
        if nav_usage:
            # 2a. multi-pane topology: root non-scroll + >=2 pane scroll domains + nav stretch
            root_none = any(
                item.get("property") == "root_scroll"
                and isinstance(item.get("value"), dict)
                and item.get("value", {}).get("value") == "none"
                for item in facts
            )
            pane_slots = {
                item.get("slot")
                for item in facts
                if item.get("property") == "scroll_block" and item.get("slot")
            }
            stretch = any(
                item.get("property") in {"size", "container_presentation"}
                and isinstance(item.get("value"), dict)
                and item.get("value", {}).get("value") == "fill"
                and item.get("slot") == SECTION_NAV_SLOT
                for item in facts + [f for u in usages if u.get("scene") == name for f in u.get("facts") or []]
            )
            topology_ok = root_none and len(pane_slots) >= 2 and stretch
            states[f"pane-scroll:{name}"] = (
                ("excluded" if scene_excluded else "observed" if topology_ok else "unresolved"),
                "scene",
            )
            # 2b. nav item anatomy (icon+label vs label-only)
            anatomy = [
                item for item in facts
                if item.get("property") == "anatomy" and isinstance(item.get("value"), dict)
            ]
            states[f"nav-anatomy:{name}"] = (
                ("excluded" if scene_excluded else "observed" if anatomy else "unresolved"),
                "scene",
            )
            # 2c. page-surface selected/hover state (must not bind sidebar tokens)
            nav_states = [
                item for item in facts
                if item.get("property") == "background"
                and isinstance(item.get("value"), dict)
                and item.get("value", {}).get("kind") == "token-ref"
                and item.get("state") in {"selected", "active", "hover"}
            ]
            page_surface = [
                item for item in nav_states
                if "sidebar" not in str(item.get("value", {}).get("value", ""))
            ]
            states[f"nav-state:{name}"] = (
                ("excluded" if scene_excluded else "observed" if page_surface else "unresolved"),
                "scene",
            )

    # ---- round 2: interactive control focus treatment ----
    for name in sorted(components):
        if not _is_interactive_control(name):
            continue
        component = components[name]
        component_excluded = component.get("id") in excluded_ids
        focus_facts = [
            item
            for item in (component.get("facts") or []) + [
                fact
                for usage in usages
                if usage.get("component") == name
                for fact in (usage.get("facts") or [])
            ]
            if isinstance(item, dict)
            and item.get("facet") == "state_presentations"
            and item.get("state") == "focus-visible"
            and item.get("property") in {"border", "shadow"}
        ]
        states[f"focus:{name}"] = (
            ("excluded" if component_excluded else "observed" if focus_facts else "unresolved"),
            "component",
        )

    # ---- round 3: trigger anatomy for select-like controls ----
    for name in sorted(components):
        if name not in TRIGGER_CONTROL_NAMES:
            continue
        component = components[name]
        component_excluded = component.get("id") in excluded_ids
        anatomy_facts = [
            item
            for item in (component.get("facts") or []) + [
                fact
                for usage in usages
                if usage.get("component") == name
                for fact in (usage.get("facts") or [])
            ]
            if isinstance(item, dict)
            and item.get("property") == "anatomy"
            and isinstance(item.get("value"), dict)
            and item.get("value", {}).get("value") in TRIGGER_ANATOMY_VALUES
        ]
        states[f"trigger-anatomy:{name}"] = (
            ("excluded" if component_excluded else "observed" if anatomy_facts else "unresolved"),
            "component",
        )

    # ---- round 3: default-state link decoration per declared context ----
    every_fact = all_facts()
    context_definitions = {
        item.get("name"): item for item in definitions if item.get("kind") == "context"
    }
    for name in sorted(context_names or []):
        if name not in LINK_CONTEXTS:
            continue
        context_excluded = (context_definitions.get(name) or {}).get("id") in excluded_ids
        decoration_facts = [
            item
            for item in every_fact
            if isinstance(item, dict)
            and item.get("facet") == "state_presentations"
            and item.get("context") == name
            and item.get("state") == "default"
            and item.get("property") == "text_decoration"
        ]
        states[f"state-decoration:{name}"] = (
            ("excluded" if context_excluded else "observed" if decoration_facts else "unresolved"),
            "context",
        )
    return states


def _is_interactive_control(name: str | None) -> bool:
    if not isinstance(name, str) or not name:
        return False
    return name in INTERACTIVE_CONTROL_NAMES or name.endswith("-nav") or name.endswith("-nav-item")


def mandatory_fact_gaps(
    graph: dict[str, Any],
    graph_path: str,
    scene_names: list[str],
    context_names: list[str] | None = None,
) -> list[str]:
    """Answer-state check for the mandatory question matrix over included scenes/components/contexts."""
    states = _matrix_questions(graph, graph_path, scene_names, context_names)
    return sorted(key for key, (state, _kind) in states.items() if state == "unresolved")


def mandatory_answer_states(
    graph: dict[str, Any],
    graph_path: str,
    scene_names: list[str],
    context_names: list[str] | None = None,
) -> dict[str, str]:
    """Per-item answer state for the mandatory question matrix."""
    return {
        key: state
        for key, (state, _kind) in _matrix_questions(graph, graph_path, scene_names, context_names).items()
    }
