import { universities } from "./data";
import {
  CONTOURS,
  READINESS_STAGES,
  getFolderPathLabel,
  getUniversityName,
  isJointProject,
  placementStatusLabels,
  type Contour,
  type KnowledgeCard,
  type ReadinessStage,
} from "./knowledge";

export type AnalyticsFilterKey =
  | "type"
  | "industry"
  | "university"
  | "partner"
  | "readiness"
  | "contour"
  | "joint";

export type AnalyticsFilter = {
  key: AnalyticsFilterKey;
  label: string;
  value: string;
};

export type AnalyticsCardType = "project" | "laboratory" | "campus";

export type AnalyticsCardRow = {
  id: string;
  title: string;
  cardType: AnalyticsCardType;
  cardTypeLabel: string;
  industry: string;
  universities: string[];
  partner: string;
  status: string;
  contour: string;
  readinessStage: ReadinessStage | null;
  contourValue: Contour | null;
  figures: string[];
  folder: string;
  sourceHref: string;
  isJoint: boolean;
};

export type AnalyticsSummary = {
  total: number;
  projects: number;
  laboratories: number;
  jointProjects: number;
  universities: string[];
  partners: string[];
  industries: string[];
  stages: Array<{ label: string; count: number }>;
  contours: Array<{ label: string; count: number }>;
};

export type AnalyticsReport = {
  query: string;
  filters: AnalyticsFilter[];
  cards: AnalyticsCardRow[];
  summary: AnalyticsSummary;
  notice: string | null;
};

type IndustryDefinition = {
  id: string;
  label: string;
  queryKeywords: string[];
  cardKeywords: string[];
};

const INDUSTRIES: IndustryDefinition[] = [
  {
    id: "medicine",
    label: "Медицина и здравоохранение",
    queryKeywords: [
      "медицин",
      "здравоохран",
      "врач",
      "клинич",
      "реабилитац",
      "биомед",
      "травмпункт",
      "больниц",
    ],
    cardKeywords: [
      "медицин",
      "здравоохран",
      "реабилитац",
      "биомед",
      "клиническ",
      "травмпункт",
    ],
  },
  {
    id: "metallurgy",
    label: "Металлургия, машиностроение и промышленность",
    queryKeywords: [
      "металлург",
      "металл",
      "трубопрокат",
      "промышленн",
      "производств",
      "машиностроен",
      "спецтехник",
      "транспорт",
      "робот",
      "чпу",
      "микроэлектроник",
    ],
    cardKeywords: [
      "металлург",
      "металл",
      "промышленн",
      "трубопрокат",
      "машиностроен",
      "спецтехник",
      "транспорт",
      "робот",
      "чпу",
      "микроэлектроник",
      "интеллектуальн",
    ],
  },
  {
    id: "ecology",
    label: "Экология и природопользование",
    queryKeywords: ["эколог", "водоем", "природопользован", "воды", "водоем"],
    cardKeywords: ["эколог", "природопользован", "водоем", "водоем"],
  },
  {
    id: "creative",
    label: "Креативные индустрии и сервис",
    queryKeywords: ["креатив", "дизайн", "сервисн", "сервис"],
    cardKeywords: ["креатив", "дизайн", "сервис"],
  },
  {
    id: "agro",
    label: "АПК и сельское хозяйство",
    queryKeywords: [
      "агро",
      "апк",
      "сельск",
      "урожай",
      "животн",
      "ветеринар",
      "ферм",
    ],
    cardKeywords: ["агро", "апк", "сельск", "урожай", "животн", "ветеринар"],
  },
  {
    id: "education",
    label: "Образование и педагогика",
    queryKeywords: ["образован", "педагог", "наставник", "школ"],
    cardKeywords: ["образован", "педагог", "наставник"],
  },
  {
    id: "digital",
    label: "Цифровые технологии и ИИ",
    queryKeywords: [
      "цифров",
      "искусственн",
      "компьютерн",
      "информацион",
      "нейросет",
    ],
    cardKeywords: [
      "цифров",
      "искусственн",
      "компьютерн",
      "информацион",
      "нейросет",
    ],
  },
];

