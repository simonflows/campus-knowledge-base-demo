import {
  flattenArticleChunks,
  type FlatArticleChunk,
  type GeneratedArticleDraft,
  type ReadyArticle,
} from "./articles";
import { universities } from "./data";
import {
  getFolderPathLabel,
  getUniversityName,
  isJointProject,
  placementStatusLabels,
  type KnowledgeCard,
} from "./knowledge";
import type { YandexAiMessage } from "./yandex-ai";
import {
  generatedArticleSchema,
  type GeneratedArticlePayload,
} from "./validation/articles";

const stopWords = new Set([
  "напиши",
  "написать",
  "сделай",
  "сделать",
  "статья",
  "статью",
  "статьи",
  "статей",
  "материал",
  "материала",
  "материалы",
  "опорой",
  "основе",
  "основа",
  "нужно",
  "нужен",
  "нужна",
  "про",
  "для",
  "чтобы",
  "это",
  "как",
  "что",
  "кто",
  "где",
  "или",
  "при",
  "уже",
  "вышедший",
  "вышедшую",
  "вышедшего",
  "сотрудничестве",
  "сотрудничество",
  "сотрудничества",
  "вуз",
  "вуза",
  "вузов",
  "вузе",
  "университет",
  "университета",
  "университете",
  "на",
  "по",
  "из",
  "от",
  "до",
  "за",
  "об",
  "не",
  "но",
  "да",
  "то",
  "же",
  "ли",
  "бы",
  "во",
  "со",
  "ко",
  "под",
  "над",
  "без",
  "том",
  "все",
  "всё",
  "очень",
  "устроен",
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

function tokenRoot(token: string): string {
  if (token.length <= 4) return token;
  return token.slice(0, 5);
}

function queryTokens(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !stopWords.has(token))
    .map(tokenRoot);
}

function matchesRoot(haystack: string, root: string): boolean {
  return haystack.includes(root);
}

function cardSearchText(card: KnowledgeCard): string {
  const parts: string[] = [
    card.title,
    card.referenceDescription,
    card.stopFormula,
    card.owners.join(" "),
    getFolderPathLabel(card.folderId),
    getUniversityName(
      card.type === "project" ? card.initiatorUniversityId : ""
    ),
  ];

  if (card.type === "project") {
    parts.push(
      card.sphere,
      card.industrialPartner,
      card.coExecutors.join(" "),
      card.confirmedFigures.join(" "),
      card.readinessStage,
      card.contour,
      card.participantUniversityIds
        .map((universityId) => getUniversityName(universityId))
        .join(" ")
    );
  }

  if (card.type === "laboratory") {
    parts.push(
      card.affiliation,
      card.partner,
      card.head,
      card.placementDetails,
      placementStatusLabels[card.placementStatus],
      card.workDirections.join(" "),
      card.equipment.join(" "),
      card.confirmedIndicators.join(" ")
    );
  }

  if (card.type === "campus") {
    parts.push(
      card.campusMetrics
        .map((metric) => `${metric.label} ${metric.value} ${metric.note}`)
        .join(" "),
      card.tariffs.map((tariff) => `${tariff.label} ${tariff.value}`).join(" "),
      card.legalEntities
        .map((entity) => `${entity.name} ${entity.role}`)
        .join(" "),
      card.stopList.join(" ")
    );
  }

  const customFields = (
    card as {
      customFields?: Record<string, string | number | string[] | null>;
    }
  ).customFields;

  if (customFields) {
    parts.push(
      Object.values(customFields)
        .flat()
        .map((value) => (value == null ? "" : String(value)))
        .join(" ")
    );
  }

  return normalize(parts.filter(Boolean).join(" "));
}

export type ScoredCard = {
  card: KnowledgeCard;
  score: number;
};

export function selectRelevantCards(
  cards: KnowledgeCard[],
  query: string,
  limit = 6
): ScoredCard[] {
  const roots = queryTokens(query);

  if (roots.length === 0) return [];

  return cards
    .map((card) => {
      const text = cardSearchText(card);
      const title = normalize(card.title);
      const uniqueRoots = new Set(roots);
      let score = 0;
      let matchedRoots = 0;
      let titleMatched = false;

      uniqueRoots.forEach((root) => {
        const inText = matchesRoot(text, root);
        const inTitle = matchesRoot(title, root);

        if (inText || inTitle) matchedRoots += 1;
        if (inText) score += 5;
        if (inTitle) {
          score += 3;
          titleMatched = true;
        }
      });

      return { card, score, matchedRoots, titleMatched };
    })
    .filter((item) => {
      const enoughMatches =
        item.matchedRoots >= 2 ||
        (item.titleMatched && new Set(roots).size === 1);

      return item.score >= 8 && enoughMatches;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({ card: item.card, score: item.score }));
}

export function selectRelevantArticles(
  articles: ReadyArticle[],
  query: string,
  limit = 4
): ReadyArticle[] {
  const roots = queryTokens(query);

  if (roots.length === 0) return [];

  return articles
    .map((article) => {
      const text = normalize(
        [
          article.title,
          article.lead,
          article.projectTitle,
          article.topic,
          ...flattenArticleChunks(article).map((chunk) => chunk.content),
        ].join(" ")
      );
      const title = normalize(article.title);
      let score = 0;

      new Set(roots).forEach((root) => {
        if (matchesRoot(text, root)) score += 2;
        if (matchesRoot(title, root)) score += 2;
      });

      return { article, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.article);
}

export function getBasisChunks(
  article: ReadyArticle | undefined,
  chunkIds: string[] | undefined
): FlatArticleChunk[] {
  if (!article || !chunkIds || chunkIds.length === 0) return [];

  const wanted = new Set(chunkIds);
  return flattenArticleChunks(article).filter((chunk) =>
    wanted.has(chunk.chunkId)
  );
}

function cardUniversityLabel(card: KnowledgeCard): string {
  if (card.type === "project") {
    const initiator = getUniversityName(card.initiatorUniversityId);
    if (isJointProject(card)) {
      return `${initiator} (совместный проект: ${card.participantUniversityIds
        .map((universityId) => getUniversityName(universityId))
        .join(", ")})`;
    }
    return initiator;
  }

  if (card.type === "laboratory") {
    return card.affiliation;
  }

  return "Кампус «Южный Урал»";
}

export function serializeCardForPrompt(card: KnowledgeCard): string {
  const lines = [
    `ID карточки: ${card.id}`,
    `Тип: ${card.type}`,
    `Название: ${card.title}`,
    `Папка: ${getFolderPathLabel(card.folderId)}`,
    `Вуз / принадлежность: ${cardUniversityLabel(card)}`,
    `Владельцы: ${card.owners.join("; ")}`,
    `Эталонное описание: ${card.referenceDescription}`,
    `Стоп-формула: ${card.stopFormula}`,
  ];

  if (card.type === "project") {
    lines.push(
      `Сфера: ${card.sphere}`,
      `Вуз-инициатор: ${getUniversityName(card.initiatorUniversityId)}`,
      `Соисполнители: ${card.coExecutors.join(", ") || "нет"}`,
      `Индустриальный партнёр: ${card.industrialPartner}`,
      `Стадия готовности: ${card.readinessStage}`,
      `Контур: ${card.contour}`,
      `Подтверждённые цифры и факты: ${card.confirmedFigures.join("; ")}`
    );
  }

  if (card.type === "laboratory") {
    lines.push(
      `Принадлежность: ${card.affiliation}`,
      `Партнёр: ${card.partner}`,
      `Руководитель: ${card.head}`,
      `Статус размещения: ${placementStatusLabels[card.placementStatus]}`,
      `Детали размещения: ${card.placementDetails}`,
      `Направления: ${card.workDirections.join("; ")}`,
      `Оборудование: ${card.equipment.join("; ")}`,
      `Подтверждённые показатели: ${card.confirmedIndicators.join("; ")}`
    );
  }

  if (card.type === "campus") {
    lines.push(
      `Параметры: ${card.campusMetrics
        .map((metric) => `${metric.label} — ${metric.value} (${metric.note})`)
        .join("; ")}`,
      `Тарифы: ${card.tariffs
        .map((tariff) => `${tariff.label} — ${tariff.value}`)
        .join("; ")}`,
      `Юрлица: ${card.legalEntities
        .map((entity) => `${entity.name} — ${entity.role}`)
        .join("; ")}`,
      `Стоп-лист: ${card.stopList.join("; ")}`
    );
  }

  return lines.join("\n");
}

export function serializeApprovedChunk(chunk: FlatArticleChunk): string {
  return [
    `Статья: ${chunk.articleTitle}`,
    `Смысловой блок: ${chunk.sectionHeading}`,
    `Живая формулировка: ${chunk.content}`,
  ].join("\n");
}

const systemPrompt = `Ты — редактор пресс-службы кампуса «Южный Урал» и семи вузов-резидентов. Ты пишешь только по предоставленным каноническим карточкам и утверждённым статьям коллег.

Жёсткие правила:
1. Не используй общие знания модели и не добавляй факты, цифры, имена или сроки, которых нет в карточках.
2. Если для запроса не хватает данных, не придумывай текст: верни noData=true и короткое честное сообщение в noDataMessage.
3. Заголовок H1 — title. Подзаголовки только H2 или H3 — sections[].heading и sections[].level.
4. Первые 1000 знаков (поле lead и первый chunk) должны ясно раскрывать: кто с кем сотрудничает, что создано, в каком контуре, в чём практическая польза.
5. Пиши живым языком без канцелярита. Избегай штампов «в рамках», «в целях», «осуществляется».
6. Дели текст на самодостаточные чанки по 1–2 абзаца. В каждом чанке явно называй участников, проект и факты, чтобы блок можно было понять отдельно от статьи.
7. Не приписывай совместный проект одному вузу или партнёру. Не меняй статус лаборатории и контур проекта.
8. В конце статьи список использованных карточек добавит интерфейс, поэтому в JSON просто перечисли их ID в sourceCardIds.

Верни строго JSON без markdown и без пояснений:
{
  "noData": false,
  "noDataMessage": null,
  "title": "заголовок H1",
  "lead": "сильные первые 1000 знаков",
  "sections": [
    {
      "heading": "подзаголовок H2 или H3",
      "level": 2,
      "chunks": ["самодостаточный чанк из 1–2 абзацев", "ещё один чанк"]
    }
  ],
  "sourceCardIds": ["id карточки"],
  "projectTitle": "название проекта или темы",
  "topic": "короткая тема для фильтра",
  "suggestedUniversityId": "id вуза или null"
}`;

export function buildArticleMessages(params: {
  query: string;
  cards: KnowledgeCard[];
  referenceChunks: FlatArticleChunk[];
}): YandexAiMessage[] {
  const cardsText = params.cards
    .map(serializeCardForPrompt)
    .join("\n\n---\n\n");

  const referenceText =
    params.referenceChunks.length > 0
      ? params.referenceChunks.map(serializeApprovedChunk).join("\n\n---\n\n")
      : "Утверждённых статей-опор по этому запросу нет.";

  return [
    { role: "system", text: systemPrompt },
    {
      role: "user",
      text: [
        `Запрос специалиста: ${params.query}`,
        "",
        "Доступные канонические карточки (единственный источник твёрдых фактов и цифр):",
        cardsText,
        "",
        "Живые формулировки из утверждённых статей коллег (можно брать тон и удачные формулировки, но нельзя брать оттуда неподтверждённые факты):",
        referenceText,
        "",
        "Собери статью по правилам выше. В sourceCardIds укажи только ID реально использованных карточек из списка.",
      ].join("\n"),
    },
  ];
}

export function extractJsonObject(text: string): unknown {
  const withoutFences = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Модель не вернула JSON-объект статьи");
  }

  return JSON.parse(withoutFences.slice(start, end + 1));
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toSectionLevel(value: unknown): 2 | 3 {
  return value === 3 || value === "3" || value === "H3" ? 3 : 2;
}

function toChunks(value: unknown): Array<{ id: string; content: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        return { id: `chunk-${index + 1}`, content: item.trim() };
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return {
          id: asString(record.id) || `chunk-${index + 1}`,
          content: asString(record.content) || asString(record.text),
        };
      }

      return { id: `chunk-${index + 1}`, content: "" };
    })
    .filter((chunk) => chunk.content.length > 0);
}

function findUniversityIdForCard(card: KnowledgeCard): string | null {
  if (card.type === "project") {
    if (card.isJoint) {
      return card.participantUniversityIds[0] ?? null;
    }
    return card.initiatorUniversityId;
  }

  if (card.type === "laboratory") {
    const normalizedAffiliation = normalize(card.affiliation);
    const match = universities.find(
      (university) =>
        normalize(university.shortName) === normalizedAffiliation ||
        normalize(university.fullName) === normalizedAffiliation
    );
    return match?.id ?? null;
  }

  return null;
}

function fallbackTopic(card: KnowledgeCard): string {
  if (card.type === "project") return card.sphere;
  if (card.type === "laboratory")
    return card.workDirections[0] ?? "Лаборатория";
  if (card.type === "campus") return "Кампус «Южный Урал»";
  return "Материалы базы знаний";
}

export function normalizeGeneratedArticle(
  raw: unknown,
  params: {
    selectedCards: KnowledgeCard[];
    matchedArticles: ReadyArticle[];
  }
): GeneratedArticlePayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Модель вернула некорректный ответ");
  }

  const record = raw as Record<string, unknown>;
  const allowedIds = new Set(params.selectedCards.map((card) => card.id));
  const rawSourceIds = Array.isArray(record.sourceCardIds)
    ? record.sourceCardIds.map(asString).filter(Boolean)
    : [];
  const sourceCardIds = rawSourceIds.filter((id) => allowedIds.has(id));
  const finalSourceIds =
    sourceCardIds.length > 0
      ? sourceCardIds
      : params.selectedCards.map((card) => card.id);

  const sourceCardTitles = finalSourceIds
    .map(
      (id) => params.selectedCards.find((card) => card.id === id)?.title ?? ""
    )
    .filter(Boolean);

  const rawSections = Array.isArray(record.sections) ? record.sections : [];
  const sections = rawSections
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const section = item as Record<string, unknown>;
      const heading = asString(section.heading);
      const chunks = toChunks(section.chunks);

      if (!heading || chunks.length === 0) return null;

      return {
        id: asString(section.id) || `section-${index + 1}`,
        heading,
        level: toSectionLevel(section.level),
        chunks: chunks.map((chunk, chunkIndex) => ({
          ...chunk,
          id: `${asString(section.id) || `section-${index + 1}`}-chunk-${chunkIndex + 1}`,
        })),
      };
    })
    .filter((section): section is NonNullable<typeof section> =>
      Boolean(section)
    );

  const firstCard = params.selectedCards[0];
  const suggestedUniversityId =
    asString(record.suggestedUniversityId) ||
    (firstCard ? findUniversityIdForCard(firstCard) : "");

  const projectTitle =
    asString(record.projectTitle) || firstCard?.title || "Материалы канона";
  const topic =
    asString(record.topic) ||
    (firstCard ? fallbackTopic(firstCard) : "Материалы базы знаний");

  return generatedArticleSchema.parse({
    noData: record.noData === true,
    noDataMessage:
      record.noData === true
        ? asString(record.noDataMessage) ||
          "В канонических карточках нет достаточных сведений по запросу."
        : null,
    title: asString(record.title),
    lead: asString(record.lead),
    sections,
    sourceCardIds: finalSourceIds,
    sourceCardTitles,
    projectTitle,
    topic,
    suggestedUniversityId: suggestedUniversityId || null,
    usedArticleIds: params.matchedArticles.map((article) => article.id),
  });
}

