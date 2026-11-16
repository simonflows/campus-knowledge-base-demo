"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Cpu,
  Home,
  PenLine,
  ScanText,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const HEADER_LINKS = [
  { href: "/", label: "Обзор", icon: Home, exact: true },
  { href: "/knowledge", label: "База знаний", icon: BookOpen, exact: false },
  { href: "/editor", label: "Редактор", icon: PenLine, exact: false },
  { href: "/check", label: "Фактчекинг", icon: ScanText, exact: false },
  { href: "/analytics", label: "Аналитика", icon: BarChart3, exact: false },
  ...(isDemoMode
    ? [{ href: "/comparison", label: "Архитектура и ИИ", icon: Cpu, exact: false }]
    : []),
  { href: "/login", label: "Доступ", icon: ShieldCheck, exact: false },
] as const;

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="ml-3 hidden items-center gap-0.5 text-[13px] xl:flex"
    >
      {HEADER_LINKS.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 whitespace-nowrap transition-all",
              isActive
                ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/20 shadow-2xs"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
