"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Edit3,
  FileText,
  Filter,
  Loader2,
  Save,
  SearchX,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiskSyncPanel } from "@/components/disk-sync/disk-sync-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ArticleSection,
  FlatArticleChunk,
  ReadyArticle,
} from "@/lib/articles";
import { flattenArticleChunks, isDemoArticle } from "@/lib/articles";
import type { SessionUser } from "@/lib/auth";
import { universities } from "@/lib/data";
import { getUniversityName } from "@/lib/knowledge";
import { cn } from "@/lib/utils";

type ArticleLibraryProps = {
  articles: ReadyArticle[];
  dbAvailable: boolean;
  currentUser?: SessionUser | null;
  onUseChunk: (article: ReadyArticle, chunk: FlatArticleChunk) => void;
  onArticleUpdated: (article: ReadyArticle) => void;
  onArticleDeleted?: (articleId: string) => void;
  onDemoArticlesCleared?: () => void;
};

type ArticleEditDraft = {
  id: string;
  title: string;
  lead: string;
  universityId: string;
  projectTitle: string;
  topic: string;
  sections: ArticleSection[];
};

function formatDate(value: string): string {
  return value.slice(0, 10).split("-").reverse().join(".");
}

function buildArticleMarkdownClient(article: ReadyArticle): string {
  const lines = [
    `# ${article.title}`,
    "",
    article.lead,
    "",
    ...article.sections.flatMap((section) => [
      `${section.level === 3 ? "###" : "##"} ${section.heading}`,
      "",
      ...section.chunks.flatMap((chunk) => [chunk.content, ""]),
    ]),
  ];
  if (article.sourceCardTitles.length > 0) {
    lines.push(
      "## Карточки-источники",
      "",
      ...article.sourceCardTitles.map((title) => `- ${title}`),
      ""
    );
  }
  return `${lines.join("\n").trim()}\n`;
}

