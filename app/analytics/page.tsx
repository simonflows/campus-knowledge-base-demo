"use client";

import { AnalyticsWorkspace } from "@/components/analytics/analytics-workspace";
import { useDemoStore } from "@/lib/demo-client-store";
import { getCardStatus } from "@/lib/knowledge";

export default function AnalyticsPage() {
  const { state, allCards } = useDemoStore();
  const cardsCount = allCards.filter((card) => getCardStatus(card) === "approved").length;

  return (
    <AnalyticsWorkspace
      key={state.resetEpoch ?? 0}
      cardsCount={cardsCount}
      dbAvailable={true}
    />
  );
}
