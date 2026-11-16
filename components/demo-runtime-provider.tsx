"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { handleDemoApiFetch, resetDemoStore } from "@/lib/demo-client-store";

let fetchPatched = false;

export function DemoRuntimeProvider() {
  useEffect(() => {
    if (fetchPatched || typeof window === "undefined") return;
    fetchPatched = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const intercepted = await handleDemoApiFetch(url, init).catch((err) => {
        console.error("Demo API error:", err);
        return new Response(
          JSON.stringify({ error: "Ошибка выполнения операции в демо-режиме" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      });

      if (intercepted) return intercepted;
      return originalFetch(input, init);
    };
  }, []);

  const handleReset = () => {
    resetDemoStore();
    toast.success("Демо-база сброшена к эталонному состоянию (18 карточек, 3 статьи)");
  };

  return (
    <div className="border-b border-primary/15 bg-primary/5 px-4 py-1.5 text-xs">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-foreground/85">
          Интерактивный демо-прототип: все изменения, карточки и статьи сохраняются в вашем браузере
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={handleReset}
          className="h-7 gap-1.5 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <RotateCcw className="h-3 w-3" />
          Сбросить демо
        </Button>
      </div>
    </div>
  );
}
