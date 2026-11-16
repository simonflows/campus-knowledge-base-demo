import {
  AUDIT_STOP_RULES,
  type AuditStopCategory,
} from "./audit-canon-registry";
import {
  getFolderPathLabel,
  getUniversityById,
  getUniversityFullName,
  getUniversityName,
  placementStatusLabels,
  type CampusCard,
  type KnowledgeCard,
  type LaboratoryCard,
  type ProjectCard,
} from "./knowledge";

export const FACT_CHECK_CHECKPOINTS = {
  campus: "Общие параметры кампуса",
  placement: "Статус и размещение объекта",
  authorship: "Авторство и соисполнители",
  contour: "Разделение контуров",
  names: "Официальные названия и должности",
  figures: "Неподтверждённые цифры",
} as const;

export type FactCheckCheckpoint = keyof typeof FACT_CHECK_CHECKPOINTS;

export const FACT_CHECK_LEVELS = ["red", "yellow", "green"] as const;

export type FactCheckLevel = (typeof FACT_CHECK_LEVELS)[number];

export const levelLabels: Record<FactCheckLevel, string> = {
  red: "Красный",
  yellow: "Жёлтый",
  green: "Зелёный",
};

export const levelDescriptions: Record<FactCheckLevel, string> = {
  red: "Прямое искажение — публикация запрещена до правки",
  yellow: "Нет подтверждения в базе — требуется уточнение",
  green: "Подтверждено канонической карточкой",
};

export type FactCheckFinding = {
  id: string;
  level: FactCheckLevel;
  checkpoint: FactCheckCheckpoint;
  checkpointLabel: string;
  title: string;
  quote: string;
  explanation: string;
  suggestion: string;
  sourceCardId: string;
  sourceCardTitle: string;
  sourceFolder: string;
};

export type FactCheckSummary = {
  red: number;
  yellow: number;
  green: number;
  total: number;
};

export type FactCheckCheckpointSummary = {
  key: FactCheckCheckpoint;
  label: string;
  red: number;
  yellow: number;
  green: number;
};

export type FactCheckResult = {
  findings: FactCheckFinding[];
  summary: FactCheckSummary;
  checkpoints: FactCheckCheckpointSummary[];
  canPublish: boolean;
  checkedChars: number;
};

export type CanonicalRewriteChunk = {
  id: string;
  content: string;
};

export type CanonicalRewriteSection = {
  id: string;
  heading: string;
  level: 2 | 3;
  chunks: CanonicalRewriteChunk[];
};

export type CanonicalRewrite = {
  title: string;
  lead: string;
  sections: CanonicalRewriteSection[];
  sourceCardIds: string[];
  sourceCardTitles: string[];
  plainText: string;
};

export const FACT_CHECK_EXAMPLE_TEXT =
  "В новом учебно-научном корпусе кампуса «Южный Урал» в Челябинске уже работает уникальная медицинская VR-лаборатория, полностью разработанная одним из вузов-резидентов. В 2025 году здесь создали виртуальный тренажёр травмпункта, через который уже прошли обучение более 5000 врачей области. Общая площадь кампуса на сегодня составляет 110 тыс. кв. метров";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

function tokenRoots(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .map((token) => token.slice(0, 5));
}

function uniqueRoots(value: string): string[] {
  return Array.from(new Set(tokenRoots(value)));
}

function termMatches(term: string, draftRoots: Set<string>): boolean {
  const cleaned = term.replace(/\([A-ZА-Я0-9\s._-]{3,32}\)/g, " ");
  const roots = uniqueRoots(cleaned);

  if (roots.length === 0) return false;

  const matched = roots.filter((root) => draftRoots.has(root)).length;
  const required =
    roots.length === 1
      ? 1
      : roots.length === 2
        ? 2
        : Math.ceil(roots.length * 0.65);

  return matched >= required;
}

function distinctiveTermMatches(
  term: string,
  draftRoots: Set<string>
): boolean {
  const roots = uniqueRoots(term);

  if (roots.length < 2 || normalize(term).length < 10) return false;

  const matched = roots.filter((root) => draftRoots.has(root)).length;

  return matched >= Math.ceil(roots.length * 0.75);
}

function isVrLaboratory(card: KnowledgeCard): card is LaboratoryCard {
  if (card.type !== "laboratory") return false;

  const text = normalize(
    [
      card.title,
      ...card.workDirections,
      ...card.equipment,
      card.referenceDescription,
    ].join(" ")
  );

  return text.includes("vr");
}

function cardReferenceTerms(card: KnowledgeCard): string[] {
  const terms: string[] = [card.title];

  if (card.type === "project") {
    terms.push(card.sphere, card.industrialPartner);
    terms.push(...card.confirmedFigures);

    if (card.isJoint) {
      terms.push(
        card.participantUniversityIds
          .map((universityId) => getUniversityFullName(universityId))
          .join(" и ")
      );
    }
  }

  if (card.type === "laboratory") {
    terms.push(
      card.affiliation,
      ...card.workDirections,
      ...card.equipment,
      ...card.confirmedIndicators
    );
  }

  if (card.type === "campus") {
    terms.push(
      "кампус «Южный Урал»",
      ...card.campusMetrics.map((metric) => metric.label)
    );
  }

  return terms.filter((term) => term.trim().length > 0);
}

function isCardReferenced(
  card: KnowledgeCard,
  draftRoots: Set<string>,
  normalizedDraft: string
): boolean {
  if (termMatches(card.title, draftRoots)) return true;

  if (
    isVrLaboratory(card) &&
    normalizedDraft.includes("vr") &&
    normalizedDraft.includes("лаборатор")
  ) {
    return true;
  }

  const nonTitleMatches = cardReferenceTerms(card)
    .slice(1)
    .filter((term) => distinctiveTermMatches(term, draftRoots));

  return nonTitleMatches.length >= 2;
}

