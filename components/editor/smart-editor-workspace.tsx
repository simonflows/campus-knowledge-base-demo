"use client";

import { useState } from "react";
import {
  BadgeCheck,
  BookOpenCheck,
  FileText,
  GraduationCap,
  Layers3,
  PenLine,
  Sparkles,
} from "lucide-react";

import { ArticleLibrary } from "@/components/editor/article-library";
import { SmartEditorDialog } from "@/components/editor/smart-editor-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FlatArticleChunk, ReadyArticle } from "@/lib/articles";
import { countArticleChars, isDemoArticle } from "@/lib/articles";
import type { SessionUser } from "@/lib/auth";
import { universities } from "@/lib/data";

type Basis = {
  articleId: string;
  chunkIds: string[];
  label: string;
};

type SmartEditorWorkspaceProps = {
  initialArticles: ReadyArticle[];
  cardsCount: number;
  dbAvailable: boolean;
  currentUser?: SessionUser | null;
};

const rules = [
  {
    title: "Твёрдые факты",
    description:
      "Цифры, сроки, авторство и статусы берутся строго из канонических карточек.",
    icon: BadgeCheck,
  },
  {
    title: "Сильный старт",
    description:
      "Первые 1000 знаков: кто с кем, что создано, в каком контуре и в чём польза.",
    icon: Sparkles,
  },
  {
    title: "Структура и чанки",
    description:
      "Иерархия H1–H2–H3 и самодостаточные блоки по 1–2 абзаца для чтения и переиспользования.",
    icon: Layers3,
  },
];

export function SmartEditorWorkspace({
  initialArticles,
  cardsCount,
  dbAvailable,
  currentUser = null,
}: SmartEditorWorkspaceProps) {
  const [articles, setArticles] = useState<ReadyArticle[]>(initialArticles);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [basis, setBasis] = useState<Basis | null>(null);

  const totalChunks = articles.reduce(
    (total, article) =>
      total +
      article.sections.reduce((sum, section) => sum + section.chunks.length, 0),
    0
  );
  const totalChars = articles.reduce(
    (total, article) => total + countArticleChars(article),
    0
  );

  const openEditor = () => {
    setBasis(null);
    setIsDialogOpen(true);
  };

  const handleUseChunk = (article: ReadyArticle, chunk: FlatArticleChunk) => {
    setBasis({
      articleId: article.id,
      chunkIds: [chunk.chunkId],
      label: `${article.title} — «${chunk.sectionHeading}»`,
    });
    setIsDialogOpen(true);
  };

  const handleSaved = (article: ReadyArticle) => {
    setArticles((current) => [article, ...current]);
  };

  const handleArticleUpdated = (article: ReadyArticle) => {
    setArticles((current) =>
      current.map((item) => (item.id === article.id ? article : item))
    );
  };

  const handleArticleDeleted = (articleId: string) => {
    setArticles((current) => current.filter((item) => item.id !== articleId));
  };

  const handleDemoArticlesCleared = () => {
    setArticles((current) =>
      current.filter((item) => !isDemoArticle(item.id))
    );
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8 px-4 py-8 sm:py-10">
      <section className="gradient-hero-vibrant relative isolate overflow-hidden rounded-[2rem] border border-white/70 px-4 py-8 shadow-sm min-[400px]:px-6 sm:px-10 lg:px-12">
        <div
          aria-hidden
          className="pattern-grid pointer-events-none absolute inset-0 opacity-[0.12]"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 max-w-3xl flex-col gap-4">
            <Badge className="w-fit border-white/80 bg-white/75 text-primary hover:bg-white/75">
              <Sparkles className="h-3.5 w-3.5" />
              Единое окно редактора
            </Badge>
            <div className="flex flex-col gap-2">
              <h1 className="break-words font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Умный редактор и готовые статьи
              </h1>
              <p className="text-sm leading-relaxed text-foreground/70 sm:text-base">
                Напишите задачу свободным языком — редактор сам подтянет
                проверенные факты из карточек и живые формулировки из
                утверждённых материалов коллег. Правила фактчекинга и стандарты
                SEO/GEO уже встроены.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Button type="button" size="lg" onClick={openEditor}>
                <PenLine className="h-4 w-4" />
                Открыть умный редактор
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium ring-1 ring-white/80">
                <BookOpenCheck className="h-3.5 w-3.5 text-primary" />
                {articles.length} утверждённых статей
              </span>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center ring-1 ring-white/90">
              <div className="text-2xl font-bold">{cardsCount}</div>
              <div className="text-[11px] text-muted-foreground">
                канонических карточек
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center ring-1 ring-white/90">
              <div className="text-2xl font-bold">{universities.length}</div>
              <div className="text-[11px] text-muted-foreground">
                вузов-резидентов
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center ring-1 ring-white/90">
              <div className="text-2xl font-bold">{totalChunks}</div>
              <div className="text-[11px] text-muted-foreground">
                смысловых чанков
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center ring-1 ring-white/90">
              <div className="text-2xl font-bold">
                {totalChars < 1000 ? totalChars : `${Math.round(totalChars / 1000)}к`}
              </div>
              <div className="text-[11px] text-muted-foreground">
                знаков в библиотеке
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {rules.map((rule) => {
          const Icon = rule.icon;

          return (
            <div
              key={rule.title}
              className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/10"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <p className="mt-3 text-sm font-semibold">{rule.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {rule.description}
              </p>
            </div>
          );
        })}
      </section>

      <section id="library" className="scroll-mt-24">
        <ArticleLibrary
          articles={articles}
          dbAvailable={dbAvailable}
          currentUser={currentUser}
          onUseChunk={handleUseChunk}
          onArticleUpdated={handleArticleUpdated}
          onArticleDeleted={handleArticleDeleted}
          onDemoArticlesCleared={handleDemoArticlesCleared}
        />
      </section>

      <section className="rounded-3xl bg-muted/40 p-5 ring-1 ring-foreground/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-foreground/10">
              <GraduationCap className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Как устроена библиотека</p>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                Каждая утверждённая статья делится на смысловые чанки. Их можно
                фильтровать по вузу, проекту и теме, читать по отдельности и
                открывать умный редактор сразу с выбранным блоком в качестве
                опоры.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <FileText className="size-3" />
            {dbAvailable ? "Сохранение доступно" : "Статический режим"}
          </Badge>
        </div>
      </section>

      <SmartEditorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        dbAvailable={dbAvailable}
        currentUser={currentUser}
        articles={articles}
        basis={basis}
        onSaved={handleSaved}
      />
    </div>
  );
}
