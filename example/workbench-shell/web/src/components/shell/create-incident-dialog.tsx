import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Spinner } from "@/components/ui/spinner";
import { toastError, toastSuccess } from "@/components/ui/toast";
import { createIncident, getChanges, getMembers, getServices, MockError } from "@/mock/api";
import type { Attachment, IncidentStatus, Severity } from "@/types/domain";

const formSchema = z.object({
  title: z.string().min(1, "标题必填").max(120, "标题过长"),
  service: z.string().min(1, "影响服务必填"),
  severity: z.enum(["sev1", "sev2", "sev3", "sev4"]),
  status: z.enum(["triggered", "acknowledged", "investigating"]),
  assignee: z.string(),
  description: z.string().max(2000, "描述过长"),
  tags: z.string(),
  relatedChange: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

/** 全局创建事件（AX-046..050 + AX-031..035 + AX-102..105）。 */
export function CreateIncidentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const { data: services } = useQuery({ queryKey: ["services"], queryFn: getServices, enabled: open });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: getMembers, enabled: open });
  const { data: changes } = useQuery({ queryKey: ["changes"], queryFn: getChanges, enabled: open });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", service: "", severity: "sev3", status: "triggered", assignee: "", description: "", tags: "", relatedChange: "" },
  });

  useEffect(() => {
    if (!open) {
      reset();
      setAttachments([]);
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: createIncident,
    onSuccess: (incident) => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toastSuccess(`事件 ${incident.number} 已创建`, "列表、看板与收件箱计数已更新");
      onOpenChange(false);
    },
    onError: (err) => {
      toastError("创建失败", err instanceof MockError ? err.message : "请重试", {
        label: "重试",
        onClick: () => mutation.mutateAsync(mutation.variables!),
      });
      setError("title", { type: "manual", message: "提交失败，请修正后重试" });
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({
      title: values.title,
      service: values.service,
      severity: values.severity as Severity,
      status: values.status as IncidentStatus,
      assignee: values.assignee || null,
      teams: [],
      occurredAt: new Date().toISOString(),
      description: values.description,
      tags: values.tags.split(/[,，\s]+/).filter(Boolean),
      relatedChange: values.relatedChange || null,
    });
  });

  const addFiles = (files: File[]) => {
    const next: Attachment[] = files.map((f) => ({
      id: `a-${Date.now()}-${f.name}`,
      name: f.name,
      size: f.size,
      progress: 100,
      status: "done",
    }));
    setAttachments((prev) => [...prev, ...next]);
  };

  const severity = watch("severity");

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/25 data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0" />
        <BaseDialog.Popup
          aria-label="创建事件"
          className={cnDialog()}
          onKeyDown={(e: React.KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <BaseDialog.Title className="text-title font-semibold">创建事件</BaseDialog.Title>
            <BaseDialog.Close
              aria-label="关闭"
              className="rounded-md p-1 text-faint-foreground hover:bg-accent hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60"
            >
              ×
            </BaseDialog.Close>
          </div>
          <form noValidate onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
            <div className="flex flex-col gap-1">
              <Label htmlFor="ci-title">
                标题 <span aria-hidden className="text-destructive">*</span>
              </Label>
              <Input id="ci-title" aria-required="true" aria-invalid={!!errors.title} aria-describedby={errors.title ? "ci-title-err" : undefined} placeholder="简明描述事件影响" {...register("title")} />
              <FieldError id="ci-title-err">{errors.title?.message}</FieldError>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <Label id="ci-service-label">
                  影响服务 <span aria-hidden className="text-destructive">*</span>
                </Label>
                <Select
                  items={serviceItems(services?.map((s) => s.name) ?? [])}
                  value={watch("service")}
                  onValueChange={(v) => setValue("service", v as string, { shouldValidate: true })}
                >
                  <SelectTrigger aria-labelledby="ci-service-label" aria-invalid={!!errors.service} className="w-full">
                    <SelectValue placeholder="选择服务" />
                  </SelectTrigger>
                  <SelectContent>
                    {(services ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id="ci-service-err">{errors.service?.message}</FieldError>
              </div>
              <div className="flex flex-col gap-1">
                <Label id="ci-sev-label">
                  严重等级 <span aria-hidden className="text-destructive">*</span>
                </Label>
                <Select
                  items={severityItems}
                  value={severity}
                  onValueChange={(v) => setValue("severity", v as FormValues["severity"])}
                >
                  <SelectTrigger aria-labelledby="ci-sev-label" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sev1">SEV-1（最高）</SelectItem>
                    <SelectItem value="sev2">SEV-2</SelectItem>
                    <SelectItem value="sev3">SEV-3</SelectItem>
                    <SelectItem value="sev4">SEV-4（最低）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label id="ci-status-label">当前状态</Label>
                <Select
                  items={statusItems}
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as FormValues["status"])}
                >
                  <SelectTrigger aria-labelledby="ci-status-label" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="triggered">已触发</SelectItem>
                    <SelectItem value="acknowledged">已确认</SelectItem>
                    <SelectItem value="investigating">处理中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label id="ci-assignee-label">负责人</Label>
                <Select items={assigneeItems(members ?? [])} value={watch("assignee")} onValueChange={(v) => setValue("assignee", v as string)}>
                  <SelectTrigger aria-labelledby="ci-assignee-label" className="w-full">
                    <SelectValue placeholder="未指派" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未指派</SelectItem>
                    {(members ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label id="ci-change-label">关联变更</Label>
                <Select items={changeItems(changes ?? [])} value={watch("relatedChange")} onValueChange={(v) => setValue("relatedChange", v as string)}>
                  <SelectTrigger aria-labelledby="ci-change-label" className="w-full">
                    <SelectValue placeholder="无" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无</SelectItem>
                    {(changes ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.id} {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ci-tags">标签（逗号分隔）</Label>
              <Input id="ci-tags" placeholder="例如：网络, 容量" {...register("tags")} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ci-desc">描述</Label>
              <Textarea id="ci-desc" rows={3} {...register("description")} />
              <FieldError id="ci-desc-err">{errors.description?.message}</FieldError>
            </div>
            <FileUpload
              attachments={attachments}
              onAdd={addFiles}
              onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
              onRetry={(id) => setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "done" as const, progress: 100 } : a)))}
            />
          </form>
          <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="button" variant="brand" disabled={mutation.isPending} onClick={onSubmit} aria-busy={mutation.isPending}>
              {mutation.isPending && <Spinner className="size-3.5 text-brand-foreground" />}
              提交
            </Button>
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

const severityItems = [
  { value: "sev1", label: "SEV-1（最高）" },
  { value: "sev2", label: "SEV-2" },
  { value: "sev3", label: "SEV-3" },
  { value: "sev4", label: "SEV-4（最低）" },
];
const statusItems = [
  { value: "triggered", label: "已触发" },
  { value: "acknowledged", label: "已确认" },
  { value: "investigating", label: "处理中" },
];
function serviceItems(names: string[]) {
  return names.map((n) => ({ value: n, label: n }));
}
function assigneeItems(members: { id: string; name: string }[]) {
  return [{ value: "", label: "未指派" }, ...members.map((m) => ({ value: m.id, label: m.name }))];
}
function changeItems(changes: { id: string; title: string }[]) {
  return [{ value: "", label: "无" }, ...changes.map((c) => ({ value: c.id, label: `${c.id} ${c.title}` }))];
}

function cnDialog() {
  return "fixed left-1/2 top-1/2 z-50 w-[min(40rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-surface-border bg-popover p-4 text-popover-foreground shadow-floating outline-none data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95 data-[ending-style]:animate-out data-[ending-style]:fade-out-0";
}
