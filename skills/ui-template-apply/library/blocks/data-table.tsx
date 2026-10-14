/**
 * DataTable — the collection pattern on TanStack Table + shadcn table.
 *
 * Construction guarantees (do not re-implement per page):
 * - one column definition drives header AND cells (no drift between them);
 * - `meta.kind` decides alignment, font and truncation; `meta.priority` hides columns by the
 *   CONTAINER width (not the viewport); below `stackBelow` px the table becomes a two-line list;
 * - rows navigate through a real anchor (RowLink) or select with aria-selected — never <tr onClick>;
 * - the footer always tells how many rows are shown and offers "load more" when there are more;
 * - `frame="bordered"` (default) draws the region: outer border, radius, header band, row rules.
 *   Use `frame="flush"` only when the table already sits inside a bordered surface (Card, Sheet) — never both.
 */
import * as React from "react"
import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type Row, type RowData, type SortingState,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RowLink } from "@/components/blocks/row-link"
import { useContainerWidth } from "@/components/blocks/use-container-width"
import { vocab } from "@/lib/vocab"

export type ColumnKind = "primary" | "text" | "id" | "number" | "time" | "status" | "tags" | "actions"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Rendering contract of the column. Default "text". */
    kind?: ColumnKind | undefined
    /** 1 = always visible (default), 2 = hidden below ~42rem container, 3 = hidden below ~56rem. */
    priority?: 1 | 2 | 3 | undefined
  }
}

const kindClass: Record<ColumnKind, string> = {
  primary: "w-full max-w-0 min-w-48 font-medium text-foreground",
  text: "max-w-64 truncate text-muted-foreground",
  id: "whitespace-nowrap",
  number: "text-right tabular-nums whitespace-nowrap",
  time: "text-right tabular-nums whitespace-nowrap text-muted-foreground",
  status: "whitespace-nowrap",
  tags: "max-w-56",
  actions: "relative z-10 w-px py-0 text-right whitespace-nowrap",
}
const priorityClass = { 1: "", 2: "hidden @2xl/table:table-cell", 3: "hidden @4xl/table:table-cell" } as const

export type DataTableProps<T> = {
  /** Accessible name of the table (rendered as an sr-only caption). */
  label: string
  columns: ColumnDef<T, unknown>[]
  data: T[]
  getRowId: (row: T) => string
  /** Row navigation (preferred when a detail page exists). */
  rowHref?: ((row: T) => string) | undefined
  /** Accessible name of the row link; defaults to the first primary cell text. */
  rowLabel?: ((row: T) => string) | undefined
  /** Master-detail selection instead of navigation. */
  selectedId?: string | undefined
  onSelect?: ((row: T) => void) | undefined
  /** Server total when known; shown as "shown / total". */
  total?: number | undefined
  hasMore?: boolean | undefined
  loadingMore?: boolean | undefined
  onLoadMore?: (() => void) | undefined
  /**
   * Server/URL-owned sort. When `sorting` is passed the table is controlled and does not reorder rows
   * (the server returns them sorted); omit it and sorting is client-side over the loaded rows.
   */
  sorting?: SortingState | undefined
  onSortingChange?: ((sorting: SortingState) => void) | undefined
  /** "bordered" (default) frames the table; "flush" when a parent Card/Sheet already draws the border. */
  frame?: "bordered" | "flush" | undefined
  /** Container width (px) under which rows render as a two-line list. */
  stackBelow?: number | undefined
  className?: string | undefined
}

