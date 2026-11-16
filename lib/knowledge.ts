import { universities } from "./data";
import type { DiskSyncInfo } from "./disk-sync";

export const READINESS_STAGES = [
  "Идея",
  "НИОКР",
  "Прототип",
  "Испытания",
  "Внедрено",
] as const;

export type ReadinessStage = (typeof READINESS_STAGES)[number];

export const CONTOURS = [
  "кампус",
  "ПИШ",
  "УМНОЦ",
  "собственный проект вуза",
] as const;

export type Contour = (typeof CONTOURS)[number];

export const PLACEMENT_STATUSES = ["active", "planned"] as const;

export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

export const placementStatusLabels: Record<PlacementStatus, string> = {
  active: "Действует на площадке вуза",
  planned: "Планируется к открытию в УНК кампуса",
};

export const UNIVERSITY_SUBFOLDERS = [
  {
    key: "passport",
    name: "Паспорт_и_спикеры",
    description: "Паспорт вуза, спикеры и официальные формулировки",
  },
  {
    key: "infrastructure",
    name: "Инфраструктура_и_лаборатории",
    description: "Лаборатории, центры и объекты инфраструктуры",
  },
  {
    key: "products",
    name: "Продукты_и_проекты",
    description: "Продукты, разработки и проекты вуза",
  },
  {
    key: "partners",
    name: "Партнёры_и_соглашения",
    description: "Индустриальные партнёры и соглашения",
  },
  {
    key: "articles",
    name: "Готовые_статьи",
    description: "Утверждённые материалы для публикации",
  },
] as const;

export type UniversitySubfolderKey =
  (typeof UNIVERSITY_SUBFOLDERS)[number]["key"];

export const CUSTOM_FIELD_TYPES = [
  "shortText",
  "longText",
  "number",
  "date",
  "list",
  "select",
  "cardReference",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const customFieldTypeLabels: Record<CustomFieldType, string> = {
  shortText: "Короткий текст",
  longText: "Длинный текст",
  number: "Число",
  date: "Дата",
  list: "Список",
  select: "Выбор из вариантов",
  cardReference: "Ссылка на другую карточку",
};

export type CustomCardField = {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
};

export type CardTypeDefinition = {
  id: string;
  name: string;
  description: string;
  fields: CustomCardField[];
  createdAt: string;
  updatedAt: string;
};

export type CardTypeWithStats = CardTypeDefinition & {
  cardCount: number;
};

export const folderIds = {
  campus: "00_campus",
  universities: "01_universities",
  joint: "02_joint",
  customRoot: "03_custom",
  customType: (typeId: string) => `03_custom/${typeId}`,
  university: (universityId: string) => `01_universities/${universityId}`,
  subfolder: (universityId: string, key: UniversitySubfolderKey) =>
    `01_universities/${universityId}/${key}`,
};

export type KnowledgeFolderKind =
  | "campus"
  | "universities-root"
  | "university"
  | "subfolder"
  | "joint"
  | "custom-root"
  | "custom-type";

export type KnowledgeFolderNode = {
  id: string;
  name: string;
  description: string;
  kind: KnowledgeFolderKind;
  universityId?: string;
  children?: KnowledgeFolderNode[];
};

export const knowledgeTree: KnowledgeFolderNode[] = [
  {
    id: folderIds.campus,
    name: "00_Кампус_общие_параметры",
    description:
      "Единый паспорт кампуса: площади, стоимость, сроки очередей, тарифы, юрлица и стоп-лист частых ошибок",
    kind: "campus",
  },
  {
    id: folderIds.universities,
    name: "01_Вузы_резиденты",
    description: "Семь университетов-резидентов и их тематические папки",
    kind: "universities-root",
    children: universities.map((university) => ({
      id: folderIds.university(university.id),
      name: university.shortName,
      description: university.fullName,
      kind: "university",
      universityId: university.id,
      children: UNIVERSITY_SUBFOLDERS.map((subfolder) => ({
        id: folderIds.subfolder(university.id, subfolder.key),
        name: subfolder.name,
        description: subfolder.description,
        kind: "subfolder",
        universityId: university.id,
      })),
    })),
  },
  {
    id: folderIds.joint,
    name: "02_Совместные_проекты",
    description:
      "Межвузовские проекты: одна карточка хранится здесь и ссылкой показывается в папках вузов-участников",
    kind: "joint",
  },
];

export function buildKnowledgeTree(
  customTypes: CardTypeDefinition[] = []
): KnowledgeFolderNode[] {
  if (customTypes.length === 0) return knowledgeTree;

  return [
    ...knowledgeTree,
    {
      id: folderIds.customRoot,
      name: "03_Пользовательские_типы",
      description:
        "Типы карточек, созданные администратором канона в конструкторе полей",
      kind: "custom-root",
      children: customTypes.map((type) => ({
        id: folderIds.customType(type.id),
        name: type.name,
        description: type.description || "Пользовательский тип карточки",
        kind: "custom-type",
      })),
    },
  ];
}

export type KnowledgeCardType = "project" | "laboratory" | "campus" | "custom";

export const CARD_STATUSES = ["approved", "pending", "rejected"] as const;

export type CardStatus = (typeof CARD_STATUSES)[number];

export const cardStatusLabels: Record<CardStatus, string> = {
  approved: "В каноне",
  pending: "На подтверждении",
  rejected: "Отклонена",
};

export type CardEditRequestStatus = "open" | "resolved";

export type CardEditRequest = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorOrganization: string;
  message: string;
  createdAt: string;
  status: CardEditRequestStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
};

