"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Cpu,
  FileCheck2,
  FolderOpen,
  GraduationCap,
  Layers,
  MapPin,
  PenLine,
  Ruler,
  ScanText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { QuickActions } from "@/components/quick-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  CampusMetric,
  DatabaseUpdate,
  HeroStat,
  LegalEntity,
  University,
} from "@/lib/data";
import { cn } from "@/lib/utils";

const metricIcons = {
  area: Ruler,
  cost: Wallet,
  queue: CalendarClock,
  residents: GraduationCap,
} as const;

const constructionStages = [
  {
    queue: "1-я очередь",
    period: "Август 2024 г.",
    status: "Введена в эксплуатацию",
    statusTone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dotTone: "bg-emerald-500",
    title: "2 семиэтажные гостиницы",
    capacity: "336 мест проживания",
    details:
      "Открыты первыми; гостиничные корпуса уже принимают студентов и преподавателей.",
  },
  {
    queue: "2-я очередь",
    period: "11–15 сентября 2026 г.",
    status: "Введена в эксплуатацию",
    statusTone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dotTone: "bg-emerald-500",
    title: "6 гостиничных корпусов",
    capacity: "3 064 места (4×16 эт. + 2×7 эт.)",
    details:
      "5 студенческих корпусов и 1 корпус для НПС. Оператор — ООО «Отельные решения» («Три звезды»).",
  },
  {
    queue: "3-я очередь",
    period: "Конец 2027 г. / запуск 2028 г.",
    status: "В стадии строительства",
    statusTone: "bg-amber-100 text-amber-900 border-amber-200",
    dotTone: "bg-amber-500",
    title: "УНК и конференц-зал",
    capacity: "40,3 тыс. м² · 40–44 лаборатории",
    details:
      "Важно по ТЗ: лаборатории УНК ещё не открыты — до сдачи корпуса указывайте «планируется в 2027 г.».",
  },
] as const;

type HomeDashboardProps = {
  heroStats: HeroStat[];
  cardsCount: number;
  articlesCount: number;
  campusMetrics: CampusMetric[];
  legalEntities: LegalEntity[];
  universities: University[];
  databaseUpdates: DatabaseUpdate[];
};

