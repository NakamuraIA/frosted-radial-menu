import { createElement, type ReactElement } from 'react';

import { iconRegistry } from '../../lib/icons';

/**
 * Cria o elemento do ícone a partir do nome persistido no JSON.
 *
 * Fica fora de componentes de propósito: o React Compiler reclama de
 * `const Icon = ...` dentro do render (componente recriado a cada render), e
 * `createElement` mantém o tipo estável sem abrir mão da tabela dinâmica.
 */
export function renderIcon(name: string, size: number, strokeWidth = 2): ReactElement {
  const icon = iconRegistry[name] ?? iconRegistry.apps;
  return createElement(icon, { size, strokeWidth });
}
