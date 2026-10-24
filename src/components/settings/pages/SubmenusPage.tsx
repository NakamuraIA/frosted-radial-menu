import { Info, ListTree } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';

import { Card, PageHeader, Slider } from '../../ui';
import { renderIcon } from '../../common/renderIcon';
import { flattenMenuItems, moveItemBefore } from '../../../lib/config';
import type { PageProps } from './types';

/** Página Submenus: hierarquia (arrastar para reordenar) + geometria do arco. */
export function SubmenusPage({ config, update }: PageProps) {
  const flatItems = useMemo(() => flattenMenuItems(config.items), [config.items]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const patchLayout = (patch: Partial<(typeof config)['layout']>) => {
    update((current) => ({ ...current, layout: { ...current.layout, ...patch } }));
  };

  const moveBefore = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    update((current) => ({ ...current, items: moveItemBefore(current.items, sourceId, targetId) }));
  };

  return (
    <div className="page">
      <PageHeader
        kicker="Hierarquia"
        title="Submenus"
        description="Estrutura de itens filhos e geometria do arco externo."
      />

      <div className="page-grid">
        <div className="page-column">
          <Card
            title="Árvore de itens"
            description="Arraste para reordenar. Clique em Ações para editar ou criar filhos."
            icon={<ListTree size={16} />}
          >
            <div className="tree">
              {flatItems.map(({ item, depth, parentId }) => (
                <div
                  key={item.id}
                  draggable
                  className={`tree-row ${item.children?.length ? 'is-parent' : ''} ${
                    draggedId === item.id ? 'is-dragging' : ''
                  }`}
                  style={{ '--item-color': item.color } as CSSProperties}
                  onDragStart={(event) => {
                    setDraggedId(item.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedId) moveBefore(draggedId, item.id);
                    setDraggedId(null);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                >
                  <span className="item-indent" style={{ width: `${depth * 16}px` }} />
                  {renderIcon(item.icon, 16)}
                  <span>{item.label}</span>
                  {item.children?.length ? (
                    <b>{item.children.length} filhos</b>
                  ) : parentId ? (
                    <b>filho</b>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="page-hint">
              A ordem da lista é a ordem das fatias no menu. Submenus exibem no máximo
              {' '}
              <strong>5 filhos</strong>
              {' '}
              no arco; os demais continuam salvos na configuração.
            </p>
          </Card>
        </div>

        <div className="page-column">
          <Card
            title="Geometria do arco"
            description="Distância, largura e abertura dos submenus."
          >
            <div className="form-grid">
              <Slider
                label="Distância do centro"
                value={config.layout.submenuInnerRadius}
                min={210}
                max={450}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ submenuInnerRadius: value })}
              />
              <Slider
                label="Largura do arco"
                value={config.layout.submenuOuterRadius}
                min={260}
                max={510}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ submenuOuterRadius: value })}
              />
              <Slider
                label="Espaçamento entre filhos"
                value={config.layout.submenuGap}
                min={0}
                max={8}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ submenuGap: value })}
              />
              <Slider
                label="Abertura do leque"
                value={config.layout.submenuSpread}
                min={20}
                max={72}
                step={1}
                unit="deg"
                onChange={(value) => patchLayout({ submenuSpread: value })}
              />
              <Slider
                label="Ícone dos filhos"
                value={config.layout.submenuIconSize}
                min={24}
                max={76}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ submenuIconSize: value })}
              />
              <Slider
                label="Texto dos filhos"
                value={config.layout.submenuLabelSize}
                min={8}
                max={22}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ submenuLabelSize: value })}
              />
            </div>
          </Card>

          <div className="ui-note">
            <Info size={16} />
            <span>
              O arco abre na direção da fatia pai, acompanhando o cursor. A geometria vale para
              todos os submenus.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
