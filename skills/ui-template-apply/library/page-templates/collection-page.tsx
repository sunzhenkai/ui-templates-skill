/**
 * CollectionPage — the list archetype: page header, one toolbar (search, filters, clear), then the table.
 *
 * Query state lives in the URL (`q`, one key per filter, `page`, `page_size`) so a link is shareable and Back
 * works. The page supplies columns, the current rows and the server total; filtering and paging stay in its
 * data layer. Empty and filtered-empty are separate states: "nothing yet" and "nothing matched".
 */
import * as React from "react"
import type { ColumnDef, RowData } from "@tanstack/react-table"
import { SearchIcon } from "lucide-react"
import { DataTable } from "@/components/blocks/data-table"
import { useSearchWriter, useUrlParams } from "@/components/blocks/router"
import { EmptyState } from "@/components/blocks/state-boundary"
import { Page, Panel, Toolbar } from "@/components/blocks/surfaces"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { vocab } from "@/lib/vocab"

/** One toolbar filter. `all` is the value that counts as "no filter" and is never written to the URL. */
export type CollectionFilter = {
  key: string
  label: string
  allLabel: string
  options: readonly { value: string; label: string }[]
}

export type CollectionQuery = {
  /** Search term as applied (debounced). */
  q: string
  /** Current filter values, `all`-valued keys omitted. */
  filters: Record<string, string>
  page: number
  pageSize: number
  /** What the search box shows; updates after a 250ms pause, not on every keystroke. */
  draft: string
  setDraft: (value: string) => void
  setFilter: (key: string, value: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  /** Page number and every filter at once — one navigation, one history entry. */
  clear: () => void
}

const SEARCH_DELAY = 250
const ALL = "all"

function positive(raw: string | null, fallback: number): number {
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

/**
 * URL-backed collection state. Pass the same `filters` list the page renders so those keys are read and cleared.
 */
export function useCollectionQuery({
  pageSize = 20,
  filters = [],
}: { pageSize?: number | undefined; filters?: readonly CollectionFilter[] | undefined } = {}): CollectionQuery {
  const params = useUrlParams()
  const write = useSearchWriter()
  const q = params.get("q") ?? ""
  const [draft, setDraft] = React.useState(q)
  React.useEffect(() => {
    // No write when the box already matches the URL: a write would change the router identity and re-run this.
    if (draft.trim() === q) return
    const timer = setTimeout(() => write({ q: draft.trim() }), SEARCH_DELAY)
    return () => clearTimeout(timer)
  }, [draft, q, write])
  const values: Record<string, string> = {}
  for (const filter of filters) values[filter.key] = params.get(filter.key) ?? ALL
  return {
    q,
    filters: Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ALL)),
    page: positive(params.get("page"), 1),
    pageSize: positive(params.get("page_size"), pageSize),
    draft,
    setDraft,
    setFilter: (key, value) => write({ [key]: value === ALL ? "" : value, page: "" }),
    setPage: (page) => write({ page: page === 1 ? "" : String(page) }),
    setPageSize: (size) => write({ page_size: size === pageSize ? "" : String(size), page: "" }),
    clear: () => {
      setDraft("")
      write({ q: "", page: "", ...Object.fromEntries(filters.map((filter) => [filter.key, ""])) })
    },
  }
}

export type CollectionEmpty = { title: string; description?: string | undefined; action?: React.ReactNode }

export type CollectionPageProps<Row extends RowData> = {
  title: string
  /** Header action (usually "New …"). */
  primary?: React.ReactNode | undefined
  /** Table name for screen readers and the empty states ("任务"). */
  label: string
  searchLabel: string
  searchPlaceholder?: string | undefined
  filters?: readonly CollectionFilter[] | undefined
  query: CollectionQuery
  columns: ColumnDef<Row, unknown>[]
  rows: Row[]
  /** Exact count the data layer reports for the current query; the footer never guesses. */
  total: number
  loading?: boolean | undefined
  getRowId: (row: Row) => string
  rowHref?: ((row: Row) => string) | undefined
  pageSizeOptions?: readonly number[] | undefined
  /** Nothing exists yet. */
  empty: CollectionEmpty
  /** Something exists but the current search or filters match nothing. */
  noResults?: CollectionEmpty | undefined
}

export function CollectionPage<Row extends RowData>({
  title, primary, label, searchLabel, searchPlaceholder, filters = [], query, columns, rows, total,
  loading = false, getRowId, rowHref, pageSizeOptions = [10, 20, 50], empty, noResults,
}: CollectionPageProps<Row>) {
  const filtered = query.q !== "" || Object.keys(query.filters).length > 0
  const missed: CollectionEmpty = noResults ?? {
    title: vocab.copy.emptyTitle,
    ...(filtered ? { action: <Button size="sm" variant="outline" onClick={query.clear}>{vocab.copy.clearFilters}</Button> } : {}),
  }
  return (
    <Page title={title} primary={primary}>
      <Toolbar
        end={filtered ? <Button variant="ghost" size="sm" onClick={query.clear}>{vocab.copy.clearFilters}</Button> : undefined}>
        <InputGroup className="w-64 max-w-full">
          <InputGroupAddon><SearchIcon /></InputGroupAddon>
          <InputGroupInput value={query.draft} onChange={(event) => query.setDraft(event.target.value)}
            placeholder={searchPlaceholder ?? label} aria-label={searchLabel} />
        </InputGroup>
        {filters.map((filter) => (
          <Select key={filter.key} value={query.filters[filter.key] ?? ALL}
            onValueChange={(value) => query.setFilter(filter.key, value)}>
            <SelectTrigger size="sm" aria-label={filter.label} className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filter.allLabel}</SelectItem>
              {filter.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
      </Toolbar>
      {total === 0
        ? <Panel><EmptyState {...(filtered ? missed : empty)} /></Panel>
        : (
          <DataTable label={label} columns={columns} data={rows} getRowId={getRowId}
            {...(rowHref === undefined ? {} : { rowHref })}
            paging={{
              mode: "pages", page: query.page, pageSize: query.pageSize, total, loading,
              onPage: query.setPage, pageSizeOptions, onPageSize: query.setPageSize,
            }} />
        )}
    </Page>
  )
}