type KnowledgeCardBase = {
  id: string;
  type: KnowledgeCardType;
  title: string;
  folderId: string;
  owners: string[];
  referenceDescription: string;
  stopFormula: string;
  createdAt: string;
  updatedAt: string;
  diskSync?: DiskSyncInfo;
  status?: CardStatus;
  submittedBy?: string;
  submittedByName?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  participantApprovals?: string[];
  editRequests?: CardEditRequest[];
};

export type ProjectCard = KnowledgeCardBase & {
  type: "project";
  sphere: string;
  initiatorUniversityId: string;
  coExecutors: string[];
  industrialPartner: string;
  readinessStage: ReadinessStage;
  contour: Contour;
  confirmedFigures: string[];
  isJoint: boolean;
  participantUniversityIds: string[];
};

export type LaboratoryCard = KnowledgeCardBase & {
  type: "laboratory";
  affiliation: string;
  partner: string;
  head: string;
  placementStatus: PlacementStatus;
  placementDetails: string;
  workDirections: string[];
  equipment: string[];
  confirmedIndicators: string[];
};

export type CampusMetric = {
  label: string;
  value: string;
  note: string;
};

export type CampusTariff = {
  label: string;
  value: string;
};

export type CampusLegalEntity = {
  name: string;
  role: string;
};

export type CampusCard = KnowledgeCardBase & {
  type: "campus";
  campusMetrics: CampusMetric[];
  tariffs: CampusTariff[];
  legalEntities: CampusLegalEntity[];
  stopList: string[];
};

export type CustomFieldValue = string | number | string[] | null;

export type CustomCard = KnowledgeCardBase & {
  type: "custom";
  customTypeId: string;
  customFields: Record<string, CustomFieldValue>;
};

export type KnowledgeCard =
  ProjectCard | LaboratoryCard | CampusCard | CustomCard;

export type KnowledgeCardDraft =
  | Omit<ProjectCard, "id" | "createdAt" | "updatedAt">
  | Omit<LaboratoryCard, "id" | "createdAt" | "updatedAt">
  | Omit<CampusCard, "id" | "createdAt" | "updatedAt">
  | Omit<CustomCard, "id" | "createdAt" | "updatedAt">;

export const knowledgeCardTypeLabels: Record<KnowledgeCardType, string> = {
  project: "Проект / продукт",
  laboratory: "Лаборатория / объект",
  campus: "Паспорт кампуса",
  custom: "Пользовательская карточка",
};

export function getCardTypeLabel(
  card: KnowledgeCard,
  customTypes: CardTypeDefinition[] = []
): string {
  if (card.type === "custom") {
    return (
      customTypes.find((type) => type.id === card.customTypeId)?.name ??
      "Пользовательский тип"
    );
  }

  return knowledgeCardTypeLabels[card.type];
}

export function isJointProject(card: KnowledgeCard): card is ProjectCard {
  return card.type === "project" && card.isJoint;
}

export function getCardStatus(card: KnowledgeCard): CardStatus {
  return card.status ?? "approved";
}

export function isCardApproved(card: KnowledgeCard): boolean {
  return getCardStatus(card) === "approved";
}

export function getParticipantApprovals(card: KnowledgeCard): string[] {
  if (!isJointProject(card)) return [];

  return card.participantApprovals ?? [];
}

export function isJointFullyApproved(card: KnowledgeCard): boolean {
  if (!isJointProject(card)) return true;

  const approvals = new Set(getParticipantApprovals(card));

  return card.participantUniversityIds.every((id) => approvals.has(id));
}

export function getPendingEditRequests(card: KnowledgeCard): CardEditRequest[] {
  return (card.editRequests ?? []).filter(
    (request) => request.status === "open"
  );
}

export function findFolder(
  folderId: string,
  nodes: KnowledgeFolderNode[] = knowledgeTree
): KnowledgeFolderNode | null {
  for (const node of nodes) {
    if (node.id === folderId) return node;
    if (node.children) {
      const found = findFolder(folderId, node.children);
      if (found) return found;
    }
  }

  return null;
}

export function getFolderPath(
  folderId: string,
  nodes: KnowledgeFolderNode[] = knowledgeTree,
  path: KnowledgeFolderNode[] = []
): KnowledgeFolderNode[] {
  for (const node of nodes) {
    const nextPath = [...path, node];
    if (node.id === folderId) return nextPath;
    if (node.children) {
      const found = getFolderPath(folderId, node.children, nextPath);
      if (found.length > 0) return found;
    }
  }

  return [];
}

