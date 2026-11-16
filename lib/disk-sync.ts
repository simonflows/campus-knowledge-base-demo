export const DISK_SYNC_STATUSES = ["pending", "synced", "failed"] as const;

export type DiskSyncStatus = (typeof DISK_SYNC_STATUSES)[number];

export type DiskSyncInfo = {
  status: DiskSyncStatus;
  lastAttemptAt: string | null;
  lastSyncedAt: string | null;
  message: string | null;
  folderPath: string | null;
  filePath: string | null;
  summaryPath: string | null;
};

export const diskSyncStatusLabels: Record<DiskSyncStatus, string> = {
  pending: "Не выгружено",
  synced: "Синхронизировано с Яндекс Диском",
  failed: "Ошибка выгрузки на Яндекс Диск",
};

export function createPendingDiskSync(): DiskSyncInfo {
  return {
    status: "pending",
    lastAttemptAt: null,
    lastSyncedAt: null,
    message: null,
    folderPath: null,
    filePath: null,
    summaryPath: null,
  };
}

export function formatDiskSyncTime(value: string | null | undefined): string {
  if (!value) return "ещё не выгружалось";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}