const READINESS_KEYWORDS: Array<{
  stage: ReadinessStage;
  keywords: string[];
}> = [
  { stage: "Идея", keywords: ["идея", "идее", "идею", "идеи"] },
  { stage: "НИОКР", keywords: ["ниокр"] },
  { stage: "Прототип", keywords: ["прототип"] },
  { stage: "Испытания", keywords: ["испытани"] },
  { stage: "Внедрено", keywords: ["внедрен", "внедрён"] },
];

const CONTOUR_KEYWORDS: Array<{ contour: Contour; keywords: string[] }> = [
  { contour: "ПИШ", keywords: ["пиш", "передов"] },
  { contour: "УМНОЦ", keywords: ["умноц"] },
  {
    contour: "собственный проект вуза",
    keywords: ["собственн"],
  },
];

const normalize = (value: string) =>
  value.toLowerCase().replace(/ё/g, "е").trim();

const includesAny = (haystack: string, keywords: string[]) =>
  keywords.some((keyword) => haystack.includes(normalize(keyword)));

function matchUniversityName(value: string, universityShortName: string) {
  const normalizedValue = normalize(value);
  const normalizedShortName = normalize(universityShortName);

  if (!normalizedValue) return false;
  if (normalizedValue.length < 3) {
    return normalizedValue === normalizedShortName;
  }

  return (
    normalizedValue === normalizedShortName ||
    normalizedValue.includes(normalizedShortName) ||
    normalizedShortName.includes(normalizedValue)
  );
}

function cardUniversityIds(card: KnowledgeCard): string[] {
  if (card.type === "project") {
    const ids = new Set<string>([card.initiatorUniversityId]);

    card.participantUniversityIds.forEach((id) => ids.add(id));

    card.coExecutors.forEach((executor) => {
      const university = universities.find((item) =>
        matchUniversityName(executor, item.shortName)
      );

      if (university) ids.add(university.id);
    });

    return [...ids];
  }

  if (card.type === "laboratory") {
    const university = universities.find((item) =>
      matchUniversityName(card.affiliation, item.shortName)
    );

    return university ? [university.id] : [];
  }

  return [];
}

function cardIndustryText(card: KnowledgeCard): string {
  if (card.type === "project") return card.sphere;
  if (card.type === "laboratory") return card.workDirections.join(" ");
  return "";
}

function cardPartner(card: KnowledgeCard): string {
  if (card.type === "project") return card.industrialPartner;
  if (card.type === "laboratory") return card.partner;
  return "";
}

function cardFigures(card: KnowledgeCard): string[] {
  if (card.type === "project") return card.confirmedFigures;
  if (card.type === "laboratory") return card.confirmedIndicators;
  if (card.type === "campus")
    return card.campusMetrics.map(
      (metric) => `${metric.label}: ${metric.value}`
    );
  return [];
}

function cardStatus(card: KnowledgeCard): string {
  if (card.type === "project") return card.readinessStage;
  if (card.type === "laboratory")
    return placementStatusLabels[card.placementStatus];
  return "Паспорт кампуса";
}

function cardContour(card: KnowledgeCard): {
  label: string;
  value: Contour | null;
} {
  if (card.type === "project") {
    return { label: card.contour, value: card.contour };
  }

  if (card.type === "laboratory") {
    return {
      label:
        card.placementStatus === "planned"
          ? "УНК кампуса (планируется)"
          : "Площадка вуза",
      value: null,
    };
  }

  return { label: "—", value: null };
}

function cardTypeLabel(card: KnowledgeCard): string {
  if (card.type === "project") {
    return card.isJoint ? "Совместный проект" : "Проект / продукт";
  }
  if (card.type === "laboratory") return "Лаборатория / объект";
  return "Паспорт кампуса";
}

function toRow(card: KnowledgeCard): AnalyticsCardRow {
  const contour = cardContour(card);
  const universityIds = cardUniversityIds(card);

  return {
    id: card.id,
    title: card.title,
    cardType: card.type === "custom" ? "campus" : card.type,
    cardTypeLabel: cardTypeLabel(card),
    industry: cardIndustryText(card) || "—",
    universities: universityIds.map(getUniversityName),
    partner: cardPartner(card) || "—",
    status: cardStatus(card),
    contour: contour.label,
    readinessStage: card.type === "project" ? card.readinessStage : null,
    contourValue: contour.value,
    figures: cardFigures(card),
    folder: getFolderPathLabel(card.folderId),
    sourceHref: `/knowledge?card=${card.id}`,
    isJoint: isJointProject(card),
  };
}

