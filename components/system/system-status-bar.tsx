"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  CloudCog,
  Cpu,
  Database,
  HardDrive,
  KeyRound,
  Loader2,
  Menu,
  PenLine,
  ScanText,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

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
import { buildDemoSystemStatus, useDemoStore } from "@/lib/demo-client-store";
import { cn } from "@/lib/utils";

export type SystemStatusPayload = {
  storageMode: string;
  yandexAi: {
    configured: boolean;
    hasApiKey: boolean;
    hasFolderId: boolean;
    modelUri: string;
  };
  alibabaAi: {
    configured: boolean;
    modelName: string;
    baseUrl: string;
  };
  yandexDisk: {
    configured: boolean;
  };
  fz152Compliant: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof BookOpen;
};

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const NAV_ITEMS: NavItem[] = [
  { href: "/knowledge", label: "База знаний", icon: BookOpen },
  { href: "/editor", label: "Умный редактор", icon: PenLine },
  { href: "/check", label: "Фактчекинг", icon: ScanText },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  ...(isDemoMode
    ? [{ href: "/comparison", label: "Архитектура и ИИ", icon: Cpu }]
    : []),
  { href: "/login", label: "Доступ", icon: ShieldCheck },
];

const MODEL_OPTIONS = [
  { value: "qwen-plus", label: "qwen-plus (баланс цена/качество)" },
  { value: "qwen-max", label: "qwen-max (максимальное качество)" },
  { value: "qwen-turbo", label: "qwen-turbo (учебный / быстрый)" },
  { value: "qwen2.5-72b-instruct", label: "qwen2.5-72b-instruct (open-weight)" },
];

function StatusPill({
  configured,
  label,
}: {
  configured: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1",
        configured
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-amber-50 text-amber-800 ring-amber-200"
      )}
    >
      {configured ? (
        <CheckCircle2 className="size-3 shrink-0" />
      ) : (
        <XCircle className="size-3 shrink-0" />
      )}
      {label}
    </span>
  );
}

