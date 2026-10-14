import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { PlusIcon, SearchIcon } from "lucide-react"
import { DataTable } from "@/components/blocks/data-table"
import { Id, Num, Time } from "@/components/blocks/format"
import { AppLink } from "@/components/blocks/router"
import { StatusBadge } from "@/components/blocks/status-badge"
import { Page, Toolbar } from "@/components/blocks/surfaces"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { jobs, type Job } from "../data"

export const jobColumns: ColumnDef<Job, unknown>[] = [
  { accessorKey: "name", header: "名称", meta: { kind: "primary" } },
  { accessorKey: "status", header: "状态", meta: { kind: "status" }, cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
  { accessorKey: "id", header: "ID", meta: { kind: "id", priority: 3 }, cell: ({ getValue }) => <Id value={getValue<string>()} /> },
  { accessorKey: "owner", header: "负责人", meta: { kind: "text", priority: 2 } },
  { accessorKey: "count", header: "条数", meta: { kind: "number", priority: 2 }, enableSorting: true, cell: ({ getValue }) => <Num value={getValue<number>()} /> },
  { accessorKey: "updatedAt", header: "更新于", meta: { kind: "time" }, cell: ({ getValue }) => <Time value={getValue<string>()} /> },
]

/** Page size; above VIRTUALIZE_ABOVE (200) loaded rows DataTable windows its rows. */
const PAGE = 500

export function CollectionPage() {
  const [shown, setShown] = useState(PAGE)
  return (
    <Page title="任务" primary={<Button size="sm" asChild><AppLink to="/jobs/new"><PlusIcon />新建任务</AppLink></Button>}>
      <Toolbar>
        <InputGroup className="w-64 max-w-full"><InputGroupAddon><SearchIcon /></InputGroupAddon><InputGroupInput aria-label="搜索任务" placeholder="搜索名称" /></InputGroup>
      </Toolbar>
      <DataTable label="任务" columns={jobColumns} data={jobs.slice(0, shown)} getRowId={(job) => job.id} rowHref={(job) => `/jobs/${job.id}`}
        paging={{ total: jobs.length, hasMore: shown < jobs.length, onLoadMore: () => setShown(shown + PAGE) }} />
    </Page>
  )
}
