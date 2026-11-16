import { z } from "zod";

import {
  CONTOURS,
  CUSTOM_FIELD_TYPES,
  PLACEMENT_STATUSES,
  READINESS_STAGES,
  type CardTypeDefinition,
  type CustomCardField,
} from "@/lib/knowledge";

const text = z.string().trim().min(1, "Заполните поле");
const longText = z.string().trim().min(1, "Заполните поле").max(10_000);
const textList = z.array(text).default([]);

const baseCardSchema = z.object({
  title: text.max(200),
  folderId: text,
  owners: z.array(text).min(1, "Укажите хотя бы одного владельца карточки"),
  referenceDescription: longText,
  stopFormula: longText,
});

const projectCardSchema = baseCardSchema.extend({
  type: z.literal("project"),
  sphere: text,
  initiatorUniversityId: text,
  coExecutors: textList,
  industrialPartner: text,
  readinessStage: z.enum(READINESS_STAGES),
  contour: z.enum(CONTOURS),
  confirmedFigures: textList,
  isJoint: z.boolean().default(false),
  participantUniversityIds: textList,
});

const laboratoryCardSchema = baseCardSchema.extend({
  type: z.literal("laboratory"),
  affiliation: text,
  partner: text,
  head: text,
  placementStatus: z.enum(PLACEMENT_STATUSES),
  placementDetails: text,
  workDirections: textList,
  equipment: textList,
  confirmedIndicators: textList,
});

const campusMetricSchema = z.object({
  label: text,
  value: text,
  note: text,
});

const campusTariffSchema = z.object({
  label: text,
  value: text,
});

const campusLegalEntitySchema = z.object({
  name: text,
  role: text,
});

const campusCardSchema = baseCardSchema.extend({
  type: z.literal("campus"),
  campusMetrics: z.array(campusMetricSchema).min(1),
  tariffs: z.array(campusTariffSchema).min(1),
  legalEntities: z.array(campusLegalEntitySchema).min(1),
  stopList: z.array(text).min(1),
});

export const customCardFieldInputSchema = z
  .object({
    id: text.max(80),
    name: text.max(120),
    type: z.enum(CUSTOM_FIELD_TYPES),
    required: z.boolean().default(false),
    options: z.array(text.max(120)).default([]),
  })
  .superRefine((field, ctx) => {
    if (field.type === "select" && field.options.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Добавьте хотя бы один вариант выбора",
      });
    }
  });

const cardTypeFieldsSchema = z
  .array(customCardFieldInputSchema)
  .min(1, "Добавьте хотя бы одно поле")
  .max(50, "Слишком много полей")
  .superRefine((fields, ctx) => {
    const ids = new Set<string>();

    fields.forEach((field, index) => {
      if (ids.has(field.id)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "Идентификаторы полей не должны повторяться",
        });
      }

      ids.add(field.id);
    });
  });

export const cardTypeInputSchema = z.object({
  name: text.max(120),
  description: z.string().trim().max(500).default(""),
  fields: cardTypeFieldsSchema,
});

export const cardTypeUpdateSchema = z
  .object({
    name: text.max(120).optional(),
    description: z.string().trim().max(500).optional(),
    fields: cardTypeFieldsSchema.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.fields !== undefined,
    { message: "Нет данных для обновления" }
  );

export type CardTypeInput = z.infer<typeof cardTypeInputSchema>;

const customCardSchema = z.object({
  type: z.literal("custom"),
  customTypeId: text,
  title: text.max(200),
  folderId: z.string().trim().optional().default(""),
  owners: z.array(text).min(1, "Укажите хотя бы одного владельца карточки"),
  referenceDescription: z.string().trim().max(10_000).default(""),
  stopFormula: z.string().trim().max(10_000).default(""),
  customFields: z.record(z.string(), z.unknown()).default({}),
});

export const knowledgeCardInputSchema = z.discriminatedUnion("type", [
  projectCardSchema,
  laboratoryCardSchema,
  campusCardSchema,
  customCardSchema,
]);

export type KnowledgeCardInput = z.infer<typeof knowledgeCardInputSchema>;

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function customFieldValueSchema(field: CustomCardField): z.ZodTypeAny {
  let base: z.ZodTypeAny;

  switch (field.type) {
    case "longText":
      base = z.string().trim().max(10_000, "Слишком длинный текст");
      break;
    case "number":
      base = z.number().finite("Введите число");
      break;
    case "date":
      base = z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату в формате ГГГГ-ММ-ДД");
      break;
    case "list":
      base = z.array(z.string().trim().min(1, "Заполните элемент списка"));
      break;
    case "select":
      base = z
        .string()
        .trim()
        .refine(
          (value) => field.options.includes(value),
          "Выберите значение из списка"
        );
      break;
    case "cardReference":
      base = z.string().trim().min(1, "Выберите карточку");
      break;
    default:
      base = z.string().trim().max(1_000, "Слишком длинный текст");
  }

  return z.any().superRefine((value, ctx) => {
    if (isEmptyValue(value)) {
      if (field.required) {
        ctx.addIssue({
          code: "custom",
          message: "Заполните обязательное поле",
        });
      }
      return;
    }

    const parsed = base.safeParse(value);

    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        message: parsed.error.issues[0]?.message ?? "Некорректное значение",
      });
    }
  });
}

export function buildCustomFieldValuesSchema(typeDef: CardTypeDefinition) {
  return z.object(
    Object.fromEntries(
      typeDef.fields.map((field) => [field.id, customFieldValueSchema(field)])
    )
  );
}
