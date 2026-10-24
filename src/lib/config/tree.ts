import { createId } from '../id';
import type { FlattenedMenuItem, MenuItemConfig } from './types';

/** Busca um item (em qualquer profundidade) pelo id. */
export function findMenuItem(items: MenuItemConfig[], id: string | null): MenuItemConfig | null {
  if (!id) return null;

  for (const item of items) {
    if (item.id === id) return item;
    const child = findMenuItem(item.children ?? [], id);
    if (child) return child;
  }

  return null;
}

/** Lista a árvore em ordem de renderização, com caminho legível e profundidade. */
export function flattenMenuItems(
  items: MenuItemConfig[],
  parentLabel = '',
  depth = 0,
  parentId: string | null = null,
): FlattenedMenuItem[] {
  const result: FlattenedMenuItem[] = [];

  items.forEach((item) => {
    const path = parentLabel ? `${parentLabel} / ${item.label}` : item.label;
    result.push({ item, path, depth, parentId });
    result.push(...flattenMenuItems(item.children ?? [], path, depth + 1, item.id));
  });

  return result;
}

export function updateItems(
  items: MenuItemConfig[],
  itemId: string,
  updater: (item: MenuItemConfig) => MenuItemConfig,
): MenuItemConfig[] {
  return items.map((item) => {
    if (item.id === itemId) {
      return updater(item);
    }

    if (!item.children?.length) {
      return item;
    }

    return {
      ...item,
      children: updateItems(item.children, itemId, updater),
    };
  });
}

export function removeItem(items: MenuItemConfig[], itemId: string): MenuItemConfig[] {
  return items
    .filter((item) => item.id !== itemId)
    .map((item) => ({
      ...item,
      children: item.children ? removeItem(item.children, itemId) : item.children,
    }));
}

export function containsItem(item: MenuItemConfig, targetId: string): boolean {
  return Boolean(
    item.children?.some((child) => child.id === targetId || containsItem(child, targetId)),
  );
}

export function extractItem(
  items: MenuItemConfig[],
  itemId: string,
): { items: MenuItemConfig[]; extracted: MenuItemConfig | null } {
  let extracted: MenuItemConfig | null = null;
  const nextItems: MenuItemConfig[] = [];

  for (const item of items) {
    if (item.id === itemId) {
      extracted = item;
      continue;
    }

    if (item.children?.length) {
      const result = extractItem(item.children, itemId);
      if (result.extracted) {
        extracted = result.extracted;
        nextItems.push({ ...item, children: result.items });
        continue;
      }
    }

    nextItems.push(item);
  }

  return { items: nextItems, extracted };
}

export function insertBeforeItem(
  items: MenuItemConfig[],
  targetId: string,
  itemToInsert: MenuItemConfig,
): { items: MenuItemConfig[]; inserted: boolean } {
  const nextItems: MenuItemConfig[] = [];

  for (const item of items) {
    if (item.id === targetId) {
      nextItems.push(itemToInsert, item);
      return { items: [...nextItems, ...items.slice(nextItems.length - 1)], inserted: true };
    }

    if (item.children?.length) {
      const result = insertBeforeItem(item.children, targetId, itemToInsert);
      if (result.inserted) {
        nextItems.push({ ...item, children: result.items });
        const currentIndex = items.indexOf(item);
        return { items: [...nextItems, ...items.slice(currentIndex + 1)], inserted: true };
      }
    }

    nextItems.push(item);
  }

  return { items, inserted: false };
}

/** Move um item para imediatamente antes de outro, recusando ciclos. */
export function moveItemBefore(
  items: MenuItemConfig[],
  sourceId: string,
  targetId: string,
): MenuItemConfig[] {
  if (sourceId === targetId) return items;
  const source = findMenuItem(items, sourceId);
  if (!source || containsItem(source, targetId)) return items;

  const extracted = extractItem(items, sourceId);
  if (!extracted.extracted) return items;

  const inserted = insertBeforeItem(extracted.items, targetId, extracted.extracted);
  return inserted.inserted ? inserted.items : items;
}

export function insertChild(
  items: MenuItemConfig[],
  parentId: string,
  child: MenuItemConfig,
): MenuItemConfig[] {
  return updateItems(items, parentId, (item) => ({
    ...item,
    actionType: 'submenu',
    children: [...(item.children ?? []), child],
  }));
}

/** Duplica o item (e seus filhos) com ids novos. */
export function cloneItem(item: MenuItemConfig): MenuItemConfig {
  const nextId = createId('copy');
  return {
    ...item,
    id: nextId,
    label: `${item.label} Copy`,
    children: item.children?.map((child, index) => ({
      ...cloneItem(child),
      id: `${nextId}-${index}`,
    })),
  };
}
