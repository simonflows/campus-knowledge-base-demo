"use client";

import { HomeDashboard } from "@/components/home-dashboard";
import {
  campusMetrics,
  databaseUpdates,
  heroStats,
  legalEntities,
  universities,
} from "@/lib/data";
import { useDemoStore } from "@/lib/demo-client-store";
import { getCardStatus } from "@/lib/knowledge";

export default function HomePage() {
  const { allCards, articles } = useDemoStore();
  const cardsCount = allCards.filter((card) => getCardStatus(card) === "approved").length;
  const articlesCount = articles.length;

  const liveStats = heroStats.map((stat, index) => {
    if (index === 0) return { ...stat, value: String(cardsCount) };
    if (index === 1) return { ...stat, value: String(articlesCount) };
    return stat;
  });

  return (
    <HomeDashboard
      heroStats={liveStats}
      cardsCount={cardsCount}
      articlesCount={articlesCount}
      campusMetrics={campusMetrics}
      legalEntities={legalEntities}
      universities={universities}
      databaseUpdates={databaseUpdates}
    />
  );
}
