import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { cn } from "@/lib/utils";
import {
  Building2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BridgeProvider } from "@/components/bridge-provider";
import { UserMenu } from "@/components/auth/user-menu";
import { DemoRuntimeProvider } from "@/components/demo-runtime-provider";
import { HeaderNav } from "@/components/navigation/header-nav";
import { SystemStatusBar, type SystemStatusPayload } from "@/components/system/system-status-bar";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_ALIBABA_BASE_URL, DEFAULT_ALIBABA_MODEL } from "@/lib/alibaba-ai";
import { universities } from "@/lib/data";

const appName = "Канон кампуса «Южный Урал»";

const DEFAULT_DEMO_SYSTEM_STATUS: SystemStatusPayload = {
  storageMode: "local-json",
  yandexAi: {
    configured: false,
    hasApiKey: false,
    hasFolderId: false,
    modelUri: "gpt://<folder_id>/yandexgpt/latest",
  },
  alibabaAi: {
    configured: false,
    modelName: DEFAULT_ALIBABA_MODEL,
    baseUrl: DEFAULT_ALIBABA_BASE_URL,
  },
  yandexDisk: {
    configured: false,
  },
  fz152Compliant: true,
};

export const metadata: Metadata = {
  title: `${appName} — Единая база знаний 7 вузов`,
  description:
    "Единый канонический источник фактов, SEO/GEO-редактор, фактчекер (66 кейсов аудита) и полигон Yandex AI Studio / Alibaba Cloud для Межуниверситетского кампуса мирового уровня «Южный Урал».",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <html lang="ru" className={cn("font-sans")}>
      <body className="antialiased min-h-screen bg-background flex flex-col">
        <DemoRuntimeProvider />
        <BridgeProvider />
        <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-lg">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
            <Link
              href="/"
              className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-hero text-white shadow-sm ring-1 ring-primary/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold tracking-tight sm:text-[15px]">
                  {appName}
                </span>
                <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
                  Single Source of Truth · 7 вузов
                </span>
              </div>
            </Link>

            <HeaderNav />

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <SystemStatusBar initialStatus={DEFAULT_DEMO_SYSTEM_STATUS} />
              <UserMenu initialUser={null} />
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-border/80 bg-card/70">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.4fr]">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-hero text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-tight">{appName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Паспорт CAMPUS-PASS-001 · г. Челябинск
                    </p>
                  </div>
                </div>
                <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                  Единый источник достоверных фактов о строительстве,
                  лабораториях, продуктовых программах и совместных проектах
                  семи университетов-резидентов кампуса мирового уровня.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                    Единый стандарт данных 7 вузов
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/15">
                    <Building2 className="h-3 w-3" />
                    АНО «РИОН» · ООО «ЧКК» · Минобрнауки ЧО
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Модули системы
                </p>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <li>
                    <Link
                      href="/knowledge"
                      className="text-foreground/80 transition-colors hover:text-primary"
                    >
                      База знаний (18 карточек)
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/editor"
                      className="text-foreground/80 transition-colors hover:text-primary"
                    >
                      Умный SEO/GEO-редактор
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/check"
                      className="text-foreground/80 transition-colors hover:text-primary"
                    >
                      Фактчекинг (66 кейсов)
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/analytics"
                      className="text-foreground/80 transition-colors hover:text-primary"
                    >
                      Сборная аналитика
                    </Link>
                  </li>
                  {isDemoMode ? (
                    <li>
                      <Link
                        href="/comparison"
                        className="text-foreground/80 transition-colors hover:text-primary"
                      >
                        Архитектура и полигон ИИ
                      </Link>
                    </li>
                  ) : null}
                  <li>
                    <Link
                      href="/login"
                      className="text-foreground/80 transition-colors hover:text-primary"
                    >
                      Роли и доступ вузов
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  Семь равноправных вузов-резидентов
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {universities.map((u) => (
                    <Link
                      key={u.id}
                      href={`/knowledge?folder=01_universities/${u.id}`}
                      className="rounded-lg border bg-background px-2.5 py-1 text-xs font-medium text-foreground/85 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      {u.shortName}
                    </Link>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Нажмите на любой университет, чтобы открыть его папку в каноне.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row">
              <span>© {new Date().getFullYear()} {appName}</span>
              <span>Челябинская область · Координация инфополя в ИИ и СМИ</span>
            </div>
          </div>
        </footer>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
