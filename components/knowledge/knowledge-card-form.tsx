"use client";

import { useState } from "react";
import { FlaskConical, Handshake, Plus, Settings2, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { universities } from "@/lib/data";
import type { SessionUser } from "@/lib/auth";
import {
  CONTOURS,
  folderIds,
  getUniversityIdFromFolder,
  knowledgeCardTypeLabels,
  PLACEMENT_STATUSES,
  placementStatusLabels,
  READINESS_STAGES,
  UNIVERSITY_SUBFOLDERS,
  type CampusLegalEntity,
  type CampusMetric,
  type CampusTariff,
  type CardTypeWithStats,
  type CustomCardField,
  type CustomFieldValue,
  type KnowledgeCard,
  type PlacementStatus,
} from "@/lib/knowledge";
import {
  buildCustomFieldValuesSchema,
  knowledgeCardInputSchema,
} from "@/lib/validation/knowledge";
import { cn } from "@/lib/utils";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const textareaClassName =
  "flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function splitList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string): string[] {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMetricLines(value: string): CampusMetric[] {
  return splitLines(value).map((line) => {
    const [label = "", metricValue = "", ...rest] = line
      .split("|")
      .map((item) => item.trim());

    return { label, value: metricValue, note: rest.join(" | ").trim() };
  });
}

function parseTariffLines(value: string): CampusTariff[] {
  return splitLines(value).map((line) => {
    const [label = "", tariffValue = ""] = line
      .split("|")
      .map((item) => item.trim());

    return { label, value: tariffValue };
  });
}

function parseLegalEntityLines(value: string): CampusLegalEntity[] {
  return splitLines(value).map((line) => {
    const [name = "", role = ""] = line.split("|").map((item) => item.trim());

    return { name, role };
  });
}

type FormType = "project" | "laboratory" | "custom" | "campus";

type KnowledgeCardFormProps = {
  cards: KnowledgeCard[];
  customTypes: CardTypeWithStats[];
  dbAvailable: boolean;
  currentUser: SessionUser | null;
  initialCard?: KnowledgeCard | null;
  defaultFolderId?: string | null;
  onCreated: (card: KnowledgeCard) => void;
  onUpdated?: (card: KnowledgeCard) => void;
  onCancel: () => void;
};

