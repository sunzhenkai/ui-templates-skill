import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ColumnDef } from "@tanstack/react-table"
import { InboxIcon, ListChecksIcon, SettingsIcon, PlusIcon } from "lucide-react"
import { MemoryRouter } from "react-router"
import { AppShell, ShellBrand, type NavGroup } from "@/components/blocks/app-shell"
import { Id, Time } from "@/components/blocks/format"
import { AppLink } from "@/components/blocks/router"
import { StatusBadge } from "@/components/blocks/status-badge"
import { CollectionPage, useCollectionQuery, type CollectionFilter } from "@/components/page-templates/collection-page"
import { Button } from "@/components/ui/button"

const meta = {
  title: "ui-kit/Pages/Collection",
  tags: ["fidelity"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const nav: NavGroup[] = [
  { items: [{ label: "Jobs", to: "/jobs", icon: ListChecksIcon }, { label: "Runs", to: "/runs", icon: InboxIcon }] },
  { label: "Workspace", items: [{ label: "Settings", to: "/settings", icon: SettingsIcon }] },
]

type Job = { id: string; name: string; status: string; owner: string; updatedAt: string }

const jobs: Job[] = [
  { id: "job_7f3a", name: "Nightly orders sync", status: "succeeded", owner: "Mei", updatedAt: "2026-11-19T02:00:00Z" },
  { id: "job_1c9b", name: "Export invoices", status: "running", owner: "Lan", updatedAt: "2026-11-19T08:12:00Z" },
  { id: "job_44de", name: "Refresh search index", status: "failed", owner: "Bo", updatedAt: "2026-11-18T21:40:00Z" },
]

const columns: ColumnDef<Job, unknown>[] = [
  { accessorKey: "name", header: "Job", meta: { kind: "primary" } },
  { accessorKey: "status", header: "Status", meta: { kind: "status" }, cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
  { accessorKey: "owner", header: "Owner", meta: { kind: "text", priority: 2 } },
  { accessorKey: "id", header: "ID", meta: { kind: "id", priority: 3 }, cell: ({ getValue }) => <Id value={getValue<string>()} /> },
  { accessorKey: "updatedAt", header: "Updated", meta: { kind: "time" }, cell: ({ getValue }) => <Time value={getValue<string>()} /> },
]

const filters: CollectionFilter[] = [
  {
    key: "status", label: "Status", allLabel: "All statuses",
    options: [{ value: "succeeded", label: "Succeeded" }, { value: "running", label: "Running" }, { value: "failed", label: "Failed" }],
  },
]

function Demo({ rows }: { rows: Job[] }) {
  const query = useCollectionQuery({ filters })
  const visible = rows
    .filter((job) => query.q === "" || job.name.toLowerCase().includes(query.q.toLowerCase()))
    .filter((job) => query.filters.status === undefined || job.status === query.filters.status)
  return (
    <CollectionPage title="Jobs" label="Jobs" searchLabel="Search jobs" filters={filters} query={query}
      columns={columns} rows={visible} total={visible.length} getRowId={(job) => job.id} rowHref={(job) => `/jobs/${job.id}`}
      primary={<Button size="sm" asChild><AppLink to="/jobs/new"><PlusIcon />New job</AppLink></Button>}
      empty={{ title: "No jobs yet", description: "Create a job and its runs will show up here." }} />
  )
}

export const InShell: Story = {
  render: () => (
    <MemoryRouter initialEntries={["/jobs"]}>
      <AppShell brand={<ShellBrand title="Workspace" />} nav={nav}>
        <Demo rows={jobs} />
      </AppShell>
    </MemoryRouter>
  ),
}

export const Empty: Story = {
  render: () => (
    <MemoryRouter initialEntries={["/jobs"]}>
      <AppShell brand={<ShellBrand title="Workspace" />} nav={nav}>
        <Demo rows={[]} />
      </AppShell>
    </MemoryRouter>
  ),
}
