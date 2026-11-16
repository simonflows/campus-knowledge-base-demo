import { z } from "zod";

import { AI_PROVIDER_CHOICES } from "@/lib/ai-providers";

export const articleChunkSchema = z.object({
  id: z.string().trim().min(1),
  content: z.string().trim().min(1).max(4_000),
});

export const articleSectionSchema = z.object({
  id: z.string().trim().min(1),
  heading: z.string().trim().min(1).max(300),
  level: z.union([z.literal(2), z.literal(3)]),
  chunks: z.array(articleChunkSchema).min(1).max(12),
});

export const generatedArticleSchema = z.object({
  title: z.string().trim().min(1).max(240),
  lead: z.string().trim().min(1).max(4_000),
  sections: z.array(articleSectionSchema).min(1).max(20),
  sourceCardIds: z.array(z.string().trim().min(1)).default([]),
  sourceCardTitles: z.array(z.string().trim().min(1)).default([]),
  projectTitle: z.string().trim().max(240).default(""),
  topic: z.string().trim().max(240).default(""),
  suggestedUniversityId: z.string().trim().nullable().default(null),
  noData: z.boolean().default(false),
  noDataMessage: z.string().trim().max(1_000).nullable().default(null),
  usedArticleIds: z.array(z.string().trim().min(1)).default([]),
});

export const generateArticleInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(10, "Опишите задачу подробнее")
    .max(2_000, "Слишком длинный запрос"),
  provider: z.enum(AI_PROVIDER_CHOICES).default("auto"),
  basis: z
    .object({
      articleId: z.string().trim().min(1),
      chunkIds: z.array(z.string().trim().min(1)).min(1),
    })
    .optional(),
});

export const saveArticleInputSchema = z.object({
  title: z.string().trim().min(1).max(240),
  lead: z.string().trim().min(1).max(4_000),
  sections: z.array(articleSectionSchema).min(1).max(20),
  sourceCardIds: z.array(z.string().trim().min(1)).default([]),
  sourceCardTitles: z.array(z.string().trim().min(1)).default([]),
  universityId: z.string().trim().min(1, "Выберите вуз"),
  projectTitle: z.string().trim().max(240).default(""),
  topic: z.string().trim().max(240).default(""),
  query: z.string().trim().max(2_000).default(""),
});

export type GenerateArticleInput = z.infer<typeof generateArticleInputSchema>;
export type SaveArticleInput = z.infer<typeof saveArticleInputSchema>;
export type GeneratedArticlePayload = z.infer<typeof generatedArticleSchema>;