export function KnowledgeCardForm({
  cards,
  customTypes,
  dbAvailable,
  currentUser,
  initialCard = null,
  defaultFolderId = null,
  onCreated,
  onUpdated,
  onCancel,
}: KnowledgeCardFormProps) {
  const projectCard = initialCard?.type === "project" ? initialCard : null;
  const laboratoryCard =
    initialCard?.type === "laboratory" ? initialCard : null;
  const customCard = initialCard?.type === "custom" ? initialCard : null;
  const campusCard = initialCard?.type === "campus" ? initialCard : null;
  const isEdit = Boolean(initialCard);

  const defaultUniversityId =
    (defaultFolderId ? getUniversityIdFromFolder(defaultFolderId) : null) ??
    currentUser?.universityId ??
    "susu";
  const initialCustomTypeFromFolder =
    !initialCard && defaultFolderId?.startsWith(`${folderIds.customRoot}/`)
      ? defaultFolderId.slice(`${folderIds.customRoot}/`.length)
      : null;
  const initialFormType: FormType =
    initialCard?.type ??
    (initialCustomTypeFromFolder
      ? "custom"
      : defaultFolderId?.endsWith("/infrastructure")
        ? "laboratory"
        : "project");

  const [type, setType] = useState<FormType>(initialFormType);
  const [selectedCustomTypeId, setSelectedCustomTypeId] = useState<
    string | null
  >(customCard?.customTypeId ?? initialCustomTypeFromFolder ?? null);
  const [customFields, setCustomFields] = useState<
    Record<string, CustomFieldValue>
  >(customCard?.customFields ?? {});
  const [title, setTitle] = useState(initialCard?.title ?? "");
  const [owners, setOwners] = useState(initialCard?.owners.join(", ") ?? "");
  const [folderId, setFolderId] = useState(
    initialCard?.folderId ??
      (defaultFolderId &&
      defaultFolderId.startsWith(`${folderIds.universities}/`) &&
      defaultFolderId.split("/").length >= 3
        ? defaultFolderId
        : folderIds.subfolder(
            defaultUniversityId,
            initialFormType === "laboratory" ? "infrastructure" : "products"
          ))
  );
  const [sphere, setSphere] = useState(projectCard?.sphere ?? "");
  const [initiatorUniversityId, setInitiatorUniversityId] = useState(
    projectCard?.initiatorUniversityId ?? defaultUniversityId
  );
  const [coExecutors, setCoExecutors] = useState(
    projectCard?.coExecutors.join(", ") ?? ""
  );
  const [industrialPartner, setIndustrialPartner] = useState(
    projectCard?.industrialPartner ?? ""
  );
  const [readinessStage, setReadinessStage] = useState<string>(
    projectCard?.readinessStage ?? "Идея"
  );
  const [contour, setContour] = useState<string>(
    projectCard?.contour ?? "кампус"
  );
  const [confirmedFigures, setConfirmedFigures] = useState(
    projectCard?.confirmedFigures.join("\n") ?? ""
  );
  const [isJoint, setIsJoint] = useState(projectCard?.isJoint ?? false);
  const [participantUniversityIds, setParticipantUniversityIds] = useState<
    string[]
  >(projectCard?.participantUniversityIds ?? []);
  const [affiliation, setAffiliation] = useState(
    laboratoryCard?.affiliation ?? ""
  );
  const [partner, setPartner] = useState(laboratoryCard?.partner ?? "");
  const [head, setHead] = useState(laboratoryCard?.head ?? "");
  const [placementStatus, setPlacementStatus] = useState<PlacementStatus | "">(
    laboratoryCard?.placementStatus ?? ""
  );
  const [placementDetails, setPlacementDetails] = useState(
    laboratoryCard?.placementDetails ?? ""
  );
  const [workDirections, setWorkDirections] = useState(
    laboratoryCard?.workDirections.join("\n") ?? ""
  );
  const [equipment, setEquipment] = useState(
    laboratoryCard?.equipment.join("\n") ?? ""
  );
  const [confirmedIndicators, setConfirmedIndicators] = useState(
    laboratoryCard?.confirmedIndicators.join("\n") ?? ""
  );
  const [campusMetrics, setCampusMetrics] = useState(
    campusCard
      ? campusCard.campusMetrics
          .map((metric) => `${metric.label} | ${metric.value} | ${metric.note}`)
          .join("\n")
      : ""
  );
  const [campusTariffs, setCampusTariffs] = useState(
    campusCard
      ? campusCard.tariffs
          .map((tariff) => `${tariff.label} | ${tariff.value}`)
          .join("\n")
      : ""
  );
  const [campusLegalEntities, setCampusLegalEntities] = useState(
    campusCard
      ? campusCard.legalEntities
          .map((entity) => `${entity.name} | ${entity.role}`)
          .join("\n")
      : ""
  );
  const [campusStopList, setCampusStopList] = useState(
    campusCard?.stopList.join("\n") ?? ""
  );
  const [referenceDescription, setReferenceDescription] = useState(
    initialCard?.referenceDescription ?? ""
  );
  const [stopFormula, setStopFormula] = useState(
    initialCard?.stopFormula ?? ""
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [listDrafts, setListDrafts] = useState<Record<string, string>>({});

  const selectedCustomType = selectedCustomTypeId
    ? (customTypes.find((item) => item.id === selectedCustomTypeId) ?? null)
    : null;
  const typeLabel = initialCard
    ? initialCard.type === "custom"
      ? (selectedCustomType?.name ?? knowledgeCardTypeLabels.custom)
      : knowledgeCardTypeLabels[initialCard.type]
    : "";

  const handleTypeChange = (value: string) => {
    if (isEdit) return;

    setFormError(null);
    setIsJoint(false);
    setParticipantUniversityIds([]);
    setCustomFields({});
    setListDrafts({});

    if (value.startsWith("custom:")) {
      const typeId = value.slice("custom:".length);

      setType("custom");
      setSelectedCustomTypeId(typeId);
      setFolderId(folderIds.customType(typeId));
      return;
    }

    if (value === "campus") {
      setType("campus");
      setSelectedCustomTypeId(null);
      setFolderId(folderIds.campus);
      return;
    }

    const nextType = value as "project" | "laboratory";
    setType(nextType);
    setSelectedCustomTypeId(null);
    setFolderId(
      nextType === "project"
        ? folderIds.subfolder(defaultUniversityId, "products")
        : folderIds.subfolder(defaultUniversityId, "infrastructure")
    );
  };

  const updateCustomField = (fieldId: string, value: CustomFieldValue) => {
    setCustomFields((current) => ({ ...current, [fieldId]: value }));
  };

  const renderCustomField = (field: CustomCardField) => {
    const value = customFields[field.id];
    const requiredMark = field.required ? (
      <span className="text-destructive"> *</span>
    ) : null;

    if (field.type === "longText") {
      return (
        <div className="space-y-2" key={field.id}>
          <label className="text-sm font-medium" htmlFor={`cf-${field.id}`}>
            {field.name}
            {requiredMark}
          </label>
          <textarea
            id={`cf-${field.id}`}
            className={textareaClassName}
            value={typeof value === "string" ? value : ""}
            onChange={(event) =>
              updateCustomField(field.id, event.target.value)
            }
            placeholder={field.name}
            required={field.required}
          />
        </div>
      );
    }

    if (field.type === "list") {
      return (
        <div className="space-y-2" key={field.id}>
          <label className="text-sm font-medium" htmlFor={`cf-${field.id}`}>
            {field.name}
            {requiredMark}
          </label>
          <textarea
            id={`cf-${field.id}`}
            className={textareaClassName}
            value={
              listDrafts[field.id] ??
              (Array.isArray(value) ? value.join("\n") : "")
            }
            onChange={(event) => {
              const text = event.target.value;

              setListDrafts((current) => ({ ...current, [field.id]: text }));
              updateCustomField(field.id, splitList(text));
            }}
            placeholder="Каждый элемент с новой строки"
            required={field.required}
          />
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div className="space-y-2" key={field.id}>
          <label className="text-sm font-medium" htmlFor={`cf-${field.id}`}>
            {field.name}
            {requiredMark}
          </label>
          <select
            id={`cf-${field.id}`}
            className={selectClassName}
            value={typeof value === "string" ? value : ""}
            onChange={(event) =>
              updateCustomField(field.id, event.target.value)
            }
            required={field.required}
          >
            <option value="">— выберите значение —</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === "cardReference") {
      return (
        <div className="space-y-2" key={field.id}>
          <label className="text-sm font-medium" htmlFor={`cf-${field.id}`}>
            {field.name}
            {requiredMark}
          </label>
          <select
            id={`cf-${field.id}`}
            className={selectClassName}
            value={typeof value === "string" ? value : ""}
            onChange={(event) =>
              updateCustomField(field.id, event.target.value)
            }
            required={field.required}
          >
            <option value="">— выберите карточку —</option>
            {cards
              .filter((card) => card.id !== initialCard?.id)
              .map((card) => (
              <option key={card.id} value={card.id}>
                {card.title}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="space-y-2" key={field.id}>
        <label className="text-sm font-medium" htmlFor={`cf-${field.id}`}>
          {field.name}
          {requiredMark}
        </label>
        <Input
          id={`cf-${field.id}`}
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : "text"
          }
          value={
            field.type === "number"
              ? typeof value === "number"
                ? value
                : ""
              : typeof value === "string"
                ? value
                : ""
          }
          onChange={(event) => {
            if (field.type === "number") {
              updateCustomField(
                field.id,
                event.target.value === "" ? null : Number(event.target.value)
              );
              return;
            }

            updateCustomField(field.id, event.target.value);
          }}
          placeholder={field.name}
          required={field.required}
        />
      </div>
    );
  };

  const toggleParticipant = (universityId: string) => {
    setParticipantUniversityIds((current) =>
      current.includes(universityId)
        ? current.filter((id) => id !== universityId)
        : [...current, universityId]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setFormError(null);

    if (type === "project" && isJoint && participantUniversityIds.length < 2) {
      const message = "Выберите минимум два вуза-участника совместного проекта";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (type === "custom" && !selectedCustomType) {
      const message = "Выберите пользовательский тип карточки";
      setFormError(message);
      toast.error(message);
      return;
    }

    const base = {
      title,
      folderId:
        type === "custom" && selectedCustomType
          ? folderIds.customType(selectedCustomType.id)
          : type === "campus"
            ? folderIds.campus
            : isJoint
              ? folderIds.joint
              : folderId,
      owners: splitList(owners),
      referenceDescription,
      stopFormula,
    };

    const payload =
      type === "custom" && selectedCustomType
        ? {
            ...base,
            type: "custom" as const,
            customTypeId: selectedCustomType.id,
            customFields,
          }
        : type === "project"
          ? {
              ...base,
              type: "project" as const,
              sphere,
              initiatorUniversityId,
              coExecutors: splitList(coExecutors),
              industrialPartner,
              readinessStage,
              contour,
              confirmedFigures: splitList(confirmedFigures),
              isJoint,
              participantUniversityIds: isJoint ? participantUniversityIds : [],
            }
          : type === "campus"
            ? {
                ...base,
                type: "campus" as const,
                campusMetrics: parseMetricLines(campusMetrics),
                tariffs: parseTariffLines(campusTariffs),
                legalEntities: parseLegalEntityLines(campusLegalEntities),
                stopList: splitLines(campusStopList),
              }
            : {
                ...base,
                type: "laboratory" as const,
                affiliation,
                partner,
                head,
                placementStatus: placementStatus || undefined,
                placementDetails,
                workDirections: splitList(workDirections),
                equipment: splitList(equipment),
                confirmedIndicators: splitList(confirmedIndicators),
              };

    const parsed = knowledgeCardInputSchema.safeParse(payload);

    if (!parsed.success) {
      const placementIssue = parsed.error.issues.find(
        (issue) => issue.path[0] === "placementStatus"
      );
      const message = placementIssue
        ? "Выберите статус размещения лаборатории: «Действует на площадке вуза» или «Планируется к открытию в УНК кампуса»"
        : (parsed.error.issues[0]?.message ?? "Проверьте заполнение полей");
      setFormError(message);
      toast.error(message);
      return;
    }

    let cardPayload = parsed.data;

    if (parsed.data.type === "custom" && selectedCustomType) {
      const values =
        buildCustomFieldValuesSchema(selectedCustomType).safeParse(
          customFields
        );

      if (!values.success) {
        const message =
          values.error.issues[0]?.message ?? "Проверьте поля карточки";
        setFormError(message);
        toast.error(message);
        return;
      }

      cardPayload = { ...parsed.data, customFields: values.data };
    }

    setIsSaving(true);

    try {
      const endpoint =
        isEdit && initialCard
          ? `/api/knowledge/cards/${initialCard.id}`
          : "/api/knowledge/cards";
      const response = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardPayload),
      });
      const data = (await response.json().catch(() => null)) as
        KnowledgeCard | { error?: string } | null;

      if (!response.ok) {
        const message =
          data && "error" in data && data.error
            ? data.error
            : "Не удалось сохранить карточку";
        setFormError(message);
        toast.error(message);
        return;
      }

      if (!data || "error" in data) {
        const message = "Сервер вернул некорректный ответ";
        setFormError(message);
        toast.error(message);
        return;
      }

      const card = data as KnowledgeCard;

      if (isEdit) {
        onUpdated?.(card);
        toast.success("Изменения карточки сохранены");
      } else {
        onCreated(card);

        if (card.status === "pending") {
          toast.success("Черновик отправлен координатору на подтверждение", {
            description: isJoint
              ? "Для совместного проекта также нужно подтверждение обоих вузов-участников."
              : "Карточка не попадёт в канон до одобрения администратором.",
          });
        } else if (card.diskSync?.status === "synced") {
          toast.success("Карточка сохранена и выгружена на Яндекс Диск");
        } else if (card.diskSync?.status === "failed") {
          toast.warning("Карточка сохранена, но не выгружена на Яндекс Диск", {
            description:
              card.diskSync.message ||
              "Карточка доступна в базе. Выгрузку можно повторить в карточке.",
          });
        } else {
          toast.success("Карточка сохранена");
        }
      }
    } catch {
      const message = "Ошибка сети при сохранении карточки";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="animate-in fade-in slide-in-from-top-2 rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10 duration-300">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="font-heading text-xl">
            {isEdit
              ? "Редактирование канонической карточки"
              : "Новая каноническая карточка"}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? "Правки сохраняются в карточку. Чужие утверждённые карточки доступны только для запроса правки."
              : currentUser?.role === "university_pr"
                ? "Карточка сохранится черновиком и уйдёт координатору на подтверждение. В канон она попадёт только после одобрения."
                : "Сохранение доступно только при заполнении обязательных полей. Новые карточки проходят проверку координатора."}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-10 shrink-0 sm:size-8"
          onClick={onCancel}
          aria-label="Закрыть форму"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        {!dbAvailable ? (
          <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
            Сейчас доступен режим просмотра: база данных недоступна. Новые
            карточки сохранить не получится.
          </p>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="card-type">
                Тип карточки
              </label>
              {isEdit ? (
                <Input id="card-type" value={typeLabel} disabled />
              ) : (
                <select
                  id="card-type"
                  className={selectClassName}
                  value={
                    type === "custom" && selectedCustomTypeId
                      ? `custom:${selectedCustomTypeId}`
                      : type
                  }
                  onChange={(event) => handleTypeChange(event.target.value)}
                >
                  <optgroup label="Стандартные типы">
                    <option value="project">Проект / продукт</option>
                    <option value="laboratory">Лаборатория / объект</option>
                  </optgroup>
                  {customTypes.length > 0 ? (
                    <optgroup label="Пользовательские типы">
                      {customTypes.map((customType) => (
                        <option
                          key={customType.id}
                          value={`custom:${customType.id}`}
                        >
                          {customType.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="card-title">
                Название
              </label>
              <Input
                id="card-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например: Виртуальный тренажёр травмпункта"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="card-owners">
                Владельцы карточки
              </label>
              <Input
                id="card-owners"
                value={owners}
                onChange={(event) => setOwners(event.target.value)}
                placeholder="Имя, вуз или организация; через запятую"
                disabled={isEdit && currentUser?.role !== "admin"}
                required
              />
              {isEdit && currentUser?.role !== "admin" ? (
                <p className="text-[11px] text-muted-foreground">
                  Владельцев карточки меняет только администратор канона.
                </p>
              ) : null}
            </div>

            {type === "custom" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="card-folder">
                  Папка хранения
                </label>
                <select
                  id="card-folder"
                  className={selectClassName}
                  value={folderId}
                  disabled
                >
                  <option value={folderId}>
                    {selectedCustomType?.name ?? "Пользовательский тип"}
                  </option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Карточка появится в разделе «03_Пользовательские_типы».
                </p>
              </div>
            ) : type === "campus" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="card-folder">
                  Папка хранения
                </label>
                <Input
                  id="card-folder"
                  value="00_Кампус_общие_параметры"
                  disabled
                />
                <p className="text-[11px] text-muted-foreground">
                  Общие параметры кампуса редактирует только администратор
                  канона.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="card-folder">
                  Папка хранения
                </label>
                <select
                  id="card-folder"
                  className={selectClassName}
                  value={isJoint ? folderIds.joint : folderId}
                  onChange={(event) => setFolderId(event.target.value)}
                  disabled={
                    (type === "project" && isJoint) ||
                    (isEdit && currentUser?.role !== "admin")
                  }
                >
                  {universities.map((university) => (
                    <optgroup key={university.id} label={university.shortName}>
                      {UNIVERSITY_SUBFOLDERS.map((subfolder) => (
                        <option
                          key={subfolder.key}
                          value={folderIds.subfolder(
                            university.id,
                            subfolder.key
                          )}
                        >
                          {university.shortName} / {subfolder.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {type === "project" && isJoint ? (
                    <option value={folderIds.joint}>
                      02_Совместные_проекты
                    </option>
                  ) : null}
                </select>
              </div>
            )}
          </div>

          {type === "custom" ? (
            <>
              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Поля типа «{selectedCustomType?.name ?? "не выбран"}»
                </div>
                <Badge variant="secondary">
                  {selectedCustomType?.fields.length ?? 0} полей
                </Badge>
              </div>

              {selectedCustomType ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedCustomType.fields.map(renderCustomField)}
                </div>
              ) : (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                  Выберите пользовательский тип, чтобы увидеть его поля.
                </p>
              )}
            </>
          ) : type === "project" ? (
            <>
              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Поля проекта / продукта
                </div>
                <label className="inline-flex min-h-10 items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium sm:min-h-8">
                  <input
                    type="checkbox"
                    checked={isJoint}
                    onChange={(event) => {
                      setIsJoint(event.target.checked);
                      if (!event.target.checked) {
                        setParticipantUniversityIds([]);
                      }
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  <Handshake className="h-3.5 w-3.5" />
                  Совместный проект
                </label>
              </div>

              {isJoint ? (
                <div className="space-y-3 rounded-2xl bg-primary/5 p-4 ring-1 ring-primary/20">
                  <p className="text-xs leading-relaxed text-foreground/80">
                    Совместный проект хранится одной карточкой в
                    «02_Совместные_проекты» и отображается ссылкой в папках
                    выбранных вузов.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {universities.map((university) => {
                      const selected = participantUniversityIds.includes(
                        university.id
                      );

                      return (
                        <button
                          key={university.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleParticipant(university.id)}
                          className={cn(
                            "min-h-10 rounded-full px-3 py-1 text-xs font-medium outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary sm:min-h-8",
                            selected
                              ? "bg-primary text-primary-foreground ring-primary"
                              : "bg-background text-foreground ring-border hover:bg-muted"
                          )}
                        >
                          {university.shortName}
                        </button>
                      );
                    })}
                  </div>
                  {participantUniversityIds.length > 0 ? (
                    <Badge variant="secondary">
                      Участники:{" "}
                      {participantUniversityIds.length > 0
                        ? participantUniversityIds
                            .map(
                              (id) =>
                                universities.find(
                                  (university) => university.id === id
                                )?.shortName ?? id
                            )
                            .join(", ")
                        : "не выбраны"}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="card-sphere">
                    Сфера / отрасль
                  </label>
                  <Input
                    id="card-sphere"
                    value={sphere}
                    onChange={(event) => setSphere(event.target.value)}
                    placeholder="Например: Медицина и образование"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="card-initiator"
                  >
                    Вуз-инициатор
                  </label>
                  <select
                    id="card-initiator"
                    className={selectClassName}
                    value={initiatorUniversityId}
                    onChange={(event) =>
                      setInitiatorUniversityId(event.target.value)
                    }
                  >
                    {universities.map((university) => (
                      <option key={university.id} value={university.id}>
                        {university.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="card-coexecutors"
                  >
                    Соисполнители
                  </label>
                  <Input
                    id="card-coexecutors"
                    value={coExecutors}
                    onChange={(event) => setCoExecutors(event.target.value)}
                    placeholder="Вузы и организации через запятую"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="card-industrial-partner"
                  >
                    Индустриальный партнёр
                  </label>
                  <Input
                    id="card-industrial-partner"
                    value={industrialPartner}
                    onChange={(event) =>
                      setIndustrialPartner(event.target.value)
                    }
                    placeholder="Организация-партнёр"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="card-readiness"
                  >
                    Стадия готовности
                  </label>
                  <select
                    id="card-readiness"
                    className={selectClassName}
                    value={readinessStage}
                    onChange={(event) => setReadinessStage(event.target.value)}
                  >
                    {READINESS_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="card-contour">
                    Контур
                  </label>
                  <select
                    id="card-contour"
                    className={selectClassName}
                    value={contour}
                    onChange={(event) => setContour(event.target.value)}
                  >
                    {CONTOURS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="card-figures">
                  Подтверждённые цифры
                </label>
                <textarea
                  id="card-figures"
                  className={textareaClassName}
                  value={confirmedFigures}
                  onChange={(event) => setConfirmedFigures(event.target.value)}
                  placeholder="Каждый факт с новой строки"
                />
              </div>
            </>
          ) : type === "campus" ? (
            <>
              <Separator />

              <div className="flex items-center gap-2 text-sm font-semibold">
                <Settings2 className="h-4 w-4 text-primary" />
                Общие параметры кампуса
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="campus-metrics"
                  >
                    Показатели кампуса
                  </label>
                  <textarea
                    id="campus-metrics"
                    className={textareaClassName}
                    value={campusMetrics}
                    onChange={(event) => setCampusMetrics(event.target.value)}
                    placeholder="Название | значение | пояснение"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Каждый показатель с новой строки: название, значение и
                    пояснение через символ «|».
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="campus-tariffs"
                  >
                    Тарифы
                  </label>
                  <textarea
                    id="campus-tariffs"
                    className={textareaClassName}
                    value={campusTariffs}
                    onChange={(event) => setCampusTariffs(event.target.value)}
                    placeholder="Название тарифа | значение"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Каждый тариф с новой строки: название и значение через
                    символ «|».
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="campus-legal-entities"
                  >
                    Юрлица
                  </label>
                  <textarea
                    id="campus-legal-entities"
                    className={textareaClassName}
                    value={campusLegalEntities}
                    onChange={(event) =>
                      setCampusLegalEntities(event.target.value)
                    }
                    placeholder="Название | роль"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Каждое юрлицо с новой строки: название и роль через символ
                    «|».
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="campus-stop-list"
                  >
                    Стоп-лист частых ошибок
                  </label>
                  <textarea
                    id="campus-stop-list"
                    className={textareaClassName}
                    value={campusStopList}
                    onChange={(event) => setCampusStopList(event.target.value)}
                    placeholder="Каждое ограничение с новой строки"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <Separator />

              <div className="flex items-center gap-2 text-sm font-semibold">
                <FlaskConical className="h-4 w-4 text-primary" />
                Поля лаборатории / объекта инфраструктуры
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="card-affiliation"
                  >
                    Принадлежность
                  </label>
                  <Input
                    id="card-affiliation"
                    value={affiliation}
                    onChange={(event) => setAffiliation(event.target.value)}
                    placeholder="Вуз или организация"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="card-partner">
                    Партнёр
                  </label>
                  <Input
                    id="card-partner"
                    value={partner}
                    onChange={(event) => setPartner(event.target.value)}
                    placeholder="Индустриальный или научный партнёр"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="card-head">
                    Руководитель
                  </label>
                  <Input
                    id="card-head"
                    value={head}
                    onChange={(event) => setHead(event.target.value)}
                    placeholder="Имя и должность"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="card-placement-status"
                  >
                    Статус размещения{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="card-placement-status"
                    className={cn(
                      selectClassName,
                      !placementStatus && "border-destructive/50"
                    )}
                    value={placementStatus}
                    onChange={(event) =>
                      setPlacementStatus(
                        event.target.value as PlacementStatus | ""
                      )
                    }
                    required
                  >
                    <option value="">— выберите статус —</option>
                    {PLACEMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {placementStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="card-placement-details"
                >
                  Адрес / корпус, год или год открытия
                </label>
                <Input
                  id="card-placement-details"
                  value={placementDetails}
                  onChange={(event) => setPlacementDetails(event.target.value)}
                  placeholder="Действует на площадке вуза (адрес, корпус, с какого года) или Планируется к открытию в УНК кампуса (год)"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="card-directions"
                  >
                    Направления работ
                  </label>
                  <textarea
                    id="card-directions"
                    className={textareaClassName}
                    value={workDirections}
                    onChange={(event) => setWorkDirections(event.target.value)}
                    placeholder="Каждое направление с новой строки"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="card-equipment"
                  >
                    Оборудование
                  </label>
                  <textarea
                    id="card-equipment"
                    className={textareaClassName}
                    value={equipment}
                    onChange={(event) => setEquipment(event.target.value)}
                    placeholder="Каждая единица оборудования с новой строки"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="card-indicators"
                >
                  Подтверждённые показатели
                </label>
                <textarea
                  id="card-indicators"
                  className={textareaClassName}
                  value={confirmedIndicators}
                  onChange={(event) =>
                    setConfirmedIndicators(event.target.value)
                  }
                  placeholder="Каждый показатель с новой строки"
                />
              </div>
            </>
          )}

          <Separator />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="card-reference">
                Эталонное описание
              </label>
              <textarea
                id="card-reference"
                className={textareaClassName}
                value={referenceDescription}
                onChange={(event) =>
                  setReferenceDescription(event.target.value)
                }
                placeholder="Проверенная формулировка для статей и релизов"
                required={type !== "custom"}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="card-stop">
                Ограничения для ИИ (стоп-формула)
              </label>
              <textarea
                id="card-stop"
                className={textareaClassName}
                value={stopFormula}
                onChange={(event) => setStopFormula(event.target.value)}
                placeholder="Что нельзя утверждать и какие ошибки запрещены"
                required={type !== "custom"}
              />
            </div>
          </div>

          {formError ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/20">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button type="button" variant="outline" className="h-10 sm:h-8" onClick={onCancel} disabled={isSaving}>
              Отмена
            </Button>
            <Button type="submit" className="h-10 sm:h-8" disabled={isSaving || !dbAvailable}>
              <Plus className="h-4 w-4" />
              {isSaving
                ? "Сохраняем..."
                : isEdit
                  ? "Сохранить изменения"
                  : "Сохранить карточку"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
