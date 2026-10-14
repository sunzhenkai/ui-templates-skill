import { Outlet } from "react-router"
import { useConfirm } from "@/components/blocks/confirm"
import { notify } from "@/components/blocks/notify"
import { SectionLayout } from "@/components/blocks/section-nav"
import { Actions, Page, Panel, Section } from "@/components/blocks/surfaces"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

const SECTIONS = [{ label: "通用", to: "/settings/general" }, { label: "通知", to: "/settings/notifications" }, { label: "危险操作", to: "/settings/danger" }]

export function SettingsLayout() {
  return <Page title="设置" layout="fill"><SectionLayout items={SECTIONS} label="设置分区"><Outlet /></SectionLayout></Page>
}

export function SettingsGeneral() {
  return (
    <Section size="lg" gap="lg" title="通用" description="工作区名称与默认值。">
      <FieldGroup>
        <Field><FieldLabel htmlFor="ws">工作区名称</FieldLabel><Input id="ws" defaultValue="运维工作台" /></Field>
        <Field><FieldLabel htmlFor="tz">默认时区</FieldLabel><Input id="tz" defaultValue="Asia/Shanghai" /></Field>
      </FieldGroup>
      <Actions><Button size="sm" onClick={() => notify.success("已保存")}>保存</Button></Actions>
    </Section>
  )
}

export function SettingsNotifications() {
  return (
    <Section size="lg" gap="lg" title="通知" description="开关即时保存。">
      <Panel>
        <FieldGroup>
          {["任务失败", "每日摘要", "成员变动"].map((label, index) => (
            <Field key={label} orientation="horizontal">
              <FieldContent><FieldLabel htmlFor={`n${index}`}>{label}</FieldLabel><FieldDescription>通过邮件与站内信通知。</FieldDescription></FieldContent>
              <Switch id={`n${index}`} defaultChecked={index !== 2} onCheckedChange={() => notify.success("已保存")} />
            </Field>
          ))}
        </FieldGroup>
      </Panel>
    </Section>
  )
}

export function SettingsDanger() {
  const confirm = useConfirm()
  return (
    <Section size="lg" gap="lg" title="危险操作" description="不可撤销。">
      <Panel title="删除工作区" description="所有任务、运行记录与成员关系会被永久删除。"
        actions={<Button size="sm" variant="destructive" onClick={() => void confirm({ title: "删除工作区？", description: "此操作不可撤销。", confirmLabel: "删除", destructive: true, typeToConfirm: "运维工作台" })}>删除</Button>}>
        <p className="text-sm text-muted-foreground">删除前请导出需要保留的数据。</p>
      </Panel>
    </Section>
  )
}
