import { getCardStatus, isJointProject, type KnowledgeCard } from "./knowledge";

export const ROLES = [
  "admin",
  "ministry",
  "rio",
  "chkk",
  "university_owner",
  "university_pr",
  "guest",
] as const;

export type Role = (typeof ROLES)[number];

export type DemoAccount = {
  id: string;
  name: string;
  role: Role;
  organization: string;
  position: string;
  universityId?: string;
  ownershipLabel: string;
  ownerAliases: string[];
  organizationAliases: string[];
  demoHint: string;
};

export type SessionUser = Omit<DemoAccount, "demoHint">;

export const roleLabels: Record<Role, string> = {
  admin: "Администратор канона",
  ministry: "Министерство образования и науки",
  rio: "АНО «РИОН»",
  chkk: "Концессионер ООО «ЧКК»",
  university_owner: "Владелец карточки в вузе",
  university_pr: "PR-команда / редактор вуза",
  guest: "Гость",
};

export const roleShortLabels: Record<Role, string> = {
  admin: "Координатор",
  ministry: "Министерство",
  rio: "АНО «РИОН»",
  chkk: "ООО «ЧКК»",
  university_owner: "Владелец карточки",
  university_pr: "PR-команда вуза",
  guest: "Гость",
};

export const roleDefinitions: Record<
  Role,
  { description: string; capabilities: string[]; restrictions: string[] }
> = {
  admin: {
    description:
      "Координатор канона: ведёт всю базу, модерирует новые карточки и настраивает структуру.",
    capabilities: [
      "Редактирует все разделы и любую карточку",
      "Модерирует новые карточки и подтверждает черновики",
      "Управляет конструктором типов и общими параметрами кампуса",
      "Одобряет совместные проекты после подтверждения вузов-участников",
    ],
    restrictions: [
      "Не заменяет запросы на правку молчаливым изменением чужой карточки",
    ],
  },
  ministry: {
    description:
      "Представитель Министерства образования и науки Челябинской области.",
    capabilities: [
      "Читает базу знаний",
      "Проверяет тексты и запрашивает аналитику",
      "Пишет статьи в умном редакторе",
      "Отправляет владельцу запрос на правку комментарием",
    ],
    restrictions: [
      "Не редактирует чужие карточки напрямую",
      "Не управляет типами карточек и параметрами кампуса",
    ],
  },
  rio: {
    description:
      "АНО «РИОН»: работает только со своими карточками в зоне ответственности.",
    capabilities: [
      "Редактирует карточки, где указан владельцем или представителем АНО «РИОН»",
      "Читает базу, проверяет тексты, пишет статьи и собирает аналитику",
      "Отправляет запрос на правку владельцу чужой карточки",
    ],
    restrictions: [
      "Не редактирует чужие карточки",
      "Не управляет типами карточек и параметрами кампуса",
    ],
  },
  chkk: {
    description:
      "Концессионер ООО «ЧКК»: работает только со своими карточками в зоне ответственности.",
    capabilities: [
      "Редактирует карточки, где указан владельцем или представителем ООО «ЧКК»",
      "Читает базу, проверяет тексты, пишет статьи и собирает аналитику",
      "Отправляет запрос на правку владельцу чужой карточки",
    ],
    restrictions: [
      "Не редактирует чужие карточки",
      "Не управляет типами карточек и параметрами кампуса",
    ],
  },
  university_owner: {
    description:
      "Ответственный за карточку в вузе: редактирует только те карточки, где указан владельцем.",
    capabilities: [
      "Редактирует карточки, где указан владельцем",
      "Добавляет новые карточки своего вуза (после проверки координатором)",
      "Видит запросы на правку в своих карточках",
      "Читает базу, проверяет тексты, пишет статьи и собирает аналитику",
    ],
    restrictions: [
      "Не редактирует утверждённые карточки других вузов",
      "Не управляет типами карточек и параметрами кампуса",
    ],
  },
  university_pr: {
    description:
      "PR-команда или редактор вуза: готовит черновики карточек и отправляет их координатору.",
    capabilities: [
      "Добавляет карточки только черновиком",
      "Черновик уходит координатору на подтверждение и не попадает в канон до одобрения",
      "Для совместного проекта требуется подтверждение второго вуза-участника",
      "Читает базу, проверяет тексты, пишет статьи и собирает аналитику",
    ],
    restrictions: [
      "Не редактирует утверждённые карточки других вузов",
      "Не управляет типами карточек и параметрами кампуса",
    ],
  },
  guest: {
    description:
      "Гость: просматривает канон и проверяет тексты без права менять базу.",
    capabilities: [
      "Читает базу знаний",
      "Проверяет тексты на искажения фактов",
      "Собирает аналитику и пишет статьи",
    ],
    restrictions: [
      "Не создаёт и не редактирует карточки",
      "Не отправляет запросы на правку",
      "Не управляет типами карточек и параметрами кампуса",
    ],
  },
};

