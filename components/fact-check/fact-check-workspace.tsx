"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Layers3,
  Loader2,
  ScanText,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  TriangleAlert,
  Upload,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  FACT_CHECK_PRESETS,
  type FactCheckPreset,
} from "@/lib/audit-canon-registry";
import {
  FACT_CHECK_CHECKPOINTS,
  type CanonicalRewrite,
  type CanonicalRewriteSection,
  type FactCheckCheckpointSummary,
  type FactCheckFinding,
  type FactCheckLevel,
  type FactCheckResult,
  type FactCheckSummary,
} from "@/lib/fact-check";
import { cn } from "@/lib/utils";

type RewriteCheck = {
  summary: FactCheckSummary;
  canPublish: boolean;
  isClean: boolean;
};

type FactCheckResponse = FactCheckResult & {
  rewrite?: CanonicalRewrite | null;
  rewriteCheck?: RewriteCheck | null;
  rewriteError?: string;
  error?: string;
};

type LevelFilter = "all" | FactCheckLevel;

type FactCheckWorkspaceProps = {
  cardsCount: number;
};

const levelStyles: Record<
  FactCheckLevel,
  {
    badge: string;
    card: string;
    icon: typeof CircleAlert;
    iconWrap: string;
  }
> = {
  red: {
    badge: "bg-red-100 text-red-700 hover:bg-red-100",
    card: "border-red-200 bg-red-50/60",
    icon: ShieldAlert,
    iconWrap: "bg-red-100 text-red-700",
  },
  yellow: {
    badge: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    card: "border-amber-200 bg-amber-50/60",
    icon: ShieldQuestion,
    iconWrap: "bg-amber-100 text-amber-800",
  },
  green: {
    badge: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    card: "border-emerald-200 bg-emerald-50/60",
    icon: ShieldCheck,
    iconWrap: "bg-emerald-100 text-emerald-700",
  },
};

const levelLabels: Record<FactCheckLevel, string> = {
  red: "Красный",
  yellow: "Жёлтый",
  green: "Зелёный",
};

const filters: Array<{ value: LevelFilter; label: string }> = [
  { value: "all", label: "Все замечания" },
  { value: "red", label: "Красные" },
  { value: "yellow", label: "Жёлтые" },
  { value: "green", label: "Зелёные" },
];

const checkpoints = Object.entries(FACT_CHECK_CHECKPOINTS) as Array<
  [keyof typeof FACT_CHECK_CHECKPOINTS, string]
>;

function SectionHeading({
  level,
  children,
}: {
  level: 2 | 3;
  children: React.ReactNode;
}) {
  if (level === 3) {
    return (
      <h3 className="font-heading text-base font-semibold leading-snug">
        {children}
      </h3>
    );
  }

  return (
    <h2 className="font-heading text-lg font-semibold leading-snug">
      {children}
    </h2>
  );
}