type ParsedQuery = {
  filters: AnalyticsFilter[];
  cardTypes: Set<AnalyticsCardType>;
  industries: IndustryDefinition[];
  universityIds: string[];
  requirePartner: boolean;
  stages: ReadinessStage[];
  contours: Contour[];
  jointOnly: boolean;
  unknownIndustry: string | null;
};

function detectCardTypes(query: string): Set<AnalyticsCardType> {
  const wantsProjects = /проект|разработ|продукт/.test(query);
  const wantsLaboratories = /лаборатор|инфраструктур|объект/.test(query);
  const wantsCampus = /паспорт|общие параметры/.test(query);
  const types = new Set<AnalyticsCardType>();

  if (wantsProjects) types.add("project");
  if (wantsLaboratories) types.add("laboratory");
  if (wantsCampus) types.add("campus");

  if (types.size === 0) {
    types.add("project");
    types.add("laboratory");
  }

  return types;
}

function parseQuery(rawQuery: string): ParsedQuery {
  const query = normalize(rawQuery);
  const filters: AnalyticsFilter[] = [];
  const cardTypes = detectCardTypes(query);
  const industries = INDUSTRIES.filter((industry) =>
    includesAny(query, industry.queryKeywords)
  );
  const universityIds = universities
    .filter((university) => {
      const names = [university.id, university.shortName, university.fullName];

      return names.some((name) => {
        const normalizedName = normalize(name);
        return (
          query.includes(normalizedName) ||
          (name === university.fullName &&
            normalizedName.split(/\s+/).every((part) => query.includes(part)))
        );
      });
    })
    .map((university) => university.id);
  const requirePartner = /партнер|партнёр|индустриальн/.test(query);
  const stages = READINESS_KEYWORDS.filter((item) =>
    includesAny(query, item.keywords)
  ).map((item) => item.stage);
  const contours = CONTOUR_KEYWORDS.filter((item) =>
    includesAny(query, item.keywords)
  ).map((item) => item.contour);
  const hasCampusContour =
    /контур[а-яёa-z]*\s+(?:в\s+)?кампус/.test(query) ||
    /кампус[а-яёa-z]*\s+контур/.test(query);

  if (hasCampusContour) contours.push("кампус");

  const jointOnly =
    /между собой|межвузов|совместн|кооперац/.test(query) &&
    cardTypes.has("project");

  if (jointOnly) {
    cardTypes.clear();
    cardTypes.add("project");
  } else {
    cardTypes.delete("campus");
  }

  const sphereMention = query.match(
    /(?:в\s+сфере|в\s+области|по\s+отрасли|в\s+отрасли|по\s+теме|в\s+тематике)\s+([^.,;!?]{2,80})/
  );
  const unknownIndustry =
    industries.length === 0 && sphereMention ? sphereMention[1].trim() : null;

  const typeLabels: Record<AnalyticsCardType, string> = {
    project: "Проект / продукт",
    laboratory: "Лаборатория / объект",
    campus: "Паспорт кампуса",
  };

  if (cardTypes.size > 0 && cardTypes.size < 3) {
    filters.push({
      key: "type",
      label: "Тип карточки",
      value: [...cardTypes].map((type) => typeLabels[type]).join(", "),
    });
  }

  industries.forEach((industry) => {
    filters.push({
      key: "industry",
      label: "Отрасль",
      value: industry.label,
    });
  });

  if (unknownIndustry) {
    filters.push({
      key: "industry",
      label: "Отрасль",
      value: `${unknownIndustry} — точного совпадения нет`,
    });
  }

  universityIds.forEach((id) => {
    filters.push({
      key: "university",
      label: "Вуз",
      value: getUniversityName(id),
    });
  });

  if (requirePartner) {
    filters.push({
      key: "partner",
      label: "Партнёры",
      value: "Только карточки с указанным партнёром",
    });
  }

  stages.forEach((stage) => {
    filters.push({ key: "readiness", label: "Статус", value: stage });
  });

  contours.forEach((contour) => {
    filters.push({ key: "contour", label: "Контур", value: contour });
  });

  if (jointOnly) {
    filters.push({
      key: "joint",
      label: "Связи",
      value: "Только совместные проекты вузов",
    });
  }

  return {
    filters,
    cardTypes,
    industries,
    universityIds,
    requirePartner,
    stages,
    contours,
    jointOnly,
    unknownIndustry,
  };
}