function sentenceAt(text: string, index: number): string {
  let start = 0;
  let end = text.length;

  for (let i = index; i >= 0; i -= 1) {
    if (
      /[.!?]/.test(text[i]) &&
      (i + 1 >= text.length || /\s/.test(text[i + 1]))
    ) {
      start = i + 1;
      break;
    }
  }

  for (let i = index; i < text.length; i += 1) {
    if (
      /[.!?]/.test(text[i]) &&
      (i + 1 >= text.length || /\s/.test(text[i + 1]))
    ) {
      end = i + 1;
      break;
    }
  }

  const sentence = text.slice(start, end).trim();

  if (sentence.length <= 280) return sentence;

  return `${sentence.slice(0, 277).trimEnd()}…`;
}

function quoteFor(text: string, pattern: RegExp): string | null {
  const match = pattern.exec(text);

  if (!match || match.index === undefined) return null;

  return sentenceAt(text, match.index);
}

function sourceFromCard(card: KnowledgeCard) {
  return {
    sourceCardId: card.id,
    sourceCardTitle: card.title,
    sourceFolder: getFolderPathLabel(card.folderId),
  };
}

function parseNumeric(value: string): number {
  const firstBound = value.split(/[–—-]/)[0] ?? value;
  const cleaned = firstBound
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.]/g, "");

  return Number.parseFloat(cleaned);
}

function formatArea(value: number): string {
  return `${value.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} м²`;
}

function resolveQueue(value: string): "first" | "second" | "third" | null {
  const normalized = normalize(value);

  if (
    normalized === "iii" ||
    normalized === "3" ||
    normalized.startsWith("трет")
  ) {
    return "third";
  }

  if (
    normalized === "ii" ||
    normalized === "2" ||
    normalized.startsWith("втор")
  ) {
    return "second";
  }

  if (
    normalized === "i" ||
    normalized === "1" ||
    normalized.startsWith("перв")
  ) {
    return "first";
  }

  return null;
}

const AUDIT_CATEGORY_TO_CHECKPOINT: Record<
  AuditStopCategory,
  FactCheckCheckpoint
> = {
  campus_params: "campus",
  placement_status: "placement",
  coauthorship: "authorship",
  contours: "contour",
  names_entities: "names",
  unverified_metrics: "figures",
};

function isCanonicalCampusArea(sqm: number): boolean {
  // Общая площадь объектов: 121.8 - 123 тыс. м²; жилая часть: 68 - 70 тыс. м²; УНК: 40 - 40.306 тыс. м²; участки: 58.8 тыс. м²
  return (
    (sqm >= 120_000 && sqm <= 123_500) ||
    (sqm >= 68_000 && sqm <= 72_000) ||
    (sqm >= 40_000 && sqm <= 40_400) ||
    Math.abs(sqm - 58_800) <= 200
  );
}

const CANONICAL_COST_VALUES_BLN = [16.7, 16.75, 21.1, 34.6, 9.13, 7.9, 1.23, 4];

function isCanonicalCampusCost(bln: number): boolean {
  return CANONICAL_COST_VALUES_BLN.some((valid) => Math.abs(bln - valid) <= 0.05);
}

const CANONICAL_CAMPUS_PLACES = [336, 3064, 3100, 3400, 5000];

function isCanonicalCampusPlaces(value: number): boolean {
  return CANONICAL_CAMPUS_PLACES.some((valid) => Math.abs(value - valid) <= 10);
}

const singleAuthorPatterns: RegExp[] = [
  /одн(?:им|ого|ому)\s+(?:из\s+)?вуз[а-яё]*/i,
  /одним\s+вузом/i,
  /единственн[а-яё]*\s+(?:автор|разработчик|вуз)[а-яё]*/i,
  /полностью\s+разраб[а-яё]*/i,
  /самостоятельно\s+разраб[а-яё]*/i,
  /силами\s+одного\s+вуз[а-яё]*/i,
  /принадлежит\s+одному\s+вуз[а-яё]*/i,
];

const activePlacementPattern =
  /(?:уже|сейчас|сегодня)\s+(?:работает|работают|работала|работал|действует|функционирует|запущен[а-яё]*|открыт[а-яё]*)|функционирует|введен[а-яё]*\s+в\s+эксплуатацию|открыт[а-яё]*\s+в\s+(?:унк|учебно)/i;

const campusPlacementPattern =
  /(?:в|на)\s+(?:новом\s+)?(?:унк|учебно[- ]научн[а-яё]*\s+корпус[а-яё]*|кампус[а-яё]*)/i;

function isContourSentence(sentence: string): boolean {
  return (
    /контур[а-яё]*/i.test(sentence) ||
    /(?:в|на)\s+(?:рамках\s+|программе\s+)?(?:пиш|умноц)(?![а-яё])/i.test(
      sentence
    ) ||
    /передов[а-яё]*\s+инженерн[а-яё]*\s+школ[а-яё]*/i.test(sentence) ||
    /собственн[а-яё]*\s+(?:проект[а-яё]*\s+вуза|инициатив[а-яё]*)/i.test(sentence)
  );
}