export function ArticleLibrary({
  articles,
  dbAvailable,
  currentUser = null,
  onUseChunk,
  onArticleUpdated,
  onArticleDeleted,
  onDemoArticlesCleared,
}: ArticleLibraryProps) {
  const [universityId, setUniversityId] = useState("all");
  const [project, setProject] = useState("all");
  const [topic, setTopic] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(
    articles[0]?.id ?? null
  );
  const [editDraft, setEditDraft] = useState<ArticleEditDraft | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingDemo, setIsClearingDemo] = useState(false);

  const canEditArticle = (article: ReadyArticle) => {
    if (!dbAvailable || !currentUser || currentUser.role === "guest") {
      return false;
    }
    if (
      currentUser.universityId &&
      (currentUser.role === "university_owner" ||
        currentUser.role === "university_pr")
    ) {
      return currentUser.universityId === article.universityId;
    }
    return true;
  };

  const canDeleteArticle = (article: ReadyArticle) => {
    if (!dbAvailable || !currentUser || currentUser.role === "guest") {
      return false;
    }
    if (currentUser.role === "admin") return true;
    return (
      Boolean(currentUser.universityId) &&
      (currentUser.role === "university_owner" ||
        currentUser.role === "university_pr") &&
      currentUser.universityId === article.universityId
    );
  };

  const demoArticlesCount = useMemo(
    () => articles.filter((article) => isDemoArticle(article.id)).length,
    [articles]
  );

  const projectOptions = useMemo(
    () =>
      Array.from(
        new Set(articles.map((article) => article.projectTitle).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "ru")),
    [articles]
  );

  const topicOptions = useMemo(
    () =>
      Array.from(
        new Set(articles.map((article) => article.topic).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "ru")),
    [articles]
  );

  const universityItems = useMemo(
    () => [
      { value: "all", label: "Все вузы" },
      ...universities.map((university) => ({
        value: university.id,
        label: university.shortName,
      })),
    ],
    []
  );

  const projectItems = useMemo(
    () => [
      { value: "all", label: "Все проекты" },
      ...projectOptions.map((option) => ({ value: option, label: option })),
    ],
    [projectOptions]
  );

  const topicItems = useMemo(
    () => [
      { value: "all", label: "Все темы" },
      ...topicOptions.map((option) => ({ value: option, label: option })),
    ],
    [topicOptions]
  );

  const projectValue = projectOptions.includes(project) ? project : "all";
  const topicValue = topicOptions.includes(topic) ? topic : "all";

  const filtered = useMemo(
    () =>
      articles.filter((article) => {
        if (universityId !== "all" && article.universityId !== universityId) {
          return false;
        }
        if (projectValue !== "all" && article.projectTitle !== projectValue) {
          return false;
        }
        if (topicValue !== "all" && article.topic !== topicValue) {
          return false;
        }
        return true;
      }),
    [articles, universityId, projectValue, topicValue]
  );

  const hasFilters =
    universityId !== "all" || projectValue !== "all" || topicValue !== "all";

  const handleCopyArticle = async (article: ReadyArticle) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("unavailable");
      await navigator.clipboard.writeText(buildArticleMarkdownClient(article));
      toast.success("Статья скопирована в Markdown");
    } catch {
      toast.error("Не удалось скопировать статью");
    }
  };

  const handleDownloadArticle = (article: ReadyArticle) => {
    const md = buildArticleMarkdownClient(article);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${article.id}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Файл статьи сохранён (.md)");
  };

  const startEdit = (article: ReadyArticle) => {
    setExpandedId(article.id);
    setConfirmDeleteId(null);
    setEditDraft({
      id: article.id,
      title: article.title,
      lead: article.lead,
      universityId: article.universityId,
      projectTitle: article.projectTitle,
      topic: article.topic,
      sections: structuredClone(article.sections),
    });
  };

  const handleSaveEdit = async (article: ReadyArticle) => {
    if (!editDraft || isSavingEdit) return;
    setIsSavingEdit(true);

    try {
      const response = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title,
          lead: editDraft.lead,
          sections: editDraft.sections,
          sourceCardIds: article.sourceCardIds,
          sourceCardTitles: article.sourceCardTitles,
          universityId: editDraft.universityId,
          projectTitle: editDraft.projectTitle,
          topic: editDraft.topic,
          query: article.query,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | (ReadyArticle & { error?: string })
        | null;

      if (!response.ok || !data || "error" in data) {
        toast.error(data?.error ?? "Не удалось сохранить изменения статьи");
        return;
      }

      onArticleUpdated(data);
      setEditDraft(null);
      toast.success("Статья обновлена в библиотеке");
    } catch {
      toast.error("Ошибка сети при сохранении статьи");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (deletingId) return;
    setDeletingId(articleId);

    try {
      const response = await fetch(
        `/api/articles?id=${encodeURIComponent(articleId)}`,
        { method: "DELETE" }
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        toast.error(data?.error ?? "Не удалось удалить статью");
        return;
      }

      toast.success("Статья удалена из библиотеки");
      if (editDraft?.id === articleId) setEditDraft(null);
      onArticleDeleted?.(articleId);
    } catch {
      toast.error("Ошибка сети при удалении статьи");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleClearDemoArticles = async () => {
    if (isClearingDemo) return;
    setIsClearingDemo(true);

    try {
      const response = await fetch("/api/articles?scope=demo", {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        toast.error(data?.error ?? "Не удалось очистить демо-статьи");
        return;
      }

      if (editDraft && isDemoArticle(editDraft.id)) {
        setEditDraft(null);
      }
      onDemoArticlesCleared?.();
      toast.success("Тестовые демо-статьи удалены", {
        description:
          "Библиотека очищена для боевой работы; повторно при старте они не появятся.",
      });
    } catch {
      toast.error("Ошибка сети при очистке демо-статей");
    } finally {
      setIsClearingDemo(false);
    }
  };

  return (
    <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpenCheck className="size-4" />
              </span>
              <CardTitle className="font-heading text-xl">
                Библиотека готовых статей
              </CardTitle>
            </div>
            <CardDescription>
              Утверждённые материалы разложены на самодостаточные смысловые
              чанки: их можно читать отдельно, редактировать, экспортировать в
              Markdown и брать как опору для новой статьи.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Filter className="size-3" />
              {filtered.length} из {articles.length}
            </Badge>
            {dbAvailable &&
            demoArticlesCount > 0 &&
            currentUser?.role === "admin" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={isClearingDemo}
                onClick={handleClearDemoArticles}
              >
                {isClearingDemo ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5 text-muted-foreground" />
                )}
                Очистить демо-статьи ({demoArticlesCount})
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="library-university">Вуз</Label>
            <Select
              value={universityId}
              items={universityItems}
              onValueChange={(value) => setUniversityId(String(value))}
            >
              <SelectTrigger id="library-university" className="h-10 w-full">
                <SelectValue placeholder="Все вузы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все вузы</SelectItem>
                {universities.map((university) => (
                  <SelectItem key={university.id} value={university.id}>
                    {university.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="library-project">Проект</Label>
            <Select
              value={project}
              items={projectItems}
              onValueChange={(value) => setProject(String(value))}
            >
              <SelectTrigger id="library-project" className="h-10 w-full">
                <SelectValue placeholder="Все проекты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все проекты</SelectItem>
                {projectOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="library-topic">Тема</Label>
            <Select
              value={topic}
              items={topicItems}
              onValueChange={(value) => setTopic(String(value))}
            >
              <SelectTrigger id="library-topic" className="h-10 w-full">
                <SelectValue placeholder="Все темы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все темы</SelectItem>
                {topicOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>По фильтрам ничего не найдено</EmptyTitle>
              <EmptyDescription>
                Снимите фильтры или сохраните новую статью через умный редактор.
              </EmptyDescription>
            </EmptyHeader>
            {hasFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setUniversityId("all");
                  setProject("all");
                  setTopic("all");
                }}
              >
                Сбросить фильтры
              </Button>
            ) : null}
          </Empty>
        ) : (
          filtered.map((article) => {
            const chunks = flattenArticleChunks(article);
            const isExpanded = expandedId === article.id;
            const isEditing = editDraft?.id === article.id;
            const canEditThisArticle = canEditArticle(article);
            const canDeleteThisArticle = canDeleteArticle(article);
            const demoBadge = isDemoArticle(article.id);

            return (
              <div
                key={article.id}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {getUniversityName(article.universityId)}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {article.topic || "Без темы"}
                      </Badge>
                      {demoBadge ? (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50/70 text-[11px] text-amber-800"
                        >
                          Демо-пример
                        </Badge>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(article.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 break-words font-heading text-lg font-semibold leading-snug">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Проект: {article.projectTitle || "не указан"} ·{" "}
                      {chunks.length} смысловых чанков
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 px-2.5 text-xs"
                      onClick={() => handleCopyArticle(article)}
                    >
                      <Copy className="size-3.5" />
                      <span className="hidden sm:inline">Копировать</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 px-2.5 text-xs"
                      onClick={() => handleDownloadArticle(article)}
                    >
                      <Download className="size-3.5" />
                      <span className="hidden sm:inline">.md</span>
                    </Button>
                    {canEditThisArticle ? (
                      <Button
                        type="button"
                        variant={isEditing ? "secondary" : "outline"}
                        size="sm"
                        className="h-9 gap-1 px-2.5 text-xs"
                        onClick={() =>
                          isEditing ? setEditDraft(null) : startEdit(article)
                        }
                      >
                        {isEditing ? (
                          <X className="size-3.5" />
                        ) : (
                          <Edit3 className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {isEditing ? "Отмена" : "Править"}
                        </span>
                      </Button>
                    ) : null}
                    {canDeleteThisArticle ? (
                      confirmDeleteId === article.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-9 px-2.5 text-xs"
                            disabled={deletingId === article.id}
                            onClick={() => handleDeleteArticle(article.id)}
                          >
                            {deletingId === article.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              "Удалить?"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 text-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Нет
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label="Удалить статью"
                          className="h-9 border-destructive/30 px-2.5 text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDeleteId(article.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : article.id)
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                      {isExpanded ? "Свернуть" : "Чанки"}
                    </Button>
                  </div>
                </div>

                {isEditing && editDraft ? (
                  <div className="mt-4 space-y-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-title-${article.id}`}>
                        Заголовок H1
                      </Label>
                      <Input
                        id={`edit-title-${article.id}`}
                        value={editDraft.title}
                        onChange={(e) =>
                          setEditDraft((prev) =>
                            prev ? { ...prev, title: e.target.value } : prev
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-lead-${article.id}`}>
                        Первые 1000 знаков ({editDraft.lead.length} симв.)
                      </Label>
                      <Textarea
                        id={`edit-lead-${article.id}`}
                        value={editDraft.lead}
                        onChange={(e) =>
                          setEditDraft((prev) =>
                            prev ? { ...prev, lead: e.target.value } : prev
                          )
                        }
                        className="min-h-24"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-project-${article.id}`}>
                          Проект
                        </Label>
                        <Input
                          id={`edit-project-${article.id}`}
                          value={editDraft.projectTitle}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, projectTitle: e.target.value }
                                : prev
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-topic-${article.id}`}>Тема</Label>
                        <Input
                          id={`edit-topic-${article.id}`}
                          value={editDraft.topic}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev ? { ...prev, topic: e.target.value } : prev
                            )
                          }
                        />
                      </div>
                    </div>

                    {editDraft.sections.map((sec, sIdx) => (
                      <div
                        key={sec.id}
                        className="space-y-2 rounded-xl border bg-background p-3"
                      >
                        <Input
                          value={sec.heading}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    sections: prev.sections.map((s, idx) =>
                                      idx === sIdx
                                        ? { ...s, heading: e.target.value }
                                        : s
                                    ),
                                  }
                                : prev
                            )
                          }
                          aria-label={`Заголовок секции ${sIdx + 1}`}
                          className="font-semibold"
                        />
                        {sec.chunks.map((ch, cIdx) => (
                          <Textarea
                            key={ch.id}
                            value={ch.content}
                            onChange={(e) =>
                              setEditDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      sections: prev.sections.map((s, idx) =>
                                        idx === sIdx
                                          ? {
                                              ...s,
                                              chunks: s.chunks.map((c, j) =>
                                                j === cIdx
                                                  ? {
                                                      ...c,
                                                      content: e.target.value,
                                                    }
                                                  : c
                                              ),
                                            }
                                          : s
                                      ),
                                    }
                                  : prev
                              )
                            }
                            aria-label={`Чанк ${sIdx + 1}.${cIdx + 1}`}
                            className="min-h-20 text-sm"
                          />
                        ))}
                      </div>
                    ))}

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSavingEdit}
                        onClick={() => setEditDraft(null)}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSavingEdit}
                        onClick={() => handleSaveEdit(article)}
                        className="gap-1.5"
                      >
                        {isSavingEdit ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        Сохранить изменения
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {article.lead}
                  </p>
                )}

                <div className="mt-3">
                  <DiskSyncPanel<ReadyArticle>
                    diskSync={article.diskSync}
                    retryEndpoint={`/api/articles/${article.id}/sync`}
                    canRetry={dbAvailable}
                    entityLabel="статья"
                    onSynced={onArticleUpdated}
                    compact
                  />
                </div>

                {isExpanded && !isEditing ? (
                  <div className="mt-4 flex flex-col gap-4 border-t pt-4">
                    {article.sections.map((section) => (
                      <div key={section.id} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase"
                          >
                            {section.level === 3 ? "H3" : "H2"}
                          </Badge>
                          <p className="min-w-0 break-words text-sm font-semibold">
                            {section.heading}
                          </p>
                        </div>
                        {section.chunks.map((chunk) => {
                          const flatChunk = chunks.find(
                            (item) =>
                              item.sectionId === section.id &&
                              item.chunkId === chunk.id
                          );

                          return (
                            <div
                              key={chunk.id}
                              className={cn(
                                "flex flex-col gap-2 rounded-xl bg-muted/30 p-3 ring-1 ring-foreground/5",
                                "sm:flex-row sm:items-start sm:justify-between"
                              )}
                            >
                              <p className="min-w-0 break-words text-sm leading-relaxed">
                                {chunk.content}
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-10 shrink-0"
                                disabled={!flatChunk}
                                onClick={() => {
                                  if (flatChunk) {
                                    onUseChunk(article, flatChunk);
                                  }
                                }}
                              >
                                <Sparkles className="size-3" />
                                Использовать как основу
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center gap-2 break-words rounded-xl bg-muted/20 p-3 text-xs text-muted-foreground">
                      <FileText className="size-3.5" />
                      Источники:{" "}
                      {article.sourceCardTitles.length > 0
                        ? article.sourceCardTitles.join(" · ")
                        : "не указаны"}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
