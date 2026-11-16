import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import {
  articleSeed,
  DEMO_ARTICLE_IDS,
  isDemoArticle,
  type ReadyArticle,
} from "./articles";
import { docClient, getStorageMode } from "./db";
import { createPendingDiskSync, type DiskSyncInfo } from "./disk-sync";
import {
  getCardStatus,
  knowledgeSeedCards,
  type CardEditRequest,
  type CardStatus,
  type CardTypeDefinition,
  type KnowledgeCard,
} from "./knowledge";
import { mutateLocalStore, readLocalStore } from "./local-store";
import { TableName } from "./schema";
import type { SaveArticleInput } from "./validation/articles";
import type { KnowledgeCardInput } from "./validation/knowledge";

export async function getAllKnowledgeCards(): Promise<KnowledgeCard[]> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    const store = await readLocalStore();
    return store.cards;
  }

  if (mode === "static-export") {
    return knowledgeSeedCards;
  }

  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.KNOWLEDGE_CARDS,
    })
  );

  return (result.Items as KnowledgeCard[]) ?? [];
}

export async function getCanonicalKnowledgeCards(): Promise<KnowledgeCard[]> {
  const cards = await getAllKnowledgeCards();

  return cards.filter((card) => getCardStatus(card) === "approved");
}

export async function getKnowledgeCardById(
  id: string
): Promise<KnowledgeCard | null> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    const store = await readLocalStore();
    return store.cards.find((card) => card.id === id) ?? null;
  }

  if (mode === "static-export") {
    return knowledgeSeedCards.find((card) => card.id === id) ?? null;
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.KNOWLEDGE_CARDS,
      Key: { id },
    })
  );

  return (result.Item as KnowledgeCard) ?? null;
}

export type KnowledgeCardCreateMeta = {
  status?: CardStatus;
  submittedBy?: string;
  submittedByName?: string;
  participantApprovals?: string[];
};

export async function createKnowledgeCard(
  data: KnowledgeCardInput,
  meta: KnowledgeCardCreateMeta = {}
): Promise<KnowledgeCard> {
  const now = new Date().toISOString();
  const card = {
    ...data,
    ...meta,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    diskSync: createPendingDiskSync(),
  } as KnowledgeCard;

  const mode = await getStorageMode();

  if (mode === "local-json") {
    return mutateLocalStore((store) => ({
      store: { ...store, cards: [...store.cards, card] },
      result: card,
    }));
  }

  await docClient.send(
    new PutCommand({
      TableName: TableName.KNOWLEDGE_CARDS,
      Item: card,
    })
  );

  return card;
}

export type KnowledgeCardModerationPatch = {
  status?: CardStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  participantApprovals?: string[];
  editRequests?: CardEditRequest[];
};

export async function setKnowledgeCardModeration(
  id: string,
  patch: KnowledgeCardModerationPatch
): Promise<KnowledgeCard | null> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    return mutateLocalStore((store) => {
      const current = store.cards.find((card) => card.id === id);
      if (!current) return { store, result: null };

      const next: KnowledgeCard = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      return {
        store: {
          ...store,
          cards: store.cards.map((card) => (card.id === id ? next : card)),
        },
        result: next,
      };
    });
  }

  const current = await getKnowledgeCardById(id);

  if (!current) return null;

  const next: KnowledgeCard = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TableName.KNOWLEDGE_CARDS,
      Item: next,
    })
  );

  return next;
}

export async function updateKnowledgeCard(
  id: string,
  data: KnowledgeCardInput
): Promise<KnowledgeCard | null> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    return mutateLocalStore((store) => {
      const current = store.cards.find((card) => card.id === id);
      if (!current) return { store, result: null };

      const next = {
        ...current,
        ...data,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      } as KnowledgeCard;

      return {
        store: {
          ...store,
          cards: store.cards.map((card) => (card.id === id ? next : card)),
        },
        result: next,
      };
    });
  }

  const current = await getKnowledgeCardById(id);

  if (!current) return null;

  const next = {
    ...current,
    ...data,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  } as KnowledgeCard;

  await docClient.send(
    new PutCommand({
      TableName: TableName.KNOWLEDGE_CARDS,
      Item: next,
    })
  );

  return next;
}

export async function setKnowledgeCardDiskSync(
  id: string,
  diskSync: DiskSyncInfo
): Promise<void> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    await mutateLocalStore((store) => ({
      store: {
        ...store,
        cards: store.cards.map((card) =>
          card.id === id ? { ...card, diskSync } : card
        ),
      },
      result: undefined,
    }));
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TableName.KNOWLEDGE_CARDS,
      Key: { id },
      UpdateExpression: "set diskSync = :diskSync",
      ExpressionAttributeValues: { ":diskSync": diskSync },
    })
  );
}

