"""Chrome composition checks for repo-structural-v1 shell scenes.

Vocabulary policy: shell variants, slot roles and anchor roles are
*instance-declared* open vocabularies. The values below are the vocabulary of
the first captured template (workbench-shell) and are kept only as capture
hints / documentation; validators must not reject other values. Structural
completeness (slots declared, orders unique, regions resolving) stays
fail-closed.
"""
from __future__ import annotations

from typing import Any

SCENE_KINDS = ("shell", "board", "master-detail", "dialog", "other")
# Capture-hint vocabulary of the first template; not an allowlist.
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
# Capture-hint vocabulary of the first template; anchors are always optional.
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
    if not variants or len(set(variants)) != 1 or not isinstance(variants[0], str) or not variants[0]:
        gaps.append("shell_variant")
    if not slots:
        gaps.append("slots")
    order_values = []
    for slot, role in slots:
        if not isinstance(role, str) or not role:
            gaps.append(f"slot_role:{role}")
        if slot not in orders:
            gaps.append(f"slot_order:{slot}")
        else:
            order_values.append(orders[slot])
    if order_values and len(order_values) != len(set(order_values)):
        gaps.append("slot_order_unique")
    # Anchors are optional attachments; roles are instance-declared vocabulary.
    for role in anchors:
        if not isinstance(role, str) or not role:
            gaps.append(f"anchor_role:{role}")
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
    if not isinstance(variant, str) or not variant:
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
        if not isinstance(role, str) or not role:
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
    # Anchors are optional; no slot role forces an anchor record.
    for anchor in anchors:
        role = anchor.get("role")
        region = anchor.get("region")
        if not isinstance(role, str) or not role:
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

