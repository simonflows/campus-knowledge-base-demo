"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  FlaskConical,
  FolderTree,
  Handshake,
  ListChecks,
  Loader2,
  MapPin,
  ShieldAlert,
  Trash2,
  Users,
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
import { Separator } from "@/components/ui/separator";
import { DiskSyncPanel } from "@/components/disk-sync/disk-sync-panel";
import { KnowledgeCardAccessPanel } from "@/components/knowledge/knowledge-card-access-panel";
import type { SessionUser } from "@/lib/auth";
import {
  cardStatusLabels,
  customFieldTypeLabels,
  getCardStatus,
  getCardTypeLabel,
  getFolderPathLabel,
  getUniversityName,
  isJointProject,
  placementStatusLabels,
  type CardTypeWithStats,
  type CustomCardField,
  type CustomFieldValue,
  type KnowledgeCard,
  type KnowledgeFolderNode,
} from "@/lib/knowledge";
import { cn } from "@/lib/utils";

type KnowledgeCardDetailProps = {
  card: KnowledgeCard;
  cards: KnowledgeCard[];
  customTypes: CardTypeWithStats[];
  tree: KnowledgeFolderNode[];
  dbAvailable: boolean;
  currentUser: SessionUser | null;
  onBack: () => void;
  onOpenFolder: (folderId: string) => void;
  onEdit: () => void;
  onCardUpdated: (card: KnowledgeCard) => void;
  onCardDeleted?: (cardId: string) => void;
};

function buildClientCardMarkdown(
  card: KnowledgeCard,
  customTypes: CardTypeWithStats[],
  tree: KnowledgeFolderNode[]
): string {
  const lines = [
    `# ${card.title}`,
    "",
    `- ID: ${card.id}`,
    `- Тип: ${getCardTypeLabel(card, customTypes)}`,
    `- Папка: ${getFolderPathLabel(card.folderId, tree)}`,
    `- Статус: ${cardStatusLabels[getCardStatus(card)]}`,
    `- Владельцы: ${card.owners.join(", ")}`,
    "",
    "## Эталонное описание",
    "",
    card.referenceDescription || "Не заполнено.",
    "",
    "## Стоп-формула для ИИ",
    "",
    card.stopFormula || "Не заполнено.",
    "",
  ];

  if (card.type === "project") {
    lines.push(
      "## Параметры проекта",
      "",
      `- Сфера: ${card.sphere}`,
      `- Инициатор: ${getUniversityName(card.initiatorUniversityId)}`,
      `- Соисполнители: ${card.coExecutors.join(", ") || "нет"}`,
      `- Партнёр: ${card.industrialPartner}`,
      `- Стадия: ${card.readinessStage}`,
      `- Контур: ${card.contour}`,
      "",
      "## Подтверждённые цифры",
      "",
      ...card.confirmedFigures.map((item) => `- ${item}`),
      ""
    );
  } else if (card.type === "laboratory") {
    lines.push(
      "## Параметры лаборатории",
      "",
      `- Принадлежность: ${card.affiliation}`,
      `- Партнёр: ${card.partner}`,
      `- Руководитель: ${card.head}`,
      `- Статус: ${placementStatusLabels[card.placementStatus]} (${card.placementDetails})`,
      "",
      "## Направления и оборудование",
      "",
      ...[...card.workDirections, ...card.equipment].map((item) => `- ${item}`),
      ""
    );
  } else if (card.type === "campus") {
    lines.push(
      "## Показатели паспорта",
      "",
      ...card.campusMetrics.map(
        (m) => `- ${m.label}: ${m.value} (${m.note})`
      ),
      ""
    );
  }

  return `${lines.join("\n").trim()}\n`;
}

