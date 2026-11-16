import { z } from "zod";

export const factCheckInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(20, "Вставьте текст для проверки")
    .max(60_000, "Текст слишком длинный: сократите черновик"),
  mode: z.enum(["check", "rewrite"]).default("check"),
});

export type FactCheckInput = z.infer<typeof factCheckInputSchema>;
