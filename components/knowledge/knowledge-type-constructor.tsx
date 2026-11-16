"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ListChecks,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CUSTOM_FIELD_TYPES,
  customFieldTypeLabels,
  type CardTypeWithStats,
  type CustomFieldType,
} from "@/lib/knowledge";
import { cardTypeInputSchema } from "@/lib/validation/knowledge";
import { cn } from "@/lib/utils";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const textareaClassName =
  "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

type EditableField = {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  optionsText: string;
};

type KnowledgeTypeConstructorProps = {
  customTypes: CardTypeWithStats[];
  dbAvailable: boolean;
  onCreated: (type: CardTypeWithStats) => void;
  onUpdated: (type: CardTypeWithStats) => void;
  onDeleted: (typeId: string) => void;
  onClose: () => void;
};

function createEmptyField(): EditableField {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "shortText",
    required: false,
    optionsText: "",
  };
}

function splitOptions(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isCardTypeResponse(
  data: CardTypeWithStats | { error?: string }
): data is CardTypeWithStats {
  return "id" in data && "fields" in data;
}

export function KnowledgeTypeConstructor({
  customTypes,
  dbAvailable,
  onCreated,
  onUpdated,
  onDeleted,
  onClose,
}: KnowledgeTypeConstructorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<EditableField[]>([
    {
      id: "initial-field",
      name: "",
      type: "shortText",
      required: false,
      optionsText: "",
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const editingType =
    customTypes.find((type) => type.id === editingId) ?? null;
  const locked = Boolean(editingType && editingType.cardCount > 0);

  const resetEditor = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setFields([createEmptyField()]);
    setFormError(null);
  };

  const startCreate = () => {
    resetEditor();
    setFields([createEmptyField()]);
  };

  const startEdit = (type: CardTypeWithStats) => {
    setEditingId(type.id);
    setName(type.name);
    setDescription(type.description);
    setFields(
      type.fields.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        required: field.required,
        optionsText: field.options.join(", "),
      }))
    );
    setFormError(null);
  };

  const updateField = (
    id: string,
    patch: Partial<Omit<EditableField, "id">>
  ) => {
    setFields((current) =>
      current.map((field) =>
        field.id === id ? { ...field, ...patch } : field
      )
    );
  };

  const warnLockedFields = () => {
    if (!editingType) return false;

    const message = `По типу «${editingType.name}» уже сохранено ${editingType.cardCount} карточек. Поля нельзя переименовывать, добавлять или удалять: значения в существующих карточках перестанут отображаться. Сначала удалите карточки этого типа.`;
    setFormError(message);
    toast.error(message);
    return true;
  };

  const addField = () => {
    if (locked && warnLockedFields()) return;
    setFields((current) => [...current, createEmptyField()]);
  };

  const removeField = (id: string) => {
    if (locked && warnLockedFields()) return;

    if (fields.length === 1) {
      const message = "У типа должно остаться хотя бы одно поле";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFields((current) => current.filter((field) => field.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setFormError(null);

    if (!dbAvailable) {
      const message =
        "База данных недоступна в режиме просмотра: сохранить тип нельзя";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (locked) {
      const hasFieldChanges =
        editingType &&
        JSON.stringify(
          editingType.fields.map((field) => ({
            id: field.id,
            name: field.name,
            type: field.type,
            required: field.required,
            options: field.options,
          }))
        ) !==
          JSON.stringify(
            fields.map((field) => ({
              id: field.id,
              name: field.name,
              type: field.type,
              required: field.required,
              options: splitOptions(field.optionsText),
            }))
          );

      if (hasFieldChanges) {
        warnLockedFields();
        return;
      }
    }

    const payload = {
      name,
      description,
      fields: fields.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        required: field.required,
        options:
          field.type === "select" ? splitOptions(field.optionsText) : [],
      })),
    };

    const parsed = cardTypeInputSchema.safeParse(payload);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Проверьте заполнение полей";
      setFormError(message);
      toast.error(message);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/knowledge/card-types/${editingId}`
          : "/api/knowledge/card-types",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingId
              ? {
                  name: parsed.data.name,
                  description: parsed.data.description,
                  fields: parsed.data.fields,
                }
              : parsed.data
          ),
        }
      );
      const data = (await response.json().catch(() => null)) as
        | CardTypeWithStats
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          data && "error" in data && data.error
            ? data.error
            : "Не удалось сохранить тип карточки";
        setFormError(message);
        toast.error(message);
        return;
      }

      if (!data || !isCardTypeResponse(data)) {
        const message = "Сервер вернул некорректный ответ";
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success(
        editingId ? "Тип карточки обновлён" : "Тип карточки создан"
      );

      if (editingId) {
        onUpdated(data);
      } else {
        onCreated(data);
      }

      resetEditor();
    } catch {
      const message = "Ошибка сети при сохранении типа карточки";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (type: CardTypeWithStats) => {
    if (type.cardCount > 0) {
      const message = `Нельзя удалить тип «${type.name}»: по нему сохранено ${type.cardCount} карточек. Сначала удалите эти карточки — иначе они потеряют свой тип и поля.`;
      setFormError(message);
      toast.error(message);
      return;
    }

    toast("Удалить тип карточки?", {
      description: `Тип «${type.name}» исчезнет из формы добавления и дерева базы.`,
      action: {
        label: "Удалить",
        onClick: async () => {
          if (isDeleting) return;
          setIsDeleting(true);
          try {
            const response = await fetch(
              `/api/knowledge/card-types/${type.id}`,
              { method: "DELETE" }
            );
            const data = (await response.json().catch(() => null)) as
              | { error?: string }
              | null;

            if (!response.ok) {
              toast.error(
                data?.error ?? "Не удалось удалить тип карточки"
              );
              return;
            }

            toast.success("Тип карточки удалён");
            onDeleted(type.id);

            if (editingId === type.id) resetEditor();
          } catch {
            toast.error("Ошибка сети при удалении типа карточки");
          } finally {
            setIsDeleting(false);
          }
        },
      },
      cancel: { label: "Отмена", onClick: () => {} },
    });
  };

  return (
    <Card className="animate-in fade-in slide-in-from-top-2 rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10 duration-300">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <Settings2 className="h-5 w-5 text-primary" />
            Конструктор типов карточек
          </CardTitle>
          <CardDescription>
            Создавайте типы без программиста. Новый тип сразу появится в форме
            добавления карточки и в дереве базы.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-10 shrink-0 sm:size-8"
          onClick={onClose}
          aria-label="Закрыть конструктор"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {!dbAvailable ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
            Сейчас доступен режим просмотра: база данных недоступна. Создавать и
            изменять типы нельзя.
          </p>
        ) : null}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-primary" />
              Типы в базе
              <Badge variant="secondary">{customTypes.length}</Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 sm:h-7"
              onClick={startCreate}
            >
              <Plus className="h-4 w-4" />
              Новый тип
            </Button>
          </div>

          {customTypes.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border/50">
              Пользовательских типов пока нет. Создайте первый тип, например
              «Образовательная программа».
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {customTypes.map((type) => (
                <li
                  key={type.id}
                  className="flex flex-col gap-2 rounded-2xl bg-muted/30 p-3 ring-1 ring-border/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="break-words text-sm font-semibold">
                        {type.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {type.fields.length} полей · {type.cardCount} карточек
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-10 sm:size-8"
                        onClick={() => startEdit(type)}
                        aria-label={`Изменить тип ${type.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-10 sm:size-8"
                        onClick={() => handleDelete(type)}
                        aria-label={`Удалить тип ${type.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {type.fields.slice(0, 4).map((field) => (
                      <Badge
                        key={field.id}
                        variant="outline"
                        className="h-auto max-w-full whitespace-normal break-words text-[10px] font-normal"
                      >
                        {field.name} · {customFieldTypeLabels[field.type]}
                      </Badge>
                    ))}
                    {type.fields.length > 4 ? (
                      <Badge variant="outline" className="text-[10px]">
                        +{type.fields.length - 4}
                      </Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              {editingId ? "Редактирование типа" : "Новый тип карточки"}
            </div>
            {editingId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 sm:h-7"
                onClick={resetEditor}
              >
                Отменить редактирование
              </Button>
            ) : null}
          </div>

          {locked && editingType ? (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">
                  Поля заблокированы: по типу сохранено {editingType.cardCount}{" "}
                  карточек.
                </p>
                <p>
                  Переименование или удаление поля сломает отображение значений
                  в существующих карточках. Название и описание типа менять
                  можно. Чтобы изменить состав полей, сначала удалите карточки
                  этого типа или создайте новый тип.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="type-name">
                Название типа
              </label>
              <Input
                id="type-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Например: Образовательная программа"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="type-description"
              >
                Описание
              </label>
              <Input
                id="type-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Коротко поясните, для чего этот тип"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Поля типа</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 sm:h-7"
                onClick={addField}
              >
                <Plus className="h-4 w-4" />
                Добавить поле
              </Button>
            </div>

            <ul className="space-y-3">
              {fields.map((field, index) => (
                <li
                  key={field.id}
                  className="space-y-3 rounded-2xl bg-muted/30 p-3 ring-1 ring-border/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Поле {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-10 sm:size-8"
                      onClick={() => removeField(field.id)}
                      aria-label={`Удалить поле ${field.name || index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        className="text-xs font-medium"
                        htmlFor={`field-name-${field.id}`}
                      >
                        Название поля
                      </label>
                      <Input
                        id={`field-name-${field.id}`}
                        value={field.name}
                        onChange={(event) =>
                          updateField(field.id, { name: event.target.value })
                        }
                        placeholder="Например: Формат обучения"
                        disabled={locked}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-xs font-medium"
                        htmlFor={`field-type-${field.id}`}
                      >
                        Тип поля
                      </label>
                      <select
                        id={`field-type-${field.id}`}
                        className={selectClassName}
                        value={field.type}
                        onChange={(event) =>
                          updateField(field.id, {
                            type: event.target.value as CustomFieldType,
                          })
                        }
                        disabled={locked}
                      >
                        {CUSTOM_FIELD_TYPES.map((fieldType) => (
                          <option key={fieldType} value={fieldType}>
                            {customFieldTypeLabels[fieldType]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {field.type === "select" ? (
                    <div className="space-y-2">
                      <label
                        className="text-xs font-medium"
                        htmlFor={`field-options-${field.id}`}
                      >
                        Варианты выбора
                      </label>
                      <textarea
                        id={`field-options-${field.id}`}
                        className={cn(textareaClassName, "min-h-16")}
                        value={field.optionsText}
                        onChange={(event) =>
                          updateField(field.id, {
                            optionsText: event.target.value,
                          })
                        }
                        placeholder="Каждый вариант с новой строки или через запятую"
                        disabled={locked}
                      />
                    </div>
                  ) : null}

                  <label className="inline-flex min-h-10 items-center gap-2 text-xs font-medium sm:min-h-0">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) =>
                        updateField(field.id, {
                          required: event.target.checked,
                        })
                      }
                      disabled={locked}
                      className="h-4 w-4 accent-primary"
                    />
                    Обязательное поле
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {formError ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/20">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button type="button" variant="outline" className="h-10 sm:h-8" onClick={resetEditor} disabled={isSaving}>
              Очистить
            </Button>
            <Button type="submit" className="h-10 sm:h-8" disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving
                ? "Сохраняем..."
                : editingId
                  ? "Сохранить изменения"
                  : "Создать тип"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
