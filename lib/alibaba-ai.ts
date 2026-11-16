import { demoAccounts } from "./auth";
import type { KnowledgeCard } from "./knowledge";
import type { YandexAiMessage } from "./yandex-ai";

export const DEFAULT_ALIBABA_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
export const DEFAULT_ALIBABA_MODEL = "qwen-plus";

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^\[::1\]$/,
  /^fc00:/i,
  /^fe80:/i,
];

export function validateExternalHttpsUrl(rawUrl: string): {
  valid: boolean;
  reason?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: "Некорректный формат URL" };
  }

  if (parsed.protocol !== "https:") {
    return {
      valid: false,
      reason: "Endpoint Alibaba Cloud должен использовать протокол https://",
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return {
      valid: false,
      reason: "Локальные и внутренние адреса запрещены для внешнего API",
    };
  }

  return { valid: true };
}

export class MissingAlibabaCredentialsError extends Error {
  constructor() {
    super(
      "Не настроен ключ Alibaba Cloud Model Studio: ALIBABA_DASHSCOPE_API_KEY"
    );
    this.name = "MissingAlibabaCredentialsError";
  }
}

export class AlibabaAiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "AlibabaAiError";
  }
}

export function isAlibabaAiConfigured(): boolean {
  return Boolean(process.env.ALIBABA_DASHSCOPE_API_KEY);
}

export function getAlibabaAiConfig() {
  return {
    configured: isAlibabaAiConfigured(),
    baseUrl: process.env.ALIBABA_DASHSCOPE_BASE_URL || DEFAULT_ALIBABA_BASE_URL,
    modelName: process.env.ALIBABA_MODEL_NAME || DEFAULT_ALIBABA_MODEL,
  };
}

const KNOWN_PERSONAL_NAMES = Array.from(
  new Set(
    demoAccounts
      .flatMap((account) => [account.name, ...account.ownerAliases])
      .filter((name) => name.trim().includes(" ") && name !== "Администратор канона")
  )
);

/**
 * Обезличивание персональных данных по 152-ФЗ перед отправкой в Alibaba Cloud Model Studio.
 * Удаляет email, телефоны, строки владельцев/руководителей и известные ФИО участников.
 */
export function sanitizeTextFor152FZ(text: string): string {
  let sanitized = text
    .replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "[email обезличен по 152-ФЗ]"
    )
    .replace(
      /(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g,
      "[телефон обезличен по 152-ФЗ]"
    )
    .replace(
      /((?:Владельцы|Руководитель)\s*:\s*)([^\n]+)/gi,
      "$1[данные обезличены по 152-ФЗ]"
    );

  for (const fullName of KNOWN_PERSONAL_NAMES) {
    const escaped = fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    sanitized = sanitized.replace(
      new RegExp(escaped, "gi"),
      "[представитель обезличен по 152-ФЗ]"
    );
  }

  return sanitized;
}

export function sanitizeCardFor152FZ(card: KnowledgeCard): KnowledgeCard {
  const anonymizedOwners = card.owners.map((owner, index) => {
    const parts = owner.split(",");
    const org = parts.slice(1).join(",").trim();
    return org
      ? `Ответственный представитель #${index + 1} (${org}) [ПДн скрыты по 152-ФЗ]`
      : `Ответственный представитель #${index + 1} [ПДн скрыты по 152-ФЗ]`;
  });

  const baseSanitized = {
    ...card,
    owners: anonymizedOwners,
    submittedBy: undefined,
    submittedByName: undefined,
    reviewedBy: undefined,
    referenceDescription: sanitizeTextFor152FZ(card.referenceDescription),
    stopFormula: sanitizeTextFor152FZ(card.stopFormula),
  };

  if (baseSanitized.type === "laboratory") {
    return {
      ...baseSanitized,
      head: `Руководитель лаборатории (${baseSanitized.affiliation}) [ПДн скрыты по 152-ФЗ]`,
    };
  }

  return baseSanitized;
}

export async function callAlibabaAi(
  messages: YandexAiMessage[],
  options: { temperature?: number; maxTokens?: number; model?: string } = {}
): Promise<string> {
  const apiKey = process.env.ALIBABA_DASHSCOPE_API_KEY;

  if (!apiKey) {
    throw new MissingAlibabaCredentialsError();
  }

  const baseUrl = (
    process.env.ALIBABA_DASHSCOPE_BASE_URL || DEFAULT_ALIBABA_BASE_URL
  ).replace(/\/$/, "");
  const urlCheck = validateExternalHttpsUrl(baseUrl);
  if (!urlCheck.valid) {
    throw new AlibabaAiError(urlCheck.reason || "Недопустимый URL Alibaba Cloud");
  }

  const model =
    options.model || process.env.ALIBABA_MODEL_NAME || DEFAULT_ALIBABA_MODEL;

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.05,
        max_tokens: options.maxTokens ?? 4_000,
        messages: messages.map((message) => ({
          role: message.role,
          content: sanitizeTextFor152FZ(message.text),
        })),
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new AlibabaAiError(
      error instanceof Error
        ? `Не удалось связаться с Alibaba Cloud Model Studio: ${error.message}`
        : "Не удалось связаться с Alibaba Cloud Model Studio"
    );
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new AlibabaAiError(
      `Alibaba Cloud Model Studio вернул ошибку ${response.status}${
        details ? `: ${details.slice(0, 500)}` : ""
      }`,
      response.status
    );
  }

  const data = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new AlibabaAiError("Alibaba Cloud Model Studio вернул пустой ответ");
  }

  return text;
}