function CheckpointChips({
  summaries,
}: {
  summaries: FactCheckCheckpointSummary[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {summaries.map((checkpoint) => {
        const total = checkpoint.red + checkpoint.yellow + checkpoint.green;

        return (
          <div
            key={checkpoint.key}
            className="flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-[11px]"
          >
            <span className="font-medium">{checkpoint.label}</span>
            {total === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span className="flex items-center gap-1">
                {checkpoint.red > 0 ? (
                  <span className="rounded-full bg-red-100 px-1.5 text-red-700">
                    {checkpoint.red}
                  </span>
                ) : null}
                {checkpoint.yellow > 0 ? (
                  <span className="rounded-full bg-amber-100 px-1.5 text-amber-800">
                    {checkpoint.yellow}
                  </span>
                ) : null}
                {checkpoint.green > 0 ? (
                  <span className="rounded-full bg-emerald-100 px-1.5 text-emerald-700">
                    {checkpoint.green}
                  </span>
                ) : null}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FindingCard({ finding }: { finding: FactCheckFinding }) {
  const style = levelStyles[finding.level];
  const Icon = style.icon;

  return (
    <div className={cn("rounded-2xl border p-4", style.card)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              style.iconWrap
            )}
          >
            <Icon className="size-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={style.badge}>
                {levelLabels[finding.level]}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {finding.checkpointLabel}
              </Badge>
            </div>
            <p className="mt-2 text-sm font-semibold">{finding.title}</p>
          </div>
        </div>
        <Link
          href={`/knowledge?card=${finding.sourceCardId}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5 text-xs"
          )}
        >
          <ExternalLink className="size-3.5" />
          Карточка-источник
        </Link>
      </div>

      {finding.quote ? (
        <blockquote className="mt-3 border-l-2 border-foreground/20 pl-3 text-sm italic text-foreground/70">
          «{finding.quote}»
        </blockquote>
      ) : null}

      <p className="mt-3 text-sm leading-relaxed text-foreground/80">
        {finding.explanation}
      </p>

      <div className="mt-3 rounded-xl bg-background/70 p-3 ring-1 ring-foreground/10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Как исправить
        </p>
        <p className="mt-1 text-sm leading-relaxed">{finding.suggestion}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <FileText className="size-3.5 shrink-0" />
        <span className="font-medium text-foreground">
          {finding.sourceCardTitle}
        </span>
        <span aria-hidden>·</span>
        <span>{finding.sourceFolder}</span>
      </div>
    </div>
  );
}

export function FactCheckWorkspace({ cardsCount }: FactCheckWorkspaceProps) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<FactCheckResponse | null>(null);
  const [rewrite, setRewrite] = useState<CanonicalRewrite | null>(null);
  const [rewriteCheck, setRewriteCheck] = useState<RewriteCheck | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [filter, setFilter] = useState<LevelFilter>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleFindings = useMemo(() => {
    if (!result) return [];
    if (filter === "all") return result.findings;

    return result.findings.filter((finding) => finding.level === filter);
  }, [result, filter]);

  const hasRed = (result?.summary.red ?? 0) > 0;
  const hasYellow = (result?.summary.yellow ?? 0) > 0;

  const resetOutput = () => {
    setResult(null);
    setRewrite(null);
    setRewriteCheck(null);
    setRewriteError(null);
    setError(null);
    setFilter("all");
  };

  const handleTextChange = (value: string) => {
    setText(value);
    setFileName(null);

    if (result || rewrite) resetOutput();
  };

  const handlePreset = (preset: FactCheckPreset) => {
    setText(preset.text);
    setFileName(null);
    resetOutput();
    toast(`Загружен пресет: ${preset.label}`, {
      description: preset.description,
    });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (!/\.(txt|md|markdown)$/i.test(file.name)) {
      toast.error("Поддерживаются текстовые файлы .txt и .md");
      return;
    }

    if (file.size > 250_000) {
      toast.error("Файл слишком большой", {
        description: "Загрузите текстовый файл до 250 КБ.",
      });
      return;
    }

    const content = await file.text();

    if (!content.trim()) {
      toast.error("Файл пустой");
      return;
    }

    setText(content);
    setFileName(file.name);
    resetOutput();
    toast.success("Файл загружен", { description: file.name });
  };

  const requestFactCheck = async (mode: "check" | "rewrite") => {
    if (isChecking || isRewriting) return;
    if (text.trim().length < 20) {
      toast.error("Вставьте черновик длиной хотя бы 20 символов");
      return;
    }

    if (mode === "check") {
      setIsChecking(true);
      setError(null);
      setRewrite(null);
      setRewriteCheck(null);
      setRewriteError(null);
    } else {
      setIsRewriting(true);
      setError(null);
    }

    try {
      const response = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), mode }),
      });
      const data = (await response
        .json()
        .catch(() => null)) as FactCheckResponse | null;

      if (!response.ok || !data) {
        const message =
          data?.error ??
          "Не удалось проверить текст. Попробуйте ещё раз или сократите черновик.";
        setError(message);
        toast.error(message);
        return;
      }

      if (data.error) {
        setError(data.error);
        toast.error(data.error);
        return;
      }

      setResult(data);
      setFilter("all");

      if (mode === "rewrite") {
        setRewrite(data.rewrite ?? null);
        setRewriteCheck(data.rewriteCheck ?? null);
        setRewriteError(data.rewriteError ?? null);

        if (!data.rewrite) {
          toast.error("Не удалось переписать текст по канону");
        } else if (data.rewriteCheck?.isClean) {
          toast.success("Текст переписан по канону", {
            description: "Красных и жёлтых замечаний не осталось.",
          });
        }
      } else {
        setRewrite(null);
        setRewriteCheck(null);
        setRewriteError(null);
        toast.success("Проверка завершена", {
          description: `Красных: ${data.summary.red}, жёлтых: ${data.summary.yellow}, зелёных: ${data.summary.green}.`,
        });
      }
    } catch {
      const message =
        "Сервис проверки недоступен. Проверьте соединение и попробуйте ещё раз.";
      setError(message);
      toast.error(message);
    } finally {
      setIsChecking(false);
      setIsRewriting(false);
    }
  };

  const handleCopyRewrite = async () => {
    if (!rewrite) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(rewrite.plainText);
      toast.success("Чистовик скопирован в буфер обмена");
    } catch {
      toast.error("Не удалось скопировать текст");
    }
  };

  const handleDownloadRewrite = () => {
    if (!rewrite) return;

    const markdown = [
      `# ${rewrite.title}`,
      "",
      rewrite.lead,
      "",
      ...rewrite.sections.flatMap((section) => [
        `${"#".repeat(section.level)} ${section.heading}`,
        "",
        ...section.chunks.flatMap((chunk) => [chunk.content, ""]),
      ]),
      "---",
      `Источники канона: ${rewrite.sourceCardTitles.join("; ")}`,
    ].join("\n");

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "campus-canonical-rewrite.md";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Файл чистовика сохранён (.md)");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:py-10">
      <section className="gradient-hero-vibrant relative isolate overflow-hidden rounded-[2rem] border border-white/70 px-6 py-8 shadow-sm sm:px-10 lg:px-12">
        <div
          aria-hidden
          className="pattern-grid pointer-events-none absolute inset-0 opacity-[0.12]"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge className="border-white/80 bg-white/75 text-primary hover:bg-white/75">
              <ScanText className="h-3.5 w-3.5" />
              Проверка текста на искажения фактов
            </Badge>
            <div className="space-y-2">
              <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Шесть контрольных точек канона
              </h1>
              <p className="text-sm leading-relaxed text-foreground/70 sm:text-base">
                Вставьте черновик или загрузите текстовый файл — система сверит
                его с каноническими карточками и покажет красные, жёлтые и
                зелёные замечания со ссылками на источники и готовыми
                формулировками для правки.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary" className="gap-1 bg-white/70">
                <BookOpenCheck className="h-3.5 w-3.5 text-primary" />
                {cardsCount} карточек в базе
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-white/70">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                Правила SEO и GEO для переписывания
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center ring-1 ring-white/90">
              <div className="text-2xl font-bold text-red-600">1</div>
              <div className="text-[11px] text-muted-foreground">красный</div>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center ring-1 ring-white/90">
              <div className="text-2xl font-bold text-amber-600">2</div>
              <div className="text-[11px] text-muted-foreground">жёлтый</div>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center ring-1 ring-white/90">
              <div className="text-2xl font-bold text-emerald-600">3</div>
              <div className="text-[11px] text-muted-foreground">зелёный</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checkpoints.map(([key, label]) => (
          <div
            key={key}
            className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs shadow-sm"
          >
            <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
            <span className="leading-snug">{label}</span>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Черновик текста</CardTitle>
                <CardDescription>
                  Вставьте материал целиком или загрузите файл .txt / .md.
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1 text-[11px]">
                <Layers3 className="size-3" />
                {text.trim().length} символов
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="fact-check-draft" className="sr-only">
              Черновик текста
            </Label>
            <Textarea
              id="fact-check-draft"
              value={text}
              onChange={(event) => handleTextChange(event.target.value)}
              placeholder="Вставьте готовый текст или черновик статьи. Проверка найдёт искажения авторства, статуса, контуров, названий, площадей и неподтверждённые цифры."
              className="min-h-64 resize-y"
            />

            {fileName ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs">
                <FileText className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">загружен</span>
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => requestFactCheck("check")}
                disabled={isChecking || isRewriting}
              >
                {isChecking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ScanText className="size-4" />
                )}
                {isChecking ? "Проверяем..." : "Проверить текст"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isChecking || isRewriting}
              >
                <Upload className="size-4" />
                Загрузить файл
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handlePreset(FACT_CHECK_PRESETS[0])}
                disabled={isChecking || isRewriting}
              >
                <ClipboardCheck className="size-4" />
                Пример из ТЗ
              </Button>
            </div>

            <div className="space-y-2 rounded-2xl border bg-muted/25 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Быстрые пресеты реальных ошибок из PDF-аудита (66 кейсов)
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {FACT_CHECK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isChecking || isRewriting}
                    onClick={() => handlePreset(preset)}
                    className="flex flex-col items-start gap-1 rounded-xl border bg-background p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold leading-snug">
                      {preset.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {preset.badge}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 p-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => requestFactCheck("rewrite")}
                disabled={isChecking || isRewriting}
              >
                {isRewriting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                {isRewriting ? "Переписываем..." : "Переписать по канону"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Исправленный текст по правилам SEO и GEO: первые 1000 знаков,
                H1–H3 и чанки.
              </span>
            </div>

            {error ? (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />
                <AlertTitle>Проверка не выполнена</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-fit rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
          <CardHeader>
            <CardTitle className="text-lg">Итог проверки</CardTitle>
            <CardDescription>
              Красный уровень блокирует публикацию до правки.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {(["red", "yellow", "green"] as FactCheckLevel[]).map(
                    (level) => {
                      const styles = levelStyles[level];
                      return (
                        <div
                          key={level}
                          className={cn(
                            "rounded-xl border p-3 text-center",
                            styles.card
                          )}
                        >
                          <div className="text-2xl font-bold">
                            {result.summary[level]}
                          </div>
                          <div className="text-[11px] capitalize">
                            {levelLabels[level].toLowerCase()}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                <div
                  className={cn(
                    "rounded-xl p-3 text-sm",
                    hasRed
                      ? "bg-red-100 text-red-800"
                      : hasYellow
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-800"
                  )}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {hasRed ? (
                      <ShieldAlert className="size-4" />
                    ) : hasYellow ? (
                      <ShieldQuestion className="size-4" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                    {hasRed
                      ? "Публикация запрещена до правки"
                      : hasYellow
                        ? "Нужно уточнить спорные факты"
                        : "Текст подтверждён базой"}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed">
                    {hasRed
                      ? `Исправьте ${result.summary.red} красное замечание, затем проверьте текст повторно.`
                      : hasYellow
                        ? `Уточните или удалите ${result.summary.yellow} неподтверждённую цифру.`
                        : "Красных и жёлтых замечаний нет — можно готовить материал к публикации."}
                  </p>
                </div>

                <Separator />
                <p className="text-xs text-muted-foreground">
                  Проверено {result.checkedChars} символов по{" "}
                  {result.checkpoints.length} контрольным точкам.
                </p>
              </>
            ) : (
              <Empty className="border-0 p-4">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ScanText className="size-4" />
                  </EmptyMedia>
                  <EmptyTitle>Проверка ещё не запускалась</EmptyTitle>
                  <EmptyDescription>
                    Вставьте текст и нажмите «Проверить текст». Замечания
                    появятся здесь с уровнями и ссылками на карточки.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      {result ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Разбор по уровням
              </h2>
              <p className="text-xs text-muted-foreground">
                Каждое замечание содержит источник и конкретное предложение по
                исправлению.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((item) => {
                const count =
                  item.value === "all"
                    ? result.summary.total
                    : result.summary[item.value];
                return (
                  <Button
                    key={item.value}
                    type="button"
                    size="sm"
                    variant={filter === item.value ? "default" : "outline"}
                    onClick={() => setFilter(item.value)}
                    className="text-xs"
                  >
                    {item.label}
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          <CheckpointChips summaries={result.checkpoints} />

          {visibleFindings.length > 0 ? (
            <div className="space-y-3">
              {visibleFindings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Sparkles className="size-4" />
                </EmptyMedia>
                <EmptyTitle>В этом уровне замечаний нет</EmptyTitle>
                <EmptyDescription>
                  Переключите фильтр, чтобы увидеть остальные уровни разбора.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      ) : null}

      {result && (rewrite || rewriteError) ? (
        <section className="space-y-4">
          <Separator />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-semibold">
                Текст, переписанный по канону
              </h2>
              <p className="text-xs text-muted-foreground">
                Первые 1000 знаков, структура H1–H3 и самодостаточные чанки.
              </p>
            </div>
            {rewrite ? (
              <div className="flex flex-wrap items-center gap-2">
                {rewriteCheck ? (
                  <Badge
                    className={cn(
                      rewriteCheck.isClean
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                    )}
                  >
                    {rewriteCheck.isClean ? (
                      <ShieldCheck className="size-3" />
                    ) : (
                      <ShieldQuestion className="size-3" />
                    )}
                    {rewriteCheck.isClean
                      ? "100% чистый канон · 0 красных · 0 жёлтых"
                      : `Красных: ${rewriteCheck.summary.red}, жёлтых: ${rewriteCheck.summary.yellow}`}
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRewrite}
                >
                  <Copy className="size-3.5" />
                  Скопировать чистовик
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadRewrite}
                >
                  <Download className="size-3.5" />
                  Скачать .md
                </Button>
              </div>
            ) : null}
          </div>

          {rewriteError ? (
            <Alert>
              <CircleAlert className="size-4" />
              <AlertTitle>Переписать не удалось</AlertTitle>
              <AlertDescription>{rewriteError}</AlertDescription>
            </Alert>
          ) : null}

          {rewrite ? (
            <article className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="space-y-2">
                <Badge variant="outline" className="text-[11px]">
                  H1 · {rewrite.title.length} символов
                </Badge>
                <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  {rewrite.title}
                </h1>
              </div>

              <div className="mt-4 rounded-2xl border bg-muted/30 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Первые 1000 знаков
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {rewrite.lead.length} символов
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{rewrite.lead}</p>
              </div>

              <div className="mt-5 space-y-5">
                {rewrite.sections.map((section: CanonicalRewriteSection) => (
                  <section key={section.id} className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        {section.level === 3 ? "H3" : "H2"}
                      </Badge>
                      <SectionHeading level={section.level}>
                        {section.heading}
                      </SectionHeading>
                    </div>
                    <div className="space-y-2">
                      {section.chunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className="rounded-xl bg-muted/20 p-3 text-sm leading-relaxed ring-1 ring-foreground/10"
                        >
                          {chunk.content}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="size-4 text-primary" />
                  <p className="text-sm font-semibold">Карточки-источники</p>
                </div>
                <ul className="mt-2 flex flex-col gap-2">
                  {rewrite.sourceCardIds.map((cardId, index) => (
                    <li
                      key={cardId}
                      className="flex items-center gap-2 text-xs"
                    >
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      <Link
                        href={`/knowledge?card=${cardId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {rewrite.sourceCardTitles[index] ?? cardId}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