function contourInSentence(sentence: string): string | null {
  if (/(?:пиш|передов[а-яё]*\s+инженерн[а-яё]*\s+школ[а-яё]*)/i.test(sentence)) {
    return "ПИШ";
  }

  if (/(?:умноц|межвузовск[а-яё]*\s+научно)/i.test(sentence)) {
    return "УМНОЦ";
  }

  if (/собственн[а-яё]*\s+(?:проект[а-яё]*\s+вуза|инициатив[а-яё]*)/i.test(sentence)) {
    return "собственный проект вуза";
  }

  if (/кампус[а-яё]*/i.test(sentence)) {
    return "кампус";
  }

  return null;
}

function universityMentioned(universityId: string, draft: string): boolean {
  const university = getUniversityById(universityId);

  if (!university) {
    return normalize(draft).includes(normalize(universityId));
  }

  return (
    normalize(draft).includes(normalize(university.shortName)) ||
    normalize(draft).includes(normalize(university.fullName))
  );
}

function collectConfirmedNumbers(cards: KnowledgeCard[]): Set<string> {
  const sources: string[] = [];

  cards.forEach((card) => {
    sources.push(card.title, card.referenceDescription);

    if (card.type === "project") {
      sources.push(...card.confirmedFigures);
    }

    if (card.type === "laboratory") {
      sources.push(...card.confirmedIndicators, card.placementDetails);
    }

    if (card.type === "campus") {
      sources.push(
        ...card.campusMetrics.flatMap((metric) => [metric.value, metric.note]),
        ...card.tariffs.map((tariff) => tariff.value)
      );
    }
  });

  const numbers = new Set<string>();

  sources.forEach((source) => {
    const matches = source.match(/\d[\d\s]*/g) ?? [];

    matches.forEach((match) => {
      const key = match.replace(/\D/g, "");

      if (key) numbers.add(key);
    });
  });

  return numbers;
}

type FindingInput = Omit<FactCheckFinding, "id" | "checkpointLabel">;

