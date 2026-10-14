import { useState } from "react"
import { useNavigate } from "react-router"
import { notify } from "@/components/blocks/notify"
import { Actions, Grid, Page, Stack } from "@/components/blocks/surfaces"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function FormPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | undefined>(undefined)
  return (
    <Page title="新建任务" breadcrumbs={[{ label: "任务", to: "/jobs" }]} width="form">
      <form noValidate onSubmit={(event) => { event.preventDefault(); if (name.trim() === "") { setError("请填写名称"); return } notify.success("已创建任务"); navigate("/jobs") }}>
        <Stack gap="xl">
          <FieldSet>
            <FieldLegend>基本信息</FieldLegend>
            <FieldGroup>
              <Field data-invalid={error !== undefined}>
                <FieldLabel htmlFor="name">名称</FieldLabel>
                <Input id="name" value={name} aria-invalid={error !== undefined} onChange={(event) => { setName(event.target.value); setError(undefined) }} />
                <FieldError>{error}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="desc">描述</FieldLabel>
                <Textarea id="desc" rows={3} />
                <FieldDescription>出现在列表与通知里。</FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend>调度</FieldLegend>
            <FieldGroup>
              <Grid>
                <Field><FieldLabel htmlFor="cron">Cron</FieldLabel><Input id="cron" className="font-mono" defaultValue="0 2 * * *" /></Field>
                <Field><FieldLabel htmlFor="tz">时区</FieldLabel><Input id="tz" defaultValue="Asia/Shanghai" /></Field>
              </Grid>
            </FieldGroup>
          </FieldSet>
          <Actions align="end">
            <Button type="button" variant="ghost" onClick={() => navigate("/jobs")}>取消</Button>
            <Button type="submit">创建任务</Button>
          </Actions>
        </Stack>
      </form>
    </Page>
  )
}
