# Library provenance

## shadcn/

Generated with `npx shadcn@4.21.4 init -b radix -p nova -y` and `shadcn add` for 37 components
(alert, alert-dialog, avatar, badge, breadcrumb, button, card, checkbox, collapsible, command,
context-menu, dialog, dropdown-menu, empty, field, hover-card, input, input-group, kbd, label,
pagination, popover, progress, radio-group, scroll-area, select, separator, sheet, sidebar,
skeleton, sonner, spinner, switch, table, tabs, textarea, tooltip) + `hooks/use-mobile.ts`.

Files import `cn` from the `cn` npm package (shadcn's own clsx + tailwind-merge helper).

Local patches (keep this list short; re-apply after regenerating):
- `ui/sonner.tsx`: `useTheme` from `@/components/blocks/theme` instead of `next-themes`.
- `ui/input-group.tsx`: disabled dimming keyed to the control (`has-[[data-slot=input-group-control]:disabled]`), not any
  disabled descendant — upstream `has-disabled` dims the typed text whenever the send button is disabled.

Adding a component: run the same CLI in a scratch project, copy the file to `shadcn/ui/`,
then `python3 scripts/build_registry.py` at the repo root.

## blocks/

Original to this skill. Depend only on `shadcn/ui`, `vocab`, React, and the npm packages
listed in `registry.json`. `router.tsx` is the single router adapter.

## lint/

`ui-template.mjs`: flat-config ESLint plugin, 10 rules, no dependencies.