function normalizeQuoteForCompare(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function createFinding(input: FindingInput): FactCheckFinding {
  return {
    ...input,
    id: `${input.checkpoint}-${input.sourceCardId}-${input.level}-${input.title}-${normalizeQuoteForCompare(input.quote).slice(0, 48)}`,
    checkpointLabel: FACT_CHECK_CHECKPOINTS[input.checkpoint],
  };
}

function buildSummary(findings: FactCheckFinding[]): FactCheckSummary {
  return {
    red: findings.filter((finding) => finding.level === "red").length,
    yellow: findings.filter((finding) => finding.level === "yellow").length,
    green: findings.filter((finding) => finding.level === "green").length,
    total: findings.length,
  };
}

function buildCheckpointSummaries(
  findings: FactCheckFinding[]
): FactCheckCheckpointSummary[] {
  return (Object.keys(FACT_CHECK_CHECKPOINTS) as FactCheckCheckpoint[]).map(
    (key) => {
      const scoped = findings.filter((finding) => finding.checkpoint === key);

      return {
        key,
        label: FACT_CHECK_CHECKPOINTS[key],
        red: scoped.filter((finding) => finding.level === "red").length,
        yellow: scoped.filter((finding) => finding.level === "yellow").length,
        green: scoped.filter((finding) => finding.level === "green").length,
      };
    }
  );
}

export function checkFactText(
  draft: string,
  cards: KnowledgeCard[]
): FactCheckResult {
  const findings: FactCheckFinding[] = [];
  const normalizedDraft = normalize(draft);
  const draftRoots = new Set(tokenRoots(draft));
  const referencedCards = cards.filter((card) =>
    isCardReferenced(card, draftRoots, normalizedDraft)
  );

  const campusCard =
    referencedCards.find(
      (card): card is CampusCard => card.type === "campus"
    ) ??
    cards.find((card): card is CampusCard => card.type === "campus") ??
    null;

  const referencedProjects = referencedCards.filter(
    (card): card is ProjectCard => card.type === "project"
  );
  const referencedLabs = referencedCards.filter(
    (card): card is LaboratoryCard => card.type === "laboratory"
  );

  const primaryProject =
    referencedProjects.find((card) => card.isJoint) ?? referencedProjects[0];

  referencedProjects.forEach((project) => {
    const patternMatch = singleAuthorPatterns
      .map((pattern) => quoteFor(draft, pattern))
      .find((quote): quote is string => Boolean(quote));

    if (project.isJoint) {
      const participantNames = project.participantUniversityIds
        .map((universityId) => getUniversityName(universityId))
        .join(" и ");

      const namedParticipants = project.participantUniversityIds.filter(
        (universityId) => universityMentioned(universityId, draft)
      );
      const attributiveVerb = /(?:разраб|созда|сделан|принадлеж|автор)/i.test(
        draft
      );
      const singleNamedAuthor =
        namedParticipants.length === 1 && attributiveVerb
          ? sentenceAt(draft, draft.search(/(?:разраб|созда|принадлеж)/i))
          : null;

      if (!patternMatch && !singleNamedAuthor) return;

      findings.push(
        createFinding({
          level: "red",
          checkpoint: "authorship",
          title: "Совместный проект приписан одному вузу",
          quote: patternMatch ?? singleNamedAuthor ?? "",
          explanation:
            "«" +
            project.title +
            "» — совместная разработка " +
            participantNames +
            ". Карточка прямо запрещает приписывать результат одному вузу или партнёру.",
          suggestion:
            "Укажите оба вуза и их роли: инициатор — " +
            getUniversityName(project.initiatorUniversityId) +
            ", соисполнитель — " +
            (project.coExecutors.join(", ") || "нет") +
            ". Например: «Совместный проект " +
            participantNames +
            "».",
          ...sourceFromCard(project),
        })
      );

      return;
    }

    if (project.coExecutors.length > 0 && patternMatch) {
      findings.push(
        createFinding({
          level: "red",
          checkpoint: "authorship",
          title: "Не указаны соисполнители проекта",
          quote: patternMatch,
          explanation:
            "У проекта «" +
            project.title +
            "» в карточке указаны соисполнители: " +
            project.coExecutors.join(", ") +
            ". Приписывать результат только инициатору нельзя.",
          suggestion:
            "Добавьте соисполнителей: " +
            project.coExecutors.join(", ") +
            ", и укажите вклад каждой стороны.",
          ...sourceFromCard(project),
        })
      );
    }
  });

  referencedLabs.forEach((lab) => {
    const activeSentence = activePlacementPattern.test(draft)
      ? (quoteFor(draft, activePlacementPattern) ??
        sentenceAt(draft, draft.search(activePlacementPattern)))
      : null;

    if (
      lab.placementStatus === "planned" &&
      activeSentence &&
      !/(?:нельзя\s+(?:писать|описывать|утверждать)|планируется\s+к\s+открытию|до\s+завершения|до\s+открытия)/i.test(
        activeSentence
      )
    ) {
      findings.push(
        createFinding({
          level: "red",
          checkpoint: "placement",
          title: "Лаборатория выдана за уже работающую",
          quote: activeSentence,
          explanation:
            "В карточке статус «" +
            placementStatusLabels[lab.placementStatus] +
            "». " +
            lab.placementDetails +
            ". Писать, что объект уже работает в УНК кампуса, нельзя.",
          suggestion:
            "Замените утверждение на «планируется к открытию в УНК кампуса в 2027 году» и не указывайте действующий адрес до ввода объекта.",
          ...sourceFromCard(lab),
        })
      );
    }

    const campusSentence = campusPlacementPattern.test(draft)
      ? (quoteFor(draft, campusPlacementPattern) ??
        sentenceAt(draft, draft.search(campusPlacementPattern)))
      : null;

    if (
      lab.placementStatus === "active" &&
      campusSentence &&
      !/(?:будущ[а-яё]*|планир[а-яё]*|нов[а-яё]*\s+лаборатор[а-яё]*|совместн[а-яё]*\s+с\s+гк|в\s+2027|нельзя\s+(?:утверждать|писать|описывать))/i.test(
        campusSentence
      )
    ) {
      findings.push(
        createFinding({
          level: "red",
          checkpoint: "placement",
          title: "Лаборатория перенесена в УНК кампуса",
          quote: campusSentence,
          explanation:
            "В карточке статус «" +
            placementStatusLabels[lab.placementStatus] +
            "»: " +
            lab.placementDetails +
            ".",
          suggestion:
            "Укажите фактическую площадку вуза из карточки и не переносите лабораторию в УНК кампуса.",
          ...sourceFromCard(lab),
        })
      );
    }
  });

  const contourSentences = draft
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => isContourSentence(sentence));

  referencedProjects.forEach((project) => {
    contourSentences.forEach((sentence) => {
      const intendedContour = contourInSentence(sentence);

      if (!intendedContour || intendedContour === project.contour) return;

      const sentenceRoots = new Set(tokenRoots(sentence));
      const normalizedSentence = normalize(sentence);
      const matchingProjectsInSentence = referencedProjects.filter(
        (candidate) =>
          termMatches(candidate.title, sentenceRoots) ||
          normalizedSentence.includes(
            normalize(candidate.title.replace(/\([^)]*\)/g, "").trim())
          )
      );

      // Если в предложении явно названы конкретные проекты, проверяем контур только для них
      if (
        matchingProjectsInSentence.length > 0 &&
        !matchingProjectsInSentence.some((candidate) => candidate.id === project.id)
      ) {
        return;
      }

      findings.push(
        createFinding({
          level: "red",
          checkpoint: "contour",
          title: "Проект отнесён к чужому контуру",
          quote: sentenceAt(draft, draft.indexOf(sentence)),
          explanation:
            "В карточке проекта контур — «" +
            project.contour +
            "», а в черновике указан «" +
            intendedContour +
            "».",
          suggestion:
            "Исправьте контур на «" +
            project.contour +
            "»: контуры кампуса, ПИШ, УМНОЦ и собственных проектов вузов не смешиваются.",
          ...sourceFromCard(project),
        })
      );
    });
  });

  if (campusCard) {
    const areaRegex =
      /(\d[\d\s.,]*)\s*(тыс\.?\s*)?(?:кв\.?\s*м(?:2|²)?|кв\.?\s*метр[а-яё]*|м(?:2|²)|квадратн[а-яё]*\s+метр[а-яё]*)/gi;
    const seenAreas = new Set<string>();
    let areaMatch: RegExpExecArray | null;

    while ((areaMatch = areaRegex.exec(draft)) !== null) {
      const sentence = sentenceAt(draft, areaMatch.index);

      if (!/кампус|унк|учебно[- ]научн|гостиниц|земл/i.test(sentence)) continue;

      const value = parseNumeric(areaMatch[1] ?? "");
      const multiplied = areaMatch[2] ? value * 1000 : value;

      if (!Number.isFinite(multiplied)) continue;

      const key = String(Math.round(multiplied));
      if (seenAreas.has(key)) continue;
      seenAreas.add(key);

      if (!isCanonicalCampusArea(multiplied)) {
        findings.push(
          createFinding({
            level: "red",
            checkpoint: "campus",
            title: "Площадь кампуса не совпадает с паспортом",
            quote: sentence,
            explanation:
              "По каноническому паспорту общая площадь объектов кампуса «Южный Урал» составляет 121,8–123 тыс. м² (жилая часть — 68–70 тыс. м², УНК — 40,3 тыс. м² / 40 306 м², земельные участки — 58,8 тыс. м²). В черновике указано " +
              formatArea(multiplied) +
              " — это устаревшая или неточная цифра.",
            suggestion:
              "Укажите канонические значения из паспорта CAMPUS-PASS-001: 121,8–123 тыс. м² (объекты), 40,3 тыс. м² (УНК), 58,8 тыс. м² (участки).",
            ...sourceFromCard(campusCard),
          })
        );
      }
    }

    const costRegex = /(\d[\d\s.,]*)\s*млрд/gi;
    let costMatch: RegExpExecArray | null;

    while ((costMatch = costRegex.exec(draft)) !== null) {
      const sentence = sentenceAt(draft, costMatch.index);

      if (!/(?:кампус|стоимост|грант|инвестиц|бюджет)/i.test(sentence)) continue;

      const value = parseNumeric(costMatch[1] ?? "");

      if (Number.isFinite(value) && !isCanonicalCampusCost(value)) {
        findings.push(
          createFinding({
            level: "red",
            checkpoint: "campus",
            title: "Стоимость или объём финансирования не совпадает с паспортом",
            quote: sentence,
            explanation:
              "В паспорте зафиксированы исходная концессия 2022 г. (16,75 млрд ₽), совокупные инвестиции до 34,6 млрд ₽ (21,1 млрд ₽ промежуточно) и капитальный грант 9,13 млрд ₽ (7,9 млрд фед. + 1,23 млрд рег.). В черновике указано другое значение.",
            suggestion:
              "Уточните сумму с привязкой к году расчёта и структуре финансирования по паспорту CAMPUS-PASS-001.",
            ...sourceFromCard(campusCard),
          })
        );
      }
    }

    const placesRegex = /(\d[\d\s.,]*)\s*(?:учебн[а-яё]*\s+|жилых\s+)?мест[а-яё]*/gi;
    let placesMatch: RegExpExecArray | null;

    while ((placesMatch = placesRegex.exec(draft)) !== null) {
      const sentence = sentenceAt(draft, placesMatch.index);

      if (!/кампус|гостиниц|очеред|этап|прожив/i.test(sentence)) continue;

      const value = parseNumeric(placesMatch[1] ?? "");

      if (Number.isFinite(value) && !isCanonicalCampusPlaces(value)) {
        findings.push(
          createFinding({
            level: "red",
            checkpoint: "campus",
            title: "Число мест не совпадает с паспортом кампуса",
            quote: sentence,
            explanation:
              "В паспорте кампуса: 336 мест (1-я очередь), 3 064 места (2-я очередь), 3 400 мест для проживания в 8 гостиницах и 5 000 обучающихся. В черновике указано другое число.",
            suggestion:
              "Укажите канонические цифры: 3 400 мест для проживания в 8 гостиницах (336 + 3 064) и 5 000 обучающихся.",
            ...sourceFromCard(campusCard),
          })
        );
      }
    }

    const queueRegex =
      /(?<![A-Za-zА-Яа-я0-9])(III|II|I|3|2|1|перв[а-яё]*|втор[а-яё]*|трет[а-яё]*)(?:-?[яей])?\s*(?:очеред[а-яё]*|этап[а-яё]*)[^.!?]{0,45}?(\d{4})(?!\d)/gi;
    let queueMatch: RegExpExecArray | null;

    while ((queueMatch = queueRegex.exec(draft)) !== null) {
      // «3 очереди» / «3 этапа» во множественном числе — это общее количество очередей, а не 3-я очередь
      if (
        /^(?:2|3)\s+(?:очереди|этапа)(?![а-яёa-z0-9])/i.test(queueMatch[0]) ||
        /(?:всего|строительства|разделено\s+на)\s*\(?\s*3\s+(?:очереди|этапа)/i.test(
          sentenceAt(draft, queueMatch.index)
        )
      ) {
        continue;
      }

      const queue = resolveQueue(queueMatch[1] ?? "");
      const year = Number.parseInt(queueMatch[2] ?? "", 10);
      const isValid =
        (queue === "first" && year === 2024) ||
        (queue === "second" && year === 2026) ||
        (queue === "third" && (year === 2027 || year === 2028));

      if (!queue || !Number.isFinite(year) || isValid) {
        continue;
      }

      findings.push(
        createFinding({
          level: "red",
          checkpoint: "campus",
          title: "Срок очереди кампуса не совпадает с паспортом",
          quote: sentenceAt(draft, queueMatch.index),
          explanation:
            "В паспорте кампуса 1-я очередь сдана в августе 2024 г., 2-я очередь открыта в сентябре 2026 г., 3-я очередь (УНК) завершается в конце 2027 г. (полный запуск — 2028 г.). В черновике указан другой срок.",
          suggestion:
            "Исправьте сроки по канону: 1-й этап — август 2024, 2-й этап — сентябрь 2026, 3-й этап (УНК) — конец 2027 / 2028 год.",
          ...sourceFromCard(campusCard),
        })
      );
    }

    const nameRegex = /кампус[а-яё]*\s*[«"]([^»"]{3,80})[»"]/gi;
    let nameMatch: RegExpExecArray | null;

    while ((nameMatch = nameRegex.exec(draft)) !== null) {
      const name = normalize(nameMatch[1] ?? "");

      if (name.includes("южный урал")) continue;

      findings.push(
        createFinding({
          level: "red",
          checkpoint: "campus",
          title: "Официальное название кампуса искажено",
          quote: sentenceAt(draft, nameMatch.index),
          explanation:
            "Официальное название объекта — Межуниверситетский кампус мирового уровня «Южный Урал». В черновике использовано другое название.",
          suggestion:
            "Замените название на официальное: кампус «Южный Урал».",
          ...sourceFromCard(campusCard),
        })
      );
    }
  }

  const confirmedNumbers = collectConfirmedNumbers(cards);
  const figureRegex =
    /(\d[\d\s]{0,12})\s+((?:[а-яё]{3,}\s+){0,2})(врач[а-яё]*|человек[а-яё]*|студент[а-яё]*|участник[а-яё]*|пациент[а-яё]*|школ[а-яё]*|наставник[а-яё]*|специалист[а-яё]*|команд[а-яё]*|прототип[а-яё]*|модул[а-яё]*|проект[а-яё]*|мест[а-яё]*|преподавател[а-яё]*|сотрудник[а-яё]*|аспирант[а-яё]*)/gi;
  const seenFigures = new Set<string>();
  let figureMatch: RegExpExecArray | null;

  while ((figureMatch = figureRegex.exec(draft)) !== null) {
    const rawNumber = figureMatch[1] ?? "";
    const key = rawNumber.replace(/\D/g, "");

    if (!key || confirmedNumbers.has(key) || seenFigures.has(key)) continue;

    seenFigures.add(key);

    const quote = sentenceAt(draft, figureMatch.index);
    const sourceCard = primaryProject ?? referencedLabs[0] ?? campusCard;
    const confirmedList =
      primaryProject?.confirmedFigures.join("; ") ??
      referencedLabs[0]?.confirmedIndicators.join("; ") ??
      "проверенные показатели карточки";

    findings.push(
      createFinding({
        level: "yellow",
        checkpoint: "figures",
        title: "Цифра не подтверждена канонической карточкой",
        quote,
        explanation:
          "Метрики «" +
          figureMatch[0].trim() +
          "» нет в подтверждённых показателях карточек. Без подтверждения публиковать число нельзя.",
        suggestion:
          "Удалите число или подтвердите его в карточке. В карточке-источнике подтверждены: " +
          confirmedList +
          ".",
        ...(sourceCard
          ? sourceFromCard(sourceCard)
          : campusCard
            ? sourceFromCard(campusCard)
            : {
                sourceCardId: "campus-passport",
                sourceCardTitle: "Паспорт кампуса «Южный Урал»",
                sourceFolder: "00_Кампус_общие_параметры",
              }),
      })
    );
  }

  for (const rule of AUDIT_STOP_RULES) {
    const match = rule.pattern.exec(draft);
    if (!match || match.index === undefined) continue;

    // Если в документе целиком явно указаны оба соавтора (МИДиС и ЮУГМУ)
    // и не сработало прямое утверждение о единоличном авторстве, не штрафуем за повтор названия проекта в следующих разделах.
    if (
      rule.id === "RULE-COOP-TRAUMA" &&
      !/полностью\s+разработан|разработал\s+артур/i.test(match[0]) &&
      /мидис/i.test(draft) &&
      /юугму/i.test(draft)
    ) {
      continue;
    }

    const checkpoint = AUDIT_CATEGORY_TO_CHECKPOINT[rule.category];
    const targetCard =
      cards.find((card) => card.id === rule.sourceCardId) ?? campusCard;
    const matchQuote = sentenceAt(draft, match.index);

    if (
      rule.id === "RULE-245-PRODUCTS-5REGIONS" &&
      /(?:пят[а-яё]*\s+(?:пилотн[а-яё]*\s+)?регион|сводн[а-яё]+\s+показател|федеральн[а-яё]+\s+показател)/i.test(
        matchQuote
      )
    ) {
      continue;
    }

    const normalizedMatchQuote = normalizeQuoteForCompare(matchQuote);

    // Избегаем дублирования одной и той же ошибки встроенной проверкой и правилом аудита
    const duplicate = findings.find((existing) => {
      if (existing.title.includes("аудит:")) return false;
      if (existing.level !== rule.severity || existing.checkpoint !== checkpoint) {
        return false;
      }
      const existingQuote = normalizeQuoteForCompare(existing.quote);
      return (
        existingQuote === normalizedMatchQuote ||
        existingQuote.includes(normalizedMatchQuote) ||
        normalizedMatchQuote.includes(existingQuote)
      );
    });

    if (duplicate) {
      const caseSuffix = `(аудит: кейсы ${rule.caseNumbers.join(", ")})`;
      if (!duplicate.title.includes("аудит:")) {
        duplicate.title = `${duplicate.title} ${caseSuffix}`;
      }
      continue;
    }

    findings.push(
      createFinding({
        level: rule.severity,
        checkpoint,
        title: `${rule.title} (аудит: кейсы ${rule.caseNumbers.join(", ")})`,
        quote: matchQuote,
        explanation: rule.wrongClaimDescription,
        suggestion: rule.canonicalCorrection,
        ...(targetCard
          ? sourceFromCard(targetCard)
          : {
              sourceCardId: rule.sourceCardId,
              sourceCardTitle: "Паспорт кампуса «Южный Урал» (CAMPUS-PASS-001)",
              sourceFolder: "00_Кампус_общие_параметры",
            }),
      })
    );
  }

  if (primaryProject) {
    const titleInDraft = normalizedDraft.includes(
      normalize(primaryProject.title)
    );

    if (titleInDraft) {
      findings.push(
        createFinding({
          level: "green",
          checkpoint: "names",
          title: "Название проекта совпадает с карточкой",
          quote: primaryProject.title,
          explanation:
            "Официальное название проекта в черновике совпадает с карточкой-источником.",
          suggestion: "Оставьте формулировку без изменений.",
          ...sourceFromCard(primaryProject),
        })
      );
    }

    const sphereRoots = uniqueRoots(primaryProject.sphere);
    const themeMatched = sphereRoots.some((root) => draftRoots.has(root));

    if (themeMatched) {
      findings.push(
        createFinding({
          level: "green",
          checkpoint: "names",
          title: "Тематика проекта подтверждена",
          quote: primaryProject.sphere,
          explanation:
            "Сфера проекта в черновике совпадает с полем «Сфера» карточки.",
          suggestion: "Тематику можно оставить без изменений.",
          ...sourceFromCard(primaryProject),
        })
      );
    }
  }

  const geographyMatched =
    normalizedDraft.includes("челябинск") ||
    normalizedDraft.includes("южный урал");

  if (geographyMatched) {
    const geographyCard =
      campusCard ?? primaryProject ?? referencedLabs[0] ?? null;

    if (geographyCard) {
      findings.push(
        createFinding({
          level: "green",
          checkpoint: "campus",
          title: "География подтверждена базой",
          quote:
            /Челябинск[а-яё]*|Челябинской\s+области/i.exec(draft)?.[0] ??
            "Челябинск",
          explanation:
            "Кампус «Южный Урал» и проекты базы привязаны к Челябинской области — география в черновике корректна.",
          suggestion: "Географию можно оставить без изменений.",
          ...sourceFromCard(geographyCard),
        })
      );
    }
  }

  const deduped = Array.from(
    new Map(findings.map((finding) => [finding.id, finding])).values()
  );

  const levelOrder: Record<FactCheckLevel, number> = {
    red: 0,
    yellow: 1,
    green: 2,
  };

  const sorted = deduped.sort(
    (a, b) => levelOrder[a.level] - levelOrder[b.level]
  );
  const summary = buildSummary(sorted);

  return {
    findings: sorted,
    summary,
    checkpoints: buildCheckpointSummaries(sorted),
    canPublish: summary.red === 0,
    checkedChars: draft.trim().length,
  };
}