const universityOwners: Array<{
  id: string;
  name: string;
  universityId: string;
  organization: string;
  ownershipLabel: string;
}> = [
  {
    id: "demo-owner-susu",
    name: "Анна Смирнова",
    universityId: "susu",
    organization: "ЮУрГУ",
    ownershipLabel: "Анна Смирнова, ЮУрГУ",
  },
  {
    id: "demo-owner-csu",
    name: "Елена Ковалёва",
    universityId: "csu",
    organization: "ЧелГУ",
    ownershipLabel: "Елена Ковалёва, ЧелГУ",
  },
  {
    id: "demo-owner-midis",
    name: "Мария Лебедева",
    universityId: "midis",
    organization: "МИДиС",
    ownershipLabel: "Мария Лебедева, МИДиС",
  },
  {
    id: "demo-owner-susmu",
    name: "Дмитрий Петров",
    universityId: "susmu",
    organization: "ЮУГМУ",
    ownershipLabel: "Дмитрий Петров, ЮУГМУ",
  },
  {
    id: "demo-owner-sursau",
    name: "Ирина Волкова",
    universityId: "sursau",
    organization: "ЮУрГАУ",
    ownershipLabel: "Ирина Волкова, ЮУрГАУ",
  },
  {
    id: "demo-owner-mgtu",
    name: "Ольга Соколова",
    universityId: "mgtu",
    organization: "МГТУ им. Г. И. Носова",
    ownershipLabel: "Ольга Соколова, МГТУ им. Г. И. Носова",
  },
  {
    id: "demo-owner-suspgu",
    name: "Светлана Морозова",
    universityId: "suspgu",
    organization: "ЮУрГГПУ",
    ownershipLabel: "Светлана Морозова, ЮУрГГПУ",
  },
];

const universityPrAccounts: Array<{
  id: string;
  name: string;
  universityId: string;
  organization: string;
}> = [
  {
    id: "demo-pr-susu",
    name: "Павел Кузнецов",
    universityId: "susu",
    organization: "ЮУрГУ",
  },
  {
    id: "demo-pr-csu",
    name: "Марина Титова",
    universityId: "csu",
    organization: "ЧелГУ",
  },
  {
    id: "demo-pr-midis",
    name: "Алина Соколова",
    universityId: "midis",
    organization: "МИДиС",
  },
  {
    id: "demo-pr-susmu",
    name: "Илья Егоров",
    universityId: "susmu",
    organization: "ЮУГМУ",
  },
  {
    id: "demo-pr-sursau",
    name: "Оксана Белова",
    universityId: "sursau",
    organization: "ЮУрГАУ",
  },
  {
    id: "demo-pr-mgtu",
    name: "Роман Фролов",
    universityId: "mgtu",
    organization: "МГТУ им. Г. И. Носова",
  },
  {
    id: "demo-pr-suspgu",
    name: "Татьяна Зайцева",
    universityId: "suspgu",
    organization: "ЮУрГГПУ",
  },
];

export const demoAccounts: DemoAccount[] = [
  {
    id: "demo-admin",
    name: "Администратор канона",
    role: "admin",
    organization: "Координационный центр канона",
    position: "Администратор канона (координатор)",
    ownershipLabel: "Координационный центр канона",
    ownerAliases: ["Администратор канона"],
    organizationAliases: ["Координационный центр канона"],
    demoHint:
      "Проверьте полный доступ: редактирование любой карточки, очередь подтверждения и конструктор типов.",
  },
  {
    id: "demo-ministry",
    name: "Наталья Григорьева",
    role: "ministry",
    organization: "Минобрнауки Челябинской области",
    position: "Представитель Министерства образования и науки",
    ownershipLabel: "Наталья Григорьева, Минобрнауки Челябинской области",
    ownerAliases: ["Наталья Григорьева"],
    organizationAliases: ["Минобрнауки Челябинской области"],
    demoHint:
      "Откройте чужую карточку и отправьте запрос на правку: он придёт владельцу комментарием.",
  },
  {
    id: "demo-rio",
    name: "Сергей Иванов",
    role: "rio",
    organization: "АНО «РИОН»",
    position: "Руководитель направления АНО «РИОН»",
    ownershipLabel: "Сергей Иванов, АНО «РИОН»",
    ownerAliases: ["Сергей Иванов"],
    organizationAliases: ["АНО «РИОН»"],
    demoHint:
      "Проверьте зону ответственности: доступны только карточки с владельцем из АНО «РИОН».",
  },
  {
    id: "demo-chkk",
    name: "Виктор Козлов",
    role: "chkk",
    organization: "ООО «ЧКК»",
    position: "Представитель концессионера ООО «ЧКК»",
    ownershipLabel: "Виктор Козлов, ООО «ЧКК»",
    ownerAliases: ["Виктор Козлов"],
    organizationAliases: ["ООО «ЧКК»"],
    demoHint:
      "Проверьте зону ответственности: редактируются только карточки концессионера.",
  },
  ...universityOwners.map<DemoAccount>((owner) => ({
    id: owner.id,
    name: owner.name,
    role: "university_owner",
    organization: owner.organization,
    position: `Владелец карточки, ${owner.organization}`,
    universityId: owner.universityId,
    ownershipLabel: owner.ownershipLabel,
    ownerAliases: [owner.name],
    organizationAliases: [],
    demoHint:
      "Откройте свою карточку — она доступна для правки. Чужие утверждённые карточки только для чтения.",
  })),
  ...universityPrAccounts.map<DemoAccount>((account) => ({
    id: account.id,
    name: account.name,
    role: "university_pr",
    organization: account.organization,
    position: `PR-команда, ${account.organization}`,
    universityId: account.universityId,
    ownershipLabel: `${account.name}, ${account.organization}`,
    ownerAliases: [account.name],
    organizationAliases: [],
    demoHint:
      "Добавьте карточку: она сохранится черновиком и уйдёт координатору на подтверждение.",
  })),
  {
    id: "demo-guest",
    name: "Гость",
    role: "guest",
    organization: "Внешний участник",
    position: "Гость с правом просмотра и проверки текста",
    ownershipLabel: "Гость",
    ownerAliases: [],
    organizationAliases: [],
    demoHint:
      "Проверьте ограничения: база и проверка текста доступны, кнопок редактирования нет.",
  },
];

