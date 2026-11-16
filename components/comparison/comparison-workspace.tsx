"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Copy,
  Cpu,
  FileCheck2,
  GraduationCap,
  HardDrive,
  Layers,
  Loader2,
  Lock,
  Play,
  Scale,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
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
import { Separator } from "@/components/ui/separator";
import {
  AUDIT_DISCREPANCY_TABLE,
  AUDIT_DISTORTION_MECHANISMS,
  CANONICAL_CAMPUS_PASSPORT,
} from "@/lib/audit-canon-registry";
import { cn } from "@/lib/utils";

type TabId = "architecture" | "benchmark" | "alibaba-edu" | "audit-memo";

type PlatformRunResult = {
  platform: "yandex" | "alibaba";
  platformName: string;
  mode: "live" | "demo";
  model: string;
  latencyMs: number;
  fz152Status: string;
  summary: string;
  excerpt: string;
  error: string | null;
};

type BenchmarkResponse = {
  executedAt: string;
  livePlatforms: { yandex: boolean; alibaba: boolean };
  scenarios: Array<{
    id: string;
    title: string;
    input: string;
    yandex: PlatformRunResult;
    alibaba: PlatformRunResult;
  }>;
  fz152Preview: {
    cardId: string;
    originalOwners: string[];
    anonymizedOwners: string[];
  } | null;
};

const TABS: Array<{ id: TabId; label: string; icon: typeof ShieldCheck }> = [
  { id: "architecture", label: "Российская архитектура", icon: ShieldCheck },
  { id: "benchmark", label: "Полигон Yandex vs Alibaba", icon: Scale },
  { id: "alibaba-edu", label: "Стенд Alibaba для вузов", icon: GraduationCap },
  { id: "audit-memo", label: "Аудит 66 кейсов и Памятка", icon: BookOpen },
];

const REPLACEMENT_MAP = [
  {
    foreign: "Google Drive (папка верифицированных карточек)",
    russian: "Яндекс Диск REST API + локальная БД / YDB Document API",
    why: "Каждая карточка и статья дублируется в .md и CSV на Яндекс Диске в дереве 00/01/02; данные не заперты в облачной ИИ-платформе.",
  },
  {
    foreign: "Perplexity Enterprise (индексация + RAG-ответы)",
    russian: "Yandex AI Studio (YandexGPT + Assistants/RAG + Search API)",
    why: "Температура 0.05, поиск строго по структурированным полям и карточкам Слоя 1 + ссылка на первоисточник в каждом ответе.",
  },
  {
    foreign: "OpenAI / Anthropic (генерация пресс-релизов)",
    russian: "YandexGPT Pro / AliceAI (РФ ЦОД) + правило SEO/GEO-чанков",
    why: "Оплата в рублях юрлицом по договору (44-ФЗ / 223-ФЗ), нет валютного контроля и трансграничной передачи ПДн по 152-ФЗ.",
  },
  {
    foreign: "Внутренний фактчекинг и мониторинг СМИ",
    russian: "Детерминированный движок 66 кейсов + LLM-сверка по Светофору",
    why: "Правила из аудита проверяют цифры, контуры, статусы УНК и опечатки ещё до обращения к нейросети.",
  },
];

const CRITERIA_COMPARISON = [
  {
    criterion: "1. Простота для студентов без глубокого кода",
    yandex:
      "Высокая: понятный интерфейс на русском языке, быстрый старт в Yandex AI Studio Assistants, встроенный векторный индекс для файлов.",
    alibaba:
      "Высокая: визуальный конструктор Model Studio (Bailian) с готовыми шаблонами Workflow, но интерфейс на английском/китайском.",
  },
  {
    criterion: "2. Качество фактчекинга и SEO/GEO-чанков",
    yandex:
      "Отлично понимает российские реалии, аббревиатуры вузов (ЮУрГУ, ЮУГМУ, ЮУрГГПУ), госнацпроекты и стилистику пресс-релизов без канцелярита.",
    alibaba:
      "Qwen-plus / Qwen-max показывают очень высокий балл в строгом JSON-форматировании, логическом разборе противоречий и мультиязычных пайплайнах.",
  },
  {
    criterion: "3. Удобство визуальных конструкторов и документов",
    yandex:
      "Хорошая связка с экосистемой Яндекс 360 / Диск и YDB, но меньше готовых узлов low-code графа, чем в зарубежных агентах.",
    alibaba:
      "Богатый визуальный граф Agentic Workflow, встроенный Data Parsing (PDF/DOCX/таблицы) и OpenAI-совместимый API DashScope.",
  },
  {
    criterion: "4. Стоимость, оплата и ограничения РФ (152-ФЗ)",
    yandex:
      "Полное соответствие 152-ФЗ (ЦОД РФ), договор с юрлицом в рублях (от ~0.20–1.20 ₽ за 1000 токенов, есть гранты для вузов).",
    alibaba:
      "Дешевле по тарифам API (~0.04–0.35 ₽ экв. за 1000 токенов + бесплатные 1 млн токенов на старт), но зарубежный контур: загрузка ПДн запрещена 152-ФЗ, возможны сложности с оплатой юрлицом из РФ.",
  },
];