function pickParticipants(project: ProjectCard): string[] {
  if (project.isJoint) {
    return Array.from(
      new Set(
        project.participantUniversityIds.map((universityId) =>
          getUniversityName(universityId)
        )
      )
    );
  }

  return Array.from(
    new Set([
      getUniversityName(project.initiatorUniversityId),
      ...project.coExecutors,
    ])
  );
}

function buildProjectRewrite(
  project: ProjectCard,
  lab: LaboratoryCard | null,
  campus: CampusCard | null
): CanonicalRewrite {
  const initiatorName = getUniversityName(project.initiatorUniversityId);
  const participants = pickParticipants(project);
  const isJoint = project.isJoint;
  const title = isJoint
    ? `${project.title}: совместный проект ${participants.join(" и ")}`
    : `${project.title}: ${project.sphere}`;

  const lead = [
    project.referenceDescription,
    `Контур проекта «${project.title}» — «${project.contour}».`,
    `В карточке подтверждены: ${project.confirmedFigures.join("; ")}.`,
  ].join(" ");

  const sections: CanonicalRewriteSection[] = [
    {
      id: "participants",
      heading: "Кто участвует",
      level: 2,
      chunks: [
        {
          id: "participants-1",
          content: isJoint
            ? `Инициатор проекта — ${initiatorName}. Совместная разработка ${participants.join(" и ")}. Индустриальный партнёр — ${project.industrialPartner}. Проект хранится одной карточкой в разделе «02_Совместные_проекты»: нельзя закреплять результат за одним участником.`
            : `Инициатор проекта — ${initiatorName}. Соисполнители — ${project.coExecutors.join(", ") || "нет"}. Индустриальный партнёр — ${project.industrialPartner}.`,
        },
      ],
    },
    {
      id: "result",
      heading: "Что создано и в каком контуре",
      level: 2,
      chunks: [
        {
          id: "result-1",
          content: isJoint
            ? `Совместный проект ${participants.join(" и ")} «${project.title}» находится на стадии «${project.readinessStage}» и развивается в контуре «${project.contour}». Подтверждённые результаты: ${project.confirmedFigures.join("; ")}.`
            : `Проект «${project.title}» находится на стадии «${project.readinessStage}» и развивается в контуре «${project.contour}». Подтверждённые результаты: ${project.confirmedFigures.join("; ")}.`,
        },
      ],
    },
  ];

  if (lab) {
    sections.push({
      id: "lab-status",
      heading: "Статус лаборатории",
      level: 2,
      chunks: [
        {
          id: "lab-status-1",
          content: `${lab.title} (${lab.affiliation}) — ${placementStatusLabels[lab.placementStatus].toLowerCase()}. ${lab.placementDetails}. Партнёр — ${lab.partner}, руководитель — ${lab.head}.${
            lab.placementStatus === "planned"
              ? " До открытия объект нельзя описывать как действующую площадку в УНК кампуса."
              : ""
          }`,
        },
      ],
    });
  }

  if (campus) {
    sections.push({
      id: "campus",
      heading: "Параметры кампуса",
      level: 2,
      chunks: [
        {
          id: "campus-1",
          content: `Кампус «Южный Урал»: ${campus.campusMetrics
            .map((metric) => `${metric.label.toLowerCase()} — ${metric.value}`)
            .join("; ")}.`,
        },
      ],
    });
  }

  const sourceCards: KnowledgeCard[] = [
    project,
    ...(lab ? [lab] : []),
    ...(campus ? [campus] : []),
  ];
  const plainText = [
    title,
    lead,
    ...sections.flatMap((section) => [
      section.heading,
      ...section.chunks.map((chunk) => chunk.content),
    ]),
  ].join("\n\n");

  return {
    title,
    lead,
    sections,
    sourceCardIds: sourceCards.map((card) => card.id),
    sourceCardTitles: sourceCards.map((card) => card.title),
    plainText,
  };
}