export async function deleteKnowledgeCard(id: string): Promise<void> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    await mutateLocalStore((store) => ({
      store: {
        ...store,
        cards: store.cards.filter((card) => card.id !== id),
      },
      result: undefined,
    }));
    return;
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TableName.KNOWLEDGE_CARDS,
      Key: { id },
    })
  );
}

export async function ensureKnowledgeSeed(): Promise<void> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    await readLocalStore();
    return;
  }

  if (mode === "static-export") return;

  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.KNOWLEDGE_CARDS,
      Limit: 1,
    })
  );

  if ((result.Items?.length ?? 0) > 0) return;

  await Promise.all(
    knowledgeSeedCards.map((card) =>
      docClient.send(
        new PutCommand({
          TableName: TableName.KNOWLEDGE_CARDS,
          Item: card,
        })
      )
    )
  );
}

export async function getAllCardTypes(): Promise<CardTypeDefinition[]> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    const store = await readLocalStore();
    return store.cardTypes;
  }

  if (mode === "static-export") return [];

  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.KNOWLEDGE_CARD_TYPES,
    })
  );

  return (result.Items as CardTypeDefinition[]) ?? [];
}

export async function getCardTypeById(
  id: string
): Promise<CardTypeDefinition | null> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    const store = await readLocalStore();
    return store.cardTypes.find((type) => type.id === id) ?? null;
  }

  if (mode === "static-export") return null;

  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.KNOWLEDGE_CARD_TYPES,
      Key: { id },
    })
  );

  return (result.Item as CardTypeDefinition) ?? null;
}

export async function createCardType(
  data: Omit<CardTypeDefinition, "createdAt" | "updatedAt">
): Promise<CardTypeDefinition> {
  const now = new Date().toISOString();
  const cardType: CardTypeDefinition = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  const mode = await getStorageMode();

  if (mode === "local-json") {
    return mutateLocalStore((store) => ({
      store: { ...store, cardTypes: [...store.cardTypes, cardType] },
      result: cardType,
    }));
  }

  await docClient.send(
    new PutCommand({
      TableName: TableName.KNOWLEDGE_CARD_TYPES,
      Item: cardType,
    })
  );

  return cardType;
}

export async function updateCardType(
  id: string,
  data: Partial<Pick<CardTypeDefinition, "name" | "description" | "fields">>
): Promise<CardTypeDefinition | null> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    return mutateLocalStore((store) => {
      const current = store.cardTypes.find((type) => type.id === id);
      if (!current) return { store, result: null };

      const next: CardTypeDefinition = {
        ...current,
        ...data,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      };

      return {
        store: {
          ...store,
          cardTypes: store.cardTypes.map((type) =>
            type.id === id ? next : type
          ),
        },
        result: next,
      };
    });
  }

  const current = await getCardTypeById(id);

  if (!current) return null;

  const next: CardTypeDefinition = {
    ...current,
    ...data,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TableName.KNOWLEDGE_CARD_TYPES,
      Item: next,
    })
  );

  return next;
}

export async function deleteCardType(id: string): Promise<void> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    await mutateLocalStore((store) => ({
      store: {
        ...store,
        cardTypes: store.cardTypes.filter((type) => type.id !== id),
      },
      result: undefined,
    }));
    return;
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TableName.KNOWLEDGE_CARD_TYPES,
      Key: { id },
    })
  );
}

export async function getCustomCardCounts(): Promise<Record<string, number>> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    const store = await readLocalStore();
    return store.cards.reduce<Record<string, number>>((counts, card) => {
      if (card.type === "custom" && card.customTypeId) {
        counts[card.customTypeId] = (counts[card.customTypeId] ?? 0) + 1;
      }
      return counts;
    }, {});
  }

  if (mode === "static-export") return {};

  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.KNOWLEDGE_CARDS,
      FilterExpression: "#type = :type",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":type": "custom" },
      ProjectionExpression: "customTypeId",
    })
  );

  return (result.Items ?? []).reduce<Record<string, number>>((counts, item) => {
    const cardTypeId = item.customTypeId as string | undefined;

    if (cardTypeId) {
      counts[cardTypeId] = (counts[cardTypeId] ?? 0) + 1;
    }

    return counts;
  }, {});
}

export async function countKnowledgeCardsByCustomType(
  typeId: string
): Promise<number> {
  const counts = await getCustomCardCounts();
  return counts[typeId] ?? 0;
}

