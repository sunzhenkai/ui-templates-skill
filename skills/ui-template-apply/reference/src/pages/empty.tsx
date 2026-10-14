import { PlusIcon } from "lucide-react"
import { AppLink } from "@/components/blocks/router"
import { EmptyState } from "@/components/blocks/state-boundary"
import { Page, Panel } from "@/components/blocks/surfaces"
import { Button } from "@/components/ui/button"

export function EmptyPage() {
  return (
    <Page title="任务">
      <Panel>
        <EmptyState title="还没有任务" description="新建一个任务，它的运行记录、日志和产物都会出现在这里。"
          action={<Button size="sm" asChild><AppLink to="/jobs/new"><PlusIcon />新建任务</AppLink></Button>} />
      </Panel>
    </Page>
  )
}