function buildLabRewrite(
  lab: LaboratoryCard,
  campus: CampusCard | null
): CanonicalRewrite {
  const title = `${lab.title}: ${lab.affiliation}`;
  const lead = `${lab.referenceDescription} Статус размещения — ${placementStatusLabels[lab.placementStatus].toLowerCase()}: ${lab.placementDetails}.`;
  const sections: CanonicalRewriteSection[] = [
    {
      id: "lab-status",
      heading: "Статус и площадка",
      level: 2,
      chunks: [
        {
          id: "lab-status-1",
          content: `${lab.title} (${lab.affiliation}) — ${placementStatusLabels[lab.placementStatus].toLowerCase()}. ${lab.placementDetails}.`,
        },
      ],
    },
    {
      id: "lab-directions",
      heading: "Направления работы",
      level: 2,
      chunks: [
        {
          id: "lab-directions-1",
          content: `Направления: ${lab.workDirections.join("; ")}. Оборудование: ${lab.equipment.join("; ")}.`,
        },
        {
          id: "lab-directions-2",
          content: `Партнёр — ${lab.partner}, руководитель — ${lab.head}. Подтверждённые показатели: ${lab.confirmedIndicators.join("; ")}.`,
        },
      ],
    },
  ];

  if (campus) {
    sections.push({
      id: "campus",
      heading: "Параметры кампуса",
      level: 2,
      chunks: [
        {
          id: "campus-1",
          content: `Кампус «Южный Урал»: ${campus.campusMetrics
            .map((metric) => `${metric.label.toLowerCase()} — ${metric.value}`)
            .join("; ")}.`,
        },
      ],
    });
  }

  const sourceCards: KnowledgeCard[] = [lab, ...(campus ? [campus] : [])];
  const plainText = [
    title,
    lead,
    ...sections.flatMap((section) => [
      section.heading,
      ...section.chunks.map((chunk) => chunk.content),
    ]),
  ].join("\n\n");

  return {
    title,
    lead,
    sections,
    sourceCardIds: sourceCards.map((card) => card.id),
    sourceCardTitles: sourceCards.map((card) => card.title),
    plainText,
  };
}

