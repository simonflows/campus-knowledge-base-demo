"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  demoAccountsByRole,
  roleDefinitions,
  roleLabels,
  roleShortLabels,
  type SessionUser,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

type LoginScreenProps = {
  currentUser: SessionUser | null;
};

function formatAccountCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} аккаунт`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} аккаунта`;
  }
  return `${count} аккаунтов`;
}

export function LoginScreen({ currentUser }: LoginScreenProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pinForAdmin, setPinForAdmin] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);
  const groups = demoAccountsByRole();

  const handleLogin = async (accountId: string, pin?: string) => {
    setBusyId(accountId);

    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, ...(pin ? { pin } : {}) }),
      });
      const data = (await response.json().catch(() => null)) as {
        user?: SessionUser;
        error?: string;
        requiresPin?: boolean;
      } | null;

      if (data?.requiresPin) {
        setShowPinInput(true);
        toast.error(data.error ?? "Введите ПИН-код администратора");
        return;
      }

      if (!response.ok || !data?.user) {
        toast.error(data?.error ?? "Не удалось войти под аккаунтом");
        return;
      }

      toast.success(`Вы вошли как ${data.user.name}`, {
        description: roleLabels[data.user.role],
      });
      router.refresh();
      router.push("/knowledge");
    } catch {
      toast.error("Ошибка сети при входе");
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = async () => {
    setBusyId("logout");

    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      toast.success("Сессия завершена");
      router.refresh();
    } catch {
      toast.error("Не удалось завершить сессию");
    } finally {
      setBusyId(null);
    }
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/80 bg-white/75 text-primary hover:bg-white/75">
                <ShieldCheck className="h-3.5 w-3.5" />
                Роли и права доступа
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50/90 text-emerald-800"
              >
                HMAC-SHA256 HttpOnly Session
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Вход по демонстрационным ролям
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-foreground/70 sm:text-base">
                Все авторизованные пользователи читают базу, проверяют тексты,
                пишут статьи и запрашивают аналитику. Изменять карточки могут
                только администратор канона и владельцы, а PR-команды вузов
                отправляют черновики на подтверждение.
              </p>
            </div>
          </div>

          {currentUser ? (
            <div className="rounded-2xl bg-white/85 p-4 ring-1 ring-white/90">
              <p className="text-xs text-muted-foreground">Текущий аккаунт</p>
              <p className="mt-1 font-semibold">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">
                {roleLabels[currentUser.role]} · {currentUser.organization}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleLogout}
                disabled={busyId !== null}
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Матрица ролей
          </h2>
          <p className="text-sm text-muted-foreground">
            Ограничения одинаковы для всех семи вузов-резидентов: ни один вуз не
            может редактировать утверждённые карточки другого.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(({ role }) => {
            const definition = roleDefinitions[role];

            return (
              <Card
                key={role}
                className="rounded-3xl border-0 shadow-sm ring-1 ring-foreground/10"
              >
                <CardHeader className="gap-2">
                  <CardTitle className="flex items-center gap-2 font-heading text-lg">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {roleLabels[role]}
                  </CardTitle>
                  <CardDescription>{definition.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-1.5">
                    {definition.capabilities.map((item) => (
                      <p key={item} className="flex gap-2 leading-relaxed">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {definition.restrictions.map((item) => (
                      <p
                        key={item}
                        className="flex gap-2 leading-relaxed text-muted-foreground"
                      >
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Демонстрационные аккаунты
          </h2>
          <p className="text-sm text-muted-foreground">
            Выберите роль и проверьте ограничения в дереве базы знаний. Вход
            работает без пароля и предназначен только для демонстрации.
          </p>
        </div>

        <div className="space-y-5">
          {groups.map(({ role, accounts }) => (
            <div key={role} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{roleLabels[role]}</h3>
                <Badge variant="secondary">{formatAccountCount(accounts.length)}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {accounts.map((account) => {
                  const isCurrent = currentUser?.id === account.id;
                  const needsPinInput = account.role === "admin" && showPinInput;

                  return (
                    <Card
                      key={account.id}
                      className={cn(
                        "rounded-2xl border-0 shadow-sm ring-1",
                        isCurrent ? "ring-primary/40" : "ring-foreground/10"
                      )}
                    >
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="flex items-center gap-1.5 text-sm font-semibold">
                              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                              {account.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {account.position}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {account.organization}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {roleShortLabels[account.role]}
                          </Badge>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {account.demoHint}
                        </p>
                        {needsPinInput ? (
                          <div className="space-y-1.5">
                            <Label htmlFor="admin-access-pin" className="text-xs">
                              ПИН-код администратора (ADMIN_ACCESS_PIN)
                            </Label>
                            <Input
                              id="admin-access-pin"
                              type="password"
                              value={pinForAdmin}
                              onChange={(event) => setPinForAdmin(event.target.value)}
                              placeholder="Введите ПИН-код..."
                              className="h-9"
                            />
                          </div>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant={isCurrent ? "outline" : "default"}
                          className="w-full"
                          onClick={() =>
                            handleLogin(
                              account.id,
                              account.role === "admin" ? pinForAdmin : undefined
                            )
                          }
                          disabled={busyId !== null || isCurrent}
                        >
                          <KeyRound className="h-4 w-4" />
                          {isCurrent
                            ? "Текущий аккаунт"
                            : busyId === account.id
                              ? "Входим..."
                              : "Войти под ролью"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
