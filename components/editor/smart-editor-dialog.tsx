"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  BookOpenCheck,
  Copy,
  Cpu,
  Edit3,
  Eye,
  FileText,
  Layers3,
  Loader2,
  PenLine,
  Quote,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import type { AiProviderChoice } from "@/lib/ai-providers";
import type { SessionUser } from "@/lib/auth";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  ArticleSection,
  ArticleSourceSummary,
  GeneratedArticleDraft,
  ReadyArticle,
} from "@/lib/articles";
import { universities } from "@/lib/data";
import { getUniversityName } from "@/lib/knowledge";

type Basis = {
  articleId: string;
  chunkIds: string[];
  label: string;
};

type SmartEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dbAvailable: boolean;
  currentUser?: SessionUser | null;
  articles: ReadyArticle[];
  basis: Basis | null;
  onSaved: (article: ReadyArticle) => void;
};

type GeneratedView = GeneratedArticleDraft & { query: string };

type ProviderMeta = {
  provider: string;
  modelLabel: string;
  latencyMs: number;
  anonymized152FZ: boolean;
  fallbackReason: string | null;
};

type GenerateResponse = {
  noData: boolean;
  noDataMessage: string | null;
  query: string;
  article?: GeneratedView;
  sources?: ArticleSourceSummary[];
  usedArticles?: Array<{ id: string; title: string }>;
  providerMeta?: ProviderMeta;
};

const PROVIDER_ITEMS = [
  { value: "auto", label: "Авто (Yandex → канонический движок)" },
  { value: "yandex", label: "Yandex AI Studio (основной контур)" },
  { value: "alibaba", label: "Alibaba Cloud Qwen (только по выбору, без ПДн)" },
  { value: "canonical", label: "Канонический движок (без LLM)" },
];

const examples = [
  "Напиши статью о сотрудничестве МИДиС и ЮУГМУ по виртуальному травмпункту с опорой на уже вышедший материал ЮУГМУ",
  "Напиши статью о цифровом двойнике трубопроката ЮУрГУ и МГТУ им. Г. И. Носова",
  "Сделай материал о том, как устроен паспорт кампуса «Южный Урал»",
];

const standards = [
  "Факты только из карточек",
  "Живой язык без канцелярита",
  "H1–H2–H3",
  "Чанки по 1–2 абзаца",
  "Сильные первые 1000 знаков",
  "Список источников",
];

function buildBasisQuery(article: ReadyArticle, chunkIds: string[]): string {
  const chunks = article.sections
    .flatMap((section) =>
      section.chunks.map((chunk) => ({
        ...chunk,
        heading: section.heading,
      }))
    )
    .filter((chunk) => chunkIds.includes(chunk.id));
  const headings = Array.from(new Set(chunks.map((chunk) => chunk.heading)));
  const project = article.projectTitle || article.title;

  return `Напиши статью по теме «${project}». Используй как опору утверждённый смысловой блок${
    headings.length > 1 ? "и" : ""
  } «${headings.join("», «")}» из статьи «${article.title}».`;
}

function sectionTitle(level: 2 | 3) {
  return level === 3 ? "h3" : "h2";
}

