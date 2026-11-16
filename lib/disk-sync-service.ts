import type { ReadyArticle } from "./articles";
import type { KnowledgeCard } from "./knowledge";
import {
  getAllArticles,
  getAllCardTypes,
  getAllKnowledgeCards,
  getArticleById,
  getKnowledgeCardById,
  setArticleDiskSync,
  setKnowledgeCardDiskSync,
} from "./models";
import { syncArticleToDisk, syncKnowledgeCardToDisk } from "./yandex-disk";

export async function syncKnowledgeCardRecord(
  card: KnowledgeCard
): Promise<KnowledgeCard> {
  const [allCards, customTypes] = await Promise.all([
    getAllKnowledgeCards().catch(() => [card]),
    getAllCardTypes().catch(() => []),
  ]);
  const diskSync = await syncKnowledgeCardToDisk(card, allCards, customTypes);

  await setKnowledgeCardDiskSync(card.id, diskSync);

  return { ...card, diskSync };
}

export async function retryKnowledgeCardSync(
  id: string
): Promise<KnowledgeCard | null> {
  const card = await getKnowledgeCardById(id);

  if (!card) return null;

  return syncKnowledgeCardRecord(card);
}

export async function syncArticleRecord(
  article: ReadyArticle
): Promise<ReadyArticle> {
  const allArticles = await getAllArticles().catch(() => [article]);
  const diskSync = await syncArticleToDisk(article, allArticles);

  await setArticleDiskSync(article.id, diskSync);

  return { ...article, diskSync };
}

export async function retryArticleSync(
  id: string
): Promise<ReadyArticle | null> {
  const article = await getArticleById(id);

  if (!article) return null;

  return syncArticleRecord(article);
}
