"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { KnowledgeBase } from "@/components/knowledge/knowledge-base";
import { useDemoStore } from "@/lib/demo-client-store";

function KnowledgePageInner() {
  const searchParams = useSearchParams();
  const { hydrated, state, user, cards, customTypes } = useDemoStore();

  const cardParam = searchParams.get("card");
  const actionParam = searchParams.get("action");
  const folderParam = searchParams.get("folder");

  const componentKey = `${hydrated ? "h" : "s"}-${user?.id ?? "anon"}-${
    state.resetEpoch ?? 0
  }-${folderParam ?? ""}-${cardParam ?? ""}-${actionParam ?? ""}`;

  return (
    <KnowledgeBase
      key={componentKey}
      initialCards={cards}
      initialCustomTypes={customTypes}
      initialCardId={cardParam}
      initialAction={actionParam}
      initialFolderId={folderParam}
      dbAvailable={true}
      currentUser={user}
    />
  );
}

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground">
          Загрузка базы знаний...
        </div>
      }
    >
      <KnowledgePageInner />
    </Suspense>
  );
}