export async function getAllArticles(): Promise<ReadyArticle[]> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    const store = await readLocalStore();
    return store.articles;
  }

  if (mode === "static-export") return articleSeed;

  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.ARTICLES,
    })
  );

  return (result.Items as ReadyArticle[]) ?? [];
}

export async function getArticleById(id: string): Promise<ReadyArticle | null> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    const store = await readLocalStore();
    return store.articles.find((article) => article.id === id) ?? null;
  }

  if (mode === "static-export") {
    return articleSeed.find((article) => article.id === id) ?? null;
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: TableName.ARTICLES,
      Key: { id },
    })
  );

  return (result.Item as ReadyArticle) ?? null;
}

export async function createArticle(
  data: SaveArticleInput
): Promise<ReadyArticle> {
  const now = new Date().toISOString();
  const article: ReadyArticle = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    diskSync: createPendingDiskSync(),
  };

  const mode = await getStorageMode();

  if (mode === "local-json") {
    return mutateLocalStore((store) => ({
      store: { ...store, articles: [article, ...store.articles] },
      result: article,
    }));
  }

  await docClient.send(
    new PutCommand({
      TableName: TableName.ARTICLES,
      Item: article,
    })
  );

  return article;
}

export async function updateArticle(
  id: string,
  data: SaveArticleInput
): Promise<ReadyArticle | null> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    return mutateLocalStore((store) => {
      const current = store.articles.find((article) => article.id === id);
      if (!current) return { store, result: null };

      const next: ReadyArticle = {
        ...current,
        ...data,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
        diskSync: current.diskSync,
      };

      return {
        store: {
          ...store,
          articles: store.articles.map((article) =>
            article.id === id ? next : article
          ),
        },
        result: next,
      };
    });
  }

  const current = await getArticleById(id);

  if (!current) return null;

  const next: ReadyArticle = {
    ...current,
    ...data,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
    diskSync: current.diskSync,
  };

  await docClient.send(
    new PutCommand({
      TableName: TableName.ARTICLES,
      Item: next,
    })
  );

  return next;
}

export async function setArticleDiskSync(
  id: string,
  diskSync: DiskSyncInfo
): Promise<void> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    await mutateLocalStore((store) => ({
      store: {
        ...store,
        articles: store.articles.map((article) =>
          article.id === id ? { ...article, diskSync } : article
        ),
      },
      result: undefined,
    }));
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TableName.ARTICLES,
      Key: { id },
      UpdateExpression: "set diskSync = :diskSync",
      ExpressionAttributeValues: { ":diskSync": diskSync },
    })
  );
}

export async function deleteArticle(id: string): Promise<void> {
  const mode = await getStorageMode();

  if (mode === "local-json") {
    await mutateLocalStore((store) => ({
      store: {
        ...store,
        articles: store.articles.filter((article) => article.id !== id),
      },
      result: undefined,
    }));
    return;
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TableName.ARTICLES,
      Key: { id },
    })
  );
}

let demoArticlesClearedInMemory = process.env.SEED_DEMO_ARTICLES === "false";

export async function clearDemoArticles(): Promise<number> {
  demoArticlesClearedInMemory = true;
  const mode = await getStorageMode();

  if (mode === "local-json") {
    return mutateLocalStore((store) => {
      const remaining = store.articles.filter(
        (article) => !isDemoArticle(article.id)
      );
      const removed = store.articles.length - remaining.length;

      return {
        store: {
          ...store,
          articles: remaining,
          demoArticlesCleared: true,
        },
        result: removed,
      };
    });
  }

  if (mode === "static-export") return 0;

  let removed = 0;
  await Promise.all(
    DEMO_ARTICLE_IDS.map(async (id) => {
      const existing = await getArticleById(id);
      if (existing) {
        removed += 1;
        await docClient.send(
          new DeleteCommand({
            TableName: TableName.ARTICLES,
            Key: { id },
          })
        );
      }
    })
  );

  return removed;
}

export async function ensureArticleSeed(): Promise<void> {
  if (demoArticlesClearedInMemory) return;

  const mode = await getStorageMode();

  if (mode === "local-json") {
    await readLocalStore();
    return;
  }

  if (mode === "static-export") return;

  const result = await docClient.send(
    new ScanCommand({
      TableName: TableName.ARTICLES,
      Limit: 1,
    })
  );

  if ((result.Items?.length ?? 0) > 0) return;

  await Promise.all(
    articleSeed.map((article) =>
      docClient.send(
        new PutCommand({
          TableName: TableName.ARTICLES,
          Item: article,
        })
      )
    )
  );
}
