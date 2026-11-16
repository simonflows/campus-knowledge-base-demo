"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Handshake,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getParticipantApprovals,
  getUniversityName,
  isJointFullyApproved,
  isJointProject,
  knowledgeCardTypeLabels,
  type KnowledgeCard,
} from "@/lib/knowledge";

type KnowledgeModerationPanelProps = {
  cards: KnowledgeCard[];
  onCardUpdated: (card: KnowledgeCard) => void;
  onOpenCard: (cardId: string) => void;
};

export function KnowledgeModerationPanel({
  cards,
  onCardUpdated,
  onOpenCard,
}: KnowledgeModerationPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (cards.length === 0) return null;

  const handleAction = async (cardId: string, action: "approve" | "reject") => {
    if (busyId !== null) return;
    setBusyId(`${cardId}-${action}`);

    try {
      const response = await fetch(
        `/api/knowledge/cards/${cardId}/moderation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = (await response.json().catch(() => null)) as
        KnowledgeCard | { error?: string } | null;

      if (!response.ok) {
        toast.error(
          data && "error" in data && data.error
            ? data.error
            : "Не удалось выполнить действие"
        );
        return;
      }

      if (!data || "error" in data) {
        toast.error("Сервер вернул некорректный ответ");
        return;
      }

      onCardUpdated(data as KnowledgeCard);
      toast.success(
        action === "approve" ? "Черновик добавлен в канон" : "Черновик отклонён"
      );
    } catch {
      toast.error("Ошибка сети при модерации карточки");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-amber-200/80">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
            Запросы на подтверждение
          </CardTitle>
          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
            {cards.length}
          </Badge>
        </div>
        <CardDescription>
          Новые карточки от PR-команд и владельцев не попадают в канон, пока
          координатор их не одобрит. Совместный проект требует подтверждения
          обоих вузов-участников.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {cards.map((card) => {
          const joint = isJointProject(card);
          const approvals = getParticipantApprovals(card);
          const ready = !joint || isJointFullyApproved(card);

          return (
            <div
              key={card.id}
              className="rounded-2xl bg-muted/40 p-3 ring-1 ring-border/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="break-words font-medium">{card.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{knowledgeCardTypeLabels[card.type]}</span>
                    {card.submittedByName ? (
                      <span>· от {card.submittedByName}</span>
                    ) : null}
                    <span className="break-words">
                      · {card.owners.join(", ")}
                    </span>
                  </div>
                  {joint ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Handshake className="h-3.5 w-3.5 text-primary" />
                      {card.participantUniversityIds.map((universityId) => {
                        const confirmed = approvals.includes(universityId);

                        return (
                          <Badge
                            key={universityId}
                            variant="outline"
                            className={
                              confirmed
                                ? "border-emerald-200 text-emerald-700"
                                : "border-amber-300 text-amber-800"
                            }
                          >
                            {confirmed ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {getUniversityName(universityId)}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 flex-1 sm:h-7 sm:flex-none"
                    onClick={() => onOpenCard(card.id)}
                  >
                    Открыть
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 flex-1 sm:h-7 sm:flex-none"
                    onClick={() => handleAction(card.id, "approve")}
                    disabled={!ready || busyId !== null}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Одобрить
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 flex-1 sm:h-7 sm:flex-none"
                    onClick={() => handleAction(card.id, "reject")}
                    disabled={busyId !== null}
                  >
                    <XCircle className="h-4 w-4" />
                    Отклонить
                  </Button>
                </div>
              </div>
              {!ready ? (
                <p className="mt-2 text-xs text-amber-900">
                  Нужно подтверждение второго вуза-участника, прежде чем
                  добавлять проект в канон.
                </p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