export function DataTable<T>({
  label, columns, data, getRowId, rowHref, rowLabel, selectedId, onSelect,
  total, hasMore = false, loadingMore = false, onLoadMore, sorting: controlled, onSortingChange, frame = "bordered", stackBelow = 480, className,
}: DataTableProps<T>) {
  const [local, setLocal] = React.useState<SortingState>([])
  const sorting = controlled ?? local
  const table = useReactTable({
    data, columns, getRowId: (row) => getRowId(row), state: { sorting }, manualSorting: controlled !== undefined,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      if (controlled === undefined) setLocal(next)
      onSortingChange?.(next)
    },
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), enableSortingRemoval: true,
    defaultColumn: { enableSorting: false }, // opt in per column: `enableSorting: true`
  })
  const [ref, width] = useContainerWidth<HTMLDivElement>()
  const stacked = width > 0 && width < stackBelow
  const rows = table.getRowModel().rows

  const rowProps = (row: Row<T>) => {
    const selected = selectedId !== undefined && row.id === selectedId
    return {
      "data-state": selected ? "selected" : undefined,
      // rows (table) support aria-selected; list items do not, so the stacked list uses aria-current
      ...(onSelect === undefined ? {} : stacked ? { "aria-current": selected ? ("true" as const) : undefined } : { "aria-selected": selected }),
      tabIndex: onSelect !== undefined ? 0 : undefined,
      onKeyDown: onSelect !== undefined ? (event: React.KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row.original) } } : undefined,
      onClick: onSelect !== undefined ? () => onSelect(row.original) : undefined,
      className: cn("relative", (rowHref !== undefined || onSelect !== undefined) && "cursor-pointer", onSelect !== undefined && "focus-visible:bg-muted/50 focus-visible:outline-none"),
    }
  }
  const linkFor = (row: Row<T>) => {
    if (rowHref === undefined) return null
    const primary = row.getVisibleCells().find((cell) => cell.column.columnDef.meta?.kind === "primary")
    const name = rowLabel?.(row.original) ?? String(primary?.getValue() ?? row.id)
    return <RowLink to={rowHref(row.original)} label={name} />
  }

  const bordered = frame === "bordered"
  return (
    <div ref={ref} data-surface={bordered ? "panel" : undefined} className={cn("@container/table min-w-0", bordered && "overflow-clip rounded-lg border bg-card", className)}>
      {stacked ? (
        <ul aria-label={label} className={cn("divide-y", !bordered && "border-y")}>
          {rows.map((row) => {
            const cells = row.getVisibleCells()
            const primary = cells.find((cell) => cell.column.columnDef.meta?.kind === "primary") ?? cells[0]
            if (primary === undefined) return null
            const actions = cells.find((cell) => cell.column.columnDef.meta?.kind === "actions")
            const meta = cells.filter((cell) => cell !== primary && cell !== actions && (cell.column.columnDef.meta?.priority ?? 1) === 1)
            const props = rowProps(row)
            return (
              <li key={row.id} {...props} className={cn(props.className, "flex items-center gap-3 px-3 py-2 hover:bg-muted/50 data-[state=selected]:bg-muted")}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{flexRender(primary.column.columnDef.cell, primary.getContext())}</div>
                  {meta.length > 0 ? (
                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {meta.map((cell) => <span key={cell.id} className="min-w-0 truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>)}
                    </div>
                  ) : null}
                </div>
                {actions !== undefined ? <div className="relative z-10 shrink-0">{flexRender(actions.column.columnDef.cell, actions.getContext())}</div> : null}
                {linkFor(row)}
              </li>
            )
          })}
        </ul>
      ) : (
        <Table>
          <caption className="sr-only">{label}</caption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className={cn("hover:bg-transparent", bordered && "bg-muted/50")}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta
                  const kind = meta?.kind ?? "text"
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={cn("h-9 text-xs font-medium text-muted-foreground", (kind === "number" || kind === "time" || kind === "actions") && "text-right", priorityClass[meta?.priority ?? 1])}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()} className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? <ArrowUpIcon className="size-3" /> : sorted === "desc" ? <ArrowDownIcon className="size-3" /> : <ChevronsUpDownIcon className="size-3 opacity-50" />}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} {...rowProps(row)}>
                {row.getVisibleCells().map((cell, index) => {
                  const meta = cell.column.columnDef.meta
                  const kind = meta?.kind ?? "text"
                  return (
                    <TableCell key={cell.id} className={cn("h-10 py-1.5", kindClass[kind], priorityClass[meta?.priority ?? 1])}>
                      {kind === "primary" ? <div className="truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div> : flexRender(cell.column.columnDef.cell, cell.getContext())}
                      {index === 0 ? linkFor(row) : null}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className={cn("flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted-foreground", bordered && "border-t")}>
        <span role="status">{vocab.copy.count(rows.length, total)}</span>
        {hasMore && onLoadMore !== undefined ? (
          <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loadingMore}>{vocab.copy.loadMore}</Button>
        ) : null}
      </div>
    </div>
  )
}
