"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  FolderTree,
  Handshake,
  Link2,
  LockKeyhole,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KnowledgeCardDetail } from "@/components/knowledge/knowledge-card-detail";
import { KnowledgeCardForm } from "@/components/knowledge/knowledge-card-form";
import { KnowledgeModerationPanel } from "@/components/knowledge/knowledge-moderation-panel";
import { KnowledgeTree } from "@/components/knowledge/knowledge-tree";
import { KnowledgeTypeConstructor } from "@/components/knowledge/knowledge-type-constructor";
import {
  canCreateCard,
  canManageTypes,
  canModerate,
  roleShortLabels,
  type SessionUser,
} from "@/lib/auth";
import { diskSyncStatusLabels } from "@/lib/disk-sync";
import {
  buildKnowledgeTree,
  cardStatusLabels,
  findFolder,
  folderIds,
  getCardStatus,
  getCardsForFolder,
  getCardTypeLabel,
  getFolderPathLabel,
  getUniversityFullName,
  getUniversityName,
  isJointProject,
  isJointReferenceForFolder,
  placementStatusLabels,
  type CardStatus,
  type CardTypeWithStats,
  type KnowledgeCard,
  type KnowledgeCardType,
} from "@/lib/knowledge";
import { cn } from "@/lib/utils";

type KnowledgeBaseProps = {
  initialCards: KnowledgeCard[];
  initialCustomTypes: CardTypeWithStats[];
  initialCardId?: string | null;
  initialAction?: string | null;
  initialFolderId?: string | null;
  dbAvailable: boolean;
  currentUser: SessionUser | null;
};