export function getDemoAccount(
  id: string | null | undefined
): DemoAccount | null {
  if (!id) return null;

  return demoAccounts.find((account) => account.id === id) ?? null;
}

export function toSessionUser(account: DemoAccount): SessionUser {
  return {
    id: account.id,
    name: account.name,
    role: account.role,
    organization: account.organization,
    position: account.position,
    universityId: account.universityId,
    ownershipLabel: account.ownershipLabel,
    ownerAliases: account.ownerAliases,
    organizationAliases: account.organizationAliases,
  };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[«»"]/g, "").replace(/\s+/g, " ").trim();
}

export function isCardOwner(
  user: SessionUser | null,
  owners: string[]
): boolean {
  if (!user) return false;

  const normalizedOwners = owners.map(normalize);
  const aliases = [...user.ownerAliases, ...user.organizationAliases]
    .map(normalize)
    .filter(Boolean);

  return aliases.some((alias) =>
    normalizedOwners.some((owner) => owner.includes(alias))
  );
}

export function canManageTypes(user: SessionUser | null): boolean {
  return user?.role === "admin";
}

export function canEditCampus(user: SessionUser | null): boolean {
  return user?.role === "admin";
}

export function canModerate(user: SessionUser | null): boolean {
  return user?.role === "admin";
}

export function canCreateCard(user: SessionUser | null): boolean {
  if (!user) return false;

  return ["admin", "rio", "chkk", "university_owner", "university_pr"].includes(
    user.role
  );
}

export function canRequestEdit(
  user: SessionUser | null,
  card: KnowledgeCard
): boolean {
  if (!user || user.role === "guest") return false;

  return !canEditCard(user, card);
}

export function canEditCard(
  user: SessionUser | null,
  card: KnowledgeCard
): boolean {
  if (!user) return false;

  if (user.role === "admin") return true;

  if (card.type === "campus") return false;

  if (getCardStatus(card) !== "approved" && card.submittedBy === user.id) {
    return true;
  }

  return isCardOwner(user, card.owners);
}

export function canSeeCard(
  user: SessionUser | null,
  card: KnowledgeCard
): boolean {
  if (getCardStatus(card) === "approved") return true;

  if (!user) return false;

  if (user.role === "admin") return true;
  if (card.submittedBy === user.id) return true;
  if (isCardOwner(user, card.owners)) return true;

  return Boolean(
    user.universityId &&
    isJointProject(card) &&
    card.participantUniversityIds.includes(user.universityId)
  );
}

export function canConfirmJointParticipation(
  user: SessionUser | null,
  card: KnowledgeCard
): boolean {
  if (!user?.universityId || !isJointProject(card)) return false;
  if (getCardStatus(card) === "approved") return false;
  if (!card.participantUniversityIds.includes(user.universityId)) return false;

  return !(card.participantApprovals ?? []).includes(user.universityId);
}

export function getUserOwnershipLabel(user: SessionUser): string {
  return user.ownershipLabel;
}

export function demoAccountsByRole(): Array<{
  role: Role;
  accounts: DemoAccount[];
}> {
  return ROLES.map((role) => ({
    role,
    accounts: demoAccounts.filter((account) => account.role === role),
  }));
}