export function getFolderPathLabel(
  folderId: string,
  nodes: KnowledgeFolderNode[] = knowledgeTree
): string {
  const path = getFolderPath(folderId, nodes);

  if (path.length === 0) return folderId;

  return path.map((folder) => folder.name).join(" / ");
}

export function getUniversityIdFromFolder(folderId: string): string | null {
  const parts = folderId.split("/");

  if (parts[0] !== folderIds.universities || parts.length < 2) return null;

  return parts[1] ?? null;
}

function collectFolderIds(node: KnowledgeFolderNode): string[] {
  return [
    node.id,
    ...(node.children ?? []).flatMap((child) => collectFolderIds(child)),
  ];
}

export function getCardsForFolder(
  folderId: string,
  cards: KnowledgeCard[],
  nodes: KnowledgeFolderNode[] = knowledgeTree
): KnowledgeCard[] {
  const folder = findFolder(folderId, nodes);

  if (!folder) return [];

  const folderIdsSet = new Set(collectFolderIds(folder));
  const universityId = getUniversityIdFromFolder(folderId);
  const isUniversityRoot = universityId
    ? folderId === folderIds.university(universityId)
    : false;
  const isProductsFolder = universityId
    ? folderId === folderIds.subfolder(universityId, "products")
    : false;

  const seen = new Set<string>();

  return cards.filter((card) => {
    if (seen.has(card.id)) return false;

    if (folderIdsSet.has(card.folderId)) {
      seen.add(card.id);
      return true;
    }

    const isJointReference =
      universityId &&
      !card.folderId.startsWith(`${folderIds.universities}/`) &&
      isJointProject(card) &&
      card.participantUniversityIds.includes(universityId) &&
      (isUniversityRoot || isProductsFolder);

    if (isJointReference) {
      seen.add(card.id);
      return true;
    }

    return false;
  });
}

export function getUniversityById(universityId: string) {
  return universities.find((university) => university.id === universityId);
}

export function getUniversityName(universityId: string): string {
  return getUniversityById(universityId)?.shortName ?? universityId;
}

export function getUniversityFullName(universityId: string): string {
  return getUniversityById(universityId)?.fullName ?? universityId;
}

export function isJointReferenceForFolder(
  card: KnowledgeCard,
  folderId: string
): boolean {
  const universityId = getUniversityIdFromFolder(folderId);

  if (!universityId || !isJointProject(card)) return false;
  if (card.folderId === folderId) return false;

  return card.participantUniversityIds.includes(universityId);
}

const seedTimestamp = "2026-11-13T09:00:00.000Z";

