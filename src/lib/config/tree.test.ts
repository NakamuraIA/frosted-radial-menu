import { describe, expect, it } from 'vitest';

import {
  cloneItem,
  containsItem,
  findMenuItem,
  flattenMenuItems,
  insertChild,
  moveItemBefore,
  removeItem,
  updateItems,
} from './tree';
import type { MenuItemConfig } from './types';

function item(id: string, children?: MenuItemConfig[]): MenuItemConfig {
  return {
    id,
    label: id,
    icon: 'apps',
    color: '#fff',
    actionType: children?.length ? 'submenu' : 'openPath',
    value: children?.length ? undefined : 'C:\\',
    children,
  };
}

function tree(): MenuItemConfig[] {
  return [item('a'), item('group', [item('child-1'), item('child-2')]), item('b')];
}

describe('findMenuItem', () => {
  it('encontra itens na raiz e em submenus', () => {
    expect(findMenuItem(tree(), 'a')?.id).toBe('a');
    expect(findMenuItem(tree(), 'child-2')?.id).toBe('child-2');
  });

  it('devolve null para id vazio ou inexistente', () => {
    expect(findMenuItem(tree(), null)).toBeNull();
    expect(findMenuItem(tree(), 'nope')).toBeNull();
  });
});

describe('flattenMenuItems', () => {
  it('monta o caminho legivel e a profundidade', () => {
    const flat = flattenMenuItems(tree());
    expect(flat.map((entry) => entry.path)).toEqual([
      'a',
      'group',
      'group / child-1',
      'group / child-2',
      'b',
    ]);
    expect(flat[2].depth).toBe(1);
    expect(flat[2].parentId).toBe('group');
  });
});

describe('updateItems', () => {
  it('atualiza somente o item alvo, inclusive aninhado', () => {
    const next = updateItems(tree(), 'child-1', (current) => ({
      ...current,
      label: 'renomeado',
    }));
    expect(findMenuItem(next, 'child-1')?.label).toBe('renomeado');
    expect(findMenuItem(next, 'child-2')?.label).toBe('child-2');
  });
});

describe('removeItem', () => {
  it('remove itens aninhados sem quebrar o restante da arvore', () => {
    const next = removeItem(tree(), 'child-1');
    expect(findMenuItem(next, 'child-1')).toBeNull();
    expect(findMenuItem(next, 'group')?.children).toHaveLength(1);
    expect(next).toHaveLength(3);
  });
});

describe('insertChild', () => {
  it('transforma o pai em submenu ao receber filho', () => {
    const next = insertChild(tree(), 'a', item('novo'));
    const parent = findMenuItem(next, 'a');
    expect(parent?.actionType).toBe('submenu');
    expect(parent?.children?.[0].id).toBe('novo');
  });
});

describe('moveItemBefore', () => {
  it('reordena irmaos', () => {
    const next = moveItemBefore(tree(), 'b', 'a');
    expect(next.map((entry) => entry.id)).toEqual(['b', 'a', 'group']);
  });

  it('recusa mover um pai para dentro do proprio filho', () => {
    const original = tree();
    const next = moveItemBefore(original, 'group', 'child-1');
    expect(next).toEqual(original);
  });

  it('ignora origem igual ao destino', () => {
    const original = tree();
    expect(moveItemBefore(original, 'a', 'a')).toEqual(original);
  });
});

describe('containsItem', () => {
  it('detecta descendentes diretos e indiretos', () => {
    const [, group] = tree();
    expect(containsItem(group, 'child-1')).toBe(true);
    expect(containsItem(group, 'a')).toBe(false);
  });
});

describe('cloneItem', () => {
  it('gera ids novos preservando a estrutura', () => {
    const source = item('group', [item('child-1')]);
    const copy = cloneItem(source);

    expect(copy.id).not.toBe(source.id);
    expect(copy.label).toBe('group Copy');
    expect(copy.children?.[0].id).not.toBe('child-1');
    expect(copy.children).toHaveLength(1);
  });
});
