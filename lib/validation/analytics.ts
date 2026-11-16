import { z } from "zod";

export const analyticsQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Опишите запрос к базе хотя бы тремя символами")
    .max(500, "Запрос слишком длинный: сократите его до 500 символов"),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
