"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

import { DEFAULT_ALIBABA_BASE_URL, DEFAULT_ALIBABA_MODEL, sanitizeCardFor152FZ, validateExternalHttpsUrl } from "@/lib/alibaba-ai";
import { buildAnalyticsReport } from "@/lib/analytics";
import { DEMO_ARTICLE_IDS, flattenArticleChunks, isDemoArticle, type ReadyArticle } from "@/lib/articles";
import { FACT_CHECK_PRESETS } from "@/lib/audit-canon-registry";
import {
  canConfirmJointParticipation,
  canCreateCard,
  canEditCard,
  canManageTypes,
  canModerate,
  canRequestEdit,
  canSeeCard,
  getDemoAccount,
  getUserOwnershipLabel,
  isCardOwner,
  roleLabels,
  toSessionUser,
  type SessionUser,
} from "@/lib/auth";
import { createPendingDiskSync, type DiskSyncInfo } from "@/lib/disk-sync";
import {
  buildDeterministicArticleDraft,
  buildNoDataDraft,
  getBasisChunks,
  selectRelevantArticles,
  selectRelevantCards,
} from "@/lib/editor";
import { buildCanonicalRewrite, checkFactText } from "@/lib/fact-check";
import {
  folderIds,
  getCardStatus,
  getUniversityById,
  isJointFullyApproved,
  isJointProject,
  knowledgeSeedCards,
  type CardEditRequest,
  type CardTypeDefinition,
  type CardTypeWithStats,
  type KnowledgeCard,
} from "@/lib/knowledge";
import { articleSeed } from "@/lib/articles";
import { editRequestCreateSchema, editRequestUpdateSchema, loginSchema, moderationActionSchema } from "@/lib/validation/access";
import { analyticsQuerySchema } from "@/lib/validation/analytics";
import { generateArticleInputSchema, saveArticleInputSchema } from "@/lib/validation/articles";
import { factCheckInputSchema } from "@/lib/validation/fact-check";
import { buildCustomFieldValuesSchema, cardTypeInputSchema, cardTypeUpdateSchema, knowledgeCardInputSchema } from "@/lib/validation/knowledge";

const STORAGE_KEY = "campus-south-ural-demo-v1";

export type DemoKeysConfig = {
  YANDEX_AI_STUDIO_API_KEY: string;
  YANDEX_AI_STUDIO_FOLDER_ID: string;
  YANDEX_AI_STUDIO_MODEL_URI: string;
  YANDEX_DISK_OAUTH_TOKEN: string;
  ALIBABA_DASHSCOPE_API_KEY: string;
  ALIBABA_DASHSCOPE_BASE_URL: string;
  ALIBABA_MODEL_NAME: string;
};

export type DemoStoreState = {
  accountId: string | null;
  cards: KnowledgeCard[];
  cardTypes: CardTypeDefinition[];
  articles: ReadyArticle[];
  keys: DemoKeysConfig;
  revision: number;
  resetEpoch?: number;
};

function createInitialState(): DemoStoreState {
  return {
    accountId: "demo-admin",
    cards: structuredClone(knowledgeSeedCards),
    cardTypes: [],
    articles: structuredClone(articleSeed),
    keys: {
      YANDEX_AI_STUDIO_API_KEY: "",
      YANDEX_AI_STUDIO_FOLDER_ID: "",
      YANDEX_AI_STUDIO_MODEL_URI: "",
      YANDEX_DISK_OAUTH_TOKEN: "",
      ALIBABA_DASHSCOPE_API_KEY: "",
      ALIBABA_DASHSCOPE_BASE_URL: DEFAULT_ALIBABA_BASE_URL,
      ALIBABA_MODEL_NAME: DEFAULT_ALIBABA_MODEL,
    },
    revision: 0,
    resetEpoch: 0,
  };
}

const SERVER_SNAPSHOT: DemoStoreState = createInitialState();
let memoryState: DemoStoreState = createInitialState();
let loadedFromStorage = false;
const listeners = new Set<() => void>();

function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getClientSnapshot(): DemoStoreState {
  return loadState();
}

function getServerSnapshot(): DemoStoreState {
  return SERVER_SNAPSHOT;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function loadState(): DemoStoreState {
  if (typeof window === "undefined") return memoryState;
  if (loadedFromStorage) return memoryState;
  loadedFromStorage = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryState;
    const parsed = JSON.parse(raw) as Partial<DemoStoreState>;
    const initial = createInitialState();
    memoryState = {
      accountId: parsed.accountId === undefined ? "demo-admin" : parsed.accountId,
      cards: Array.isArray(parsed.cards) ? parsed.cards : initial.cards,
      cardTypes: Array.isArray(parsed.cardTypes) ? parsed.cardTypes : initial.cardTypes,
      articles: Array.isArray(parsed.articles) ? parsed.articles : initial.articles,
      keys: { ...initial.keys, ...(parsed.keys ?? {}) },
      revision: typeof parsed.revision === "number" ? parsed.revision : 1,
    };
  } catch {
    memoryState = createInitialState();
  }
  return memoryState;
}

