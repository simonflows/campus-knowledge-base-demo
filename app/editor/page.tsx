"use client";

import { SmartEditorWorkspace } from "@/components/editor/smart-editor-workspace";
import { useDemoStore } from "@/lib/demo-client-store";
import { getCardStatus } from "@/lib/knowledge";

export default function EditorPage() {
  const { hydrated, state, user, allCards, articles } = useDemoStore();
  const cardsCount = allCards.filter((card) => getCardStatus(card) === "approved").length;

  const componentKey = `${hydrated ? "h" : "s"}-${user?.id ?? "anon"}-${
    state.resetEpoch ?? 0
  }`;

  return (
    <SmartEditorWorkspace
      key={componentKey}
      initialArticles={articles}
      cardsCount={cardsCount}
      dbAvailable={true}
      currentUser={user}
    />
  );
}
