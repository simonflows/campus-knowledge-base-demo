// Эталонные мок-данные для статической сборки (без БД)
import { knowledgeSeedCards, type CardTypeDefinition } from "./knowledge";
import { articleSeed } from "./articles";

export const mockKnowledgeCards = knowledgeSeedCards;

export const mockCustomCardTypes: CardTypeDefinition[] = [];

export const mockArticles = articleSeed;