function buildCampusRewrite(campus: CampusCard): CanonicalRewrite {
  const title =
    "Межуниверситетский кампус мирового уровня «Южный Урал»: канонические параметры и 7 вузов-резидентов";
  const lead = campus.referenceDescription;
  const sections: CanonicalRewriteSection[] = [
    {
      id: "campus-metrics",
      heading: "Площади, инвестиции, этапы и вместимость",
      level: 2,
      chunks: [
        {
          id: "campus-metrics-1",
          content: campus.campusMetrics
            .map((metric) => `${metric.label}: ${metric.value} (${metric.note})`)
            .join(". "),
        },
        {
          id: "campus-metrics-2",
          content: `Тарифы на проживание (ООО «Отельные решения», «Три звезды»): ${campus.tariffs
            .map((tariff) => `${tariff.label} — ${tariff.value}`)
            .join("; ")}.`,
        },
      ],
    },
    {
      id: "campus-entities",
      heading: "Участники, юридические лица и стоп-лист",
      level: 2,
      chunks: [
        {
          id: "campus-entities-1",
          content: `В проекте кампуса «Южный Урал» участвуют 7 равноправных вузов: ЮУрГУ, ЧелГУ, МИДиС (единственный частный), ЮУГМУ, ЮУрГАУ, МГТУ им. Г. И. Носова и ЮУрГГПУ. Юрлица: ${campus.legalEntities
            .map((entity) => `${entity.name} — ${entity.role}`)
            .join("; ")}.`,
        },
      ],
    },
  ];

  const plainText = [
    title,
    lead,
    ...sections.flatMap((section) => [
      section.heading,
      ...section.chunks.map((chunk) => chunk.content),
    ]),
  ].join("\n\n");

  return {
    title,
    lead,
    sections,
    sourceCardIds: [campus.id],
    sourceCardTitles: [campus.title],
    plainText,
  };
}