export const knowledgeSeedCards: KnowledgeCard[] = [
  {
    id: "campus-passport",
    type: "campus",
    title: "Паспорт кампуса «Южный Урал» (CAMPUS-PASS-001)",
    folderId: folderIds.campus,
    owners: [
      "Администратор канона",
      "Сергей Иванов, АНО «РИОН»",
      "Наталья Григорьева, Минобрнауки Челябинской области",
      "Виктор Козлов, ООО «ЧКК»",
    ],
    referenceDescription:
      "Межуниверситетский кампус мирового уровня «Южный Урал» (г. Челябинск) объединяет 7 равноправных вузов-резидентов: ЮУрГУ, ЧелГУ, МИДиС (единственный частный вуз), ЮУГМУ, ЮУрГАУ, МГТУ им. Г. И. Носова и ЮУрГГПУ. Строительство разделено на 3 этапа: 1-я очередь (август 2024 г., 2 семиэтажные гостиницы на 336 мест), 2-я очередь (ввод 11.09.2026, открытие 15.09.2026, 6 корпусов на 3 064 места) и 3-я очередь (УНК 40,3 тыс. м² и модульный конференц-зал — конец 2027 г., полный запуск всей инфраструктуры — 2028 г.). Проектная вместимость гостиниц — 3 400 мест, численность обучающихся — 5 000 человек.",
    stopFormula:
      "Не указывать 5 или 6 вузов вместо 7; не называть площадь 110 или 114 тыс. м²; не путать 3 400 мест проживания и 5 000 обучающихся; не приписывать Челябинску сводную федеральную цифру 5 регионов РФ (37 программ / 245 решений — в Челябинске 8 программ и 83–84 продукта); не называть лаборатории работающими в УНК до завершения 3-й очереди в конце 2027 г.",
    campusMetrics: [
      {
        label: "Общая площадь объектов",
        value: "121,8–123 тыс. м²",
        note: "Жилая часть — 68–70 тыс. м², УНК — 40,3 тыс. м² (40 306 м²), два земельных участка — 58,8 тыс. м²",
      },
      {
        label: "Стоимость и инвестиции",
        value: "16,75 / до 34,6 млрд ₽",
        note: "Концессия 2022 г. — 16,75 млрд ₽; промежуточно ВТБ — 21,1 млрд ₽; совокупный объём инвестиций — до 34,6 млрд ₽",
      },
      {
        label: "Капитальный грант (2022 г.)",
        value: "9,13 млрд ₽",
        note: "7,9 млрд ₽ (86,5%) — федеральный бюджет + 1,23 млрд ₽ (13,5%) — областной бюджет; в 2026 г. ВЭБ.РФ выделил 4 млрд ₽",
      },
      {
        label: "Этапы строительства (3 очереди)",
        value: "2024 / 2026 / 2027–2028",
        note: "1-я (авг 2024): 2 гост. / 336 мест; 2-я (11–15.09.2026): 6 корп. (4×16эт + 2×7эт, 5 студ. + 1 НПС) / 3 064 места; 3-я (УНК): конец 2027 / 2028 г.",
      },
      {
        label: "Вместимость и контингент",
        value: "3 400 мест / 5 000 уч.",
        note: "8 гостиниц на 3 400 мест для проживания студентов и преподавателей; 5 000 — общая численность обучающихся",
      },
      {
        label: "Лаборатории и продуктовый портфель",
        value: "40–44 лаб. / 8 программ (83–84 продукта)",
        note: "В УНК проектируется 40–44 лаборатории (12 с партнёрами, ~20 на согласовании). Региональный портфель: 8 программ, 83–84 решения",
      },
    ],
    tariffs: [
      {
        label: "Двухместное (16-этажные корпуса)",
        value: "10 900 ₽ / мес. (2026/27 уч. год)",
      },
      {
        label: "Двухместное (7-этажные корпуса)",
        value: "11 900 ₽ / мес. (2026/27 уч. год)",
      },
      {
        label: "Трёхместное размещение",
        value: "8 500 ₽ / мес. (тариф 8 600 ₽ от 2024 г. устарел)",
      },
      {
        label: "Одноместное размещение",
        value: "от 16 800 ₽ / мес.",
      },
      {
        label: "Сервис «Три звезды» (приглашённые специалисты)",
        value: "4 750 ₽ / сутки (еженедельная уборка и смена белья)",
      },
    ],
    legalEntities: [
      {
        name: "ООО «Челябинская концессионная компания» (ООО «ЧКК»)",
        role: "Концессионер проекта (форма — концессионное соглашение в формате ГЧП)",
      },
      {
        name: "ВТБ Инфраструктурный холдинг и ВЭБ.РФ",
        role: "Инвестор / холдинг (ВТБ) и финансовый партнёр проекта (ВЭБ.РФ)",
      },
      {
        name: "Компания «ВТБ Девелопмент»",
        role: "Технический заказчик строительства объектов кампуса",
      },
      {
        name: "ООО «Отельные решения» (г. Екатеринбург)",
        role: "Оператор целевой эксплуатации гостиниц (категория «Три звезды»)",
      },
      {
        name: "АНО «РИОН» и Минобрнауки Челябинской области",
        role: "Региональные координаторы (министр Виталий Литке; ГФИ — Денис Чернятьев; Минобрнауки России — Андрей Омельчук)",
      },
    ],
    stopList: [
      "Запрещено указывать площадь 110 или 114 тыс. м² (либо называть 114 тыс. м² площадью земли — участки 58,8 тыс. м², объекты — 121,8–123 тыс. м²).",
      "Запрещено писать «проживать будут 5 000 человек»: мест проживания 3 400 (8 гостиниц), а 5 000 — численность обучающихся.",
      "Запрещено приписывать Челябинску сводку 5 регионов РФ («37 продуктовых программ и 245 решений»): в Челябинске 8 программ и 83–84 продукта.",
      "Запрещено описывать лаборатории как уже работающие в здании УНК кампуса до завершения строительства в конце 2027 года.",
      "Стоп-опечатки: «ВТД Девелопмент», «Денис Чертьев», «ЮУрГППУ», «ЮУрГМУ», «кинопласт», «робот Куки», «Министерство образования и науки РФ» (верно — Минобрнауки России).",
    ],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-susu-digital-twin",
    type: "project",
    title: "Цифровой двойник трубопрокатного производства",
    folderId: folderIds.subfolder("susu", "products"),
    owners: ["Анна Смирнова, ЮУрГУ", "Игорь Белов, ПАО «ТМК»"],
    sphere: "Металлургия и цифровое производство",
    initiatorUniversityId: "susu",
    coExecutors: ["МГТУ им. Г. И. Носова"],
    industrialPartner: "ПАО «Трубная металлургическая компания»",
    readinessStage: "Прототип",
    contour: "ПИШ",
    confirmedFigures: [
      "1 цифровой двойник линии трубопроката",
      "Сокращение времени наладки на 18% на пилотном участке",
      "2025 год — запуск опытной эксплуатации",
    ],
    referenceDescription:
      "ЮУрГУ совместно с МГТУ им. Г. И. Носова и ПАО «ТМК» создаёт цифровой двойник линии трубопроката в контуре Передовой инженерной школы (ПИШ) «Сердце Урала». Прототип собирает телеметрию оборудования и помогает наладчикам проверять режимы без остановки производства.",
    stopFormula:
      "Не утверждать, что цифровой двойник внедрён на всех площадках ТМК: подтверждён только пилотный участок. Не приписывать проект исключительно ЮУрГУ — МГТУ им. Г. И. Носова указан соисполнителем.",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-susu-pish-machines",
    type: "project",
    title: "Спецтехника ПИШ «Сердце Урала» (коммунальная машина и дистанционный погрузчик)",
    folderId: folderIds.subfolder("susu", "products"),
    owners: ["Анна Смирнова, ЮУрГУ"],
    sphere: "Машиностроение и спецтехника",
    initiatorUniversityId: "susu",
    coExecutors: [],
    industrialPartner: "АО «Автомобильный завод „Урал“» / ДСТ-Урал",
    readinessStage: "Прототип",
    contour: "ПИШ",
    confirmedFigures: [
      "Бесшумная электрическая коммунальная машина",
      "Погрузчик с дистанционным управлением",
      "Контур второй волны федерального проекта ПИШ",
    ],
    referenceDescription:
      "Экспонаты выставки открытия 2-й очереди гостиниц — бесшумная электрическая коммунальная машина и дистанционный погрузчик — являются разработками федерального проекта Передовой инженерной школы (ПИШ) «Сердце Урала» ЮУрГУ.",
    stopFormula:
      "Кейс 57 аудита: не приписывать разработки отдельной федеральной программы ПИШ «Сердце Урала» напрямую бюджету кампуса без явного указания контура ПИШ.",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-susu-arctic-bus",
    type: "project",
    title: "Арктический автобус-вездеход «Арктика» (Урал-427701)",
    folderId: folderIds.subfolder("susu", "products"),
    owners: ["Анна Смирнова, ЮУрГУ"],
    sphere: "Транспортно-логистические системы",
    initiatorUniversityId: "susu",
    coExecutors: [],
    industrialPartner: "АО «Автомобильный завод „Урал“»",
    readinessStage: "Испытания",
    contour: "собственный проект вуза",
    confirmedFigures: [
      "Разработка 2022–2023 годов",
      "Демонстрация образца на открытии 2-й очереди гостиниц 15.09.2026",
      "Плановый запуск серии на АЗ «Урал» перенесён на конец 2026 года",
    ],
    referenceDescription:
      "Совместная разработка инженеров ЮУрГУ и автозавода «Урал» (2022–2023 гг.) для эксплуатации в арктических условиях. Машина демонстрировалась на выставке при открытии 2-й очереди гостиниц кампуса.",
    stopFormula:
      "Кейс 56 аудита: всегда указывать год разработки (2022–2023 гг.) и актуальный перенесённый срок серийного выпуска (конец 2026 г.), не выдавать старые планы 2024–2025 гг. за состоявшуюся серию.",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-susu-ecomonitor",
    type: "project",
    title: "Экомониторинг: модель SUSUPLUME и система «Экомонитор»",
    folderId: folderIds.subfolder("susu", "products"),
    owners: ["Анна Смирнова, ЮУрГУ"],
    sphere: "Экология и живые системы",
    initiatorUniversityId: "susu",
    coExecutors: [],
    industrialPartner: "Промышленные предприятия Челябинской области",
    readinessStage: "Прототип",
    contour: "кампус",
    confirmedFigures: [
      "Расчёт рассеивания загрязняющих веществ по модели SUSUPLUME выполняется примерно в 100 раз быстрее",
      "Система «Экомонитор»: вдвое дешевле при внедрении и в 5 раз при эксплуатации по сравнению с импортными аналогами",
    ],
    referenceDescription:
      "Два самостоятельных решения ЮУрГУ в контуре экологического мониторинга: вычислительная модель SUSUPLUME для расчёта концентрации примесей в атмосфере и программно-аппаратный комплекс «Экомонитор».",
    stopFormula:
      "Кейс 58 аудита: не склеивать метрики модели SUSUPLUME (скорость ×100) и комплекса «Экомонитор» (дешевле в 2 и 5 раз) в один неразделённый продукт.",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-csu-cnc-software",
    type: "project",
    title: "ПО управления пятиосевыми станками с ЧПУ и ПЛК",
    folderId: folderIds.subfolder("csu", "products"),
    owners: ["Елена Ковалёва, ЧелГУ"],
    sphere: "Интеллектуальное производство и ЧПУ",
    initiatorUniversityId: "csu",
    coExecutors: [],
    industrialPartner: "Промышленные предприятия региона",
    readinessStage: "Прототип",
    contour: "кампус",
    confirmedFigures: [
      "Отечественное ПО управления станками с ЧПУ",
      "Программирование ПЛК и сервоприводов (в т.ч. Yaskawa)",
    ],
    referenceDescription:
      "Разработка ЧелГУ по созданию отечественного программного обеспечения для управления пятиосевыми станками с числовым программным управлением, включая программирование ПЛК и сервоприводов Yaskawa.",
    stopFormula:
      "Кейс 54 аудита: не смешивать программный проект ЧелГУ (где используются приводы Yaskawa) со сторонними разработками как «полностью отечественный станок без импортных комплектующих».",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-csu-water-monitoring",
    type: "project",
    title: "Экологический мониторинг водоёмов Челябинской области",
    folderId: folderIds.subfolder("csu", "products"),
    owners: ["Елена Ковалёва, ЧелГУ"],
    sphere: "Экология и природопользование",
    initiatorUniversityId: "csu",
    coExecutors: ["ЮУрГГПУ"],
    industrialPartner: "Министерство экологии Челябинской области",
    readinessStage: "Испытания",
    contour: "УМНОЦ",
    confirmedFigures: [
      "12 контрольных точек мониторинга",
      "6 сезонных циклов наблюдений",
      "2024–2026 годы — полевой этап",
    ],
    referenceDescription:
      "ЧелГУ развивает систему экологического мониторинга водоёмов региона. Датчики и лабораторные пробы объединяются в единую карту состояния воды, а результаты передаются профильному министерству. ЮУрГГПУ участвует в подготовке школьных исследовательских групп.",
    stopFormula:
      "Не называть систему всероссийской и не указывать водоёмы за пределами Челябинской области. Не приписывать полевые данные ЧелГУ одному: часть измерений выполняют партнёрские группы.",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-midis-service-design",
    type: "project",
    title: "Платформа сервисного дизайна для креативных индустрий",
    folderId: folderIds.subfolder("midis", "products"),
    owners: ["Мария Лебедева, МИДиС"],
    sphere: "Креативные индустрии и сервис",
    initiatorUniversityId: "midis",
    coExecutors: [],
    industrialPartner: "АНО «Креативные индустрии Урала»",
    readinessStage: "Идея",
    contour: "собственный проект вуза",
    confirmedFigures: ["3 пилотные команды", "2026 год — запуск акселератора"],
    referenceDescription:
      "МИДиС проектирует платформу, которая помогает командам креативных индустрий проходить путь от исследования пользователя до прототипа услуги. На старте участвуют три пилотные команды, а в 2026 году планируется акселератор.",
    stopFormula:
      "Не указывать, что платформа уже работает и приносит выручку: проект находится на стадии «Идея». Не добавлять партнёров, кроме АНО «Креативные индустрии Урала».",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-susmu-rehab",
    type: "project",
    title: "Программа реабилитации после эндопротезирования",
    folderId: folderIds.subfolder("susmu", "products"),
    owners: ["Дмитрий Петров, ЮУГМУ", "Наталья Орлова, ЧОКБ"],
    sphere: "Медицина и реабилитация",
    initiatorUniversityId: "susmu",
    coExecutors: [],
    industrialPartner: "ГАУЗ «Челябинская областная клиническая больница»",
    readinessStage: "НИОКР",
    contour: "кампус",
    confirmedFigures: [
      "2 пилотные группы пациентов",
      "2026 год — набор 120 участников исследования",
    ],
    referenceDescription:
      "ЮУГМУ вместе с Челябинской областной клинической больницей разрабатывает программу восстановления после эндопротезирования. Исследование объединяет клинические протоколы, дневники пациентов и дистанционный контроль реабилитации.",
    stopFormula:
      "Не заявлять о доказанной эффективности до завершения НИОКР. Не указывать 120 участников как уже прошедших программу: это планируемый набор 2026 года.",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-sursau-agroscout",
    type: "project",
    title: "Агроскаутинг на основе компьютерного зрения",
    folderId: folderIds.subfolder("sursau", "products"),
    owners: ["Ирина Волкова, ЮУрГАУ"],
    sphere: "АПК и цифровые технологии",
    initiatorUniversityId: "sursau",
    coExecutors: ["ЧелГУ"],
    industrialPartner: "ГК «Здоровая ферма»",
    readinessStage: "Испытания",
    contour: "УМНОЦ",
    confirmedFigures: [
      "4 поля пилотного хозяйства",
      "Точность распознавания 92% на тестовой выборке",
      "2025 год — полевые испытания",
    ],
    referenceDescription:
      "ЮУрГАУ испытывает агроскаутинг, который распознаёт состояние посевов по снимкам с дронов и мобильных камер. ЧелГУ помогает с моделью компьютерного зрения, а индустриальный партнёр предоставляет поля для полевых испытаний.",
    stopFormula:
      "Не переносить точность 92% на все культуры и регионы: показатель получен на тестовой выборке четырёх полей. Не называть систему полностью автономной.",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-mgtu-metal-quality",
    type: "project",
    title: "Цифровая платформа прогноза качества металла",
    folderId: folderIds.subfolder("mgtu", "products"),
    owners: ["Ольга Соколова, МГТУ им. Г. И. Носова"],
    sphere: "Металлургия и промышленная аналитика",
    initiatorUniversityId: "mgtu",
    coExecutors: ["ЮУрГУ"],
    industrialPartner: "ПАО «Магнитогорский металлургический комбинат»",
    readinessStage: "Внедрено",
    contour: "ПИШ",
    confirmedFigures: [
      "2 производственные линии",
      "Снижение брака на 7% за 2025 год",
    ],
    referenceDescription:
      "МГТУ им. Г. И. Носова внедрил на ММК платформу прогноза качества металла. Модель анализирует параметры плавки и предупреждает технологов о риске брака. ЮУрГУ участвовал в разработке алгоритмов.",
    stopFormula:
      "Не распространять снижение брака на 7% на другие комбинаты и линии. Не указывать, что платформа заменила технологов: она выдаёт рекомендации.",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "project-suspgu-mentor",
    type: "project",
    title: "Педагогический навигатор наставника",
    folderId: folderIds.subfolder("suspgu", "products"),
    owners: ["Светлана Морозова, ЮУрГГПУ"],
    sphere: "Образование и педагогика",
    initiatorUniversityId: "suspgu",
    coExecutors: ["ЧелГУ"],
    industrialPartner: "Министерство образования и науки Челябинской области",
    readinessStage: "Прототип",
    contour: "собственный проект вуза",
    confirmedFigures: [
      "18 школ-пилотов",
      "240 наставников в тестировании",
      "2026 год — опытная эксплуатация",
    ],
    referenceDescription:
      "ЮУрГГПУ создаёт навигатор для наставников, который подсказывает маршруты адаптации молодых педагогов. В тестировании участвуют 18 школ и 240 наставников, а ЧелГУ помогает с аналитикой образовательных данных.",
    stopFormula:
      "Не называть навигатор обязательным для всех школ региона: это пилотный проект. Не указывать, что 240 наставников уже прошли полный курс.",
    isJoint: false,
    participantUniversityIds: [],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "lab-susu-digital-twins",
    type: "laboratory",
    title: "Лаборатория цифровых двойников и промышленного ИИ",
    folderId: folderIds.subfolder("susu", "infrastructure"),
    owners: ["Анна Смирнова, ЮУрГУ"],
    affiliation: "ЮУрГУ",
    partner: "ПАО «Трубная металлургическая компания»",
    head: "Анна Смирнова",
    placementStatus: "active",
    placementDetails:
      "Действует на площадке вуза (пр. Ленина, 76, главный корпус, с 2021 года)",
    workDirections: [
      "Промышленные цифровые двойники",
      "Компьютерное зрение",
      "Предиктивная аналитика оборудования",
    ],
    equipment: [
      "Промышленный стенд сбора телеметрии",
      "GPU-кластер",
      "Стенд виртуальной наладки",
    ],
    confirmedIndicators: [
      "12 действующих проектов",
      "38 сотрудников и аспирантов",
    ],
    referenceDescription:
      "Лаборатория цифровых двойников и промышленного ИИ ЮУрГУ работает в главном корпусе университета. Команда собирает цифровые модели производственных линий, испытывает алгоритмы компьютерного зрения и предиктивной аналитики на промышленном стенде.",
    stopFormula:
      "Не утверждать, что лаборатория находится в УНК кампуса: она действует в главном корпусе ЮУрГУ на пр. Ленина, 76 с 2021 года. Не менять год открытия и адрес.",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "lab-csu-microelectronics-insmart",
    type: "laboratory",
    title: "Лаборатория микроэлектроники и радиофизики (ЧелГУ × ГК inSmart)",
    folderId: folderIds.subfolder("csu", "infrastructure"),
    owners: ["Елена Ковалёва, ЧелГУ"],
    affiliation: "ЧелГУ",
    partner: "ГК inSmart",
    head: "Елена Ковалёва",
    placementStatus: "planned",
    placementDetails:
      "Действует на площадке ЧелГУ, планируется масштабирование в УНК кампуса (2027)",
    workDirections: [
      "Микроэлектроника и радиофизика",
      "Умная автоматика и приборостроение",
    ],
    equipment: ["Стенд радиофизических измерений", "Контроллеры inSmart"],
    confirmedIndicators: [
      "Совместный индустриальный партнёр — ГК inSmart (также сотрудничает с МИДиС)",
    ],
    referenceDescription:
      "Лаборатория микроэлектроники и радиофизики ЧелГУ создана при участии ГК inSmart. В аналитике уникальных партнёров ГК inSmart учитывается однократно, несмотря на кооперацию и с ЧелГУ, и с МИДиС.",
    stopFormula:
      "Кейс 52 аудита: не дублировать ГК inSmart как двух разных партнёров в сводных отчётах; не писать, что корпус УНК уже введён в эксплуатацию.",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "lab-susmu-vr-biomed",
    type: "laboratory",
    title: "Лаборатория биомедицинских VR-технологий (LAB-VUZ-004)",
    folderId: folderIds.subfolder("susmu", "infrastructure"),
    owners: ["Дмитрий Петров, ЮУГМУ", "Мария Лебедева, МИДиС"],
    affiliation: "ЮУГМУ",
    partner: "ООО «ЧКК»",
    head: "Дмитрий Петров",
    placementStatus: "planned",
    placementDetails: "Планируется к открытию в УНК кампуса (2027)",
    workDirections: [
      "VR-симуляторы клинических сценариев",
      "Биомедицинская визуализация",
      "Оценка практических навыков врачей",
    ],
    equipment: [
      "VR-шлемы",
      "Тактильные тренажёры",
      "Стенд записи клинических сценариев",
    ],
    confirmedIndicators: [
      "Проектная мощность — 8 рабочих мест",
      "2027 год — планируемый ввод",
    ],
    referenceDescription:
      "Лаборатория биомедицинских VR-технологий создаётся ЮУГМУ в учебно-научном корпусе кампуса (ввод УНК — конец 2027 г.). Она будет отрабатывать клинические сценарии в виртуальной среде и оценивать навыки студентов и врачей.",
    stopFormula:
      "Прямой запрет (ТЗ): нельзя писать, что лаборатория уже открыта и работает в новом УНК кампуса — в карточке статус «Планируется к открытию» (2027).",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "lab-midis-kuka",
    type: "laboratory",
    title:
      "Центр промышленного и архитектурного дизайна с роботом KUKA (LAB-MIDIS-KUKA)",
    folderId: folderIds.subfolder("midis", "infrastructure"),
    owners: ["Мария Лебедева, МИДиС"],
    affiliation: "МИДиС",
    partner: "ГК «Голос» (будущая лаборатория в УНК); ранее проработка с ГК inSmart",
    head: "Мария Лебедева",
    placementStatus: "active",
    placementDetails:
      "Робот-манипулятор KUKA действует на площадке МИДиС (ул. Ворошилова, 12); новая лаборатория промдизайна с ГК «Голос» планируется в УНК кампуса (2027)",
    workDirections: [
      "Промышленный и архитектурный дизайн",
      "Фрезеровка и резка прототипов из пенопласта, дерева и металла",
      "Аддитивное и роботизированное производство арт-объектов",
    ],
    equipment: [
      "Промышленный робот-манипулятор KUKA",
      "3D-принтеры и фрезерный модуль",
    ],
    confirmedIndicators: [
      "Действующий центр на площадке МИДиС",
      "Партнёр лаборатории в УНК — девелопер ГК «Голос»",
    ],
    referenceDescription:
      "На площадке МИДиС работает промышленный робот-манипулятор KUKA, вырезающий точные модели и скульптуры из пенопласта, дерева и металла с последующей доработкой и окраской. Партнёром будущей лаборатории МИДиС в УНК кампуса выступает ГК «Голос».",
    stopFormula:
      "Кейсы 60–61 аудита: запрещены искажения «робот Куки» (верно — робот KUKA) и «кинопласт» (верно — пенопласт). Нельзя утверждать, что робот KUKA уже работает в новом здании УНК кампуса.",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "joint-midis-susmu-trauma",
    type: "project",
    title: "Виртуальный тренажёр травмпункта (PROJ-COOP-001)",
    folderId: folderIds.joint,
    owners: ["Мария Лебедева, МИДиС", "Дмитрий Петров, ЮУГМУ"],
    sphere: "Медицина, медицинское образование и VR/3D-технологии",
    initiatorUniversityId: "midis",
    coExecutors: ["ЮУГМУ"],
    industrialPartner: "ГАУЗ «Челябинская областная клиническая больница»",
    readinessStage: "Прототип",
    contour: "кампус",
    confirmedFigures: [
      "1 VR-сценарий травмпункта",
      "12 учебных модулей",
      "2025 год — пилотная апробация (руководитель от ЮУГМУ — Артур Шамселов)",
    ],
    referenceDescription:
      "«Виртуальный тренажёр травмпункта» — совместный проект Международного института дизайна и сервиса (МИДиС) и Южно-Уральского государственного медицинского университета (ЮУГМУ) в контуре кампуса «Южный Урал». МИДиС отвечает за 3D-моделирование и геймдев-среду, ЮУГМУ — за медицинскую экспертизу и клинические сценарии.",
    stopFormula:
      "Кейс 59 аудита: строго запрещено приписывать проект только МИДиС, только ЮУГМУ или единолично одному врачу (Артуру Шамселову) без указания обоих вузов. Нельзя указывать неподтверждённую метрику «прошли обучение более 5 000 врачей».",
    isJoint: true,
    participantUniversityIds: ["midis", "susmu"],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "joint-sursau-csu-agro-ai",
    type: "project",
    title: "Агро-ИИ полигон для малых хозяйств",
    folderId: folderIds.joint,
    owners: ["Ирина Волкова, ЮУрГАУ", "Елена Ковалёва, ЧелГУ"],
    sphere: "АПК и искусственный интеллект",
    initiatorUniversityId: "sursau",
    coExecutors: ["ЧелГУ"],
    industrialPartner: "ГК «Здоровая ферма»",
    readinessStage: "НИОКР",
    contour: "УМНОЦ",
    confirmedFigures: [
      "2 хозяйства-пилота",
      "3 сценария мониторинга",
      "2026 год — опытная эксплуатация",
    ],
    referenceDescription:
      "Совместный проект ЮУрГАУ и ЧелГУ: агро-ИИ полигон проверяет модели прогноза урожайности и состояния животных в малых хозяйствах. ЮУрГАУ отвечает за агрономическую часть, ЧелГУ — за алгоритмы и обработку данных. Карточка хранится в «02_Совместные_проекты» и ссылкой показывается в папках обоих вузов.",
    stopFormula:
      "Совместный проект ЮУрГАУ и ЧелГУ. Нельзя указывать один вуз единственным автором и создавать вторую карточку в папке участника. Не распространять результаты двух пилотных хозяйств на весь регион.",
    isJoint: true,
    participantUniversityIds: ["sursau", "csu"],
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
];
