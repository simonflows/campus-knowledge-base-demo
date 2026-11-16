import fs from "node:fs/promises";
import path from "node:path";

import { articleSeed, type ReadyArticle } from "./articles";
import {
  knowledgeSeedCards,
  type CardTypeDefinition,
  type KnowledgeCard,
} from "./knowledge";

export interface LocalStoreData {
  seedVersion: number;
  cards: KnowledgeCard[];
  cardTypes: CardTypeDefinition[];
  articles: ReadyArticle[];
  demoArticlesCleared?: boolean;
}

const CURRENT_SEED_VERSION = 2;
const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(STORE_DIR, "local-store.json");

let writeQueue: Promise<unknown> = Promise.resolve();

function createInitialStore(): LocalStoreData {
  const skipDemoArticles = process.env.SEED_DEMO_ARTICLES === "false";
  return {
    seedVersion: CURRENT_SEED_VERSION,
    cards: structuredClone(knowledgeSeedCards),
    cardTypes: [],
    articles: skipDemoArticles ? [] : structuredClone(articleSeed),
    demoArticlesCleared: skipDemoArticles,
  };
}

export async function readLocalStore(): Promise<LocalStoreData> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalStoreData>;

    if (
      !parsed ||
      parsed.seedVersion !== CURRENT_SEED_VERSION ||
      !Array.isArray(parsed.cards) ||
      !Array.isArray(parsed.articles)
    ) {
      const fresh = createInitialStore();
      await writeLocalStore(fresh);
      return fresh;
    }

    return {
      seedVersion: CURRENT_SEED_VERSION,
      cards: parsed.cards,
      cardTypes: Array.isArray(parsed.cardTypes) ? parsed.cardTypes : [],
      articles: parsed.articles,
      demoArticlesCleared: Boolean(parsed.demoArticlesCleared),
    };
  } catch {
    const fresh = createInitialStore();
    await writeLocalStore(fresh);
    return fresh;
  }
}

export async function writeLocalStore(data: LocalStoreData): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  const tempPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempPath, STORE_PATH);
}

export async function mutateLocalStore<T>(
  mutator: (store: LocalStoreData) => Promise<{ store: LocalStoreData; result: T }> | { store: LocalStoreData; result: T }
): Promise<T> {
  const task = writeQueue.then(async () => {
    const current = await readLocalStore();
    const { store, result } = await mutator(current);
    await writeLocalStore(store);
    return result;
  });

  writeQueue = task.catch(() => undefined);
  return task;
}