export function KnowledgeBase({
  initialCards,
  initialCustomTypes,
  initialCardId,
  initialAction,
  initialFolderId,
  dbAvailable,
  currentUser,
}: KnowledgeBaseProps) {
  const [cards, setCards] = useState<KnowledgeCard[]>(initialCards);
  const [customTypes, setCustomTypes] =
    useState<CardTypeWithStats[]>(initialCustomTypes);
  const initialCard = initialCardId
    ? (initialCards.find((card) => card.id === initialCardId) ?? null)
    : null;
  const resolvedInitialFolder =
    initialCard?.folderId ??
    (initialFolderId &&
    findFolder(initialFolderId, buildKnowledgeTree(initialCustomTypes))
      ? initialFolderId
      : folderIds.campus);
  const [selectedFolderId, setSelectedFolderId] = useState(
    resolvedInitialFolder
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    initialCard?.id ?? null
  );
  const canAddCard = canCreateCard(currentUser) && dbAvailable;
  const [showForm, setShowForm] = useState(
    Boolean(initialAction === "new" && canAddCard)
  );
  const [showConstructor, setShowConstructor] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isMobileTreeOpen, setIsMobileTreeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | KnowledgeCardType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CardStatus>("all");

  const tree = useMemo(() => buildKnowledgeTree(customTypes), [customTypes]);
  const selectedFolder = findFolder(selectedFolderId, tree);
  const hasGlobalFilter =
    searchQuery.trim().length > 0 ||
    typeFilter !== "all" ||
    statusFilter !== "all";

  const folderCards = useMemo(() => {
    if (!hasGlobalFilter) {
      return getCardsForFolder(selectedFolderId, cards, tree);
    }

    const q = searchQuery.trim().toLowerCase().replace(/ё/g, "е");

    return cards.filter((card) => {
      if (typeFilter !== "all" && card.type !== typeFilter) return false;
      if (statusFilter !== "all" && getCardStatus(card) !== statusFilter) {
        return false;
      }
      if (!q) return true;

      const haystackParts: string[] = [
        card.id,
        card.title,
        card.referenceDescription,
        card.stopFormula,
        card.owners.join(" "),
        getFolderPathLabel(card.folderId, tree),
      ];
      if (card.type === "project") {
        haystackParts.push(
          card.sphere,
          card.industrialPartner,
          card.contour,
          card.readinessStage,
          getUniversityName(card.initiatorUniversityId),
          ...card.coExecutors,
          ...card.participantUniversityIds.map(getUniversityName)
        );
      } else if (card.type === "laboratory") {
        haystackParts.push(
          card.affiliation,
          card.partner,
          card.head,
          card.placementDetails,
          ...card.workDirections
        );
      }
      const haystack = haystackParts.join(" ").toLowerCase().replace(/ё/g, "е");
      return haystack.includes(q);
    });
  }, [
    hasGlobalFilter,
    selectedFolderId,
    cards,
    tree,
    searchQuery,
    typeFilter,
    statusFilter,
  ]);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;
  const editingCard = editingCardId
    ? (cards.find((card) => card.id === editingCardId) ?? null)
    : null;
  const pendingCards = useMemo(
    () => cards.filter((card) => getCardStatus(card) === "pending"),
    [cards]
  );
  const jointCount = cards.filter((card) => isJointProject(card)).length;
  const plannedLabCount = cards.filter(
    (card) => card.type === "laboratory" && card.placementStatus === "planned"
  ).length;
  const canUseConstructor = canManageTypes(currentUser);
  const canModerateCards = canModerate(currentUser) && dbAvailable;

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedCardId(null);
    setEditingCardId(null);
    setShowForm(false);
    setIsMobileTreeOpen(false);
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const handleCardDeleted = (cardId: string) => {
    const removed = cards.find((c) => c.id === cardId);
    setCards((current) => current.filter((c) => c.id !== cardId));
    if (removed?.type === "custom") {
      const typeId = removed.customTypeId;
      setCustomTypes((current) =>
        current.map((t) =>
          t.id === typeId
            ? { ...t, cardCount: Math.max(0, t.cardCount - 1) }
            : t
        )
      );
    }
    setSelectedCardId(null);
    setEditingCardId(null);
  };

  const handleOpenCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setEditingCardId(null);
    setShowForm(false);
  };

  const handleCreated = (card: KnowledgeCard) => {
    setCards((current) => [...current, card]);

    if (card.type === "custom") {
      const typeId = card.customTypeId;
      setCustomTypes((current) =>
        current.map((type) =>
          type.id === typeId ? { ...type, cardCount: type.cardCount + 1 } : type
        )
      );
    }

    setSelectedFolderId(card.folderId);
    setSelectedCardId(card.id);
    setShowForm(false);
    setEditingCardId(null);
  };

  const handleCardUpdated = (card: KnowledgeCard) => {
    setCards((current) =>
      current.map((item) => (item.id === card.id ? card : item))
    );
  };

  const handleCardSaved = (card: KnowledgeCard) => {
    handleCardUpdated(card);
    setEditingCardId(null);
  };

  const handleTypeCreated = (type: CardTypeWithStats) => {
    setCustomTypes((current) => [...current, type]);
    setSelectedFolderId(folderIds.customType(type.id));
    setSelectedCardId(null);
    setShowForm(false);
  };

  const handleTypeUpdated = (type: CardTypeWithStats) => {
    setCustomTypes((current) =>
      current.map((item) => (item.id === type.id ? type : item))
    );
  };

  const handleTypeDeleted = (typeId: string) => {
    setCustomTypes((current) => current.filter((type) => type.id !== typeId));

    if (selectedFolderId === folderIds.customType(typeId)) {
      setSelectedFolderId(folderIds.campus);
      setSelectedCardId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6 sm:space-y-8 sm:px-4 sm:py-10">
      <section className="gradient-hero-vibrant relative isolate overflow-hidden rounded-[2rem] border border-white/70 px-4 py-6 shadow-sm sm:px-10 sm:py-8 lg:px-12">
        <div
          aria-hidden
          className="pattern-grid pointer-events-none absolute inset-0 opacity-[0.12]"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/80 bg-white/75 text-primary hover:bg-white/75">
                <BookOpen className="h-3.5 w-3.5" />
                Каноническая база знаний
              </Badge>
              {currentUser ? (
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-white/80 text-foreground"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  {roleShortLabels[currentUser.role]}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-white/80 text-muted-foreground"
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Гостевой просмотр
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Дерево базы знаний
              </h1>
              <p className="text-sm leading-relaxed text-foreground/70 sm:text-base">
                Общие параметры кампуса, папки семи вузов-резидентов и
                совместные проекты. Каждая карточка хранит проверенные факты,
                эталонное описание и стоп-формулу для ИИ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-white/80 px-2 py-3 text-center ring-1 ring-white/90 sm:px-4">
              <div className="font-heading text-xl font-bold sm:text-2xl">
                {cards.length}
              </div>
              <div className="text-[11px] leading-tight text-muted-foreground">
                карточек
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 px-2 py-3 text-center ring-1 ring-white/90 sm:px-4">
              <div className="font-heading text-xl font-bold sm:text-2xl">
                7
              </div>
              <div className="text-[11px] text-muted-foreground">
                вузов-резидентов
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 px-2 py-3 text-center ring-1 ring-white/90 sm:px-4">
              <div className="font-heading text-xl font-bold sm:text-2xl">
                {jointCount}
              </div>
              <div className="text-[11px] text-muted-foreground">
                совместных
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-3 lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between rounded-2xl"
              aria-expanded={isMobileTreeOpen}
              aria-controls="knowledge-tree-panel"
              onClick={() => setIsMobileTreeOpen((open) => !open)}
            >
              <span className="flex items-center gap-2 truncate">
                <FolderTree className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">
                  Папка: {selectedFolder?.name ?? "Выбрать"}
                </span>
              </span>
              {isMobileTreeOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </Button>
          </div>
          <Card
            id="knowledge-tree-panel"
            className={cn(
              "rounded-3xl border-0 py-4 shadow-sm ring-1 ring-foreground/10",
              !isMobileTreeOpen && "hidden lg:block"
            )}
          >
            <CardContent className="max-h-[60vh] overflow-y-auto px-2 lg:max-h-[calc(100vh-12rem)]">
              <KnowledgeTree
                cards={cards}
                tree={tree}
                selectedFolderId={selectedFolderId}
                onSelect={handleSelectFolder}
              />
            </CardContent>
            <div className="mx-4 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
              Объектов со статусом «Планируется к открытию в УНК кампуса»:{" "}
              {plannedLabCount}.
            </div>
          </Card>
        </aside>

        <section className="min-w-0 space-y-5">
          {canModerateCards ? (
            <KnowledgeModerationPanel
              cards={pendingCards}
              onCardUpdated={handleCardUpdated}
              onOpenCard={handleOpenCard}
            />
          ) : null}

          {selectedCard && editingCard ? (
            <KnowledgeCardForm
              cards={cards}
              customTypes={customTypes}
              dbAvailable={dbAvailable}
              currentUser={currentUser}
              initialCard={editingCard}
              onCreated={handleCreated}
              onUpdated={handleCardSaved}
              onCancel={() => setEditingCardId(null)}
            />
          ) : selectedCard ? (
            <KnowledgeCardDetail
              card={selectedCard}
              cards={cards}
              customTypes={customTypes}
              tree={tree}
              dbAvailable={dbAvailable}
              currentUser={currentUser}
              onBack={() => setSelectedCardId(null)}
              onOpenFolder={handleSelectFolder}
              onEdit={() => setEditingCardId(selectedCard.id)}
              onCardUpdated={handleCardUpdated}
              onCardDeleted={handleCardDeleted}
            />
          ) : (
            <>
              <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[11px]">
                          <FolderOpen className="h-3 w-3" />
                          {hasGlobalFilter
                            ? "Поиск по всей базе"
                            : selectedFolder?.kind === "joint"
                              ? "Общая папка"
                              : "Папка базы"}
                        </Badge>
                        <span className="break-words text-[11px] text-muted-foreground">
                          {hasGlobalFilter
                            ? `Найдено по всей базе (${cards.length} всего)`
                            : getFolderPathLabel(selectedFolderId, tree)}
                        </span>
                      </div>
                      <CardTitle className="font-heading text-xl tracking-tight break-words sm:text-2xl">
                        {hasGlobalFilter
                          ? "Результаты поиска и фильтрации"
                          : (selectedFolder?.name ?? "База знаний")}
                      </CardTitle>
                      <CardDescription>
                        {hasGlobalFilter
                          ? "Показаны карточки из всех папок базы, соответствующие фильтрам."
                          : selectedFolder?.description}
                      </CardDescription>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      {canUseConstructor ? (
                        <Button
                          type="button"
                          className="h-10 flex-1 sm:h-8 sm:flex-none"
                          variant={showConstructor ? "outline" : "secondary"}
                          onClick={() => {
                            setShowConstructor((value) => !value);
                            setShowForm(false);
                          }}
                        >
                          <Settings2 className="h-4 w-4" />
                          {showConstructor
                            ? "Скрыть конструктор"
                            : "Конструктор типов"}
                        </Button>
                      ) : null}
                      {canAddCard ? (
                        <Button
                          type="button"
                          className="h-10 flex-1 sm:h-8 sm:flex-none"
                          onClick={() => {
                            setShowForm((value) => !value);
                            setShowConstructor(false);
                          }}
                          variant={showForm ? "outline" : "default"}
                        >
                          <Plus className="h-4 w-4" />
                          {showForm ? "Скрыть форму" : "Добавить карточку"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {folderCards.length} карточек
                    </Badge>
                    {!hasGlobalFilter && selectedFolder?.universityId ? (
                      <span>
                        {getUniversityFullName(selectedFolder.universityId)}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-2 pt-1 sm:grid-cols-[minmax(0,1fr)_165px_165px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Поиск по названию, вузу, партнёру, ID..."
                        aria-label="Сквозной поиск по карточкам"
                        className="h-10 pl-9 pr-8"
                      />
                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          aria-label="Очистить поиск"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>

                    <select
                      aria-label="Фильтр по типу карточки"
                      value={typeFilter}
                      onChange={(event) =>
                        setTypeFilter(
                          event.target.value as "all" | KnowledgeCardType
                        )
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">Все типы карточек</option>
                      <option value="project">Проекты и продукты</option>
                      <option value="laboratory">Лаборатории</option>
                      <option value="campus">Паспорт кампуса</option>
                      <option value="custom">Пользовательские</option>
                    </select>

                    <select
                      aria-label="Фильтр по статусу модерации"
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as "all" | CardStatus
                        )
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">Любой статус</option>
                      <option value="approved">В каноне</option>
                      <option value="pending">На подтверждении</option>
                      <option value="rejected">Отклонена</option>
                    </select>
                  </div>

                  {hasGlobalFilter ? (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => {
                          setSearchQuery("");
                          setTypeFilter("all");
                          setStatusFilter("all");
                        }}
                      >
                        <X className="h-3 w-3" />
                        Сбросить фильтры и вернуться в папку
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>
              </Card>

              {showConstructor ? (
                <KnowledgeTypeConstructor
                  customTypes={customTypes}
                  dbAvailable={dbAvailable}
                  onCreated={handleTypeCreated}
                  onUpdated={handleTypeUpdated}
                  onDeleted={handleTypeDeleted}
                  onClose={() => setShowConstructor(false)}
                />
              ) : null}

              {showForm ? (
                <KnowledgeCardForm
                  cards={cards}
                  customTypes={customTypes}
                  dbAvailable={dbAvailable}
                  currentUser={currentUser}
                  defaultFolderId={selectedFolderId}
                  onCreated={handleCreated}
                  onCancel={() => setShowForm(false)}
                />
              ) : null}

              {folderCards.length === 0 ? (
                <Card className="rounded-3xl border-0 py-12 text-center shadow-sm ring-1 ring-foreground/10">
                  <CardContent className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <FolderTree className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        В этой папке пока нет карточек
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Добавьте карточку выбранного типа или создайте новый тип
                        в конструкторе.
                      </p>
                    </div>
                    {canAddCard ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 sm:h-7"
                        onClick={() => setShowForm(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Добавить карточку
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Создавать карточки могут владельцы, PR-команды вузов,
                        АНО «РИОН», ООО «ЧКК» и администратор канона.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {folderCards.map((card) => {
                    const isReference = isJointReferenceForFolder(
                      card,
                      selectedFolderId
                    );

                    return (
                      <Card
                        key={card.id}
                        className="card-hover rounded-2xl border-0 py-0 shadow-sm ring-1 ring-foreground/10"
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenCard(card.id)}
                          className="flex w-full min-w-0 flex-col gap-3 rounded-2xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-5"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {getCardTypeLabel(card, customTypes)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                getCardStatus(card) === "approved" &&
                                  "border-emerald-200 text-emerald-700",
                                getCardStatus(card) === "pending" &&
                                  "border-amber-300 text-amber-700",
                                getCardStatus(card) === "rejected" &&
                                  "border-destructive/30 text-destructive"
                              )}
                            >
                              {cardStatusLabels[getCardStatus(card)]}
                            </Badge>
                            {card.type === "project" ? (
                              <Badge variant="outline">
                                {card.readinessStage}
                              </Badge>
                            ) : null}
                            {card.type === "laboratory" ? (
                              <Badge
                                className={cn(
                                  card.placementStatus === "planned"
                                    ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                )}
                              >
                                {placementStatusLabels[card.placementStatus]}
                              </Badge>
                            ) : null}
                            {isJointProject(card) ? (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                                <Handshake className="h-3 w-3" />
                                Совместный проект
                              </Badge>
                            ) : null}
                            {isReference ? (
                              <Badge
                                variant="outline"
                                className="border-primary/30 text-primary"
                              >
                                <Link2 className="h-3 w-3" />
                                Ссылка на общую карточку
                              </Badge>
                            ) : null}
                            {card.diskSync ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  card.diskSync.status === "synced" &&
                                    "border-emerald-200 text-emerald-700",
                                  card.diskSync.status === "failed" &&
                                    "border-amber-300 text-amber-700"
                                )}
                              >
                                {diskSyncStatusLabels[card.diskSync.status]}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-heading text-lg font-semibold leading-snug break-words">
                              {card.title}
                            </h3>
                            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                              {card.referenceDescription ||
                                "Карточка пользовательского типа: заполните поля, заданные администратором канона."}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                            <span className="inline-flex min-w-0 items-center gap-1.5 break-words">
                              <Users className="h-3.5 w-3.5" />
                              {card.owners.join(" · ")}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <FolderTree className="h-3.5 w-3.5" />
                              {getFolderPathLabel(card.folderId, tree)}
                            </span>
                          </div>
                        </button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
