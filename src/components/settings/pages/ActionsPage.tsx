import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';

import { Button, Card, ConfirmDialog, Field, PageHeader } from '../../ui';
import { CustomIcon } from '../../common/CustomIcon';
import { renderIcon } from '../../common/renderIcon';
import { createItem } from '../itemFactory';
import type { PageProps } from './types';
import {
  ACTION_TYPE_LABELS,
  ICON_OPTIONS,
  cloneItem,
  findMenuItem,
  flattenMenuItems,
  insertChild,
  moveItemBefore,
  removeItem,
  updateItems,
  type ActionType,
  type MenuItemConfig,
  type ShellType,
} from '../../../lib/config';
import { resolveCustomIconSrc } from '../../../lib/icons';

const NON_TARGET_ACTIONS: ActionType[] = ['settings', 'submenu'];

/** Página Ações: lista, editor, inclusão, duplicação e remoção. */
export function ActionsPage({ config, update }: PageProps) {
  const [selectedId, setSelectedId] = useState(() => config.items[0]?.id ?? '');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const flatItems = useMemo(() => flattenMenuItems(config.items), [config.items]);
  const selected = findMenuItem(config.items, selectedId) ?? config.items[0] ?? null;
  const activeId = selected?.id ?? '';

  const patchSelected = (patch: Partial<MenuItemConfig>) => {
    if (!selected) return;
    update((current) => ({
      ...current,
      items: updateItems(current.items, selected.id, (item) => ({ ...item, ...patch })),
    }));
  };

  const addRootItem = () => {
    const item = createItem();
    update((current) => ({ ...current, items: [...current.items, item] }));
    setSelectedId(item.id);
  };

  const addChildItem = () => {
    if (!selected) return;
    const child = createItem(selected.id);
    update((current) => ({ ...current, items: insertChild(current.items, selected.id, child) }));
    setSelectedId(child.id);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = cloneItem(selected);
    update((current) => ({ ...current, items: [...current.items, copy] }));
    setSelectedId(copy.id);
  };

  const deleteSelected = () => {
    if (!selected || config.items.length <= 1) return;
    const nextItems = removeItem(config.items, selected.id);
    update((current) => ({ ...current, items: nextItems }));
    setSelectedId(flattenMenuItems(nextItems)[0]?.item.id ?? '');
    setConfirmDelete(false);
  };

  const moveBefore = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    update((current) => ({ ...current, items: moveItemBefore(current.items, sourceId, targetId) }));
    setSelectedId(sourceId);
  };

  const targetDisabled = selected ? NON_TARGET_ACTIONS.includes(selected.actionType) : true;
  const commandOnly = selected?.actionType !== 'runCommand';

  return (
    <div className="page">
      <PageHeader
        kicker="Conteúdo"
        title="Ações"
        description="Aplicativos, comandos e destinos vinculados às fatias do menu."
      />

      <div className="actions-layout">
        <Card
          title="Itens"
          description="Arraste para reordenar."
          actions={
            <Button size="sm" icon={<Plus size={14} />} onClick={addRootItem}>
              Novo
            </Button>
          }
        >
          <div className="items-list">
            {flatItems.map(({ item, path, depth }) => (
              <button
                key={item.id}
                type="button"
                draggable
                className={`item-row ${activeId === item.id ? 'is-selected' : ''} ${
                  draggedId === item.id ? 'is-dragging' : ''
                }`}
                onClick={() => setSelectedId(item.id)}
                onDragStart={(event) => {
                  setDraggedId(item.id);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', item.id);
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
                style={{ '--item-color': item.color } as CSSProperties}
              >
                <span className="item-indent" style={{ width: `${depth * 14}px` }} />
                <CustomIcon
                  src={resolveCustomIconSrc(item.customIcon)}
                  fallback={renderIcon(item.icon, 18)}
                />
                <span>{path}</span>
                {item.children?.length ? <b>{item.children.length}</b> : null}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="ghost"
            icon={<Plus size={14} />}
            onClick={addChildItem}
            disabled={!selected}
          >
            Adicionar filho
          </Button>
          <p className="page-hint">
            Filhos só aparecem no arco externo quando o item pai é um submenu.
          </p>
        </Card>

        <Card
          title="Editor"
          description={
            selected ? 'Altere os campos e salve para aplicar.' : 'Selecione uma ação para editar.'
          }
        >
          {selected ? (
            <>
              <div className="editor-head">
                <div>
                  <span>{selected.actionType === 'submenu' ? 'Submenu' : 'Ação'}</span>
                  <h2>{selected.label}</h2>
                </div>
                <div className="ui-inline">
                  <Button size="sm" variant="secondary" onClick={duplicateSelected}>
                    Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={14} />}
                    onClick={() => setConfirmDelete(true)}
                    disabled={config.items.length <= 1}
                  >
                    Remover
                  </Button>
                </div>
              </div>

              <div className="form-grid">
                <Field label="Nome">
                  <input
                    className="ui-input"
                    value={selected.label}
                    onChange={(event) => patchSelected({ label: event.target.value })}
                  />
                </Field>

                <Field label="Ícone">
                  <select
                    className="ui-select"
                    value={selected.icon}
                    onChange={(event) => patchSelected({ icon: event.target.value })}
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Ícone customizado"
                  hint="Caminho local (.ico/.png), URL ou data URI. Vazio usa o ícone acima."
                  className="span-2"
                >
                  <input
                    className="ui-input"
                    value={selected.customIcon ?? ''}
                    placeholder="C:\\Users\\...\\logo.png ou https://..."
                    onChange={(event) => patchSelected({ customIcon: event.target.value })}
                  />
                </Field>

                <Field label="Cor individual">
                  <div className="ui-color-input">
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(event) => patchSelected({ color: event.target.value })}
                      aria-label="Cor individual"
                    />
                    <input
                      className="ui-input"
                      value={selected.color}
                      onChange={(event) => patchSelected({ color: event.target.value })}
                    />
                  </div>
                </Field>

                <Field label="Tipo de ação">
                  <select
                    className="ui-select"
                    value={selected.actionType}
                    onChange={(event) =>
                      patchSelected({ actionType: event.target.value as ActionType })
                    }
                  >
                    {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Caminho, URL ou comando"
                  className="span-2"
                  hint={
                    targetDisabled
                      ? 'Não se aplica a este tipo de ação.'
                      : 'Aceita variáveis de ambiente, como %USERPROFILE%.'
                  }
                >
                  <input
                    className="ui-input"
                    value={selected.value ?? ''}
                    placeholder="%USERPROFILE%\\Desktop, https://..., npm run dev"
                    disabled={targetDisabled}
                    onChange={(event) => patchSelected({ value: event.target.value })}
                  />
                </Field>

                <Field label="Shell" hint="Só para comandos.">
                  <select
                    className="ui-select"
                    value={selected.shell ?? 'powershell'}
                    disabled={commandOnly}
                    onChange={(event) => patchSelected({ shell: event.target.value as ShellType })}
                  >
                    <option value="powershell">PowerShell</option>
                    <option value="cmd">CMD</option>
                  </select>
                </Field>

                <Field label="Pasta de trabalho" hint="Opcional; só para comandos.">
                  <input
                    className="ui-input"
                    value={selected.workingDir ?? ''}
                    placeholder="Opcional"
                    disabled={commandOnly}
                    onChange={(event) => patchSelected({ workingDir: event.target.value })}
                  />
                </Field>
              </div>

              <div className="preview-strip">
                <div
                  className="preview-button"
                  style={{ '--preview-color': selected.color } as CSSProperties}
                >
                  <CustomIcon
                    src={resolveCustomIconSrc(selected.customIcon)}
                    fallback={renderIcon(selected.icon, 20)}
                  />
                  <span>{selected.label}</span>
                </div>
                <p>
                  Submenus abrem no arco externo; ações diretas fecham o menu após executar, se a
                  preferência estiver ligada.
                </p>
              </div>
            </>
          ) : (
            <p className="items-empty">Nenhuma ação disponível.</p>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Remover "${selected?.label ?? ''}"?`}
        description="A ação (e os filhos dela) sai do rascunho. Você ainda pode descartar as alterações com Restaurar antes de salvar."
        confirmLabel="Remover"
        tone="danger"
        onConfirm={deleteSelected}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