export function buildNoDataDraft(params: {
  query: string;
  message: string;
}): GeneratedArticleDraft {
  return {
    noData: true,
    noDataMessage: params.message,
    title: "",
    lead: "",
    sections: [],
    sourceCardIds: [],
    sourceCardTitles: [],
    projectTitle: "",
    topic: "",
    suggestedUniversityId: null,
    usedArticleIds: [],
    query: params.query,
  };
}

export function buildDeterministicArticleDraft(params: {
  query: string;
  selectedCards: KnowledgeCard[];
  matchedArticles: ReadyArticle[];
  referenceChunks: FlatArticleChunk[];
}): GeneratedArticlePayload {
  const primary = params.selectedCards[0];

  if (!primary) {
    throw new Error("Нет канонических карточек для сборки статьи");
  }

  const secondaryCards = params.selectedCards.slice(1, 3);
  const sections: GeneratedArticlePayload["sections"] = [];

  let title = primary.title;
  let lead = primary.referenceDescription;

  if (primary.type === "project") {
    const initiator = getUniversityName(primary.initiatorUniversityId);
    const participants = primary.isJoint
      ? primary.participantUniversityIds.map(getUniversityName).join(" и ")
      : [initiator, ...primary.coExecutors].filter(Boolean).join(" и ");

    title = primary.isJoint
      ? `${primary.title}: совместная разработка ${participants} в кампусе «Южный Урал»`
      : `${primary.title} — проект ${participants} в контуре «${primary.contour}»`;

    lead = [
      primary.referenceDescription,
      `Контур реализации — «${primary.contour}», текущая стадия готовности — «${primary.readinessStage}».`,
      primary.confirmedFigures.length > 0
        ? `Ключевые подтверждённые факты: ${primary.confirmedFigures.join("; ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 990);

    sections.push({
      id: "section-participants",
      heading: `Участники и роли: ${participants}`,
      level: 2,
      chunks: [
        {
          id: "section-participants-chunk-1",
          content: primary.isJoint
            ? `Проект «${primary.title}» является совместной разработкой ${participants} в контуре кампуса «Южный Урал». Вуз-инициатор — ${initiator}, соисполнители — ${primary.coExecutors.join(", ") || "участники консорциума"}, индустриальный партнёр — ${primary.industrialPartner}.`
            : `Инициатор разработки «${primary.title}» — ${initiator}${primary.coExecutors.length > 0 ? `, соисполнители — ${primary.coExecutors.join(", ")}` : ""}. Индустриальным партнёром выступает ${primary.industrialPartner}.`,
        },
        {
          id: "section-participants-chunk-2",
          content: `Карточка проекта хранится в папке «${getFolderPathLabel(primary.folderId)}». Ограничение канона: ${primary.stopFormula}`,
        },
      ],
    });

    sections.push({
      id: "section-results",
      heading: `Практическая польза и подтверждённые результаты (${primary.sphere})`,
      level: 2,
      chunks: [
        {
          id: "section-results-chunk-1",
          content: `В рамках направления «${primary.sphere}» команда ${participants} развивает решение «${primary.title}» на стадии «${primary.readinessStage}». ${
            primary.confirmedFigures.length > 0
              ? `Документально подтверждены показатели: ${primary.confirmedFigures.join("; ")}.`
              : "Количественные метрики добавляются только после документального подтверждения."
          }`,
        },
      ],
    });
  } else if (primary.type === "laboratory") {
    title = `${primary.title} (${primary.affiliation}): статус, оборудование и задачи`;
    lead = `${primary.referenceDescription} Актуальный статус площадки: ${placementStatusLabels[primary.placementStatus].toLowerCase()} — ${primary.placementDetails}. Партнёр направления — ${primary.partner}.`.slice(
      0,
      990
    );

    sections.push({
      id: "section-lab-status",
      heading: `Статус размещения и инфраструктура (${primary.affiliation})`,
      level: 2,
      chunks: [
        {
          id: "section-lab-status-chunk-1",
          content: `${primary.title} относится к университету ${primary.affiliation} и развивается при участии партнёра ${primary.partner}. Текущий статус размещения: ${primary.placementDetails}.`,
        },
        {
          id: "section-lab-status-chunk-2",
          content: `Основные направления работ: ${primary.workDirections.join("; ")}. Используемое оборудование: ${primary.equipment.join("; ")}. Ограничение канона: ${primary.stopFormula}`,
        },
      ],
    });

    if (primary.confirmedIndicators.length > 0) {
      sections.push({
        id: "section-lab-indicators",
        heading: "Подтверждённые показатели лаборатории",
        level: 3,
        chunks: [
          {
            id: "section-lab-indicators-chunk-1",
            content: `По паспорту объекта «${primary.title}» зафиксированы показатели: ${primary.confirmedIndicators.join("; ")}.`,
          },
        ],
      });
    }
  } else if (primary.type === "campus") {
    title =
      "Кампус «Южный Урал» в Челябинске: канонические параметры, этапы ввода и 7 вузов-резидентов";
    lead = primary.referenceDescription.slice(0, 990);

    sections.push({
      id: "section-campus-metrics",
      heading: "Площади, инвестиции, вместимость и этапы ввода кампуса",
      level: 2,
      chunks: [
        {
          id: "section-campus-metrics-chunk-1",
          content: primary.campusMetrics
            .map((metric) => `${metric.label}: ${metric.value} (${metric.note})`)
            .join(". "),
        },
        {
          id: "section-campus-metrics-chunk-2",
          content: `Тарифы на проживание (ООО «Отельные решения», «Три звезды»): ${primary.tariffs
            .map((tariff) => `${tariff.label} — ${tariff.value}`)
            .join("; ")}.`,
        },
      ],
    });

    sections.push({
      id: "section-campus-entities",
      heading: "Юридические лица и стоп-лист частых искажений",
      level: 2,
      chunks: [
        {
          id: "section-campus-entities-chunk-1",
          content: primary.legalEntities
            .map((entity) => `${entity.name} — ${entity.role}`)
            .join(". "),
        },
        {
          id: "section-campus-entities-chunk-2",
          content: `Ключевые запреты канона: ${primary.stopList.slice(0, 3).join(" ")}`,
        },
      ],
    });
  } else {
    lead = (primary.referenceDescription || primary.title).slice(0, 990);
    sections.push({
      id: "section-custom",
      heading: `Сведения карточки «${primary.title}»`,
      level: 2,
      chunks: [
        {
          id: "section-custom-chunk-1",
          content:
            Object.entries(primary.customFields)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v ?? "—")}`)
              .join("; ") || primary.title,
        },
      ],
    });
  }

  if (secondaryCards.length > 0) {
    sections.push({
      id: "section-related-context",
      heading: "Связанные объекты и проекты канона",
      level: 3,
      chunks: secondaryCards.map((card, index) => ({
        id: `section-related-chunk-${index + 1}`,
        content: `${card.title}: ${card.referenceDescription}`,
      })),
    });
  }

  if (params.referenceChunks.length > 0) {
    sections.push({
      id: "section-colleagues-context",
      heading: "Опорный контекст из библиотеки «Готовые_статьи»",
      level: 3,
      chunks: params.referenceChunks.slice(0, 2).map((chunk, index) => ({
        id: `section-colleagues-chunk-${index + 1}`,
        content: `${chunk.content} (опора на материал «${chunk.articleTitle}»)`,
      })),
    });
  }

  return generatedArticleSchema.parse({
    noData: false,
    noDataMessage: null,
    title,
    lead,
    sections,
    sourceCardIds: params.selectedCards.map((card) => card.id),
    sourceCardTitles: params.selectedCards.map((card) => card.title),
    projectTitle: primary.title,
    topic: fallbackTopic(primary),
    suggestedUniversityId: findUniversityIdForCard(primary) ?? "susu",
    usedArticleIds: params.matchedArticles.map((article) => article.id),
  });
}
