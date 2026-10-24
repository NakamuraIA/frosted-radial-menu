import { Plus, SlidersHorizontal } from 'lucide-react';
import { useState, type CSSProperties, type DragEvent } from 'react';

import { CustomIcon } from '../common/CustomIcon';
import { getIconComponent, resolveCustomIconSrc } from '../../lib/icons';
import type { FlattenedMenuItem } from '../../lib/config';

interface ItemsPanelProps {
  items: FlattenedMenuItem[];
  selectedId: string;
  canAddChild: boolean;
  onSelect: (id: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onAddRoot: () => void;
  onAddChild: () => void;
}

/** Lista de ações com arrastar-e-soltar para reordenar. */
export function ItemsPanel({
  items,
  selectedId,
  canAddChild,
  onSelect,
  onReorder,
  onAddRoot,
  onAddChild,
}: ItemsPanelProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDrop = (event: DragEvent<HTMLButtonElement>, targetId: string) => {
    event.preventDefault();
    if (draggedId && draggedId !== targetId) {
      onReorder(draggedId, targetId);
    }
    setDraggedId(null);
  };

  return (
    <aside className="items-panel">
      <div className="panel-title">
        <SlidersHorizontal size={17} />
        Acoes
      </div>

      <div className="items-list">
        {items.map(({ item, path, depth }) => {
          const Icon = getIconComponent(item.icon);
          const customIconSrc = resolveCustomIconSrc(item.customIcon);
          return (
            <button
              key={item.id}
              type="button"
              draggable
              className={`item-row ${selectedId === item.id ? 'is-selected' : ''} ${draggedId === item.id ? 'is-dragging' : ''}`}
              onClick={() => onSelect(item.id)}
              onDragStart={(event) => {
                setDraggedId(item.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => handleDrop(event, item.id)}
              onDragEnd={() => setDraggedId(null)}
              style={{ '--item-color': item.color } as CSSProperties}
            >
              <span className="item-indent" style={{ width: `${depth * 14}px` }} />
              <CustomIcon src={customIconSrc} fallback={<Icon size={20} />} />
              <span>{path}</span>
              {item.children?.length ? <b>{item.children.length}</b> : null}
            </button>
          );
        })}
      </div>

      <div className="item-tools">
        <button type="button" onClick={onAddRoot}>
          <Plus size={15} />
          Item
        </button>
        <button type="button" onClick={onAddChild} disabled={!canAddChild}>
          <Plus size={15} />
          Filho
        </button>
      </div>
    </aside>
  );
}
