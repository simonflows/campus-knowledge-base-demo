"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Handshake,
  LockKeyhole,
  MessageSquarePlus,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canConfirmJointParticipation,
  canEditCard,
  canModerate,
  canRequestEdit,
  roleShortLabels,
  type SessionUser,
} from "@/lib/auth";
import {
  cardStatusLabels,
  getCardStatus,
  getParticipantApprovals,
  getPendingEditRequests,
  getUniversityName,
  isJointFullyApproved,
  isJointProject,
  type KnowledgeCard,
} from "@/lib/knowledge";
import { cn } from "@/lib/utils";

type KnowledgeCardAccessPanelProps = {
  card: KnowledgeCard;
  currentUser: SessionUser | null;
  dbAvailable: boolean;
  onCardUpdated: (card: KnowledgeCard) => void;
  onEdit: () => void;
};

function formatMoment(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function KnowledgeCardAccessPanel({
  card,
  currentUser,
  dbAvailable,
  onCardUpdated,
  onEdit,
}: KnowledgeCardAccessPanelProps) {
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const status = getCardStatus(card);
  const canEdit = canEditCard(currentUser, card);
  const canRequest = canRequestEdit(currentUser, card);
  const canConfirm = canConfirmJointParticipation(currentUser, card);
  const canApprove = canModerate(currentUser) && status === "pending";
  const joint = isJointProject(card);
  const approvals = getParticipantApprovals(card);
  const openRequests = getPendingEditRequests(card);
  const editRequests = card.editRequests ?? [];

  const handleSendRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyAction !== null) return;
    setBusyAction("request");

    try {
      const response = await fetch(
        `/api/knowledge/cards/${card.id}/edit-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message.trim() }),
        }
      );
      const data = (await response.json().catch(() => null)) as
        KnowledgeCard | { error?: string } | null;

      if (!response.ok) {
        toast.error(
          data && "error" in data && data.error
            ? data.error
            : "Не удалось отправить запрос на правку"
        );
        return;
      }

      if (!data || "error" in data) {
        toast.error("Сервер вернул некорректный ответ");
        return;
      }

      onCardUpdated(data as KnowledgeCard);
      setMessage("");
      toast.success("Запрос на правку отправлен владельцу карточки");
    } catch {
      toast.error("Ошибка сети при отправке запроса");
    } finally {
      setBusyAction(null);
    }
  };

  const handleModeration = async (
    action: "approve" | "reject" | "confirm-participation"
  ) => {
    if (busyAction !== null) return;
    setBusyAction(action);

    try {
      const response = await fetch(
        `/api/knowledge/cards/${card.id}/moderation`,
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

      if (action === "approve") {
        toast.success("Карточка одобрена и добавлена в канон");
      } else if (action === "reject") {
        toast.success("Карточка отклонена");
      } else {
        toast.success("Участие вуза подтверждено");
      }
    } catch {
      toast.error("Ошибка сети при выполнении действия");
    } finally {
      setBusyAction(null);
    }
  };

  const handleEditRequestStatus = async (
    requestId: string,
    action: "resolve" | "reopen"
  ) => {
    if (busyAction !== null) return;
    setBusyAction(`${action}-${requestId}`);

    try {
      const response = await fetch(
        `/api/knowledge/cards/${card.id}/edit-requests`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            action,
            resolution:
              action === "resolve" ? "Запрос отработан владельцем" : undefined,
          }),
        }
      );
      const data = (await response.json().catch(() => null)) as
        KnowledgeCard | { error?: string } | null;

      if (!response.ok) {
        toast.error(
          data && "error" in data && data.error
            ? data.error
            : "Не удалось обновить запрос"
        );
        return;
      }

      if (!data || "error" in data) {
        toast.error("Сервер вернул некорректный ответ");
        return;
      }

      onCardUpdated(data as KnowledgeCard);
      toast.success(
        action === "resolve" ? "Запрос закрыт" : "Запрос возвращён в работу"
      );
    } catch {
      toast.error("Ошибка сети при обновлении запроса");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                status === "approved" && "border-emerald-200 text-emerald-700",
                status === "pending" && "border-amber-300 text-amber-800",
                status === "rejected" &&
                  "border-destructive/30 text-destructive"
              )}
            >
              {cardStatusLabels[status]}
            </Badge>
            <span className="break-words text-xs text-muted-foreground">
              {currentUser
                ? `${currentUser.name} · ${roleShortLabels[currentUser.role]}`
                : "Гость без входа"}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {currentUser?.role === "admin"
              ? "Администратор канона: можно редактировать любую карточку, модерировать черновики и общие параметры кампуса."
              : canEdit
                ? "Вы владелец карточки: правки сохраняются от вашего имени."
                : "Только просмотр. Чужую утверждённую карточку нельзя изменить — отправьте запрос владельцу."}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {canEdit ? (
            <Button type="button" className="h-10 flex-1 sm:h-8 sm:flex-none" onClick={onEdit} disabled={!dbAvailable}>
              <Edit3 className="h-4 w-4" />
              Редактировать карточку
            </Button>
          ) : null}
          {canApprove ? (
            <>
              <Button
                type="button"
                className="h-10 flex-1 sm:h-8 sm:flex-none"
                onClick={() => handleModeration("approve")}
                disabled={
                  busyAction !== null || (joint && !isJointFullyApproved(card))
                }
              >
                <CheckCircle2 className="h-4 w-4" />
                {busyAction === "approve" ? "Одобряем..." : "Одобрить"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 sm:h-8 sm:flex-none"
                onClick={() => handleModeration("reject")}
                disabled={busyAction !== null}
              >
                <XCircle className="h-4 w-4" />
                Отклонить
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {canApprove && joint && !isJointFullyApproved(card) ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
          Одобрение станет доступно после подтверждения обоих вузов-участников.
        </p>
      ) : null}

      {status === "rejected" ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive ring-1 ring-destructive/20">
          Карточка отклонена
          {card.reviewedBy ? ` (${card.reviewedBy})` : ""}. В канон она не
          попадает.
        </p>
      ) : null}

      {joint && status !== "approved" ? (
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            <Handshake className="h-3.5 w-3.5" />
            Подтверждение вузов-участников
          </div>
          <div className="flex flex-wrap gap-2">
            {card.participantUniversityIds.map((universityId) => {
              const confirmed = approvals.includes(universityId);

              return (
                <Badge
                  key={universityId}
                  variant="outline"
                  className={cn(
                    "gap-1.5 bg-white/80",
                    confirmed
                      ? "border-emerald-200 text-emerald-700"
                      : "border-amber-300 text-amber-800"
                  )}
                >
                  {confirmed ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {getUniversityName(universityId)}
                  {confirmed ? " подтвердил" : " ожидает"}
                </Badge>
              );
            })}
          </div>
          {canConfirm ? (
            <Button
              type="button"
              size="sm"
              className="h-10 sm:h-7"
              onClick={() => handleModeration("confirm-participation")}
              disabled={busyAction !== null}
            >
              <UserCheck className="h-4 w-4" />
              Подтвердить участие вуза
            </Button>
          ) : null}
          {!isJointFullyApproved(card) ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Совместный проект не попадёт в канон, пока его не подтвердят оба
              вуза-участника.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-emerald-800">
              Оба вуза-участника подтвердили проект.
            </p>
          )}
        </div>
      ) : null}

      {canRequest && dbAvailable ? (
        <form
          onSubmit={handleSendRequest}
          className="space-y-2 rounded-2xl bg-muted/40 p-3 ring-1 ring-border/50"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Запрос на правку владельцу
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="Текст запроса на правку"
              className="h-10 sm:h-8"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Что нужно изменить и почему"
              maxLength={2_000}
            />
            <Button
              type="submit"
              className="h-10 sm:h-8"
              disabled={busyAction !== null || message.trim().length < 10}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Отправить
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Запрос придёт владельцу карточки комментарием и не изменит карточку
            в обход автора.
          </p>
        </form>
      ) : null}

      {!currentUser ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5" />
          Чтобы увидеть ограничения роли, войдите под демонстрационным
          аккаунтом.
        </p>
      ) : null}

      {editRequests.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Комментарии и запросы на правку
            {openRequests.length > 0 ? (
              <Badge variant="secondary">{openRequests.length} открыто</Badge>
            ) : null}
          </div>
          <ul className="space-y-2">
            {editRequests.map((request) => (
              <li
                key={request.id}
                className={cn(
                  "rounded-xl p-3 text-sm ring-1",
                  request.status === "open"
                    ? "bg-amber-50/60 ring-amber-200"
                    : "bg-muted/30 ring-border/50"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-medium">{request.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {request.authorRole} · {request.authorOrganization}
                    </span>
                  </div>
                  <Badge
                    variant={request.status === "open" ? "default" : "outline"}
                  >
                    {request.status === "open" ? "Открыт" : "Отработан"}
                  </Badge>
                </div>
                <p className="mt-1.5 whitespace-pre-line break-words leading-relaxed">
                  {request.message}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{formatMoment(request.createdAt)}</span>
                  {canEdit ? (
                    <div className="flex w-full gap-2 sm:w-auto">
                      {request.status === "open" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-10 sm:h-7"
                          onClick={() =>
                            handleEditRequestStatus(request.id, "resolve")
                          }
                          disabled={busyAction !== null}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Запрос отработан
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-10 sm:h-7"
                          onClick={() =>
                            handleEditRequestStatus(request.id, "reopen")
                          }
                          disabled={busyAction !== null}
                        >
                          Вернуть в работу
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
                {request.status === "resolved" && request.resolution ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Решение: {request.resolution}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
