import type { ReadyArticle } from "./articles";
import { createPendingDiskSync, type DiskSyncInfo } from "./disk-sync";
import {
  folderIds,
  getCardTypeLabel,
  getFolderPath,
  getUniversityName,
  type CardTypeDefinition,
  type KnowledgeCard,
} from "./knowledge";

const DISK_API_BASE = "https://cloud-api.yandex.net/v1/disk";
const DISK_ROOT = "disk:";
const REQUEST_TIMEOUT_MS = 30_000;

export const DISK_CARD_SUMMARY_FILE = "_Сводная_таблица_карточек.csv";
export const DISK_ARTICLE_SUMMARY_FILE = "_Сводная_таблица_статей.csv";

export class YandexDiskError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "YandexDiskError";
  }
}

export function isYandexDiskConfigured(): boolean {
  return Boolean(process.env.YANDEX_DISK_OAUTH_TOKEN);
}

function getToken(): string {
  const token = process.env.YANDEX_DISK_OAUTH_TOKEN;

  if (!token) {
    throw new YandexDiskError(
      "Не настроен YANDEX_DISK_OAUTH_TOKEN: выгрузка на Яндекс Диск недоступна."
    );
  }

  return token;
}

function sanitizeFileName(value: string): string {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return cleaned || "without-name";
}

function toDisplayPath(segments: string[]): string {
  return segments.join("/");
}

function toResourcePath(segments: string[]): string {
  return `${DISK_ROOT}/${segments.join("/")}`;
}

export function getCardDiskFolderSegments(card: KnowledgeCard): string[] {
  const path = getFolderPath(card.folderId);

  if (path.length > 0) {
    return path.map((node) => node.name);
  }

  const customPrefix = `${folderIds.customRoot}/`;

  if (card.folderId.startsWith(customPrefix)) {
    return [
      "03_Пользовательские_типы",
      card.folderId.slice(customPrefix.length),
    ];
  }

  return ["99_Прочее"];
}

export function getArticleDiskFolderSegments(article: ReadyArticle): string[] {
  return [
    "01_Вузы_резиденты",
    getUniversityName(article.universityId),
    "Готовые_статьи",
  ];
}

