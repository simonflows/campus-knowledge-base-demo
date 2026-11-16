export type YandexAiMessage = {
  role: "system" | "user" | "assistant";
  text: string;
};

export class MissingYandexCredentialsError extends Error {
  constructor() {
    super(
      "Не настроены ключи Yandex AI Studio: YANDEX_AI_STUDIO_API_KEY и YANDEX_AI_STUDIO_FOLDER_ID"
    );
    this.name = "MissingYandexCredentialsError";
  }
}

export class YandexAiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "YandexAiError";
  }
}

export function isYandexAiConfigured(): boolean {
  return Boolean(
    process.env.YANDEX_AI_STUDIO_API_KEY &&
      process.env.YANDEX_AI_STUDIO_FOLDER_ID
  );
}

export function getYandexAiConfig() {
  const folderId = process.env.YANDEX_AI_STUDIO_FOLDER_ID ?? "";
  const modelUri =
    process.env.YANDEX_AI_STUDIO_MODEL_URI ??
    (folderId ? `gpt://${folderId}/yandexgpt/latest` : "gpt://<folder_id>/yandexgpt/latest");

  return {
    configured: isYandexAiConfigured(),
    hasApiKey: Boolean(process.env.YANDEX_AI_STUDIO_API_KEY),
    hasFolderId: Boolean(folderId),
    modelUri,
  };
}

export async function callYandexAi(
  messages: YandexAiMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.YANDEX_AI_STUDIO_API_KEY;
  const folderId = process.env.YANDEX_AI_STUDIO_FOLDER_ID;

  if (!apiKey || !folderId) {
    throw new MissingYandexCredentialsError();
  }

  const modelUri =
    process.env.YANDEX_AI_STUDIO_MODEL_URI ??
    `gpt://${folderId}/yandexgpt/latest`;

  let response: Response;

  try {
    response = await fetch(
      "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
      {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelUri,
          completionOptions: {
            stream: false,
            temperature: options.temperature ?? 0.05,
            maxTokens: String(options.maxTokens ?? 4_000),
          },
          messages,
        }),
        signal: AbortSignal.timeout(60_000),
      }
    );
  } catch (error) {
    throw new YandexAiError(
      error instanceof Error
        ? `Не удалось связаться с Yandex AI Studio: ${error.message}`
        : "Не удалось связаться с Yandex AI Studio"
    );
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new YandexAiError(
      `Yandex AI Studio вернул ошибку ${response.status}${
        details ? `: ${details.slice(0, 500)}` : ""
      }`,
      response.status
    );
  }

  const data = (await response.json().catch(() => null)) as {
    result?: {
      alternatives?: Array<{ message?: { text?: string } }>;
    };
  } | null;

  const text = data?.result?.alternatives?.[0]?.message?.text?.trim();

  if (!text) {
    throw new YandexAiError("Yandex AI Studio вернул пустой ответ");
  }

  return text;
}