export function HomeDashboard({
  heroStats,
  cardsCount,
  articlesCount,
  campusMetrics,
  legalEntities,
  universities,
  databaseUpdates,
}: HomeDashboardProps) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-12 px-4 py-8 sm:space-y-16 sm:py-10">
      <section className="gradient-hero-vibrant relative isolate overflow-hidden rounded-[2rem] border border-primary/15 px-4 py-8 min-[400px]:px-6 min-[400px]:py-9 sm:px-10 sm:py-12 lg:px-12">
        <div
          aria-hidden
          className="pattern-grid pointer-events-none absolute inset-0 opacity-60"
        />
        <div className="relative grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] lg:items-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 min-w-0 space-y-6 duration-500">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-primary/20 bg-white/90 text-primary shadow-2xs hover:bg-white">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Single Source of Truth · 7 вузов Челябинска
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50/90 font-medium text-emerald-800"
              >
                <ShieldCheck className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                Верифицированный реестр · 66 правил
              </Badge>
            </div>

            <div className="space-y-3.5">
              <h1 className="font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
                Каноническая база знаний
                <span className="mt-1 block text-primary">
                  кампуса «Южный Урал»
                </span>
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-foreground/75 sm:text-base">
                Единый первоисточник фактов для 7 вузов-резидентов, регионального
                Минобрнауки, АНО «РИОН», СМИ и нейросетей. Исключает противоречия
                по цифрам, статусам лабораторий, очередям строительства и
                соавторству проектов.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                href="/check"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "gap-2 rounded-xl shadow-sm"
                )}
              >
                <ScanText className="h-4 w-4" />
                Проверить текст на ошибки
              </Link>
              <Link
                href="/knowledge"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "gap-2 rounded-xl border-border/90 bg-white/90 hover:bg-white"
                )}
              >
                <BookOpen className="h-4 w-4 text-primary" />
                Дерево базы ({cardsCount})
              </Link>
              <Link
                href="/editor"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "gap-2 rounded-xl bg-white/60 hover:bg-white/90"
                )}
              >
                <PenLine className="h-4 w-4 text-primary" />
                Умный редактор
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-white/80 px-3 py-1 font-medium text-foreground/85">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                7 равноправных вузов
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-white/80 px-3 py-1 font-medium text-foreground/85">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {cardsCount} эталонных карточек
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-white/80 px-3 py-1 font-medium text-foreground/85">
                <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                {articlesCount} GEO-статьи
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-white/80 px-3 py-1 font-mono font-medium text-foreground/80">
                CAMPUS-PASS-001
              </span>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-2 rounded-[2rem] bg-primary/10 blur-2xl"
            />
            <div className="relative rounded-3xl border border-white/90 bg-white/90 p-4 sm:p-5 shadow-[0_22px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur-md">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                <div>
                  <p className="text-sm font-bold tracking-tight">
                    Пульт канона и антигаллюцинаций
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Слой 1 (факты) + 66 стоп-правил аудита
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="border border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  <span aria-hidden="true" className="pulse-dot mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Верифицировано
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-0 rounded-2xl border border-border/70 bg-background/85 p-3.5 transition-colors hover:border-primary/30"
                  >
                    <div className="break-words font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {stat.value}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-foreground/90">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {stat.hint}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary">
                <span className="font-medium">
                  Порог генерации ИИ: temperature 0.05
                </span>
                {isDemoMode ? (
                  <Link
                    href="/comparison"
                    className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
                  >
                    Полигон ИИ
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <Link
                    href="/knowledge"
                    className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
                  >
                    Источники: Слой 1
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Рабочие инструменты канона
            </h2>
            <p className="text-sm text-muted-foreground">
              Быстрый переход к проверке текстов, генерации публикаций и
              управлению карточками.
            </p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {isDemoMode
              ? "5 модулей · Редактор, фактчекинг и полигон ИИ"
              : "4 сценария · База знаний, редактор, фактчекинг и аналитика"}
          </span>
        </div>
        <QuickActions cardsCount={cardsCount} />
      </section>

      <section id="passport" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/25 bg-primary/5 font-mono text-primary"
              >
                00_Кампус_общие_параметры
              </Badge>
              <Badge variant="secondary" className="font-mono text-[11px]">
                CAMPUS-PASS-001
              </Badge>
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Единый паспорт кампуса «Южный Урал»
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Эталонные площади, бюджет, 3 очереди строительства и официальные
              юрлица проекта для СМИ, отчётов и нейросистем.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              г. Челябинск
            </span>
            <Link
              href="/knowledge?card=campus-passport"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-h-10 gap-1.5 rounded-lg"
              )}
            >
              Открыть карточку
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Card className="rounded-3xl border border-border/80 shadow-xs">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Ключевые физические и финансовые параметры
                  </CardTitle>
                  <CardDescription>
                    Сверено с контент-аудитом по 105 источникам (66 кейсов)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3.5 sm:grid-cols-2">
                {campusMetrics.map((metric) => {
                  const Icon = metricIcons[metric.icon];

                  return (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-border/70 bg-muted/30 p-4"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Icon className="h-4 w-4 text-primary" />
                        {metric.label}
                      </div>
                      <div className="mt-2 font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {metric.value}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {metric.hint}
                      </p>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Дорожная карта 3 очередей (2024 → 2026 → 2027/2028)
                  </p>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Портфель региона: 8 программ · 83–84 решения
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {constructionStages.map((stage) => (
                    <div
                      key={stage.queue}
                      className="flex flex-col justify-between gap-2 rounded-2xl border border-border/80 bg-background p-3.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-mono text-xs font-bold text-primary">
                            {stage.queue}
                          </span>
                          <span
                            className={cn(
                              "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              stage.statusTone
                            )}
                          >
                            <span
                              className={cn("h-1.5 w-1.5 rounded-full", stage.dotTone)}
                            />
                            {stage.period}
                          </span>
                        </div>
                        <p className="text-sm font-semibold leading-snug">
                          {stage.title}
                        </p>
                        <p className="font-mono text-xs font-medium text-foreground/80">
                          {stage.capacity}
                        </p>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {stage.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border/80 shadow-xs">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Юрлица и контур управления
                  </CardTitle>
                  <CardDescription>
                    Проверенные официальные наименования
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3.5">
                {legalEntities.map((entity) => (
                  <li
                    key={entity.name}
                    className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 space-y-0.5 break-words">
                      <p className="text-sm font-semibold leading-snug">
                        {entity.name}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {entity.role}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Защита от типовых опечаток аудита
                </div>
                <p className="mt-1 leading-relaxed text-emerald-800/90">
                  Стоп-лист автоматически блокирует ошибки вроде «ВТД
                  Девелопмент», «ЮУрГППУ», «Денис Чертьев», «робот Куки» и
                  «кинопласт».
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="universities" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="border-primary/25 bg-primary/5 font-mono text-primary"
            >
              01_Вузы_резиденты
            </Badge>
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Семь равноправных вузов-резидентов
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Шесть государственных университетов и один частный вуз (МИДиС).
              Нажмите на любую карточку, чтобы перейти к его проектам и
              лабораториям в Базе знаний.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <Clock3 className="h-3.5 w-3.5 text-primary" />{universities.length} из 7 в каноне
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {universities.map((university, index) => {
            const isPrivate = university.id === "midis";

            return (
              <Link
                key={university.id}
                href={`/knowledge?folder=01_universities/${university.id}`}
                className={cn(
                  "group block h-full",
                  index === 0 && "sm:col-span-2 xl:col-span-2"
                )}
              >
                <Card className="card-hover flex h-full flex-col rounded-2xl border border-border/80 shadow-xs group-hover:border-primary/40">
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold shadow-2xs",
                          university.accent
                        )}
                      >
                        {university.monogram}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px]",
                          isPrivate
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-border bg-muted/40 text-muted-foreground"
                        )}
                      >
                        {isPrivate ? "Частный вуз-резидент" : "Вуз-резидент"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="flex items-center justify-between gap-2 text-base leading-snug group-hover:text-primary">
                        <span>{university.shortName}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </CardTitle>
                      <CardDescription className="text-xs leading-snug">
                        {university.fullName}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {university.profile}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {university.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-80 group-hover:opacity-100">
                        <FolderOpen className="h-3 w-3" />
                        Папка вуза
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="updates" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="border-primary/25 bg-primary/5 text-primary"
            >
              Журнал изменений
            </Badge>
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Лента обновлений канона
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Верифицированные карточки из контент-аудита, утверждённые статьи и
              обновления паспорта.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            Актуально на ноябрь 2026
          </div>
        </div>

        <Card className="overflow-hidden rounded-3xl border border-border/80 py-0 shadow-xs">
          <CardContent className="divide-y divide-border/70 p-0">
            {databaseUpdates.map((update, index) => (
              <div
                key={`${update.date}-${update.title}-${index}`}
                className="flex flex-col gap-3 p-5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1 break-words">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {update.date}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("border-0 text-[11px]", update.typeTone)}
                      >
                        {update.type}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold leading-snug">
                      {update.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {update.source}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-1.5 break-words pl-[3.25rem] text-xs text-muted-foreground sm:pl-0">
                  <Users className="h-3.5 w-3.5" />
                  {update.author}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {isDemoMode ? (
        <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-blue-50/90 via-background to-emerald-50/70 p-5 shadow-xs sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground">
                  <Cpu className="mr-1 h-3.5 w-3.5" />
                  Инфраструктура и полигон ИИ
                </Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-800"
                >
                  Стенд Alibaba Cloud для вузов
                </Badge>
              </div>
              <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                Замена Perplexity + Google Drive и учебный полигон Yandex vs Qwen
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Архитектурный разбор контура 152-ФЗ для госвузов (Yandex AI
                Studio + Яндекс Диск + YDB), живой сравнительный полигон моделей,
                гайд для студентов по Alibaba Cloud Model Studio с авто-фильтром ПДн
                и реестр всех 66 кейсов аудита.
              </p>
            </div>
            <Link
              href="/comparison"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-auto min-h-10 shrink-0 gap-2 whitespace-normal rounded-xl shadow-sm"
              )}
            >
              Открыть полигон и гайд
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