const ALIBABA_CODE_SNIPPET = `// Пример учебного подключения к Alibaba Cloud Model Studio (DashScope)
// ВНИМАНИЕ (152-ФЗ): передаются только обезличенные открытые карточки кампуса!
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.ALIBABA_DASHSCOPE_API_KEY,
  baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
});

const completion = await client.chat.completions.create({
  model: "qwen-plus",
  temperature: 0.05, // Строгий запрет на выдумывание фактов
  messages: [
    { role: "system", content: "Отвечай строго по каноническим карточкам кампуса." },
    { role: "user", content: "Собери проекты МИДиС и ЮУГМУ с источниками." },
  ],
});`;

export function ComparisonWorkspace({
  yandexConfigured,
  alibabaConfigured,
  storageMode,
}: {
  yandexConfigured: boolean;
  alibabaConfigured: boolean;
  storageMode: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("architecture");
  const [isRunning, setIsRunning] = useState(false);
  const [benchmark, setBenchmark] = useState<BenchmarkResponse | null>(null);

  const runBenchmark = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const response = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "all" }),
      });
      const data = (await response.json().catch(() => null)) as
        | (BenchmarkResponse & { error?: string })
        | null;

      if (!response.ok || !data) {
        toast.error(data?.error ?? "Не удалось запустить полигон");
        return;
      }

      setBenchmark(data);
      toast.success("Прогон 3 контрольных сценариев завершён", {
        description:
          data.livePlatforms.yandex || data.livePlatforms.alibaba
            ? "Использованы подключённые облачные ключи API."
            : "Выполнен эталонный демо-прогон (ключи API можно добавить в шапке).",
      });
    } catch {
      toast.error("Ошибка связи с /api/benchmark");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopySnippet = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(ALIBABA_CODE_SNIPPET);
      toast.success("Код для учебного стенда скопирован");
    } catch {
      toast.error("Не удалось скопировать код — выделите его и скопируйте вручную");
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8 px-4 py-8 sm:py-10">
      <section className="gradient-hero-vibrant relative isolate overflow-hidden rounded-[2rem] border border-white/70 px-4 py-8 shadow-sm min-[400px]:px-6 sm:px-10 lg:px-12">
        <div
          aria-hidden
          className="pattern-grid pointer-events-none absolute inset-0 opacity-[0.12]"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/80 bg-white/75 text-primary hover:bg-white/75">
                <Cpu className="h-3.5 w-3.5" />
                Архитектура и полигон ИИ · Задача 2 ТЗ
              </Badge>
              <Badge
                variant="secondary"
                className="bg-emerald-50 text-emerald-800"
              >
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {storageMode === "dynamodb"
                  ? "БД: YDB / DynamoDB"
                  : "БД: Локальный JSON"}
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="break-words font-heading text-2xl font-bold min-[400px]:text-3xl leading-tight tracking-tight sm:text-4xl">
                Российская архитектура, полигон Yandex vs Alibaba Cloud и аудит 66 кейсов
              </h1>
              <p className="text-sm leading-relaxed text-foreground/75 sm:text-base">
                Техническое решение по замене Perplexity Enterprise + Google
                Drive в российском контуре (152-ФЗ), сравнительный полигон
                Yandex AI Studio и Alibaba Cloud Model Studio (Qwen), методичка
                для обучения студентов и памятка для 7 вузов-резидентов.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-2xl bg-white/85 px-4 py-3 text-center ring-1 ring-white/90">
              <div className="text-sm font-bold text-primary">
                {yandexConfigured ? "Онлайн (API)" : "Демо-режим"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Yandex AI Studio
              </div>
            </div>
            <div className="rounded-2xl bg-white/85 px-4 py-3 text-center ring-1 ring-white/90">
              <div className="text-sm font-bold text-primary">
                {alibabaConfigured ? "Онлайн (API)" : "Демо-режим"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Alibaba Qwen (без ПДн)
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Разделы страницы"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [scrollbar-width:thin]"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              variant={active ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className="min-h-10 shrink-0 gap-2 whitespace-nowrap rounded-xl"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {activeTab === "architecture" ? (
        <div className="space-y-6">
          <Alert className="border-emerald-200 bg-emerald-50/70 text-emerald-950">
            <ShieldCheck className="size-4 text-emerald-700" />
            <AlertTitle>
              Почему зарубежная связка Perplexity Enterprise + Google Drive не подходит госвузам РФ
            </AlertTitle>
            <AlertDescription>
              Зарубежные облака несут риски валютного контроля, блокировок
              аккаунтов, невозможности прямой оплаты по 44-ФЗ/223-ФЗ и нарушения
              ст. 18 ФЗ-152 (локализация персональных данных руководителей,
              спикеров и студентов на территории РФ). Ниже — готовая замена в
              российской экосистеме.
            </AlertDescription>
          </Alert>

          <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader>
              <CardTitle className="font-heading text-xl">
                Маппинг архитектуры: Perplexity + Google Drive → Российский контур (152-ФЗ)
              </CardTitle>
              <CardDescription>
                Именно эта схема уже реализована и работает в коде данного веб-сервиса.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {REPLACEMENT_MAP.map((row) => (
                <div
                  key={row.foreign}
                  className="min-w-0 break-words rounded-2xl border bg-muted/20 p-4 space-y-2"
                >
                  <div className="text-xs text-muted-foreground line-through">
                    {row.foreign}
                  </div>
                  <div className="flex items-start gap-2 text-sm font-semibold text-primary">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{row.russian}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/80">
                    {row.why}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl border-emerald-200 bg-emerald-50/30 shadow-sm">
              <CardHeader>
                <Badge className="w-fit bg-emerald-600 text-white hover:bg-emerald-600">
                  Рекомендуемый боевой вариант
                </Badge>
                <CardTitle className="mt-2 flex items-center gap-2 text-lg">
                  <Cloud className="h-5 w-5 text-emerald-700" />
                  1. Yandex Cloud (152-ФЗ, УЗ-1)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-relaxed text-foreground/85">
                <p>
                  <strong>Стек:</strong> Yandex AI Studio (YandexGPT /
                  Embeddings) + Yandex Database (YDB Document API) + Яндекс Диск
                  REST API + данный портал на Next.js.
                </p>
                <p>
                  <strong>Плюсы:</strong> аттестация по 152-ФЗ в ЦОД РФ, прямая
                  оплата в рублях от юрлица вуза, готовый OAuth-бэкап в папки
                  Яндекс Диска.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  Альтернатива в РФ
                </Badge>
                <CardTitle className="mt-2 flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  2. Экосистема Сбер (GigaChat)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-relaxed text-foreground/85">
                <p>
                  <strong>Стек:</strong> GigaChat Pro / Max API + Cloud.ru +
                  S3-совместимое хранилище + интеграция через OpenAI-совместимый
                  адаптер.
                </p>
                <p>
                  <strong>Плюсы:</strong> сертификаты ФСТЭК, высокие лимиты для
                  вузов по академическим соглашениям, сильная работа с русскими
                  официальными текстами.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  Закрытый контур вуза
                </Badge>
                <CardTitle className="mt-2 flex items-center gap-2 text-lg">
                  <Server className="h-5 w-5 text-primary" />
                  3. On-Premise на сервере вуза
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-relaxed text-foreground/85">
                <p>
                  <strong>Стек:</strong> Dify / AnythingLLM + vLLM (Qwen2.5-32B
                  или Vikhr-Nemo-12B на 1–2×A100/H100) + Qdrant + локальный
                  бэкап.
                </p>
                <p>
                  <strong>Плюсы:</strong> 100% автономность от внешних API,
                  можно обрабатывать закрытые документы ДСП, но требует GPU и
                  сопровождения администратором.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "benchmark" ? (
        <div className="space-y-6">
          <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-heading text-xl">
                  Живой испытательный полигон (3 контрольных сценария ТЗ)
                </CardTitle>
                <CardDescription>
                  Прогон одних и тех же задач кампуса через Yandex AI Studio и
                  Alibaba Cloud Model Studio (Qwen) с контролем обезличивания
                  ПДн по 152-ФЗ.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={runBenchmark}
                disabled={isRunning}
                className="min-h-10 w-full shrink-0 gap-2 whitespace-normal sm:w-auto"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isRunning
                  ? "Выполняем прогон..."
                  : "Запустить прогон 3 сценариев"}
              </Button>
            </CardHeader>
            {benchmark ? (
              <CardContent className="space-y-6">
                {benchmark.fz152Preview ? (
                  <div className="break-words rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                      <Lock className="h-4 w-4" />
                      Фильтр 152-ФЗ перед отправкой в Alibaba Cloud Model Studio (карточка{" "}
                      {benchmark.fz152Preview.cardId})
                    </div>
                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      <div className="rounded-xl bg-white/80 p-3">
                        <div className="font-semibold text-muted-foreground">
                          Внутри контура РФ (Yandex AI Studio):
                        </div>
                        <div className="mt-1 break-words">
                          {benchmark.fz152Preview.originalOwners.join(" · ")}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3">
                        <div className="font-semibold text-emerald-700">
                          Передано в Alibaba Cloud (обезличено):
                        </div>
                        <div className="mt-1 break-words">
                          {benchmark.fz152Preview.anonymizedOwners.join(" · ")}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {benchmark.scenarios.map((sc) => (
                    <div
                      key={sc.id}
                      className="rounded-2xl border p-4 space-y-3"
                    >
                      <div>
                        <h3 className="font-heading text-base font-semibold">
                          {sc.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          Вход: {sc.input}
                        </p>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {[sc.yandex, sc.alibaba].map((res) => (
                          <div
                            key={res.platform}
                            className="rounded-xl bg-muted/30 p-3.5 space-y-2 ring-1 ring-border/60"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-semibold">
                                {res.platformName}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant={
                                    res.mode === "live"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-[10px]"
                                >
                                  {res.mode === "live" ? "Live API" : "Демо-эталон"}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {res.latencyMs} мс
                                </Badge>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Модель: <code>{res.model}</code> · {res.fz152Status}
                            </p>
                            <p className="break-words text-xs font-medium text-foreground">
                              {res.summary}
                            </p>
                            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-background p-2.5 text-[11px] leading-relaxed ring-1 ring-border/50">
                              {res.excerpt}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            ) : null}
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader>
              <CardTitle className="font-heading text-xl">
                Итоговый сравнительный отчёт по 4 критериям ТЗ
              </CardTitle>
              <CardDescription>
                Рекомендация: Yandex AI Studio — для боевой PR-работы с ПДн по
                152-ФЗ; Alibaba Cloud Model Studio (Qwen) — для учебного трека и
                разработки студенческих ИИ-агентов на открытых датасетах.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div tabIndex={0} className="overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3 font-semibold">Критерий оценки (ТЗ)</th>
                      <th className="p-3 font-semibold">Yandex AI Studio (РФ)</th>
                      <th className="p-3 font-semibold">
                        Alibaba Cloud Model Studio (Qwen)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {CRITERIA_COMPARISON.map((row) => (
                      <tr key={row.criterion} className="align-top">
                        <td className="w-1/4 p-3 font-semibold text-xs sm:text-sm">
                          {row.criterion}
                        </td>
                        <td className="w-3/8 p-3 text-xs leading-relaxed">
                          {row.yandex}
                        </td>
                        <td className="w-3/8 p-3 text-xs leading-relaxed">
                          {row.alibaba}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "alibaba-edu" ? (
        <div className="space-y-6">
          <Alert>
            <GraduationCap className="size-4" />
            <AlertTitle>
              Учебный полигон на базе Alibaba Cloud для студентов и университетов
            </AlertTitle>
            <AlertDescription>
              В соответствии со 152-ФЗ в международный контур Alibaba Cloud
              Model Studio (Bailian / DashScope) загружаются только открытые
              учебные и научные данные кампуса без персональных данных.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5 text-primary" />
                  Архитектура студенческого стенда в Alibaba Cloud
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed">
                <div className="rounded-xl bg-muted/40 p-3">
                  <strong>1. Model Studio (Bailian) + Knowledge Base:</strong>{" "}
                  студенты загружают обезличенные <code>.md</code> карточки из
                  папок <code>00_Кампус_общие_параметры</code> и{" "}
                  <code>02_Совместные_проекты</code>, настраивают chunking
                  (500–800 токенов) и эмбеддинги <code>text-embedding-v3</code>.
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <strong>2. Agentic Workflow (Low-Code):</strong> сборка
                  визуального пайплайна «Запрос → Поиск по канону → Сверка
                  температуры 0.05 → Генерация SEO/GEO-чанков» без ручного
                  бэкенда.
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <strong>3. ECS / FC + OSS (для разработчиков):</strong>{" "}
                  развёртывание студенческих веб-прототипов на лёгком инстансе
                  Alibaba Cloud ECS (или в контейнере Docker) с подключением к
                  DashScope через переменную <code>ALIBABA_DASHSCOPE_API_KEY</code>.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Terminal className="h-5 w-5 text-primary" />
                    Подключение DashScope (OpenAI SDK)
                  </CardTitle>
                  <CardDescription>
                    Этот же протокол уже встроен в <code>lib/alibaba-ai.ts</code>
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-10"
                  onClick={handleCopySnippet}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Копировать
                </Button>
              </CardHeader>
              <CardContent>
                <pre tabIndex={0} className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-100">
                  {ALIBABA_CODE_SNIPPET}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "audit-memo" ? (
        <div className="space-y-6">
          <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-xl">
                    Сводная панорама {AUDIT_DISCREPANCY_TABLE.length} ключевых противоречий инфополя (PDF-аудит)
                  </CardTitle>
                  <CardDescription>
                    Проверена 161 веб-страница (105 публикаций, 66
                    задокументированных разночтений за 2020–2026 гг.). Все
                    правила уже зашиты в фактчекер.
                  </CardDescription>
                </div>
                <Link
                  href="/check"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-10")}
                >
                  <FileCheck2 className="mr-1.5 h-4 w-4" />
                  Проверить текст на ошибки
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div tabIndex={0} className="overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[780px] border-collapse text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3 font-semibold">Базовый вопрос</th>
                      <th className="p-3 font-semibold">
                        Разночтения в открытых источниках
                      </th>
                      <th className="p-3 font-semibold">
                        Канон ({CANONICAL_CAMPUS_PASSPORT.officialCode})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {AUDIT_DISCREPANCY_TABLE.map((row, rowIndex) => (
                      <tr key={`${row.question}-${rowIndex}`} className="align-top">
                        <td className="p-3 text-xs font-semibold">
                          {row.question}
                          <div className="mt-1 text-[10px] font-normal text-muted-foreground">
                            Кейсы: {row.caseNumbers.join(", ")} · Вариантов:{" "}
                            {row.variantsCount}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {row.variantsInMedia.map((v) => (
                              <Badge
                                key={v}
                                variant="outline"
                                className="border-amber-200 bg-amber-50/70 text-[11px] text-amber-900"
                              >
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-xs leading-relaxed text-emerald-900">
                          {row.canonicalAnswer}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AUDIT_DISTORTION_MECHANISMS.map((m) => (
              <Card key={m.number} className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <Badge variant="secondary" className="w-fit text-[11px]">
                    Механизм {m.number}
                  </Badge>
                  <CardTitle className="mt-1 text-base">{m.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <p>{m.description}</p>
                  <p className="rounded-lg bg-muted/50 p-2 text-foreground/85">
                    {m.example}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <Card className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-xl">
                <ClipboardList className="h-5 w-5 text-primary" />
                Памятка для сотрудников 7 вузов, АНО «РИОН», ООО «ЧКК» и Минобрнауки
              </CardTitle>
              <CardDescription>
                Короткая инструкция по работе с единой канонической базой в режиме «одного окна».
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  1. Два слоя знаний (Слой 1 и Слой 2)
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <strong>Слой 1 (Канонические карточки)</strong> — единственный
                  источник цифр, дат, статусов площадок и авторства.{" "}
                  <strong>Слой 2 (Готовые_статьи/)</strong> — библиотека
                  утверждённых чанков других вузов для живых формулировок.
                </p>
              </div>
              <div className="rounded-2xl border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  2. «Правило владельца» и равноправие 7 вузов
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Все 7 вузов равноправны. Редактировать карточку может только её
                  владелец и Администратор канона. Совместные проекты (например,
                  МИДиС + ЮУГМУ) лежат в <code>02_Совместные_проекты/</code> и
                  требуют согласования обеих сторон. Чужие карточки можно
                  комментировать кнопкой «Запросить правку».
                </p>
              </div>
              <div className="rounded-2xl border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  3. Порядок работы перед публикацией
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Сгенерируйте текст в «Умном редакторе» (он сразу соберёт лид до
                  1000 знаков и H1–H3 чанки) или вставьте черновик в
                  «Фактчекинг». Публикация разрешена только при отсутствии
                  красных флагов (0 красных).
                </p>
              </div>
              <div className="rounded-2xl border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <HardDrive className="h-4 w-4 text-primary" />
                  4. Резервное дублирование на Яндекс Диск
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  После одобрения карточки или сохранения статьи система
                  автоматически выгружает читаемый <code>.md</code>-файл и
                  сводную таблицу <code>.csv</code> в папки{" "}
                  <code>00_Кампус_общие_параметры</code>,{" "}
                  <code>01_Вузы_резиденты</code> и{" "}
                  <code>02_Совместные_проекты</code> на Яндекс Диске.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
