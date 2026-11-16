"use client";

import { ComparisonWorkspace } from "@/components/comparison/comparison-workspace";
import { useDemoStore } from "@/lib/demo-client-store";

export default function ComparisonPage() {
  const { systemStatus } = useDemoStore();

  return (
    <ComparisonWorkspace
      yandexConfigured={systemStatus.yandexAi.configured}
      alibabaConfigured={systemStatus.alibabaAi.configured}
      storageMode={systemStatus.storageMode}
    />
  );
}
