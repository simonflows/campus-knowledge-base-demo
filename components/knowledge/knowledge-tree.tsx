"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FlaskConical,
  GraduationCap,
  Handshake,
  Layers,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getCardsForFolder,
  type KnowledgeCard,
  type KnowledgeFolderKind,
  type KnowledgeFolderNode,
} from "@/lib/knowledge";
import { cn } from "@/lib/utils";

const folderIcons: Record<KnowledgeFolderKind, typeof Folder> = {
  campus: Layers,
  "universities-root": GraduationCap,
  university: BookOpen,
  subfolder: FlaskConical,
  joint: Handshake,
  "custom-root": Layers,
  "custom-type": Folder,
};

type KnowledgeTreeProps = {
  cards: KnowledgeCard[];
  tree: KnowledgeFolderNode[];
  selectedFolderId: string;
  onSelect: (folderId: string) => void;
};

export function KnowledgeTree({
  cards,
  tree,
  selectedFolderId,
  onSelect,
}: KnowledgeTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const counts = useMemo(() => {
    const result = new Map<string, number>();

    const visit = (nodes: KnowledgeFolderNode[]) => {
      for (const node of nodes) {
        result.set(node.id, getCardsForFolder(node.id, cards, tree).length);
        if (node.children) visit(node.children);
      }
    };

    visit(tree);
    return result;
  }, [cards, tree]);

  const renderNode = (node: KnowledgeFolderNode, depth: number) => {
    const Icon = folderIcons[node.kind];
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = !collapsed.has(node.id);
    const isSelected = selectedFolderId === node.id;
    const count = counts.get(node.id) ?? 0;

    return (
      <li key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
            isSelected ? "bg-primary/10" : "hover:bg-muted/60"
          )}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={`${isExpanded ? "Свернуть" : "Развернуть"} папку «${node.name}»`}
              aria-expanded={isExpanded}
              className="flex h-10 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary lg:h-8 lg:w-6"
              onClick={() =>
                setCollapsed((current) => {
                  const next = new Set(current);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  return next;
                })
              }
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="h-10 w-8 shrink-0 lg:h-8 lg:w-6" />
          )}

          <button
            type="button"
            aria-current={isSelected ? "true" : undefined}
            onClick={() => onSelect(node.id)}
            style={{ paddingLeft: `${Math.min(depth, 3) * 10}px` }}
            className={cn(
              "flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 text-left text-[13px] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-primary lg:min-h-8",
              isSelected
                ? "font-semibold text-primary"
                : "font-medium text-foreground/80"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="min-w-0 break-words" title={node.name}>{node.name}</span>
          </button>

          <Badge
            variant="secondary"
            className="h-5 min-w-5 justify-center px-1.5 text-[10px] text-muted-foreground"
          >
            {count}
          </Badge>
        </div>

        {hasChildren && isExpanded ? (
          <ul className="mt-0.5 space-y-0.5 border-l border-border/60 pl-1">
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <nav aria-label="Дерево базы знаний">
      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <FolderOpen className="h-3.5 w-3.5" />
        Папки базы
      </div>
      <ul className="space-y-1">
        {tree.map((node) => renderNode(node, 0))}
      </ul>
    </nav>
  );
}
