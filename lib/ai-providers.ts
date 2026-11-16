import {
  callAlibabaAi,
  getAlibabaAiConfig,
  isAlibabaAiConfigured,
} from "./alibaba-ai";
import {
  callYandexAi,
  getYandexAiConfig,
  isYandexAiConfigured,
  type YandexAiMessage,
} from "./yandex-ai";

export const AI_PROVIDER_CHOICES = [
  "auto",
  "yandex",
  "alibaba",
  "canonical",
] as const;

export type AiProviderChoice = (typeof AI_PROVIDER_CHOICES)[number];

export type ResolvedAiProvider = "yandex" | "alibaba" | "canonical";

export interface AiExecutionResult {
  text: string | null;
  provider: ResolvedAiProvider;
  modelLabel: string;
  latencyMs: number;
  anonymized152FZ: boolean;
  fallbackReason: string | null;
}

export async function runWithAiProvider(
  messages: YandexAiMessage[],
  requested: AiProviderChoice = "auto",
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<AiExecutionResult> {
  const startedAt = Date.now();
  const yandexCfg = getYandexAiConfig();
  const alibabaCfg = getAlibabaAiConfig();

  const tryYandex = async (): Promise<AiExecutionResult> => {
    const text = await callYandexAi(messages, {
      temperature: options.temperature ?? 0.05,
      maxTokens: options.maxTokens ?? 4_000,
    });
    return {
      text,
      provider: "yandex",
      modelLabel: `Yandex AI Studio (${yandexCfg.modelUri.split("/").slice(-2).join("/")})`,
      latencyMs: Date.now() - startedAt,
      anonymized152FZ: false,
      fallbackReason: null,
    };
  };

  const tryAlibaba = async (): Promise<AiExecutionResult> => {
    const text = await callAlibabaAi(messages, {
      temperature: options.temperature ?? 0.05,
      maxTokens: options.maxTokens ?? 4_000,
    });
    return {
      text,
      provider: "alibaba",
      modelLabel: `Alibaba Cloud Model Studio (${alibabaCfg.modelName})`,
      latencyMs: Date.now() - startedAt,
      anonymized152FZ: true,
      fallbackReason: null,
    };
  };

  if (requested === "canonical") {
    return {
      text: null,
      provider: "canonical",
      modelLabel: "Канонический движок (локальная сборка без LLM)",
      latencyMs: Date.now() - startedAt,
      anonymized152FZ: false,
      fallbackReason: null,
    };
  }

  if (requested === "yandex") {
    if (!isYandexAiConfigured()) {
      return {
        text: null,
        provider: "canonical",
        modelLabel: "Канонический движок (резерв: нет ключей Yandex AI Studio)",
        latencyMs: Date.now() - startedAt,
        anonymized152FZ: false,
        fallbackReason:
          "Ключи YANDEX_AI_STUDIO_API_KEY и YANDEX_AI_STUDIO_FOLDER_ID не заданы — выполнена строгая детерминированная сборка из карточек.",
      };
    }

    try {
      return await tryYandex();
    } catch (error) {
      return {
        text: null,
        provider: "canonical",
        modelLabel: "Канонический движок (резерв после сбоя Yandex AI)",
        latencyMs: Date.now() - startedAt,
        anonymized152FZ: false,
        fallbackReason:
          error instanceof Error
            ? error.message
            : "Ошибка обращения к Yandex AI Studio",
      };
    }
  }

  if (requested === "alibaba") {
    if (!isAlibabaAiConfigured()) {
      return {
        text: null,
        provider: "canonical",
        modelLabel: "Канонический движок (резерв: нет ключа Alibaba Cloud)",
        latencyMs: Date.now() - startedAt,
        anonymized152FZ: true,
        fallbackReason:
          "Ключ ALIBABA_DASHSCOPE_API_KEY не задан — выполнена строгая детерминированная сборка (данные обезличены по 152-ФЗ).",
      };
    }

    try {
      return await tryAlibaba();
    } catch (error) {
      return {
        text: null,
        provider: "canonical",
        modelLabel: "Канонический движок (резерв после сбоя Alibaba Cloud)",
        latencyMs: Date.now() - startedAt,
        anonymized152FZ: true,
        fallbackReason:
          error instanceof Error
            ? error.message
            : "Ошибка обращения к Alibaba Cloud Model Studio",
      };
    }
  }

  // requested === "auto": строго контур РФ 152-ФЗ (Yandex AI Studio → канонический движок).
  // Alibaba Cloud Model Studio (зарубежный контур) запускается только при явном выборе requested === "alibaba".
  if (isYandexAiConfigured()) {
    try {
      return await tryYandex();
    } catch (error) {
      const yandexReason =
        error instanceof Error ? error.message : "Сбой Yandex AI Studio";
      return {
        text: null,
        provider: "canonical",
        modelLabel: "Канонический движок (резерв 152-ФЗ)",
        latencyMs: Date.now() - startedAt,
        anonymized152FZ: false,
        fallbackReason: yandexReason,
      };
    }
  }

  return {
    text: null,
    provider: "canonical",
    modelLabel: "Канонический движок (локальная сборка 152-ФЗ без LLM)",
    latencyMs: Date.now() - startedAt,
    anonymized152FZ: false,
    fallbackReason:
      "Ключи Yandex AI Studio не настроены — материал собран локальным движком строго из канонических карточек.",
  };
}