function escapeCsv(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(
  rows: Array<Array<string | number | null | undefined>>
): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(";")).join("\r\n")}\r\n`;
}

function stringifyFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function buildKnowledgeCardMarkdown(
  card: KnowledgeCard,
  customTypes: CardTypeDefinition[] = []
): string {
  const lines: string[] = [
    `# ${card.title}`,
    "",
    `- ID: ${card.id}`,
    `- Тип: ${getCardTypeLabel(card, customTypes)}`,
    `- Папка: ${getCardFolderLabel(card)}`,
    `- Владельцы: ${card.owners.join(", ")}`,
    `- Обновлено: ${card.updatedAt}`,
    "",
    "## Эталонное описание",
    "",
    card.referenceDescription || "Не заполнено.",
    "",
    "## Ограничения для ИИ (стоп-формула)",
    "",
    card.stopFormula || "Не заполнено.",
    "",
  ];

  if (card.type === "project") {
    lines.push(
      "## Параметры проекта",
      "",
      `- Сфера / отрасль: ${card.sphere}`,
      `- Вуз-инициатор: ${getUniversityName(card.initiatorUniversityId)}`,
      `- Соисполнители: ${card.coExecutors.join(", ") || "нет"}`,
      `- Индустриальный партнёр: ${card.industrialPartner}`,
      `- Стадия готовности: ${card.readinessStage}`,
      `- Контур: ${card.contour}`,
      `- Совместный проект: ${card.isJoint ? "да" : "нет"}`,
      `- Вузы-участники: ${
        card.participantUniversityIds.map(getUniversityName).join(", ") || "нет"
      }`,
      "",
      "## Подтверждённые цифры",
      "",
      card.confirmedFigures.length > 0
        ? card.confirmedFigures.map((item) => `- ${item}`).join("\n")
        : "Не указаны.",
      ""
    );
  }

  if (card.type === "laboratory") {
    lines.push(
      "## Параметры лаборатории",
      "",
      `- Принадлежность: ${card.affiliation}`,
      `- Партнёр: ${card.partner}`,
      `- Руководитель: ${card.head}`,
      `- Статус размещения: ${card.placementDetails}`,
      "",
      "## Направления работ",
      "",
      card.workDirections.length > 0
        ? card.workDirections.map((item) => `- ${item}`).join("\n")
        : "Не указаны.",
      "",
      "## Оборудование",
      "",
      card.equipment.length > 0
        ? card.equipment.map((item) => `- ${item}`).join("\n")
        : "Не указано.",
      "",
      "## Подтверждённые показатели",
      "",
      card.confirmedIndicators.length > 0
        ? card.confirmedIndicators.map((item) => `- ${item}`).join("\n")
        : "Не указаны.",
      ""
    );
  }

  if (card.type === "campus") {
    lines.push(
      "## Показатели кампуса",
      "",
      ...card.campusMetrics.map(
        (metric) => `- ${metric.label}: ${metric.value} (${metric.note})`
      ),
      "",
      "## Тарифы",
      "",
      ...card.tariffs.map((tariff) => `- ${tariff.label}: ${tariff.value}`),
      "",
      "## Юридические лица",
      "",
      ...card.legalEntities.map(
        (entity) => `- ${entity.name} — ${entity.role}`
      ),
      "",
      "## Стоп-лист частых ошибок",
      "",
      ...card.stopList.map((item) => `- ${item}`),
      ""
    );
  }

  if (card.type === "custom") {
    const customType = customTypes.find(
      (type) => type.id === card.customTypeId
    );
    const fields = customType?.fields ?? [];

    lines.push("## Поля карточки", "");

    if (fields.length > 0) {
      fields.forEach((field) => {
        lines.push(
          `- ${field.name}: ${stringifyFieldValue(card.customFields[field.id]) || "не заполнено"}`
        );
      });
    } else {
      Object.entries(card.customFields).forEach(([key, value]) => {
        lines.push(`- ${key}: ${stringifyFieldValue(value) || "не заполнено"}`);
      });
    }

    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function getCardFolderLabel(card: KnowledgeCard): string {
  const path = getFolderPath(card.folderId);

  if (path.length > 0) {
    return path.map((node) => node.name).join(" / ");
  }

  return card.folderId;
}

export function buildArticlesSummaryCsv(
  article: ReadyArticle,
  allArticles: ReadyArticle[]
): string {
  const universityId = article.universityId;
  const rows: Array<Array<string | number | null | undefined>> = [
    [
      "ID",
      "Название",
      "Вуз",
      "Проект",
      "Тема",
      "Карточки-источники",
      "Обновлено",
    ],
    ...allArticles
      .filter((item) => item.universityId === universityId)
      .map((item) => [
        item.id,
        item.title,
        getUniversityName(item.universityId),
        item.projectTitle,
        item.topic,
        item.sourceCardTitles.join(", "),
        item.updatedAt,
      ]),
  ];

  return buildCsv(rows);
}

export function buildKnowledgeCardsSummaryCsv(
  card: KnowledgeCard,
  allCards: KnowledgeCard[]
): string {
  const targetFolder = getCardDiskFolderSegments(card).join("/");
  const rows: Array<Array<string | number | null | undefined>> = [
    ["ID", "Название", "Тип", "Папка", "Владельцы", "Обновлено"],
    ...allCards
      .filter(
        (item) => getCardDiskFolderSegments(item).join("/") === targetFolder
      )
      .map((item) => [
        item.id,
        item.title,
        item.type,
        getCardDiskFolderSegments(item).join(" / "),
        item.owners.join(", "),
        item.updatedAt,
      ]),
  ];

  return buildCsv(rows);
}

export function buildArticleMarkdown(article: ReadyArticle): string {
  const lines: string[] = [`# ${article.title}`, "", article.lead, ""];

  article.sections.forEach((section) => {
    lines.push(`${section.level === 3 ? "###" : "##"} ${section.heading}`, "");
    section.chunks.forEach((chunk) => {
      lines.push(chunk.content, "");
    });
  });

  lines.push(
    "## Карточки-источники",
    "",
    article.sourceCardTitles.length > 0
      ? article.sourceCardTitles.map((title) => `- ${title}`).join("\n")
      : "Источники не указаны.",
    ""
  );

  return `${lines.join("\n").trim()}\n`;
}

function describeDiskError(error: unknown): string {
  if (error instanceof YandexDiskError) {
    if (error.status === 401) {
      return "Яндекс Диск отклонил токен YANDEX_DISK_OAUTH_TOKEN. Проверьте права доступа.";
    }
    if (error.status === 403) {
      return "У токена нет прав на запись в указанную папку Яндекс Диска.";
    }
    if (error.status === 507) {
      return "На Яндекс Диске закончилось место.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return `Не удалось связаться с Яндекс Диском: ${error.message}`;
  }

  return "Не удалось связаться с Яндекс Диском.";
}

async function diskRequest(
  token: string,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      headers: {
        Authorization: `OAuth ${token}`,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new YandexDiskError(describeDiskError(error));
  }
}

async function ensureFolder(token: string, segments: string[]): Promise<void> {
  let current = DISK_ROOT;

  for (const segment of segments) {
    current = `${current}/${segment}`;
    const response = await diskRequest(
      token,
      `${DISK_API_BASE}/resources?path=${encodeURIComponent(current)}`,
      { method: "PUT" }
    );

    if (!response.ok && response.status !== 409) {
      const details = await response.text().catch(() => "");
      throw new YandexDiskError(
        `Не удалось создать папку «${current}»${
          details ? `: ${details.slice(0, 300)}` : ""
        }`,
        response.status
      );
    }
  }
}

async function uploadFile(
  token: string,
  segments: string[],
  fileName: string,
  content: string,
  contentType: string
): Promise<string> {
  await ensureFolder(token, segments);

  const resourcePath = toResourcePath([...segments, fileName]);
  const uploadResponse = await diskRequest(
    token,
    `${DISK_API_BASE}/resources/upload?path=${encodeURIComponent(
      resourcePath
    )}&overwrite=true`,
    { method: "GET" }
  );

  if (!uploadResponse.ok) {
    const details = await uploadResponse.text().catch(() => "");
    throw new YandexDiskError(
      `Не удалось получить ссылку для загрузки «${fileName}»${
        details ? `: ${details.slice(0, 300)}` : ""
      }`,
      uploadResponse.status
    );
  }

  const payload = (await uploadResponse.json().catch(() => null)) as {
    href?: string;
  } | null;

  if (!payload?.href) {
    throw new YandexDiskError(
      `Яндекс Диск не вернул ссылку для загрузки «${fileName}».`
    );
  }

  let fileResponse: Response;

  try {
    fileResponse = await fetch(payload.href, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: content,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new YandexDiskError(describeDiskError(error));
  }

  if (!fileResponse.ok) {
    throw new YandexDiskError(
      `Не удалось загрузить «${fileName}» на Яндекс Диск (${fileResponse.status}).`,
      fileResponse.status
    );
  }

  return toDisplayPath([...segments, fileName]);
}

export async function syncKnowledgeCardToDisk(
  card: KnowledgeCard,
  allCards: KnowledgeCard[],
  customTypes: CardTypeDefinition[] = []
): Promise<DiskSyncInfo> {
  const previous = card.diskSync ?? createPendingDiskSync();
  const attemptedAt = new Date().toISOString();
  const segments = getCardDiskFolderSegments(card);
  const fileName = `${sanitizeFileName(card.title)}.md`;
  const summaryName = DISK_CARD_SUMMARY_FILE;

  try {
    const token = getToken();

    const filePath = await uploadFile(
      token,
      segments,
      fileName,
      buildKnowledgeCardMarkdown(card, customTypes),
      "text/markdown; charset=utf-8"
    );
    const summaryPath = await uploadFile(
      token,
      segments,
      summaryName,
      buildKnowledgeCardsSummaryCsv(card, allCards),
      "text/csv; charset=utf-8"
    );

    return {
      status: "synced",
      lastAttemptAt: attemptedAt,
      lastSyncedAt: attemptedAt,
      message: null,
      folderPath: toDisplayPath(segments),
      filePath,
      summaryPath,
    };
  } catch (error) {
    return {
      status: "failed",
      lastAttemptAt: attemptedAt,
      lastSyncedAt: previous.lastSyncedAt ?? null,
      message: describeDiskError(error),
      folderPath: toDisplayPath(segments),
      filePath: toDisplayPath([...segments, fileName]),
      summaryPath: toDisplayPath([...segments, summaryName]),
    };
  }
}

export async function syncArticleToDisk(
  article: ReadyArticle,
  allArticles: ReadyArticle[]
): Promise<DiskSyncInfo> {
  const previous = article.diskSync ?? createPendingDiskSync();
  const attemptedAt = new Date().toISOString();
  const segments = getArticleDiskFolderSegments(article);
  const fileName = `${sanitizeFileName(article.title)}.md`;
  const summaryName = DISK_ARTICLE_SUMMARY_FILE;

  try {
    const token = getToken();

    const filePath = await uploadFile(
      token,
      segments,
      fileName,
      buildArticleMarkdown(article),
      "text/markdown; charset=utf-8"
    );
    const summaryPath = await uploadFile(
      token,
      segments,
      summaryName,
      buildArticlesSummaryCsv(article, allArticles),
      "text/csv; charset=utf-8"
    );

    return {
      status: "synced",
      lastAttemptAt: attemptedAt,
      lastSyncedAt: attemptedAt,
      message: null,
      folderPath: toDisplayPath(segments),
      filePath,
      summaryPath,
    };
  } catch (error) {
    return {
      status: "failed",
      lastAttemptAt: attemptedAt,
      lastSyncedAt: previous.lastSyncedAt ?? null,
      message: describeDiskError(error),
      folderPath: toDisplayPath(segments),
      filePath: toDisplayPath([...segments, fileName]),
      summaryPath: toDisplayPath([...segments, summaryName]),
    };
  }
}
