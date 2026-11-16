"use client";

import { FactCheckWorkspace } from "@/components/fact-check/fact-check-workspace";
import { useDemoStore } from "@/lib/demo-client-store";
import { getCardStatus } from "@/lib/knowledge";

export default function FactCheckPage() {
  const { state, allCards } = useDemoStore();
  const cardsCount = allCards.filter((card) => getCardStatus(card) === "approved").length;

  return <FactCheckWorkspace key={state.resetEpoch ?? 0} cardsCount={cardsCount} />;
}