function saveState(next: DemoStoreState): DemoStoreState {
  memoryState = { ...next, revision: next.revision + 1 };
  loadedFromStorage = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
    } catch {
      // Ignore quota errors in restricted browsing modes.
    }
  }
  notify();
  return memoryState;
}

export function resetDemoStore(): void {
  const fresh = createInitialState();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage clear errors.
    }
  }
  memoryState = {
    ...fresh,
    revision: memoryState.revision + 1,
    resetEpoch: (memoryState.resetEpoch ?? 0) + 1,
  };
  loadedFromStorage = true;
  notify();
}

export function getDemoSessionUser(state: DemoStoreState = loadState()): SessionUser | null {
  const acc = getDemoAccount(state.accountId);
  return acc ? toSessionUser(acc) : null;
}

export function getDemoCardTypesWithStats(state: DemoStoreState): CardTypeWithStats[] {
  const counts: Record<string, number> = {};
  for (const card of state.cards) {
    if (card.type === "custom" && card.customTypeId) {
      counts[card.customTypeId] = (counts[card.customTypeId] ?? 0) + 1;
    }
  }
  return state.cardTypes.map((type) => ({
    ...type,
    cardCount: counts[type.id] ?? 0,
  }));
}

export function buildDemoSystemStatus(state: DemoStoreState = loadState()) {
  const folderId = state.keys.YANDEX_AI_STUDIO_FOLDER_ID.trim();
  const yandexConfigured = Boolean(state.keys.YANDEX_AI_STUDIO_API_KEY.trim() && folderId);
  const alibabaConfigured = Boolean(state.keys.ALIBABA_DASHSCOPE_API_KEY.trim());
  const yandexDiskConfigured = Boolean(state.keys.YANDEX_DISK_OAUTH_TOKEN.trim());

  return {
    storageMode: "local-json",
    yandexAi: {
      configured: yandexConfigured,
      hasApiKey: Boolean(state.keys.YANDEX_AI_STUDIO_API_KEY.trim()),
      hasFolderId: Boolean(folderId),
      modelUri:
        state.keys.YANDEX_AI_STUDIO_MODEL_URI.trim() ||
        (folderId ? `gpt://${folderId}/yandexgpt/latest` : "gpt://<folder_id>/yandexgpt/latest"),
    },
    alibabaAi: {
      configured: alibabaConfigured,
      modelName: state.keys.ALIBABA_MODEL_NAME || DEFAULT_ALIBABA_MODEL,
      baseUrl: state.keys.ALIBABA_DASHSCOPE_BASE_URL || DEFAULT_ALIBABA_BASE_URL,
    },
    yandexDisk: {
      configured: yandexDiskConfigured,
    },
    fz152Compliant: true,
    timestamp: new Date().toISOString(),
  };
}

export function useDemoStore() {
  const state = useSyncExternalStore(
    subscribeStore,
    getClientSnapshot,
    getServerSnapshot
  );
  const hydrated = state !== SERVER_SNAPSHOT;

  const user = getDemoSessionUser(state);
  const visibleCards = state.cards.filter((card) => canSeeCard(user, card));
  const customTypes = getDemoCardTypesWithStats(state);
  const articles = [...state.articles].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    hydrated,
    state,
    user,
    cards: visibleCards,
    allCards: state.cards,
    customTypes,
    articles,
    systemStatus: buildDemoSystemStatus(state),
  };
}

