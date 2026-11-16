"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createPendingDiskSync,
  diskSyncStatusLabels,
  formatDiskSyncTime,
  type DiskSyncInfo,
} from "@/lib/disk-sync";
import { cn } from "@/lib/utils";

type DiskSyncedEntity = { diskSync?: DiskSyncInfo };

type DiskSyncPanelProps<T extends DiskSyncedEntity> = {
  diskSync?: DiskSyncInfo | null;
  retryEndpoint: string;
  canRetry: boolean;
  entityLabel: string;
  onSynced?: (entity: T) => void;
  compact?: boolean;
};

export function DiskSyncPanel<T extends DiskSyncedEntity>({
  diskSync,
  retryEndpoint,
  canRetry,
  entityLabel,
  onSynced,
  compact = false,
}: DiskSyncPanelProps<T>) {
  const [isRetrying, setIsRetrying] = useState(false);
  const sync = diskSync ?? createPendingDiskSync();
  const isSynced = sync.status === "synced";
  const isFailed = sync.status === "failed";

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);

    try {
      const response = await fetch(retryEndpoint, { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | (T & { error?: string; diskSync?: DiskSyncInfo })
        | null;

      if (!response.ok || !data) {
        toast.error(
          data?.error || `Не удалось повторить выгрузку ${entityLabel}`
        );
        return;
      }

      onSynced?.(data as T);

      if (data.diskSync?.status === "synced") {
        toast.success(
          `${entityLabel[0].toUpperCase()}${entityLabel.slice(1)} выгружена на Яндекс Диск`
        );
      } else {
        toast.warning("Выгрузка на Яндекс Диск не удалась", {
          description:
            data.diskSync?.message ||
            "Карточка сохранена. Можно повторить выгрузку позже.",
        });
      }
    } catch {
      toast.error("Ошибка сети при выгрузке на Яндекс Диск");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        isSynced
          ? "border-emerald-200 bg-emerald-50/60"
          : isFailed
            ? "border-amber-200 bg-amber-50/70"
            : "border-border bg-muted/30",
        compact && "p-3"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl",
              isSynced
                ? "bg-emerald-100 text-emerald-700"
                : isFailed
                  ? "bg-amber-100 text-amber-700"
                  : "bg-background text-muted-foreground ring-1 ring-border"
            )}
          >
            {isSynced ? (
              <CheckCircle2 className="size-4" />
            ) : isFailed ? (
              <AlertTriangle className="size-4" />
            ) : (
              <CloudUpload className="size-4" />
            )}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={isSynced ? "secondary" : "outline"}
                className={cn(
                  isSynced && "bg-emerald-100 text-emerald-800",
                  isFailed && "border-amber-300 text-amber-800"
                )}
              >
                {diskSyncStatusLabels[sync.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Последняя выгрузка: {formatDiskSyncTime(sync.lastSyncedAt)}
              </span>
            </div>
            {sync.lastAttemptAt && isFailed ? (
              <p className="text-[11px] text-muted-foreground">
                Последняя попытка: {formatDiskSyncTime(sync.lastAttemptAt)}
              </p>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 w-full sm:h-7 sm:w-auto"
          onClick={handleRetry}
          disabled={isRetrying || !canRetry}
        >
          {isRetrying ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {isSynced ? "Выгрузить снова" : "Повторить выгрузку"}
        </Button>
      </div>

      {isFailed && sync.message ? (
        <p className="mt-3 rounded-xl bg-background/70 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
          {sync.message} {entityLabel[0].toUpperCase()}
          {entityLabel.slice(1)} сохранена, можно повторить выгрузку.
        </p>
      ) : null}

      {sync.filePath ? (
        <div className="mt-3 grid gap-1.5 text-[11px] text-muted-foreground">
          <p className="flex items-start gap-1.5">
            <FolderTree className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0">
              Папка на Диске:{" "}
              <span className="break-all font-medium text-foreground/80">
                {sync.folderPath ?? "—"}
              </span>
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <FileText className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0">
              Файл:{" "}
              <span className="break-all font-medium text-foreground/80">
                {sync.filePath}
              </span>
            </span>
          </p>
          {sync.summaryPath ? (
            <p className="flex items-start gap-1.5">
              <FileSpreadsheet className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0">
                Сводная таблица:{" "}
                <span className="break-all font-medium text-foreground/80">
                  {sync.summaryPath}
                </span>
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {!canRetry ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Повторная выгрузка недоступна в статическом режиме.
        </p>
      ) : null}
    </div>
  );
}