function matchesQuery(card: KnowledgeCard, parsed: ParsedQuery): boolean {
  if (card.type === "custom") return false;
  if (!parsed.cardTypes.has(card.type)) return false;

  if (parsed.unknownIndustry) return false;

  if (parsed.industries.length > 0) {
    const industryText = normalize(cardIndustryText(card));
    const matchesIndustry = parsed.industries.some((industry) =>
      includesAny(industryText, industry.cardKeywords)
    );

    if (!matchesIndustry) return false;
  }

  if (parsed.universityIds.length > 0) {
    const ids = cardUniversityIds(card);
    const hasUniversities = parsed.jointOnly
      ? parsed.universityIds.every((id) => ids.includes(id))
      : parsed.universityIds.some((id) => ids.includes(id));

    if (!hasUniversities) return false;
  }

  if (parsed.requirePartner && !cardPartner(card)) return false;

  if (parsed.stages.length > 0) {
    if (card.type !== "project") return false;
    if (!parsed.stages.includes(card.readinessStage)) return false;
  }

  if (parsed.contours.length > 0) {
    if (card.type !== "project") return false;
    if (!parsed.contours.includes(card.contour)) return false;
  }

  if (parsed.jointOnly && !isJointProject(card)) return false;

  return true;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function uniquePartners(values: string[]): string[] {
  const seen = new Map<string, string>();

  values
    .filter((value) => Boolean(value) && value !== "—")
    .forEach((value) => {
      const cleaned = value.replace(/\s*\([^)]*\)/g, "").split(";")[0]?.trim() ?? value;
      const key = normalize(cleaned).replace(/[«»"']/g, "");
      if (key && !seen.has(key)) {
        seen.set(key, cleaned);
      }
    });

  return [...seen.values()];
}

function countBy<T extends string>(
  values: T[],
  order: readonly T[]
): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return order
    .filter((value) => counts.has(value))
    .map((value) => ({ label: value, count: counts.get(value) ?? 0 }));
}

export function buildAnalyticsReport(
  rawQuery: string,
  cards: KnowledgeCard[]
): AnalyticsReport {
  const query = rawQuery.trim();
  const parsed = parseQuery(query);
  const matchedCards = cards
    .filter((card) => matchesQuery(card, parsed))
    .sort((a, b) => {
      const typeOrder: Record<KnowledgeCard["type"], number> = {
        project: 0,
        laboratory: 1,
        campus: 2,
        custom: 3,
      };
      const typeDelta = typeOrder[a.type] - typeOrder[b.type];

      if (typeDelta !== 0) return typeDelta;

      return a.title.localeCompare(b.title, "ru");
    });
  const rows = matchedCards.map(toRow);

  const summary: AnalyticsSummary = {
    total: rows.length,
    projects: rows.filter((row) => row.cardType === "project").length,
    laboratories: rows.filter((row) => row.cardType === "laboratory").length,
    jointProjects: rows.filter((row) => row.isJoint).length,
    universities: unique(rows.flatMap((row) => row.universities)),
    partners: uniquePartners(rows.map((row) => row.partner)),
    industries: unique(
      rows.map((row) => row.industry).filter((industry) => industry !== "—")
    ),
    stages: countBy(
      rows.flatMap((row) => (row.readinessStage ? [row.readinessStage] : [])),
      READINESS_STAGES
    ),
    contours: countBy(
      rows.flatMap((row) => (row.contourValue ? [row.contourValue] : [])),
      CONTOURS
    ),
  };

  let notice: string | null = null;

  if (rows.length === 0) {
    notice = parsed.unknownIndustry
      ? `В базе нет карточек с отраслью «${parsed.unknownIndustry}». Система не добавляет сведения и не делает предположений.`
      : `По запросу «${query}» в базе нет подходящих карточек. Система не добавляет сведения и не делает предположений.`;
  }

  return {
    query,
    filters: parsed.filters,
    cards: rows,
    summary,
    notice,
  };
}
