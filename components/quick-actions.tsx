"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Cpu,
  PenLine,
  Plus,
  ScanText,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type QuickAction = {
  title: string;
  tag: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  ringTone: string;
  href: string;
};

const quickActions: QuickAction[] = [
  {
    title: "Проверить черновик",
    tag: "Стоп-лист · 66",
    description:
      "Сверить текст с паспортом кампуса и автоматически переписать по канону.",
    icon: ScanText,
    tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    ringTone: "hover:border-emerald-300/80 hover:bg-emerald-50/20",
    href: "/check",
  },
  {
    title: "Написать статью",
    tag: "SEO / GEO",
    description:
      "Собрать пресс-релиз чанками в Yandex AI Studio или Qwen строго по карточкам.",
    icon: PenLine,
    tone: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    ringTone: "hover:border-blue-300/80 hover:bg-blue-50/20",
    href: "/editor",
  },
  {
    title: "База знаний",
    tag: "Карточки",
    description:
      "Папки 7 вузов, совместные проекты и конструктор пользовательских типов.",
    icon: Plus,
    tone: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    ringTone: "hover:border-indigo-300/80 hover:bg-indigo-50/20",
    href: "/knowledge",
  },
  {
    title: "Собрать аналитику",
    tag: "Без выдумок",
    description:
      "Сводный отчёт по отраслям, вузам и уникальным индустриальным партнёрам.",
    icon: BarChart3,
    tone: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    ringTone: "hover:border-sky-300/80 hover:bg-sky-50/20",
    href: "/analytics",
  },
  {
    title: "Архитектура и ИИ",
    tag: "Yandex × Alibaba",
    description:
      "Сравнение облачных ИИ-моделей, учебный стенд Qwen и реестр аудита.",
    icon: Cpu,
    tone: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    ringTone: "hover:border-teal-300/80 hover:bg-teal-50/20",
    href: "/comparison",
  },
];

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function QuickActions({ cardsCount }: { cardsCount?: number }) {
  const visibleActions = isDemoMode
    ? quickActions
    : quickActions.filter((action) => action.href !== "/comparison");

  return (
    <div
      className={cn(
        "grid gap-3.5 sm:grid-cols-2",
        isDemoMode ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4"
      )}
    >
      {visibleActions.map((action) => {
        const Icon = action.icon;
        const tag =
          action.href === "/knowledge" && typeof cardsCount === "number"
            ? `${cardsCount} карточек`
            : action.tag;

        return (
          <Link
            key={action.title}
            href={action.href}
            className={cn(
              "card-hover group flex h-full min-h-11 min-w-0 flex-col justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all",
              action.ringTone
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    action.tone
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex min-w-0 items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className="bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </Badge>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary">
                  {action.title}
                </p>
                <p className="break-words text-xs leading-relaxed text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