function isEmptyFieldValue(value: CustomFieldValue | undefined): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function CustomFieldValueView({
  field,
  value,
  cards,
}: {
  field: CustomCardField;
  value: CustomFieldValue | undefined;
  cards: KnowledgeCard[];
}) {
  if (isEmptyFieldValue(value)) {
    return <span className="text-sm text-muted-foreground">Не заполнено</span>;
  }

  if (field.type === "cardReference") {
    const referenced = cards.find((card) => card.id === value);

    return referenced ? (
      <span className="font-medium">{referenced.title}</span>
    ) : (
      <span className="text-sm text-muted-foreground">Карточка не найдена</span>
    );
  }

  if (Array.isArray(value)) {
    return <TagList items={value} />;
  }

  if (field.type === "longText") {
    return (
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {String(value)}
      </p>
    );
  }

  return <span className="text-sm">{String(value)}</span>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm leading-relaxed text-foreground">{children}</dd>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-sm text-muted-foreground">Не указано</span>;
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex gap-2 text-sm leading-relaxed"
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function KnowledgeCardDetail({
  card,
  cards,
  customTypes,
  tree,
  dbAvailable,
  currentUser,
  onBack,
  onOpenFolder,
  onEdit,
  onCardUpdated,
  onCardDeleted,
}: KnowledgeCardDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const joint = isJointProject(card);
  const status = getCardStatus(card);
  const canDelete =
    currentUser?.role === "admin" &&
    dbAvailable &&
    card.id !== "campus-passport";
  const customType =
    card.type === "custom"
      ? (customTypes.find((type) => type.id === card.customTypeId) ?? null)
      : null;

  const handleCopyMarkdown = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(
        buildClientCardMarkdown(card, customTypes, tree)
      );
      toast.success("Markdown карточки скопирован в буфер обмена");
    } catch {
      toast.error("Не удалось скопировать текст карточки");
    }
  };

  const handleDownloadMarkdown = () => {
    const markdown = buildClientCardMarkdown(card, customTypes, tree);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `canon-${card.id}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Карточка выгружена в .md");
  };

  const handleDeleteCard = async () => {
    if (isDeleting || !canDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/knowledge/cards?id=${encodeURIComponent(card.id)}`,
        { method: "DELETE" }
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        success?: boolean;
      } | null;

      if (!response.ok) {
        toast.error(data?.error ?? "Не удалось удалить карточку");
        return;
      }

      toast.success("Карточка удалена из базы знаний");
      onCardDeleted?.(card.id);
    } catch {
      toast.error("Ошибка сети при удалении карточки");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-5 duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 h-10 sm:h-8">
          <ArrowLeft className="h-4 w-4" />К списку папки
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            className="h-9 gap-1.5 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            Копировать .md
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadMarkdown}
            className="h-9 gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Скачать .md
          </Button>

          {canDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteCard}
                  disabled={isDeleting}
                  className="h-9 gap-1.5 text-xs"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Подтвердить
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="h-9 text-xs"
                >
                  Отмена
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="h-9 gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить
              </Button>
            )
          ) : null}
        </div>
      </div>

      <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {getCardTypeLabel(card, customTypes)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                status === "approved" && "border-emerald-200 text-emerald-700",
                status === "pending" && "border-amber-300 text-amber-700",
                status === "rejected" &&
                  "border-destructive/30 text-destructive"
              )}
            >
              {cardStatusLabels[status]}
            </Badge>
            {joint ? (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                <Handshake className="h-3 w-3" />
                Совместный проект
              </Badge>
            ) : null}
            {card.type === "laboratory" ? (
              <Badge
                className={cn(
                  card.placementStatus === "planned"
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                )}
              >
                <MapPin className="h-3 w-3" />
                {placementStatusLabels[card.placementStatus]}
              </Badge>
            ) : null}
            {card.type === "project" ? (
              <Badge variant="outline">{card.readinessStage}</Badge>
            ) : null}
          </div>

          <div className="space-y-2">
            <CardTitle className="font-heading text-2xl leading-tight tracking-tight break-words sm:text-3xl">
              {card.title}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <FolderTree className="h-3.5 w-3.5" />
              <span>Папка хранения:</span>
              <button
                type="button"
                onClick={() => onOpenFolder(card.folderId)}
                className="min-h-8 min-w-0 break-words rounded-sm text-left font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
              >
                {getFolderPathLabel(card.folderId, tree)}
              </button>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="min-w-0 space-y-6 break-words">
          <div className="rounded-2xl bg-muted/40 p-4 ring-1 ring-border/50">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Владельцы карточки
            </div>
            <ul className="flex flex-wrap gap-2">
              {card.owners.map((owner) => (
                <li
                  key={owner}
                  className="max-w-full break-words rounded-full bg-background px-3 py-1 text-xs font-medium ring-1 ring-border/70"
                >
                  {owner}
                </li>
              ))}
            </ul>
            {status !== "approved" && card.submittedByName ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Черновик отправил: {card.submittedByName}
              </p>
            ) : null}
          </div>

          <KnowledgeCardAccessPanel
            card={card}
            currentUser={currentUser}
            dbAvailable={dbAvailable}
            onCardUpdated={onCardUpdated}
            onEdit={onEdit}
          />

          <DiskSyncPanel<KnowledgeCard>
            diskSync={card.diskSync}
            retryEndpoint={`/api/knowledge/cards/${card.id}/sync`}
            canRetry={dbAvailable && status === "approved"}
            entityLabel="карточка"
            onSynced={onCardUpdated}
          />

          {joint ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <div className="flex items-start gap-3">
                <Handshake className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Одна общая карточка для вузов-участников
                  </p>
                  <p className="leading-relaxed">
                    Проект принадлежит вузам:{" "}
                    {card.participantUniversityIds
                      .map((id) => getUniversityName(id))
                      .join(" и ")}
                    . Карточка хранится в «02_Совместные_проекты» и показывается
                    ссылкой в папках участников.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {card.type === "project" ? (
            <>
              <dl className="grid gap-5 sm:grid-cols-2">
                <Field label="Сфера / отрасль">{card.sphere}</Field>
                <Field label="Вуз-инициатор">
                  {getUniversityName(card.initiatorUniversityId)}
                </Field>
                <Field label="Соисполнители">
                  {card.coExecutors.length > 0
                    ? card.coExecutors.join(", ")
                    : "Нет"}
                </Field>
                <Field label="Индустриальный партнёр">
                  {card.industrialPartner}
                </Field>
                <Field label="Стадия готовности">
                  <Badge variant="outline">{card.readinessStage}</Badge>
                </Field>
                <Field label="Контур">
                  <Badge variant="secondary">{card.contour}</Badge>
                </Field>
              </dl>

              <Separator />

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" />
                    Подтверждённые цифры
                  </div>
                  <TagList items={card.confirmedFigures} />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Эталонное описание
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {card.referenceDescription}
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {card.type === "laboratory" ? (
            <>
              <dl className="grid gap-5 sm:grid-cols-2">
                <Field label="Принадлежность">{card.affiliation}</Field>
                <Field label="Партнёр">{card.partner}</Field>
                <Field label="Руководитель">{card.head}</Field>
                <Field label="Статус размещения">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                      card.placementStatus === "planned"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    )}
                  >
                    <MapPin className="h-3 w-3" />
                    {card.placementDetails}
                  </span>
                </Field>
              </dl>

              <Separator />

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Направления работ и оборудование
                  </div>
                  <TagList
                    items={[...card.workDirections, ...card.equipment]}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Подтверждённые показатели
                  </div>
                  <TagList items={card.confirmedIndicators} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Эталонное описание
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {card.referenceDescription}
                </p>
              </div>
            </>
          ) : null}

          {card.type === "custom" ? (
            <>
              {customType ? (
                <dl className="grid gap-5 sm:grid-cols-2">
                  {customType.fields.map((field) => (
                    <Field key={field.id} label={field.name}>
                      <div className="space-y-1">
                        <CustomFieldValueView
                          field={field}
                          value={card.customFields[field.id]}
                          cards={cards}
                        />
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {customFieldTypeLabels[field.type]}
                        </div>
                      </div>
                    </Field>
                  ))}
                </dl>
              ) : (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                  Тип этой карточки не найден. Поля сохранены, но их названия и
                  настройки недоступны.
                </div>
              )}

              {card.referenceDescription ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Эталонное описание
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {card.referenceDescription}
                    </p>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {card.type === "campus" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {card.campusMetrics.map((metric) => (
                  <div
                    key={`${metric.label}-${metric.value}`}
                    className="rounded-2xl bg-muted/40 p-4 ring-1 ring-border/50"
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {metric.label}
                    </div>
                    <div className="mt-1 text-xl font-bold tracking-tight">
                      {metric.value}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {metric.note}
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Тарифы
                  </div>
                  <ul className="space-y-2">
                    {card.tariffs.map((tariff) => (
                      <li
                        key={`${tariff.label}-${tariff.value}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {tariff.label}
                        </span>
                        <span className="font-medium">{tariff.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    Юрлица
                  </div>
                  <ul className="space-y-2">
                    {card.legalEntities.map((entity) => (
                      <li key={`${entity.name}-${entity.role}`} className="space-y-0.5 text-sm">
                        <p className="font-medium">{entity.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entity.role}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Эталонное описание
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {card.referenceDescription}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Стоп-лист частых ошибок
                </div>
                <ul className="space-y-1.5">
                  {card.stopList.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm leading-relaxed"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {card.stopFormula ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" />
                Ограничения для ИИ (стоп-формула)
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                {card.stopFormula}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
