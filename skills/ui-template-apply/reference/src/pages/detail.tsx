import { useParams } from "react-router"
import { PlayIcon, Trash2Icon } from "lucide-react"
import { NotFound } from "@/components/blocks/app-errors"
import { useConfirm } from "@/components/blocks/confirm"
import { DataTable } from "@/components/blocks/data-table"
import { Id, Num, Time } from "@/components/blocks/format"
import { notify } from "@/components/blocks/notify"
import { useUrlState } from "@/components/blocks/router"
import { StatusBadge } from "@/components/blocks/status-badge"
import { DisclosureRow, Page, Panel, Properties, Rows, Section } from "@/components/blocks/surfaces"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { jobs } from "../data"
import { jobColumns } from "./collection"

export function DetailPage() {
  const { id } = useParams()
  const job = jobs.find((item) => item.id === id) ?? (id === "demo" ? jobs[0] : undefined)
  const [tab, setTab] = useUrlState("tab", "overview")
  const confirm = useConfirm()
  if (job === undefined) return <NotFound />
  return (
    <Page title={job.name} breadcrumbs={[{ label: "任务", to: "/jobs" }]}
      primary={<Button size="sm" onClick={() => notify.success("已开始运行")}><PlayIcon />运行</Button>}
      actions={[{ label: "删除任务", icon: <Trash2Icon />, destructive: true, onSelect: () => void confirm({ title: `删除任务「${job.name}」？`, description: "运行记录与产物会一并删除。", confirmLabel: "删除", destructive: true }) }]}>
      <Properties columns={2} items={[
        { label: "状态", value: <StatusBadge status={job.status} /> },
        { label: "ID", value: <Id value={job.id} /> },
        { label: "负责人", value: job.owner },
        { label: "条数", value: <Num value={job.count} /> },
        { label: "更新于", value: <Time value={job.updatedAt} mode="datetime" /> },
        { label: "调度", value: "每天 02:00（Asia/Shanghai）" },
      ]} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line"><TabsTrigger value="overview">概览</TabsTrigger><TabsTrigger value="runs">运行</TabsTrigger></TabsList>
        <TabsContent value="overview">
          <Section title="产物">
            <Panel padding="none">
              <Rows label="产物">
                <DisclosureRow summary={<><span className="min-w-0 flex-1 truncate font-mono text-xs">report/summary.md</span><Badge variant="secondary">markdown</Badge></>}>
                  <p className="text-sm text-muted-foreground">本次运行共处理 3,464 条记录，失败 0 条。</p>
                </DisclosureRow>
                <DisclosureRow summary={<><span className="min-w-0 flex-1 truncate font-mono text-xs">exports/orders.csv</span><Badge variant="secondary">csv</Badge></>} />
              </Rows>
            </Panel>
          </Section>
        </TabsContent>
        <TabsContent value="runs">
          <DataTable label="运行" columns={jobColumns} data={jobs.slice(1, 9)} getRowId={(row) => row.id} paging="complete" />
        </TabsContent>
      </Tabs>
    </Page>
  )
}
