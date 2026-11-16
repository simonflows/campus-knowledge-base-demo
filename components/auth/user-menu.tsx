"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleShortLabels, type SessionUser } from "@/lib/auth";
import { useDemoStore } from "@/lib/demo-client-store";

type UserMenuProps = {
  initialUser: SessionUser | null;
};

export function UserMenu({ initialUser }: UserMenuProps) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const { user: storeUser } = useDemoStore();
  const currentUser = storeUser ?? initialUser;

  const handleLogout = async () => {
    setIsBusy(true);

    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      toast.success("Вы вышли из демонстрационного аккаунта");
      router.push("/login");
    } catch {
      toast.error("Не удалось завершить сессию");
    } finally {
      setIsBusy(false);
    }
  };

  if (!currentUser) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => router.push("/login")}
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Войти по роли</span>
        <span className="sm:hidden">Войти</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="hidden items-center gap-2 rounded-full bg-muted/60 py-1 pr-1 pl-3 text-left transition-colors hover:bg-muted sm:flex"
      >
        <span className="flex flex-col">
          <span className="text-xs font-semibold leading-tight">
            {currentUser.name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {roleShortLabels[currentUser.role]}
          </span>
        </span>
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          {currentUser.organization}
        </Badge>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleLogout}
        disabled={isBusy}
        aria-label="Выйти из аккаунта"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