export function SmartEditorDialog({
  open,
  onOpenChange,
  dbAvailable,
  currentUser = null,
  articles,
  basis,
  onSaved,
}: SmartEditorDialogProps) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<AiProviderChoice>("auto");
  const [providerMeta, setProviderMeta] = useState<ProviderMeta | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedView | null>(null);
  const [sources, setSources] = useState<ArticleSourceSummary[]>([]);
  const [universityId, setUniversityId] = useState("susu");
  const [topic, setTopic] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const articlesRef = useRef(articles);

  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  useEffect(() => {
    if (!open) return;

    if (basis) {
      const article = articlesRef.current.find(
        (item) => item.id === basis.articleId
      );
      setQuery(
        article
          ? buildBasisQuery(article, basis.chunkIds)
          : "Напиши статью на основе утверждённого смыслового блока."
      );
    } else {
      setQuery((current) => current);
    }

    setError(null);
    setNoDataMessage(null);
  }, [open, basis]);

  useEffect(() => {
    if (!open) {
      requestIdRef.current += 1;
      setIsGenerating(false);
      setResult(null);
      setSources([]);
      setProviderMeta(null);
      setError(null);
      setNoDataMessage(null);
      setSavedArticleId(null);
      setIsEditingDraft(false);
    }
  }, [open]);

  const basisLabel = useMemo(() => {
    if (!basis) return null;
    const article = articles.find((item) => item.id === basis.articleId);
    return article ? basis.label || article.title : basis.label;
  }, [basis, articles]);

  const universityItems = useMemo(
    () =>
      universities.map((university) => ({
        value: university.id,
        label: university.shortName,
      })),
    []
  );

  const handleGenerate = async () => {
    if (isGenerating) return;
    if (query.trim().length < 10) {
      toast.error("Опишите задачу подробнее");
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsGenerating(true);
    setError(null);
    setNoDataMessage(null);
    setResult(null);
    setSources([]);
    setProviderMeta(null);
    setSavedArticleId(null);

    try {
      const response = await fetch("/api/editor/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          provider,
          ...(basis
            ? {
                basis: { articleId: basis.articleId, chunkIds: basis.chunkIds },
              }
            : {}),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | (GenerateResponse & { error?: string })
        | null;

      if (requestId !== requestIdRef.current) return;

      if (!response.ok) {
        setError(
          data?.error ||
            "Не удалось подготовить статью. Попробуйте ещё раз или уточните запрос."
        );
        return;
      }

      if (!data) {
        setError("Сервер вернул пустой ответ. Попробуйте ещё раз.");
        return;
      }

      if (data.noData) {
        setNoDataMessage(
          data.noDataMessage ||
            "В канонических карточках нет сведений по этому запросу."
        );
        return;
      }

      if (!data.article) {
        setError("Не удалось получить текст статьи. Попробуйте ещё раз.");
        return;
      }

      setResult(data.article);
      setSources(data.sources ?? []);
      setProviderMeta(data.providerMeta ?? null);
      setUniversityId(data.article.suggestedUniversityId ?? "susu");
      setTopic(data.article.topic ?? "");
      setProjectTitle(data.article.projectTitle ?? "");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError(
        "Сервис генерации недоступен. Проверьте соединение и попробуйте ещё раз."
      );
    } finally {
      if (requestId === requestIdRef.current) setIsGenerating(false);
    }
  };

  const canSaveToLibrary =
    dbAvailable && Boolean(currentUser) && currentUser?.role !== "guest";

  const handleCopyDraft = async () => {
    if (!result) return;
    const text = [
      `# ${result.title}`,
      "",
      result.lead,
      "",
      ...result.sections.flatMap((section) => [
        `${"#".repeat(section.level)} ${section.heading}`,
        "",
        ...section.chunks.flatMap((chunk) => [chunk.content, ""]),
      ]),
    ].join("\n");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("unavailable");
      await navigator.clipboard.writeText(text);
      toast.success("Черновик статьи скопирован в Markdown");
    } catch {
      toast.error("Не удалось скопировать текст");
    }
  };

  const handleSave = async () => {
    if (!result || isSaving || savedArticleId) return;

    if (!dbAvailable) {
      toast.error(
        "Сохранение недоступно: база данных работает в статическом режиме."
      );
      return;
    }

    if (!currentUser || currentUser.role === "guest") {
      toast.error(
        "Для сохранения статьи в библиотеку войдите под ролью редактора или координатора (/login)."
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          lead: result.lead,
          sections: result.sections,
          sourceCardIds: result.sourceCardIds,
          sourceCardTitles: result.sourceCardTitles,
          universityId,
          projectTitle,
          topic,
          query,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | (ReadyArticle & { error?: string })
        | null;

      if (!response.ok || !data || "error" in data) {
        toast.error(
          data?.error || "Не удалось сохранить статью в «Готовые_статьи»"
        );
        return;
      }

      setSavedArticleId(data.id);
      onSaved(data);

      if (data.diskSync?.status === "synced") {
        toast.success("Статья сохранена и выгружена на Яндекс Диск", {
          description: `Вуз: ${getUniversityName(data.universityId)}`,
        });
      } else if (data.diskSync?.status === "failed") {
        toast.warning("Статья сохранена в «Готовые_статьи», но не выгружена", {
          description:
            data.diskSync.message ||
            "Выгрузку на Яндекс Диск можно повторить в библиотеке статей.",
        });
      } else {
        toast.success("Статья сохранена в «Готовые_статьи»", {
          description: `Вуз: ${getUniversityName(data.universityId)}`,
        });
      }
    } catch {
      toast.error("Не удалось сохранить статью. Попробуйте ещё раз.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-1rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3" />
              Стандарты SEO и GEO встроены
            </Badge>
          </div>
          <DialogTitle className="font-heading text-xl">
            Умный редактор
          </DialogTitle>
          <DialogDescription>
            Опишите задачу свободным языком. Редактор возьмёт твёрдые факты и
            цифры из канонических карточек, а живые формулировки — из
            утверждённых статей коллег.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {standards.map((standard) => (
            <Badge key={standard} variant="outline" className="text-[11px]">
              <BadgeCheck className="size-3" />
              {standard}
            </Badge>
          ))}
        </div>

        {basisLabel ? (
          <Alert>
            <Quote className="size-4" />
            <AlertTitle>Опора из «Готовых_статей»</AlertTitle>
            <AlertDescription>{basisLabel}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="smart-editor-query">Задача редактору</Label>
          <Textarea
            id="smart-editor-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: напиши статью о сотрудничестве МИДиС и ЮУГМУ по виртуальному травмпункту с опорой на уже вышедший материал ЮУГМУ"
            className="min-h-28"
            aria-describedby="smart-editor-hint"
          />
          <div className="flex flex-wrap gap-1.5">
            {examples.map((example) => (
              <Button
                key={example}
                type="button"
                variant="outline"
                size="xs"
                className="h-auto max-w-full justify-start whitespace-normal text-left text-[11px] leading-snug"
                onClick={() => setQuery(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PenLine className="size-4" />
              )}
              {isGenerating ? "Готовим статью..." : "Написать статью по запросу"}
            </Button>
            <span id="smart-editor-hint" className="text-xs text-muted-foreground">
              Температура 0.05 · строго по карточкам.
            </span>
          </div>

          {isDemoMode ? (
            <div className="flex flex-col gap-1 sm:w-64">
              <Label
                htmlFor="smart-editor-provider"
                className="text-[11px] text-muted-foreground"
              >
                ИИ-движок (РФ / Учебный стенд)
              </Label>
              <Select
                value={provider}
                items={PROVIDER_ITEMS}
                onValueChange={(value) =>
                  setProvider(String(value) as AiProviderChoice)
                }
              >
                <SelectTrigger id="smart-editor-provider" className="h-10 w-full text-xs">
                  <SelectValue placeholder="Выберите движок" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {provider === "alibaba"
                  ? "Alibaba Qwen — учебный стенд: используйте только без персональных данных."
                  : provider === "yandex"
                    ? "Yandex AI Studio — основной облачный движок. Без ключа — канонический движок."
                    : provider === "canonical"
                      ? "Канонический движок: сборка без LLM, строго из карточек."
                      : "Авто: Yandex AI Studio, при отсутствии ключа — канонический движок. Alibaba не включается автоматически."}
              </p>
            </div>
          ) : null}
        </div>

        {error ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>Генерация не выполнена</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {noDataMessage ? (
          <Alert>
            <Layers3 className="size-4" />
            <AlertTitle>Сведений в базе нет</AlertTitle>
            <AlertDescription>{noDataMessage}</AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-5">
            <Separator />

            {providerMeta ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-muted/25 px-3.5 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Cpu className="size-3.5 text-primary" />
                  <span className="font-semibold">{providerMeta.modelLabel}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {providerMeta.latencyMs} мс
                  </Badge>
                  {providerMeta.anonymized152FZ ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
                      Контакты обезличены
                    </Badge>
                  ) : null}
                </div>
                {providerMeta.fallbackReason ? (
                  <span className="text-[11px] text-muted-foreground">
                    {providerMeta.fallbackReason}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Предпросмотр и доработка статьи
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={isEditingDraft ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setIsEditingDraft((value) => !value)}
                  className="h-8 gap-1.5 text-xs"
                >
                  {isEditingDraft ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <Edit3 className="size-3.5" />
                  )}
                  {isEditingDraft ? "Режим чтения" : "Редактировать текст"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDraft}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Copy className="size-3.5" />
                  Копировать .md
                </Button>
              </div>
            </div>

            <article className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Badge variant="outline" className="w-fit text-[11px]">
                  H1 · {result.title.length} символов
                </Badge>
                {isEditingDraft ? (
                  <Input
                    value={result.title}
                    onChange={(event) =>
                      setResult((prev) =>
                        prev ? { ...prev, title: event.target.value } : prev
                      )
                    }
                    aria-label="Заголовок статьи H1"
                    className="font-heading text-lg font-bold"
                  />
                ) : (
                  <h1 className="break-words font-heading text-2xl font-bold leading-tight tracking-tight">
                    {result.title}
                  </h1>
                )}
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Первые 1000 знаков
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {result.lead.length} символов
                  </span>
                </div>
                {isEditingDraft ? (
                  <Textarea
                    value={result.lead}
                    onChange={(event) =>
                      setResult((prev) =>
                        prev ? { ...prev, lead: event.target.value } : prev
                      )
                    }
                    aria-label="Лид статьи (первые 1000 знаков)"
                    className="min-h-28 text-sm leading-relaxed"
                  />
                ) : (
                  <p className="break-words text-sm leading-relaxed">{result.lead}</p>
                )}
              </div>

              {result.sections.map((section: ArticleSection, sectionIndex: number) => {
                const Heading = sectionTitle(section.level);

                return (
                  <section key={section.id} className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        {section.level === 3 ? "H3" : "H2"}
                      </Badge>
                      {isEditingDraft ? (
                        <Input
                          value={section.heading}
                          onChange={(event) =>
                            setResult((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    sections: prev.sections.map((sec, idx) =>
                                      idx === sectionIndex
                                        ? { ...sec, heading: event.target.value }
                                        : sec
                                    ),
                                  }
                                : prev
                            )
                          }
                          aria-label={`Подзаголовок ${sectionIndex + 1}`}
                          className="h-9 flex-1 font-heading text-sm font-semibold"
                        />
                      ) : (
                        <Heading
                          className={
                            section.level === 3
                              ? "font-heading text-base font-semibold"
                              : "font-heading text-lg font-semibold"
                          }
                        >
                          {section.heading}
                        </Heading>
                      )}
                    </div>
                    {section.chunks.map((chunk, chunkIndex) =>
                      isEditingDraft ? (
                        <Textarea
                          key={chunk.id}
                          value={chunk.content}
                          onChange={(event) =>
                            setResult((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    sections: prev.sections.map((sec, sIdx) =>
                                      sIdx === sectionIndex
                                        ? {
                                            ...sec,
                                            chunks: sec.chunks.map((c, cIdx) =>
                                              cIdx === chunkIndex
                                                ? { ...c, content: event.target.value }
                                                : c
                                            ),
                                          }
                                        : sec
                                    ),
                                  }
                                : prev
                            )
                          }
                          aria-label={`Чанк ${sectionIndex + 1}.${chunkIndex + 1}`}
                          className="min-h-24 text-sm leading-relaxed"
                        />
                      ) : (
                        <div
                          key={chunk.id}
                          className="break-words rounded-xl bg-card p-3 text-sm leading-relaxed ring-1 ring-foreground/10"
                        >
                          {chunk.content}
                        </div>
                      )
                    )}
                  </section>
                );
              })}
            </article>

            <div className="flex flex-col gap-2 rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="size-4 text-primary" />
                <p className="text-sm font-semibold">
                  Карточки-источники статьи
                </p>
              </div>
              {sources.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {sources.map((source) => (
                    <li key={source.id} className="flex gap-2 text-xs">
                      <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 break-words">
                        <p className="font-medium">{source.title}</p>
                        <p className="text-muted-foreground">
                          {source.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {result.sourceCardTitles.join(" · ") ||
                    "Источники не указаны."}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border p-4">
              <div>
                <p className="text-sm font-semibold">
                  Сохранить в «Готовые_статьи»
                </p>
                <p className="text-xs text-muted-foreground">
                  Выберите вуз, в папке которого появится утверждённый материал.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="article-university">Вуз</Label>
                  <Select
                    value={universityId}
                    items={universityItems}
                    onValueChange={(value) => setUniversityId(String(value))}
                  >
                    <SelectTrigger id="article-university" className="w-full">
                      <SelectValue placeholder="Выберите вуз" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map((university) => (
                        <SelectItem key={university.id} value={university.id}>
                          {university.shortName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="article-project">Проект</Label>
                  <Input
                    id="article-project"
                    value={projectTitle}
                    onChange={(event) => setProjectTitle(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="article-topic">Тема</Label>
                  <Input
                    id="article-topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              <span className="text-xs text-muted-foreground" role="status">
                {savedArticleId ? (
                  "Статья сохранена в библиотеке."
                ) : !currentUser || currentUser.role === "guest" ? (
                  <>
                    Чтобы сохранить в библиотеку,{" "}
                    <Link
                      href="/login"
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      войдите под ролью редактора (/login)
                    </Link>
                    .
                  </>
                ) : (
                  "Проверьте формулировки перед сохранением."
                )}
              </span>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || Boolean(savedArticleId) || !canSaveToLibrary}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {savedArticleId
                  ? "Сохранено"
                  : isSaving
                    ? "Сохраняем..."
                    : "Сохранить в «Готовые_статьи»"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