# A shell scene that declares a variant (anything except the profile-level
# "flush" waiver, where chrome and content share one surface) must characterise
# its variant surface(s): inset/margin, radius, border, shadow and background.
# The surfaces are the slots named by the graph's shell_variant facts — an
# instance-declared open vocabulary; exact values stay in tokens.yaml.
VARIANT_SURFACE_GEOMETRY: tuple[tuple[str, tuple[str, ...]], ...] = (
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
# navigation lives. The nav column is detected structurally (a slot carrying
# anatomy facts or selected/hover/active background token-refs), never by a
# fixed slot-role name.
CONTENT_SCENE_KINDS = ("board", "other")
# Profile-level waiver value: chrome and content share one surface, so
# containment/separation questions do not apply. Any other variant value is
# instance-declared and triggers them.
FLUSH_VARIANT = "flush"
# Round 2: component names that trigger the focus-treatment question.
INTERACTIVE_CONTROL_NAMES = frozenset({
    "button", "icon-button", "input", "textarea", "select", "combobox",
    "checkbox", "switch", "nav-item", "menu-item", "tabs", "pagination",
})
# Round 3: component names that trigger the trigger-anatomy question
# (whole-row trigger vs separately-clickable affordance icon).
TRIGGER_CONTROL_NAMES = frozenset({"select", "combobox", "dropdown", "dropdown-menu"})
TRIGGER_ANATOMY_VALUES = frozenset({"whole-trigger", "split-trigger"})
# Round 3: link contexts whose default-state text decoration is mandatory.
# Matched by structural naming ("link" in the declared context name), not by a
# fixed context list, so newly declared link contexts are covered.
LINK_CONTEXT_MARKER = "link"


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


# Column-level layout properties: a slot carrying any of these is a
# structural column candidate (as opposed to a lone interactive element).
COLUMN_PROPERTIES = frozenset({
    "anatomy", "arrangement", "container_presentation", "scroll_block", "scroll_inline", "size",
})


def _nav_column_slots(facts: list[dict[str, Any]]) -> set[Any]:
    """Detect an in-card navigation column structurally — never by a fixed
    slot-role name.

    A slot qualifies when it declares item anatomy (icon/label structure), or
    when it is a structural column (carries column-level layout properties)
    AND binds selected/hover/active state backgrounds to tokens. A lone
    interactive element (e.g. a single link hover fact) does not qualify.
    """
    anatomy_slots: set[Any] = set()
    column_slots: set[Any] = set()
    stateful_slots: set[Any] = set()
    for item in facts:
        if not isinstance(item, dict) or not item.get("slot"):
            continue
        slot = item.get("slot")
        if item.get("property") == "anatomy":
            anatomy_slots.add(slot)
        if item.get("property") in COLUMN_PROPERTIES:
            column_slots.add(slot)
        if (
            item.get("property") == "background"
            and item.get("state") in {"selected", "active", "hover"}
            and isinstance(item.get("value"), dict)
            and item.get("value", {}).get("kind") == "token-ref"
        ):
            stateful_slots.add(slot)
    return anatomy_slots | (column_slots & stateful_slots)


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
            variant_facts = [
                item
                for item in facts
                if item.get("property") == "shell_variant" and isinstance(item.get("value"), dict)
            ]
            if variant_facts:
                declared_slots = {
                    item.get("slot")
                    for item in facts
                    if item.get("property") == "slot_role" and item.get("slot")
                }
                surfaces = {item.get("slot") for item in variant_facts if item.get("slot")}
                if not surfaces:
                    surfaces = set(declared_slots)
                variant_value = next(
                    (item.get("value", {}).get("value") for item in variant_facts),
                    None,
                )
                surface_properties = {
                    (item.get("slot"), item.get("property")) for item in facts
                }
                for label, options in VARIANT_SURFACE_GEOMETRY:
                    key = f"variant-surface:{label}:{name}"
                    answered = bool(surfaces) and all(
                        any((slot, option) in surface_properties for option in options)
                        for slot in surfaces
                    )
                    states[key] = (
                        ("excluded" if scene_excluded else "observed" if answered else "unresolved"),
                        "scene",
                    )
                # ---- round 3: chrome containment and separation ----
                # Any non-flush variant separates chrome from the content
                # surface, so every declared chrome slot must state its
                # container (root or a named surface) and its border
                # explicitly (positive or negative). Slot roles and container
                # names are instance-declared vocabulary.
                chrome_slots = declared_slots - surfaces
                if variant_value != FLUSH_VARIANT and chrome_slots:
                    contained = {
                        item.get("slot")
                        for item in facts
                        if item.get("property") == "container_role" and item.get("slot")
                    }
                    states[f"chrome-containment:{name}"] = (
                        (
                            "excluded" if scene_excluded
                            else "observed" if chrome_slots <= contained
                            else "unresolved"
                        ),
                        "scene",
                    )
                    bordered = {
                        item.get("slot")
                        for item in facts
                        if item.get("property") == "border" and item.get("slot")
                    }
                    states[f"chrome-separation:{name}"] = (
                        (
                            "excluded" if scene_excluded
                            else "observed" if chrome_slots <= bordered
                            else "unresolved"
                        ),
                        "scene",
                    )
        elif kind == "master-detail":
            # Panes are instance-declared: any two scroll-bearing slots form
            # the master/detail pair.
            pane_slots = {
                item.get("slot")
                for item in facts
                if item.get("property") == "scroll_block" and item.get("slot")
            }
            states[f"detail-panes:{name}"] = (
                ("excluded" if scene_excluded else "observed" if len(pane_slots) >= 2 else "unresolved"),
                "scene",
            )
            # Auxiliary surfaces (e.g. a context panel) are detected from
            # overlay facts on non-pane slots, never from a fixed slot name.
            aux_slots = {
                item.get("slot")
                for item in facts
                if item.get("slot")
                and item.get("slot") not in pane_slots
                and item.get("property") in {"overlay_scope", "overlay_anchor"}
            }
            if aux_slots:
                characterised = {
                    item.get("slot")
                    for item in facts
                    if item.get("slot") in aux_slots and item.get("property") == "overlay_scope"
                }
                states[f"aux-surfaces:{name}"] = (
                    (
                        "excluded" if scene_excluded
                        else "observed" if aux_slots <= characterised
                        else "unresolved"
                    ),
                    "scene",
                )
        elif kind in CONTENT_SCENE_KINDS:
            nav_slots = _nav_column_slots(facts)
            states[f"nav-column:{name}"] = (
                ("excluded" if scene_excluded else "observed" if nav_slots else "unresolved"),
                "scene",
            )

        # ---- round 2: in-card section navigation scenes ----
        nav_slots = _nav_column_slots(facts)
        if nav_slots:
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
                and item.get("slot") in nav_slots
                for item in facts
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
            # 2c. selected/hover/active state bound to a token (mechanism must
            # be a token-ref; which surface token is a template-level decision
            # recorded in tokens.yaml, not a matrix concern).
            nav_states = [
                item for item in facts
                if item.get("property") == "background"
                and isinstance(item.get("value"), dict)
                and item.get("value", {}).get("kind") == "token-ref"
                and item.get("state") in {"selected", "active", "hover"}
            ]
            states[f"nav-state:{name}"] = (
                ("excluded" if scene_excluded else "observed" if nav_states else "unresolved"),
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
        if LINK_CONTEXT_MARKER not in name:
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