function jsonResp(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeSyncedInfo(folderPath: string, fileName: string, summaryName: string): DiskSyncInfo {
  const now = new Date().toISOString();
  return {
    status: "synced",
    lastAttemptAt: now,
    lastSyncedAt: now,
    message: "Демо-режим: файл сформирован для резервной структуры папок",
    folderPath,
    filePath: `${folderPath}/${fileName}`,
    summaryPath: `${folderPath}/${summaryName}`,
  };
}

function extractUniversityFolderId(folderId: string): string | null {
  const match = /^01_universities\/([^/]+)/.exec(folderId);
  return match?.[1] ?? null;
}

const updateKeysSchema = z.object({
  YANDEX_AI_STUDIO_API_KEY: z.string().trim().max(500).optional(),
  YANDEX_AI_STUDIO_FOLDER_ID: z.string().trim().max(200).optional(),
  YANDEX_AI_STUDIO_MODEL_URI: z.string().trim().max(300).optional(),
  YANDEX_DISK_OAUTH_TOKEN: z.string().trim().max(500).optional(),
  ALIBABA_DASHSCOPE_API_KEY: z.string().trim().max(500).optional(),
  ALIBABA_DASHSCOPE_BASE_URL: z.string().trim().max(300).optional(),
  ALIBABA_MODEL_NAME: z.string().trim().max(120).optional(),
  clearKeys: z.array(z.string()).optional(),
});

export async function handleDemoApiFetch(urlInput: string, init?: RequestInit): Promise<Response | null> {
  const parsedUrl = new URL(urlInput, window.location.origin);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  let pathname = parsedUrl.pathname;
  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }
  if (!pathname.startsWith("/api/")) return null;

  const method = (init?.method ?? "GET").toUpperCase();
  const state = loadState();
  const user = getDemoSessionUser(state);
  const approvedCards = state.cards.filter((c) => getCardStatus(c) === "approved");

  let body: unknown = undefined;
  if (typeof init?.body === "string" && init.body.length > 0) {
    try {
      body = JSON.parse(init.body);
    } catch {
      return jsonResp({ error: "Некорректный JSON в теле запроса" }, 400);
    }
  }

  // 1. Auth session
  if (pathname === "/api/auth/session") {
    if (method === "GET") {
      return jsonResp({ user, adminPinRequired: false });
    }
    if (method === "DELETE") {
      saveState({ ...state, accountId: null });
      return jsonResp({ user: null });
    }
    if (method === "POST") {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResp({ error: parsed.error.issues[0]?.message ?? "Выберите аккаунт" }, 400);
      }
      const account = getDemoAccount(parsed.data.accountId);
      if (!account) return jsonResp({ error: "Демонстрационный аккаунт не найден" }, 404);
      saveState({ ...state, accountId: account.id });
      return jsonResp({ user: toSessionUser(account) });
    }
  }

  // 2. Health & System Status
  if (pathname === "/api/health") {
    return jsonResp({ ok: true, mode: "browser-demo" });
  }

  if (pathname === "/api/system/status") {
    if (method === "GET") return jsonResp(buildDemoSystemStatus(state));
    if (method === "POST") {
      if (!user) return jsonResp({ error: "Войдите под аккаунтом Администратора канона" }, 401);
      if (user.role !== "admin") return jsonResp({ error: "Настраивать ключи может только Администратор канона" }, 403);
      const parsed = updateKeysSchema.safeParse(body);
      if (!parsed.success) return jsonResp({ error: "Некорректные параметры ключей" }, 400);
      if (parsed.data.ALIBABA_DASHSCOPE_BASE_URL) {
        const urlCheck = validateExternalHttpsUrl(parsed.data.ALIBABA_DASHSCOPE_BASE_URL);
        if (!urlCheck.valid) return jsonResp({ error: urlCheck.reason }, 400);
      }
      const nextKeys = { ...state.keys };
      for (const k of parsed.data.clearKeys ?? []) {
        if (k in nextKeys) (nextKeys as Record<string, string>)[k] = "";
      }
      for (const k of Object.keys(nextKeys) as Array<keyof DemoKeysConfig>) {
        const val = parsed.data[k];
        if (typeof val === "string" && val.length > 0) nextKeys[k] = val;
      }
      const saved = saveState({ ...state, keys: nextKeys });
      return jsonResp({ ...buildDemoSystemStatus(saved), saved: true });
    }
  }

  // 3. Fact-check
  if (pathname === "/api/fact-check" && method === "POST") {
    const parsed = factCheckInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResp({ error: parsed.error.issues[0]?.message ?? "Проверьте текст и попробуйте снова" }, 400);
    }
    const { text, mode } = parsed.data;
    const result = checkFactText(text, approvedCards);
    if (mode === "check") return jsonResp(result);

    const rewrite = buildCanonicalRewrite(text, approvedCards);
    if (!rewrite) {
      return jsonResp({
        ...result,
        rewrite: null,
        rewriteCheck: null,
        rewriteError: "В канонических карточках нет опоры для переписывания этого текста.",
      });
    }
    const rewriteResult = checkFactText(rewrite.plainText, approvedCards);
    return jsonResp({
      ...result,
      rewrite,
      rewriteCheck: {
        summary: rewriteResult.summary,
        canPublish: rewriteResult.canPublish,
        isClean: rewriteResult.summary.red === 0 && rewriteResult.summary.yellow === 0,
      },
    });
  }

  // 4. Smart Editor Generate
  if (pathname === "/api/editor/generate" && method === "POST") {
    const parsed = generateArticleInputSchema.safeParse(body);
    if (!parsed.success) return jsonResp({ error: "Опишите задачу подробнее" }, 400);
    const { query, basis, provider } = parsed.data;
    const basisArticle = basis ? state.articles.find((a) => a.id === basis.articleId) : undefined;
    const basisChunks = getBasisChunks(basisArticle, basis?.chunkIds);
    const selectedCards = selectRelevantCards(approvedCards, query).map((i) => i.card);
    if (basisArticle) {
      for (const cid of basisArticle.sourceCardIds) {
        const found = approvedCards.find((c) => c.id === cid);
        if (found && !selectedCards.some((c) => c.id === found.id)) selectedCards.push(found);
      }
    }
    if (selectedCards.length === 0) {
      return jsonResp(
        buildNoDataDraft({
          query,
          message:
            "В канонических карточках нет сведений по этому запросу. Уточните вуз, проект или тему: умный редактор не использует общие знания модели.",
        })
      );
    }
    const matchedArticles = selectRelevantArticles(state.articles, query).filter((a) => a.id !== basisArticle?.id);
    const referenceChunks = [...basisChunks, ...matchedArticles.flatMap((a) => flattenArticleChunks(a))].slice(0, 10);
    const draft = buildDeterministicArticleDraft({ query, selectedCards, matchedArticles, referenceChunks });
    const sources = draft.sourceCardIds
      .map((id) => approvedCards.find((c) => c.id === id))
      .filter((c): c is KnowledgeCard => Boolean(c))
      .map((c) => ({ id: c.id, title: c.title, type: c.type, description: c.referenceDescription }));

    const modelLabel =
      provider === "alibaba"
        ? "Alibaba Cloud Qwen (демо-полигон, контакты обезличены)"
        : provider === "yandex"
          ? "Yandex AI Studio (локальный канонический движок демо)"
          : "Канонический движок (детерминированная сборка по карточкам)";

    return jsonResp({
      noData: false,
      noDataMessage: null,
      query,
      article: { ...draft, query },
      sources,
      usedArticles: matchedArticles.map((i) => ({ id: i.id, title: i.title })),
      providerMeta: {
        provider: provider === "alibaba" ? "alibaba" : "canonical",
        modelLabel,
        latencyMs: 12,
        anonymized152FZ: provider === "alibaba",
        fallbackReason:
          provider === "alibaba" || provider === "yandex"
            ? "Статический демо-прототип: для ответа без внешнего сервера использован канонический движок."
            : null,
      },
    });
  }

  // 5. Analytics
  if (pathname === "/api/analytics" && method === "POST") {
    const parsed = analyticsQuerySchema.safeParse(body);
    if (!parsed.success) return jsonResp({ error: parsed.error.issues[0]?.message ?? "Опишите запрос к базе данных" }, 400);
    return jsonResp(buildAnalyticsReport(parsed.data.query, approvedCards));
  }

  // 6. Benchmark
  if (pathname === "/api/benchmark" && method === "POST") {
    const draftToTest = FACT_CHECK_PRESETS[0].text;
    const fc = checkFactText(draftToTest, approvedCards);
    const articleQuery =
      "Напиши статью о сотрудничестве МИДиС и ЮУГМУ по виртуальному травмпункту с опорой на уже вышедший материал ЮУГМУ";
    const selCards = selectRelevantCards(approvedCards, articleQuery).map((i) => i.card);
    const matchArts = selectRelevantArticles(state.articles, articleQuery);
    const refChunks = matchArts.flatMap((a) => flattenArticleChunks(a)).slice(0, 6);
    const artDraft = buildDeterministicArticleDraft({ query: articleQuery, selectedCards: selCards, matchedArticles: matchArts, referenceChunks: refChunks });
    const anQuery = "Собери все проекты взаимодействия вузов с индустриальными партнёрами в сфере медицины";
    const anRep = buildAnalyticsReport(anQuery, approvedCards);
    const sampleCard = approvedCards.find((c) => c.id === "joint-midis-susmu-trauma") ?? approvedCards[0];
    const sampleSan = sampleCard ? sanitizeCardFor152FZ(sampleCard) : null;

    return jsonResp({
      executedAt: new Date().toISOString(),
      livePlatforms: { yandex: false, alibaba: false },
      fz152Preview:
        sampleCard && sampleSan
          ? { cardId: sampleCard.id, originalOwners: sampleCard.owners, anonymizedOwners: sampleSan.owners }
          : null,
      scenarios: [
        {
          id: "fact-check",
          title: "Сценарий 1. Фактчекинг черновика с ошибками (ТЗ + Аудит)",
          input: draftToTest,
          yandex: {
            platform: "yandex",
            platformName: "Yandex AI Studio",
            mode: "demo",
            model: "gpt://<folder_id>/yandexgpt/latest",
            latencyMs: 820,
            fz152Status: "РФ контур (152-ФЗ соблюдён)",
            summary: `Выявлено нарушений: ${fc.summary.red} красных, ${fc.summary.yellow} жёлтых (по каноническому эталону)`,
            excerpt: fc.findings.filter((f) => f.level !== "green").slice(0, 3).map((f) => `• [${f.level.toUpperCase()}] ${f.title} (${f.sourceCardId})`).join("\n"),
            error: null,
          },
          alibaba: {
            platform: "alibaba",
            platformName: "Alibaba Cloud Model Studio",
            mode: "demo",
            model: state.keys.ALIBABA_MODEL_NAME || DEFAULT_ALIBABA_MODEL,
            latencyMs: 940,
            fz152Status: "ПДн обезличены перед отправкой",
            summary: `Выявлено нарушений: ${fc.summary.red} красных, ${fc.summary.yellow} жёлтых (по каноническому эталону)`,
            excerpt: fc.findings.filter((f) => f.level !== "green").slice(0, 3).map((f) => `• [${f.level.toUpperCase()}] ${f.title} (${f.sourceCardId})`).join("\n"),
            error: null,
          },
        },
        {
          id: "article",
          title: "Сценарий 2. Генерация SEO/GEO-статьи чанками (МИДиС + ЮУГМУ)",
          input: articleQuery,
          yandex: {
            platform: "yandex",
            platformName: "Yandex AI Studio",
            mode: "demo",
            model: "gpt://<folder_id>/yandexgpt/latest",
            latencyMs: 1650,
            fz152Status: "РФ контур (152-ФЗ)",
            summary: `H1 + лид (${artDraft.lead.length} зн.) + ${artDraft.sections.length} чанков по SEO/GEO`,
            excerpt: `${artDraft.title}\n\n${artDraft.lead}`,
            error: null,
          },
          alibaba: {
            platform: "alibaba",
            platformName: "Alibaba Cloud Model Studio",
            mode: "demo",
            model: state.keys.ALIBABA_MODEL_NAME || DEFAULT_ALIBABA_MODEL,
            latencyMs: 1420,
            fz152Status: "ПДн обезличены (152-ФЗ)",
            summary: `H1 + лид (${artDraft.lead.length} зн.) + ${artDraft.sections.length} чанков по SEO/GEO`,
            excerpt: `${artDraft.title}\n\n${artDraft.lead}`,
            error: null,
          },
        },
        {
          id: "analytics",
          title: "Сценарий 3. Сборная аналитика по отрасли (Медицина)",
          input: anQuery,
          yandex: {
            platform: "yandex",
            platformName: "Yandex AI Studio",
            mode: "demo",
            model: "gpt://<folder_id>/yandexgpt/latest",
            latencyMs: 540,
            fz152Status: "РФ контур (152-ФЗ)",
            summary: `Найдено карточек: ${anRep.summary.total} (совместных: ${anRep.summary.jointProjects})`,
            excerpt: anRep.cards.map((r) => `• ${r.title} (${r.universities.join(", ")}) — партнёр: ${r.partner}, статус: ${r.status}`).join("\n"),
            error: null,
          },
          alibaba: {
            platform: "alibaba",
            platformName: "Alibaba Cloud Model Studio",
            mode: "demo",
            model: state.keys.ALIBABA_MODEL_NAME || DEFAULT_ALIBABA_MODEL,
            latencyMs: 610,
            fz152Status: "Открытые поля без ПДн",
            summary: `Найдено карточек: ${anRep.summary.total} (совместных: ${anRep.summary.jointProjects})`,
            excerpt: anRep.cards.map((r) => `• ${r.title} (${r.universities.join(", ")}) — партнёр: ${r.partner}, статус: ${r.status}`).join("\n"),
            error: null,
          },
        },
      ],
    });
  }

  // 7. Articles CRUD & Sync
  if (pathname === "/api/articles") {
    if (method === "GET") {
      return jsonResp([...state.articles].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
    if (method === "POST") {
      if (!user) return jsonResp({ error: "Войдите под демонстрационным аккаунтом" }, 401);
      if (user.role === "guest") return jsonResp({ error: "Гость не может сохранять статьи" }, 403);
      const parsed = saveArticleInputSchema.safeParse(body);
      if (!parsed.success) return jsonResp({ error: "Проверьте статью перед сохранением" }, 400);
      if (!getUniversityById(parsed.data.universityId)) return jsonResp({ error: "Выберите вуз из списка резидентов" }, 400);
      if (user.role !== "admin" && (user.role === "university_owner" || user.role === "university_pr") && user.universityId && parsed.data.universityId !== user.universityId) {
        return jsonResp({ error: "Представитель вуза может сохранять статью только в папку своего университета" }, 403);
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const article: ReadyArticle = {
        ...parsed.data,
        id,
        createdAt: now,
        updatedAt: now,
        diskSync: makeSyncedInfo(`01_Вузы_резиденты/${parsed.data.universityId}/Готовые_статьи`, `${id}.md`, "articles.csv"),
      };
      saveState({ ...state, articles: [article, ...state.articles] });
      return jsonResp(article, 201);
    }
    if (method === "DELETE") {
      if (!user) return jsonResp({ error: "Войдите под демонстрационным аккаунтом" }, 401);
      if (user.role === "guest") return jsonResp({ error: "Гость не может удалять статьи" }, 403);
      const scope = parsedUrl.searchParams.get("scope");
      if (scope === "demo") {
        if (user.role !== "admin") return jsonResp({ error: "Очищать стартовые демо-статьи может только администратор канона" }, 403);
        const remaining = state.articles.filter((a) => !isDemoArticle(a.id));
        const removed = DEMO_ARTICLE_IDS.length ? state.articles.length - remaining.length : 0;
        saveState({ ...state, articles: remaining });
        return jsonResp({ success: true, clearedDemo: true, removed });
      }
      const id = parsedUrl.searchParams.get("id");
      if (!id) return jsonResp({ error: "Параметр id обязателен" }, 400);
      const existing = state.articles.find((a) => a.id === id);
      if (!existing) return jsonResp({ error: "Статья не найдена" }, 404);
      const canDel = user.role === "admin" || (Boolean(user.universityId) && (user.role === "university_owner" || user.role === "university_pr") && existing.universityId === user.universityId);
      if (!canDel) return jsonResp({ error: "Удалять статьи могут только администратор или представители вуза-автора" }, 403);
      saveState({ ...state, articles: state.articles.filter((a) => a.id !== id) });
      return jsonResp({ success: true });
    }
  }

  const artMatch = /^\/api\/articles\/([^/]+)(\/sync)?$/.exec(pathname);
  if (artMatch) {
    const id = decodeURIComponent(artMatch[1]);
    const isSync = Boolean(artMatch[2]);
    const existing = state.articles.find((a) => a.id === id);
    if (!existing) return jsonResp({ error: "Статья не найдена" }, 404);
    if (!user) return jsonResp({ error: "Войдите под демонстрационным аккаунтом" }, 401);
    if (user.role === "guest") return jsonResp({ error: "Гость не может изменять статьи" }, 403);

    if (isSync && method === "POST") {
      const updated: ReadyArticle = {
        ...existing,
        diskSync: makeSyncedInfo(`01_Вузы_резиденты/${existing.universityId}/Готовые_статьи`, `${id}.md`, "articles.csv"),
      };
      saveState({ ...state, articles: state.articles.map((a) => (a.id === id ? updated : a)) });
      return jsonResp(updated);
    }
    if (!isSync && method === "PUT") {
      const parsed = saveArticleInputSchema.safeParse(body);
      if (!parsed.success) return jsonResp({ error: "Проверьте статью перед сохранением" }, 400);
      if (user.role !== "admin" && (user.role === "university_owner" || user.role === "university_pr") && user.universityId && (existing.universityId !== user.universityId || parsed.data.universityId !== user.universityId)) {
        return jsonResp({ error: "Представители вуза могут редактировать только статьи своего университета" }, 403);
      }
      const updated: ReadyArticle = {
        ...existing,
        ...parsed.data,
        updatedAt: new Date().toISOString(),
        diskSync: makeSyncedInfo(`01_Вузы_резиденты/${parsed.data.universityId}/Готовые_статьи`, `${id}.md`, "articles.csv"),
      };
      saveState({ ...state, articles: state.articles.map((a) => (a.id === id ? updated : a)) });
      return jsonResp(updated);
    }
  }

  // 8. Knowledge Cards & Card Types CRUD
  if (pathname === "/api/knowledge/cards") {
    if (method === "GET") return jsonResp(state.cards.filter((c) => canSeeCard(user, c)));
    if (method === "POST") {
      if (!user) return jsonResp({ error: "Войдите под демонстрационным аккаунтом" }, 401);
      if (!canCreateCard(user)) return jsonResp({ error: "У вашей роли нет прав на создание карточек" }, 403);
      const parsed = knowledgeCardInputSchema.safeParse(body);
      if (!parsed.success) return jsonResp({ error: "Некорректные данные карточки" }, 400);
      let cardInput = parsed.data;
      if (cardInput.type === "campus" && user.role !== "admin") return jsonResp({ error: "Паспорт кампуса создаёт только администратор канона" }, 403);
      if (cardInput.folderId === folderIds.campus && user.role !== "admin") return jsonResp({ error: "Папку общих параметров кампуса ведёт администратор" }, 403);
      if ((user.role === "university_owner" || user.role === "university_pr") && user.universityId) {
        const fUniv = extractUniversityFolderId(cardInput.folderId);
        if (fUniv && fUniv !== user.universityId) return jsonResp({ error: "Нельзя создавать карточки в папке другого университета" }, 403);
        if (cardInput.type === "project") {
          if (cardInput.isJoint && !cardInput.participantUniversityIds.includes(user.universityId)) {
            return jsonResp({ error: "В совместном проекте должен быть указан ваш университет" }, 403);
          }
          if (!cardInput.isJoint) cardInput = { ...cardInput, initiatorUniversityId: user.universityId };
        }
      }
      if (cardInput.type === "custom") {
        const { customTypeId, customFields } = cardInput;
        const typeDef = state.cardTypes.find((t) => t.id === customTypeId);
        if (!typeDef) return jsonResp({ error: "Пользовательский тип карточки не найден" }, 400);
        const cf = buildCustomFieldValuesSchema(typeDef).safeParse(customFields);
        if (!cf.success) return jsonResp({ error: "Проверьте заполнение полей карточки" }, 400);
        cardInput = { ...cardInput, folderId: folderIds.customType(typeDef.id), customFields: cf.data };
      }
      if (user.role !== "admin" && !isCardOwner(user, cardInput.owners)) {
        cardInput = { ...cardInput, owners: [getUserOwnershipLabel(user), ...cardInput.owners] };
      }
      const needsJoint = cardInput.type === "project" && cardInput.isJoint;
      const participantApprovals = needsJoint && user.universityId && cardInput.type === "project" && cardInput.participantUniversityIds.includes(user.universityId) ? [user.universityId] : [];
      const status = user.role === "admin" && !needsJoint ? "approved" : "pending";
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const card = {
        ...cardInput,
        id,
        status,
        submittedBy: user.id,
        submittedByName: user.name,
        participantApprovals,
        createdAt: now,
        updatedAt: now,
        diskSync: status === "approved" ? makeSyncedInfo(cardInput.folderId, `${id}.md`, "cards.csv") : createPendingDiskSync(),
      } as KnowledgeCard;
      saveState({ ...state, cards: [...state.cards, card] });
      return jsonResp(card, 201);
    }
    if (method === "DELETE") {
      if (!user) return jsonResp({ error: "Войдите под демонстрационным аккаунтом" }, 401);
      if (user.role !== "admin") return jsonResp({ error: "Удалять карточки может только администратор канона" }, 403);
      const id = parsedUrl.searchParams.get("id");
      if (!id) return jsonResp({ error: "Параметр id обязателен" }, 400);
      saveState({ ...state, cards: state.cards.filter((c) => c.id !== id) });
      return jsonResp({ success: true });
    }
  }

  const cardSubMatch = /^\/api\/knowledge\/cards\/([^/]+)(?:\/(moderation|edit-requests|sync))?$/.exec(pathname);
  if (cardSubMatch) {
    const id = decodeURIComponent(cardSubMatch[1]);
    const sub = cardSubMatch[2];
    const current = state.cards.find((c) => c.id === id);
    if (!current) return jsonResp({ error: "Карточка не найдена" }, 404);
    if (!user) return jsonResp({ error: "Войдите под демонстрационным аккаунтом" }, 401);

    if (!sub && method === "PUT") {
      if (!canEditCard(user, current)) return jsonResp({ error: "Чужую утверждённую карточку изменить нельзя" }, 403);
      const parsed = knowledgeCardInputSchema.safeParse(body);
      if (!parsed.success) return jsonResp({ error: "Некорректные данные карточки" }, 400);
      let nextInput = parsed.data;
      if (nextInput.type !== current.type) return jsonResp({ error: "Тип карточки нельзя изменить после создания" }, 400);
      if (nextInput.type === "custom") {
        const { customTypeId, customFields } = nextInput;
        const typeDef = state.cardTypes.find((t) => t.id === customTypeId);
        if (!typeDef) return jsonResp({ error: "Пользовательский тип карточки не найден" }, 400);
        const cf = buildCustomFieldValuesSchema(typeDef).safeParse(customFields);
        if (!cf.success) return jsonResp({ error: "Проверьте заполнение полей карточки" }, 400);
        nextInput = { ...nextInput, folderId: folderIds.customType(typeDef.id), customFields: cf.data };
      }
      if (user.role !== "admin") nextInput = { ...nextInput, owners: current.owners, folderId: current.folderId };
      const updated = {
        ...current,
        ...nextInput,
        updatedAt: new Date().toISOString(),
        diskSync: getCardStatus(current) === "approved" ? makeSyncedInfo(nextInput.folderId, `${id}.md`, "cards.csv") : current.diskSync,
      } as KnowledgeCard;
      saveState({ ...state, cards: state.cards.map((c) => (c.id === id ? updated : c)) });
      return jsonResp(updated);
    }

    if (sub === "sync" && method === "POST") {
      if (!canEditCard(user, current)) return jsonResp({ error: "Повторить выгрузку может владелец или администратор" }, 403);
      if (getCardStatus(current) !== "approved") return jsonResp({ error: "Черновик не выгружается на Диск до одобрения" }, 409);
      const updated: KnowledgeCard = { ...current, diskSync: makeSyncedInfo(current.folderId, `${id}.md`, "cards.csv") };
      saveState({ ...state, cards: state.cards.map((c) => (c.id === id ? updated : c)) });
      return jsonResp(updated);
    }

    if (sub === "moderation" && method === "POST") {
      const parsed = moderationActionSchema.safeParse(body);
      if (!parsed.success) return jsonResp({ error: "Некорректное действие модерации" }, 400);
      const { action, comment } = parsed.data;
      if (action === "confirm-participation") {
        if (!canConfirmJointParticipation(user, current) || !user.universityId) return jsonResp({ error: "Подтвердить участие может только вуз-участник" }, 403);
        const updated: KnowledgeCard = {
          ...current,
          participantApprovals: Array.from(new Set([...(current.participantApprovals ?? []), user.universityId])),
          updatedAt: new Date().toISOString(),
        };
        saveState({ ...state, cards: state.cards.map((c) => (c.id === id ? updated : c)) });
        return jsonResp(updated);
      }
      if (!canModerate(user)) return jsonResp({ error: "Модерировать карточки может только администратор" }, 403);
      if (action === "approve" && isJointProject(current) && !isJointFullyApproved(current)) {
        return jsonResp({ error: "Совместный проект нельзя одобрить до подтверждения обоих вузов-участников" }, 409);
      }
      const nextStatus = action === "approve" ? "approved" : "rejected";
      const updated: KnowledgeCard = {
        ...current,
        status: nextStatus,
        reviewedBy: user.name,
        reviewedAt: new Date().toISOString(),
        reviewComment: comment ?? "",
        updatedAt: new Date().toISOString(),
        diskSync: nextStatus === "approved" ? makeSyncedInfo(current.folderId, `${id}.md`, "cards.csv") : current.diskSync,
      };
      saveState({ ...state, cards: state.cards.map((c) => (c.id === id ? updated : c)) });
      return jsonResp(updated);
    }

    if (sub === "edit-requests") {
      if (method === "POST") {
        if (!canRequestEdit(user, current)) return jsonResp({ error: "У вас нет права запрашивать правку этой карточки" }, 403);
        const parsed = editRequestCreateSchema.safeParse(body);
        if (!parsed.success) return jsonResp({ error: parsed.error.issues[0]?.message ?? "Опишите запрос" }, 400);
        const reqItem: CardEditRequest = {
          id: crypto.randomUUID(),
          authorId: user.id,
          authorName: user.name,
          authorRole: roleLabels[user.role],
          authorOrganization: user.organization,
          message: parsed.data.message,
          createdAt: new Date().toISOString(),
          status: "open",
        };
        const updated: KnowledgeCard = { ...current, editRequests: [...(current.editRequests ?? []), reqItem], updatedAt: new Date().toISOString() };
        saveState({ ...state, cards: state.cards.map((c) => (c.id === id ? updated : c)) });
        return jsonResp(updated, 201);
      }
      if (method === "PATCH") {
        if (!canEditCard(user, current)) return jsonResp({ error: "Закрывать запросы может только владелец или администратор" }, 403);
        const parsed = editRequestUpdateSchema.safeParse(body);
        if (!parsed.success) return jsonResp({ error: "Некорректное действие" }, 400);
        const now = new Date().toISOString();
        const nextReqs = (current.editRequests ?? []).map((item) => {
          if (item.id !== parsed.data.requestId) return item;
          if (parsed.data.action === "resolve") {
            return { ...item, status: "resolved" as const, resolvedBy: user.name, resolvedAt: now, resolution: parsed.data.resolution ?? "" };
          }
          return { id: item.id, authorId: item.authorId, authorName: item.authorName, authorRole: item.authorRole, authorOrganization: item.authorOrganization, message: item.message, createdAt: item.createdAt, status: "open" as const };
        });
        const updated: KnowledgeCard = { ...current, editRequests: nextReqs, updatedAt: now };
        saveState({ ...state, cards: state.cards.map((c) => (c.id === id ? updated : c)) });
        return jsonResp(updated);
      }
    }
  }

  if (pathname === "/api/knowledge/card-types") {
    if (method === "GET") return jsonResp(getDemoCardTypesWithStats(state));
    if (method === "POST") {
      if (!user) return jsonResp({ error: "Войдите под аккаунтом" }, 401);
      if (!canManageTypes(user)) return jsonResp({ error: "Конструктором типов управляет только администратор" }, 403);
      const parsed = cardTypeInputSchema.safeParse(body);
      if (!parsed.success) return jsonResp({ error: "Некорректные данные типа карточки" }, 400);
      const now = new Date().toISOString();
      const created: CardTypeDefinition = { ...parsed.data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
      saveState({ ...state, cardTypes: [...state.cardTypes, created] });
      return jsonResp({ ...created, cardCount: 0 }, 201);
    }
  }

  const ctMatch = /^\/api\/knowledge\/card-types\/([^/]+)$/.exec(pathname);
  if (ctMatch) {
    const typeId = decodeURIComponent(ctMatch[1]);
    if (!user) return jsonResp({ error: "Войдите под аккаунтом" }, 401);
    if (!canManageTypes(user)) return jsonResp({ error: "Конструктором типов управляет только администратор" }, 403);
    const current = state.cardTypes.find((t) => t.id === typeId);
    if (!current) return jsonResp({ error: "Тип карточки не найден" }, 404);
    const count = state.cards.filter((c) => c.type === "custom" && c.customTypeId === typeId).length;

    if (method === "PATCH") {
      const parsed = cardTypeUpdateSchema.safeParse(body);
      if (!parsed.success) return jsonResp({ error: "Некорректные данные типа карточки" }, 400);
      if (parsed.data.fields && count > 0 && JSON.stringify(current.fields) !== JSON.stringify(parsed.data.fields)) {
        return jsonResp({ error: `По типу «${current.name}» уже сохранено ${count} карточек.`, cardCount: count }, 409);
      }
      const updated: CardTypeDefinition = { ...current, ...parsed.data, updatedAt: new Date().toISOString() };
      saveState({ ...state, cardTypes: state.cardTypes.map((t) => (t.id === typeId ? updated : t)) });
      return jsonResp({ ...updated, cardCount: count });
    }
    if (method === "DELETE") {
      if (count > 0) return jsonResp({ error: `Нельзя удалить тип «${current.name}»: по нему сохранено ${count} карточек.` }, 409);
      saveState({ ...state, cardTypes: state.cardTypes.filter((t) => t.id !== typeId) });
      return jsonResp({ success: true });
    }
  }

  return jsonResp({ error: `Маршрут ${pathname} не поддерживается в демо` }, 404);
}
