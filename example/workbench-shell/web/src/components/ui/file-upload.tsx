import { useRef, useState } from "react";
import { FileText, Paperclip, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "./button";
import { Progress } from "./progress";
import { formatSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/domain";

export interface FileUploadProps {
  attachments: Attachment[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  className?: string;
}

export function FileUpload({ attachments, onAdd, onRemove, onRetry, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onAdd(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-md border border-dashed border-input p-4 text-caption text-muted-foreground outline-none",
          "focus-within:border-ring focus-within:outline-3 focus-within:outline-ring/60",
          dragOver && "border-brand bg-brand/5",
        )}
      >
        <UploadCloud className="size-5 text-faint-foreground" aria-hidden />
        <p>拖拽文件到此处，或</p>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Paperclip className="size-3.5" aria-hidden />
          选择文件
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-label="上传附件"
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="附件列表">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-md border border-surface-border px-2.5 py-1.5">
              <FileText className="size-3.5 shrink-0 text-faint-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-caption">{a.name}</span>
              <span className="text-micro text-faint-foreground">{formatSize(a.size)}</span>
              {a.status === "uploading" && <Progress value={a.progress} label={`${a.name} 上传进度`} className="w-20" />}
              {a.status === "failed" && (
                <>
                  <span className="text-micro text-destructive">失败</span>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`重试上传 ${a.name}`} onClick={() => onRetry(a.id)}>
                    <RotateCcw className="size-3.5" aria-hidden />
                  </Button>
                </>
              )}
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`删除附件 ${a.name}`} onClick={() => onRemove(a.id)}>
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