export function buildCanonicalRewrite(
  draft: string,
  cards: KnowledgeCard[]
): CanonicalRewrite | null {
  const normalizedDraft = normalize(draft);
  const draftRoots = new Set(tokenRoots(draft));
  const referencedCards = cards.filter((card) =>
    isCardReferenced(card, draftRoots, normalizedDraft)
  );

  const project =
    referencedCards.find(
      (card): card is ProjectCard => card.type === "project" && card.isJoint
    ) ??
    referencedCards.find(
      (card): card is ProjectCard => card.type === "project"
    ) ??
    null;

  const lab =
    referencedCards.find(
      (card): card is LaboratoryCard => card.type === "laboratory"
    ) ?? null;

  const campus =
    referencedCards.find(
      (card): card is CampusCard => card.type === "campus"
    ) ??
    (normalizedDraft.includes("кампус") ||
    normalizedDraft.includes("южный урал") ||
    normalizedDraft.includes("челябинск")
      ? (cards.find((card): card is CampusCard => card.type === "campus") ??
        null)
      : null);

  if (project) {
    return buildProjectRewrite(project, lab, campus);
  }

  if (lab) {
    return buildLabRewrite(lab, campus);
  }

  if (campus) {
    return buildCampusRewrite(campus);
  }

  return null;
}
