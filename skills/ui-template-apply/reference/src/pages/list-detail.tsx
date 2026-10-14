import { useState } from "react"
import { Outlet, useParams } from "react-router"
import { FileTextIcon, PlusIcon, SearchIcon, WrenchIcon } from "lucide-react"
import { AttachmentChip, ComposerDock, Message, Step, Steps, Transcript, Turn } from "@/components/blocks/conversation"
import { Time } from "@/components/blocks/format"
import { ListDetailLayout, ListPaneTrigger, PaneHeader, PaneSection, RecencyList } from "@/components/blocks/list-detail"
import { Markdown } from "@/components/blocks/markdown"
import { AppLink } from "@/components/blocks/router"
import { StatusBadge } from "@/components/blocks/status-badge"
import { Body, Centered, Page, ScrollRegion } from "@/components/blocks/surfaces"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group"
import { threads } from "../data"

export function ThreadsLayout() {
  return (
    <ListDetailLayout label="对话列表" pane={<>
      <PaneHeader><Button size="sm" className="flex-1" asChild><AppLink to="/threads"><PlusIcon />新对话</AppLink></Button></PaneHeader>
      <PaneSection>
        <InputGroup><InputGroupAddon><SearchIcon /></InputGroupAddon><InputGroupInput aria-label="搜索对话" placeholder="搜索对话" /></InputGroup>
      </PaneSection>
      <PaneSection grow><RecencyList items={threads.map((t) => ({ id: t.id, to: `/threads/${t.id}`, label: t.title, time: t.updatedAt }))} /></PaneSection>
    </>}>
      <Outlet />
    </ListDetailLayout>
  )
}

function ComposerBox() {
  const [text, setText] = useState("")
  return (
    <InputGroup>
      <InputGroupTextarea aria-label="消息" rows={2} placeholder="输入消息，Enter 发送" value={text} onChange={(event) => setText(event.target.value)} />
      <InputGroupAddon align="block-end"><InputGroupButton variant="default" size="sm" className="ml-auto" disabled={text.trim() === ""}>发送</InputGroupButton></InputGroupAddon>
    </InputGroup>
  )
}

const QUESTIONS = ["昨天的部署为什么失败？", "索引重建要多久？", "能不能先回滚？", "给我一份上线检查清单。"]

export function NewThread() {
  return <Page title="新对话" leading={<ListPaneTrigger />} width="reading"><Centered title="有什么可以帮你？" description="回复、工具调用与产物会出现在对话时间线里。"><ComposerBox /></Centered></Page>
}

export function ThreadPage() {
  const { id } = useParams()
  const thread = threads.find((t) => t.id === id) ?? threads[0]!
  return (
    <Page title={thread.title} leading={<ListPaneTrigger />} layout="fill" primary={<StatusBadge status="succeeded" />}>
      <ScrollRegion label="对话时间线" follow>
        <Body width="reading">
          <Transcript label="对话时间线">
            {QUESTIONS.map((question, index) => (
              <Turn key={question}>
                <Message meta={<><span className="font-medium text-foreground">你</span><Time value={thread.updatedAt} /></>}><p>{question}</p></Message>
                <Steps summary={<><StatusBadge status="succeeded" /><span>2 个步骤</span></>}>
                  <Step><WrenchIcon className="size-3.5 text-muted-foreground" /><span className="font-mono">search_logs</span><StatusBadge status="succeeded" /></Step>
                  <Step><AttachmentChip icon={<FileTextIcon />} name={`deploy-2026-10-1${index}.log`} meta="text/plain · 18 KB" /></Step>
                </Steps>
                <Message meta={<><span className="font-medium text-foreground">助手</span><Time value={thread.updatedAt} /></>}>
                  <Markdown>{"部署在 **迁移步骤** 失败：`orders` 表的索引重建超时（600s）。\n\n| 阶段 | 耗时 | 状态 |\n|---|---|---|\n| 抽取 | 12 min | 成功 |\n| 重建 | 41 min | 需关注 |\n\n1. 先在低峰期单独重建索引\n2. 再重新触发部署"}</Markdown>
                </Message>
              </Turn>
            ))}
          </Transcript>
        </Body>
      </ScrollRegion>
      <ComposerDock><ComposerBox /></ComposerDock>
    </Page>
  )
}