export function SystemStatusBar({
  initialStatus,
}: {
  initialStatus: SystemStatusPayload;
}) {
  const pathname = usePathname();
  const { hydrated, state: demoState } = useDemoStore();
  const [fallbackStatus, setStatus] = useState<SystemStatusPayload>(initialStatus);
  const status = hydrated ? buildDemoSystemStatus(demoState) : fallbackStatus;
  const [keysOpen, setKeysOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  const [yandexKey, setYandexKey] = useState("");
  const [yandexFolder, setYandexFolder] = useState("");
  const [yandexDiskToken, setYandexDiskToken] = useState("");
  const [alibabaKey, setAlibabaKey] = useState("");
  const [alibabaModel, setAlibabaModel] = useState(
    status.alibabaAi.modelName || "qwen-plus"
  );

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!keysOpen) return;
    let cancelled = false;
    setIsAdmin(null);
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: { role?: string } | null } | null) => {
        if (!cancelled) setIsAdmin(data?.user?.role === "admin");
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keysOpen]);

  const baseUrlValue = baseUrl.trim();
  const baseUrlInvalid = (() => {
    if (!baseUrlValue) return false;
    try {
      return new URL(baseUrlValue).protocol !== "https:";
    } catch {
      return true;
    }
  })();

  const handleSaveKeys = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    if (isAdmin === false) {
      toast.error("Войдите как Администратор канона на странице /login");
      return;
    }
    if (baseUrlInvalid) {
      toast.error("ALIBABA_DASHSCOPE_BASE_URL должен быть https-адресом");
      return;
    }
    setIsSaving(true);

    try {
      const response = await fetch("/api/system/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(yandexKey.trim() ? { YANDEX_AI_STUDIO_API_KEY: yandexKey.trim() } : {}),
          ...(yandexFolder.trim()
            ? { YANDEX_AI_STUDIO_FOLDER_ID: yandexFolder.trim() }
            : {}),
          ...(yandexDiskToken.trim()
            ? { YANDEX_DISK_OAUTH_TOKEN: yandexDiskToken.trim() }
            : {}),
          ...(alibabaKey.trim()
            ? { ALIBABA_DASHSCOPE_API_KEY: alibabaKey.trim() }
            : {}),
          ...(baseUrlValue ? { ALIBABA_DASHSCOPE_BASE_URL: baseUrlValue } : {}),
          ALIBABA_MODEL_NAME: alibabaModel,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | (SystemStatusPayload & { saved?: boolean; error?: string })
        | null;

      if (response.status === 401 || response.status === 403) {
        setIsAdmin(false);
        toast.error(
          data?.error ?? "Нужна роль Администратора канона. Войдите на странице /login"
        );
        return;
      }
      if (!response.ok || !data) {
        toast.error(data?.error ?? "Не удалось сохранить ключи");
        return;
      }

      setStatus(data);
      setYandexKey("");
      setYandexFolder("");
      setYandexDiskToken("");
      setAlibabaKey("");
      setBaseUrl("");
      toast.success("Ключи сохранены в .env.local и применены", {
        description:
          "Изменения активны в текущей сессии. Для Docker перезапустите контейнер.",
      });
      setKeysOpen(false);
    } catch {
      toast.error("Ошибка связи с /api/system/status");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = [
    status.yandexAi.configured,
    status.yandexDisk.configured,
    status.alibabaAi.configured,
  ].filter(Boolean).length;

  return (
    <>
      <div className="flex items-center gap-1.5">
        {isDemoMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setKeysOpen(true)}
            className="h-10 gap-1.5 rounded-full border-border/80 bg-card/90 px-2.5 text-[11px] font-medium text-foreground/85 hover:bg-muted"
            title="Состояние ИИ-интеграций и настройка API-ключей"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="sr-only md:hidden">ИИ и ключи {activeCount}/3</span>
            <span className="hidden md:inline">ИИ и ключи</span>
            <span className="hidden xl:inline text-muted-foreground">
              · {activeCount}/3
            </span>
            <KeyRound className="h-3 w-3 md:ml-0.5 text-primary" />
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-10 xl:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Открыть меню навигации"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <Sparkles className="h-4 w-4 text-primary" />
              Навигация по сервису
            </DialogTitle>
            <DialogDescription>
              Каноническая база знаний кампуса «Южный Урал»
            </DialogDescription>
          </DialogHeader>
          <nav aria-label="Основная навигация" className="grid gap-1.5 py-2">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                "min-h-11",
                pathname === "/"
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
              aria-current={pathname === "/" ? "page" : undefined}
            >
              <Sparkles className="h-4 w-4" />
              Главная панель
            </Link>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "min-h-11 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {isDemoMode ? (
            <>
              <Separator />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setKeysOpen(true);
                }}
              >
                <KeyRound className="h-4 w-4 text-primary" />
                Настройка API-ключей ({activeCount}/3)
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {isDemoMode ? (
        <Dialog open={keysOpen} onOpenChange={setKeysOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Интеграции и ключи API
              </Badge>
              <Badge variant="outline" className="gap-1 text-[11px]">
                <Database className="h-3 w-3" />
                БД:{" "}
                {status.storageMode === "dynamodb"
                  ? "DynamoDB / YDB"
                  : "Локальный JSON (.data)"}
              </Badge>
            </div>
            <DialogTitle className="font-heading text-xl">
              Настройка ключей ИИ и Яндекс Диска
            </DialogTitle>
            <DialogDescription>
              Сервис работает сразу в автономном режиме. Чтобы включить живую
              генерацию через облачные LLM и автобэкап на Яндекс Диск, вставьте
              ключи ниже или запустите <code>npm run setup</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              configured={status.yandexAi.configured}
              label={
                status.yandexAi.configured
                  ? "Yandex AI Studio подключён"
                  : "Yandex AI: Демо-движок"
              }
            />
            <StatusPill
              configured={status.yandexDisk.configured}
              label={
                status.yandexDisk.configured
                  ? "Яндекс Диск подключён"
                  : "Яндекс Диск: Ожидает токен"
              }
            />
            <StatusPill
              configured={status.alibabaAi.configured}
              label={
                status.alibabaAi.configured
                  ? `Alibaba Qwen (${status.alibabaAi.modelName})`
                  : "Alibaba Cloud: Демо-режим"
              }
            />
          </div>

          <form onSubmit={handleSaveKeys} className="space-y-5">
            <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CloudCog className="h-4 w-4 text-primary" />
                1. Основной контур: Yandex AI Studio
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="key-yandex-api">
                    YANDEX_AI_STUDIO_API_KEY
                  </Label>
                  <Input
                    id="key-yandex-api"
                    type="password"
                    value={yandexKey}
                    onChange={(e) => setYandexKey(e.target.value)}
                    placeholder={
                      status.yandexAi.hasApiKey
                        ? "•••••••• (уже сохранён)"
                        : "AQVN..."
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="key-yandex-folder">
                    YANDEX_AI_STUDIO_FOLDER_ID
                  </Label>
                  <Input
                    id="key-yandex-folder"
                    value={yandexFolder}
                    onChange={(e) => setYandexFolder(e.target.value)}
                    placeholder={
                      status.yandexAi.hasFolderId
                        ? "b1g... (уже сохранён)"
                        : "b1g..."
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <HardDrive className="h-4 w-4 text-primary" />
                2. Резервное дублирование: Яндекс Диск REST API
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="key-yandex-disk">YANDEX_DISK_OAUTH_TOKEN</Label>
                <Input
                  id="key-yandex-disk"
                  type="password"
                  value={yandexDiskToken}
                  onChange={(e) => setYandexDiskToken(e.target.value)}
                  placeholder={
                    status.yandexDisk.configured
                      ? "•••••••• (уже сохранён)"
                      : "y0_AgAAAA..."
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Cpu className="h-4 w-4 text-primary" />
                3. Учебный полигон: Alibaba Cloud Model Studio (Qwen)
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="key-alibaba">ALIBABA_DASHSCOPE_API_KEY</Label>
                  <Input
                    id="key-alibaba"
                    type="password"
                    value={alibabaKey}
                    onChange={(e) => setAlibabaKey(e.target.value)}
                    placeholder={
                      status.alibabaAi.configured
                        ? "•••••••• (уже сохранён)"
                        : "sk-..."
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="key-alibaba-model">Модель Qwen</Label>
                  <Select
                    value={alibabaModel}
                    items={MODEL_OPTIONS}
                    onValueChange={(value) => setAlibabaModel(String(value))}
                  >
                    <SelectTrigger id="key-alibaba-model" className="w-full">
                      <SelectValue placeholder="Выберите модель" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="key-alibaba-url">
                  ALIBABA_DASHSCOPE_BASE_URL (необязательно)
                </Label>
                <Input
                  id="key-alibaba-url"
                  type="url"
                  inputMode="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  aria-invalid={baseUrlInvalid}
                  placeholder={status.alibabaAi.baseUrl || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"}
                  className="break-all"
                />
                {baseUrlInvalid ? (
                  <p className="text-[11px] text-destructive">
                    Допустим только https-адрес (например, https://…).
                  </p>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                При обращении к учебному стенду Alibaba Cloud ФИО и контакты
                владельцев карточек автоматически обезличиваются до отправки.
              </p>
            </div>

            {isAdmin === false ? (
              <Alert variant="destructive" role="alert">
                <ShieldCheck className="size-4" />
                <AlertTitle>Сохранение ключей доступно только администратору</AlertTitle>
                <AlertDescription>
                  Войдите как Администратор канона на странице{" "}
                  <Link href="/login" className="font-semibold underline underline-offset-2">
                    /login
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            ) : null}

            <Alert>
              <KeyRound className="size-4" />
              <AlertTitle>Альтернатива — интерактивный скрипт</AlertTitle>
              <AlertDescription>
                Также можно запустить <code>npm run setup</code> или{" "}
                <code>setup-keys.bat</code> в корне проекта — скрипт проведёт
                по всем ключам и сам заполнит <code>.env.local</code> и{" "}
                <code>.env.docker</code>.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setKeysOpen(false)}
              >
                Закрыть
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isAdmin !== true || baseUrlInvalid}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {isSaving ? "Сохраняем..." : "Сохранить и применить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      ) : null}
    </>
  );
}
