import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
  Palette,
} from 'lucide-react';
import {
  ACTION_TYPE_LABELS,
  FALLBACK_CONFIG,
  FONT_OPTIONS,
  ICON_OPTIONS,
  findMenuItem,
  flattenMenuItems,
  normalizeLayoutConfig,
  normalizeRadialConfig,
  type ActionType,
  type LayoutConfig,
  type MenuItemConfig,
  type RadialConfig,
  type ShellType,
} from '../lib/menuConfig';
import { getIconComponent } from '../lib/iconRegistry';
import { resolveCustomIconSrc } from '../lib/iconSource';
import './SettingsPanel.css';

function createId(prefix: string) {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now()).slice(-8);
  return `${prefix}-${randomId}`;
}

function createItem(parentId?: string): MenuItemConfig {
  return {
    id: createId(parentId ? 'child' : 'item'),
    label: parentId ? 'Novo filho' : 'Novo item',
    icon: 'apps',
    customIcon: '',
    color: '#23e6ff',
    actionType: 'openPath',
    value: '',
    shell: 'powershell',
  };
}

function updateItems(
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

function removeItem(items: MenuItemConfig[], itemId: string): MenuItemConfig[] {
  return items
    .filter((item) => item.id !== itemId)
    .map((item) => ({
      ...item,
      children: item.children ? removeItem(item.children, itemId) : item.children,
    }));
}

function containsItem(item: MenuItemConfig, targetId: string): boolean {
  return Boolean(item.children?.some((child) => child.id === targetId || containsItem(child, targetId)));
}

function extractItem(
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

function insertBeforeItem(
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

function moveItemBefore(items: MenuItemConfig[], sourceId: string, targetId: string): MenuItemConfig[] {
  if (sourceId === targetId) return items;
  const source = findMenuItem(items, sourceId);
  if (!source || containsItem(source, targetId)) return items;

  const extracted = extractItem(items, sourceId);
  if (!extracted.extracted) return items;

  const inserted = insertBeforeItem(extracted.items, targetId, extracted.extracted);
  return inserted.inserted ? inserted.items : items;
}

function insertChild(items: MenuItemConfig[], parentId: string, child: MenuItemConfig): MenuItemConfig[] {
  return updateItems(items, parentId, (item) => ({
    ...item,
    actionType: 'submenu',
    children: [...(item.children ?? []), child],
  }));
}

function cloneItem(item: MenuItemConfig): MenuItemConfig {
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

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

function formatRangeValue(value: number, step: number) {
  return step < 1 ? value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : String(Math.round(value));
}

function RangeField({ label, value, min, max, step, unit = '', onChange }: RangeFieldProps) {
  return (
    <label className="range-field">
      <span>
        {label}
        <output>{formatRangeValue(value, step)}{unit}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface CustomIconProps {
  src: string;
  fallback: ReactNode;
}

function CustomIcon({ src, fallback }: CustomIconProps) {
  const [failedSrc, setFailedSrc] = useState('');

  if (!src || failedSrc === src) {
    return <>{fallback}</>;
  }

  return <img src={src} alt="" onError={() => setFailedSrc(src)} />;
}

export function SettingsPanel() {
  const [config, setConfig] = useState<RadialConfig>(() => normalizeRadialConfig(FALLBACK_CONFIG));
  const [selectedId, setSelectedId] = useState<string>(FALLBACK_CONFIG.items[0]?.id ?? '');
  const [status, setStatus] = useState('Carregando configuracao...');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    invoke<RadialConfig>('load_config')
      .then((nextConfig) => {
        if (!mounted) return;
        const normalizedConfig = normalizeRadialConfig(nextConfig);
        setConfig(normalizedConfig);
        setSelectedId(normalizedConfig.items[0]?.id ?? '');
        setStatus('Pronto');
      })
      .catch((error) => {
        if (!mounted) return;
        console.warn('Usando configuracao local de fallback.', error);
        setConfig(normalizeRadialConfig(FALLBACK_CONFIG));
        setSelectedId(FALLBACK_CONFIG.items[0]?.id ?? '');
        setStatus('Modo preview');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const flatItems = useMemo(() => flattenMenuItems(config.items), [config.items]);
  const selectedItem = useMemo(
    () => findMenuItem(config.items, selectedId),
    [config.items, selectedId],
  );
  const layout = useMemo(() => normalizeLayoutConfig(config.layout), [config.layout]);

  const patchSelected = (patch: Partial<MenuItemConfig>) => {
    if (!selectedId) return;
    setConfig((current) => ({
      ...current,
      items: updateItems(current.items, selectedId, (item) => ({ ...item, ...patch })),
    }));
  };

  const patchTheme = (patch: Partial<RadialConfig['theme']>) => {
    setConfig((current) => ({
      ...current,
      theme: { ...current.theme, ...patch },
    }));
  };

  const patchLayout = (patch: Partial<LayoutConfig>) => {
    setConfig((current) => ({
      ...current,
      layout: normalizeLayoutConfig({ ...current.layout, ...patch }),
    }));
  };

  const patchPreferences = (patch: Partial<RadialConfig['preferences']>) => {
    setConfig((current) => ({
      ...current,
      preferences: { ...current.preferences, ...patch },
    }));
  };

  const addRootItem = () => {
    const item = createItem();
    setConfig((current) => ({
      ...current,
      items: [...current.items, item],
    }));
    setSelectedId(item.id);
    setStatus('Novo item criado');
  };

  const addChildItem = () => {
    if (!selectedItem) return;
    const child = createItem(selectedItem.id);
    setConfig((current) => ({
      ...current,
      items: insertChild(current.items, selectedItem.id, child),
    }));
    setSelectedId(child.id);
    setStatus('Subitem criado');
  };

  const duplicateSelected = () => {
    if (!selectedItem) return;
    const copy = cloneItem(selectedItem);
    setConfig((current) => ({
      ...current,
      items: [...current.items, copy],
    }));
    setSelectedId(copy.id);
    setStatus('Item duplicado');
  };

  const deleteSelected = () => {
    if (!selectedId || config.items.length <= 1) return;
    const nextItems = removeItem(config.items, selectedId);
    setConfig((current) => ({
      ...current,
      items: nextItems,
    }));
    setSelectedId(flattenMenuItems(nextItems)[0]?.item.id ?? '');
    setStatus('Item removido');
  };

  const saveConfig = async () => {
    try {
      const normalizedConfig = normalizeRadialConfig(config);
      setConfig(normalizedConfig);
      await invoke('save_config', { config: normalizedConfig });
      setStatus('Salvo');
    } catch (error) {
      console.error(error);
      setStatus('Erro ao salvar');
    }
  };

  const resetConfig = () => {
    setConfig(normalizeRadialConfig(FALLBACK_CONFIG));
    setSelectedId(FALLBACK_CONFIG.items[0]?.id ?? '');
    setStatus('Reset local');
  };

  const handleDropOnItem = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setConfig((current) => ({
      ...current,
      items: moveItemBefore(current.items, draggedId, targetId),
    }));
    setSelectedId(draggedId);
    setDraggedId(null);
    setStatus('Ordem alterada');
  };

  const closeWindow = () => {
    void invoke('hide_settings_window').catch(() => getCurrentWindow().hide());
  };

  return (
    <div className="settings-shell">
      <header className="settings-header">
        <div>
          <span>Radial Menu</span>
          <h1>Configuracoes</h1>
        </div>
        <div className="settings-actions">
          <span className="status-chip">{status}</span>
          <button type="button" className="ghost-button" onClick={resetConfig}>
            <RotateCcw size={16} />
            Reset
          </button>
          <button type="button" className="primary-button" onClick={() => void saveConfig()}>
            <Save size={16} />
            Salvar
          </button>
          <button type="button" className="icon-button" onClick={closeWindow} title="Fechar">
            <X size={18} />
          </button>
        </div>
      </header>

      <main className="settings-layout">
        <aside className="items-panel">
          <div className="panel-title">
            <SlidersHorizontal size={17} />
            Acoes
          </div>

          <div className="items-list">
            {flatItems.map(({ item, path, depth }) => {
              const Icon = getIconComponent(item.icon);
              const customIconSrc = resolveCustomIconSrc(item.customIcon);
              return (
                <button
                  key={item.id}
                  type="button"
                  draggable
                  className={`item-row ${selectedId === item.id ? 'is-selected' : ''} ${draggedId === item.id ? 'is-dragging' : ''}`}
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
                    handleDropOnItem(item.id);
                  }}
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
            <button type="button" onClick={addRootItem}>
              <Plus size={15} />
              Item
            </button>
            <button type="button" onClick={addChildItem} disabled={!selectedItem}>
              <Plus size={15} />
              Filho
            </button>
          </div>
        </aside>

        <section className="editor-panel">
          {selectedItem ? (
            <>
              <div className="editor-title">
                <div>
                  <span>Editando</span>
                  <h2>{selectedItem.label}</h2>
                </div>
                <div className="editor-actions">
                  <button type="button" onClick={duplicateSelected}>
                    Duplicar
                  </button>
                  <button type="button" className="danger-button" onClick={deleteSelected}>
                    <Trash2 size={15} />
                    Remover
                  </button>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  Nome
                  <input
                    value={selectedItem.label}
                    onChange={(event) => patchSelected({ label: event.target.value })}
                  />
                </label>

                <label>
                  Icone
                  <select
                    value={selectedItem.icon}
                    onChange={(event) => patchSelected({ icon: event.target.value })}
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Icone customizado
                  <input
                    value={selectedItem.customIcon ?? ''}
                    placeholder="C:\\Users\\...\\logo.ico, .png ou https://..."
                    onChange={(event) => patchSelected({ customIcon: event.target.value })}
                  />
                </label>

                <label>
                  Cor neon
                  <div className="color-input">
                    <input
                      type="color"
                      value={selectedItem.color}
                      onChange={(event) => patchSelected({ color: event.target.value })}
                    />
                    <input
                      value={selectedItem.color}
                      onChange={(event) => patchSelected({ color: event.target.value })}
                    />
                  </div>
                </label>

                <label>
                  Tipo
                  <select
                    value={selectedItem.actionType}
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
                </label>

                <label className="wide-field">
                  Caminho, URL ou comando
                  <input
                    value={selectedItem.value ?? ''}
                    placeholder="%USERPROFILE%\\Desktop, https://..., npm run dev"
                    onChange={(event) => patchSelected({ value: event.target.value })}
                    disabled={selectedItem.actionType === 'settings' || selectedItem.actionType === 'submenu'}
                  />
                </label>

                <label>
                  Shell
                  <select
                    value={selectedItem.shell ?? 'powershell'}
                    onChange={(event) =>
                      patchSelected({ shell: event.target.value as ShellType })
                    }
                    disabled={selectedItem.actionType !== 'runCommand'}
                  >
                    <option value="powershell">PowerShell</option>
                    <option value="cmd">CMD</option>
                  </select>
                </label>

                <label>
                  Pasta de trabalho
                  <input
                    value={selectedItem.workingDir ?? ''}
                    placeholder="Opcional"
                    onChange={(event) => patchSelected({ workingDir: event.target.value })}
                    disabled={selectedItem.actionType !== 'runCommand'}
                  />
                </label>
              </div>

              <div className="preview-strip">
                <div className="preview-button" style={{ '--preview-color': selectedItem.color } as CSSProperties}>
                  {(() => {
                    const Icon = getIconComponent(selectedItem.icon);
                    const customIconSrc = resolveCustomIconSrc(selectedItem.customIcon);
                    return <CustomIcon src={customIconSrc} fallback={<Icon size={28} />} />;
                  })()}
                  <span>{selectedItem.label}</span>
                </div>
                <p>
                  Submenus abrem em arco externo. Acoes diretas fecham o menu depois de executar,
                  se essa preferencia estiver ligada.
                </p>
              </div>
            </>
          ) : (
            <div className="empty-editor">Selecione um item para editar.</div>
          )}
        </section>

        <aside className="theme-panel">
          <div className="panel-title">
            <Palette size={17} />
            Visual
          </div>

          <div className="theme-section">
            <h3>Aparencia</h3>
            <label>
              Neon principal
              <input
                type="color"
                value={config.theme.accent}
                onChange={(event) => patchTheme({ accent: event.target.value })}
              />
            </label>

            <label>
              Neon secundario
              <input
                type="color"
                value={config.theme.accentAlt}
                onChange={(event) => patchTheme({ accentAlt: event.target.value })}
              />
            </label>

            <label>
              Perigo
              <input
                type="color"
                value={config.theme.danger}
                onChange={(event) => patchTheme({ danger: event.target.value })}
              />
            </label>

            <label>
              Fonte
              <select
                value={layout.fontFamily}
                onChange={(event) => patchLayout({ fontFamily: event.target.value })}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>

            <RangeField
              label="Vidro"
              value={config.theme.glassOpacity}
              min={0.42}
              max={0.9}
              step={0.02}
              onChange={(value) => patchTheme({ glassOpacity: value })}
            />
            <RangeField
              label="Animacao"
              value={config.theme.animationSpeed}
              min={0.65}
              max={1.45}
              step={0.05}
              unit="x"
              onChange={(value) => patchTheme({ animationSpeed: value })}
            />
            <RangeField
              label="Glow"
              value={layout.glowIntensity}
              min={0.35}
              max={1.85}
              step={0.05}
              unit="x"
              onChange={(value) => patchLayout({ glowIntensity: value })}
            />
            <RangeField
              label="Escala geral"
              value={layout.menuScale}
              min={0.45}
              max={1.3}
              step={0.01}
              unit="x"
              onChange={(value) => patchLayout({ menuScale: value })}
            />
          </div>

          <div className="theme-section">
            <h3>Menu principal</h3>
            <RangeField
              label="Raio interno"
              value={layout.mainInnerRadius}
              min={88}
              max={220}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ mainInnerRadius: value })}
            />
            <RangeField
              label="Raio externo"
              value={layout.mainOuterRadius}
              min={170}
              max={390}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ mainOuterRadius: value })}
            />
            <RangeField
              label="Espaco entre fatias"
              value={layout.mainGap}
              min={0}
              max={10}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ mainGap: value })}
            />
            <RangeField
              label="Borda"
              value={layout.borderWidth}
              min={0.8}
              max={3.4}
              step={0.1}
              unit="px"
              onChange={(value) => patchLayout({ borderWidth: value })}
            />
            <RangeField
              label="Icone"
              value={layout.mainIconSize}
              min={24}
              max={72}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ mainIconSize: value })}
            />
            <RangeField
              label="Texto"
              value={layout.mainLabelSize}
              min={9}
              max={22}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ mainLabelSize: value })}
            />
          </div>

          <div className="theme-section">
            <h3>Submenu</h3>
            <RangeField
              label="Distancia"
              value={layout.submenuInnerRadius}
              min={210}
              max={450}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ submenuInnerRadius: value })}
            />
            <RangeField
              label="Largura"
              value={layout.submenuOuterRadius}
              min={260}
              max={510}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ submenuOuterRadius: value })}
            />
            <RangeField
              label="Espaco"
              value={layout.submenuGap}
              min={0}
              max={8}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ submenuGap: value })}
            />
            <RangeField
              label="Abertura"
              value={layout.submenuSpread}
              min={20}
              max={72}
              step={1}
              unit="deg"
              onChange={(value) => patchLayout({ submenuSpread: value })}
            />
            <RangeField
              label="Icone filho"
              value={layout.submenuIconSize}
              min={24}
              max={76}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ submenuIconSize: value })}
            />
            <RangeField
              label="Texto filho"
              value={layout.submenuLabelSize}
              min={8}
              max={22}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ submenuLabelSize: value })}
            />
          </div>

          <div className="theme-section">
            <h3>Centro e sistema</h3>
            <RangeField
              label="Centro"
              value={layout.centerSize}
              min={148}
              max={320}
              step={1}
              unit="px"
              onChange={(value) => patchLayout({ centerSize: value })}
            />
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={config.preferences.hideAfterAction}
                onChange={(event) => patchPreferences({ hideAfterAction: event.target.checked })}
              />
              Fechar apos executar
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={config.preferences.showPercentages}
                onChange={(event) => patchPreferences({ showPercentages: event.target.checked })}
              />
              Mostrar percentuais
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={config.preferences.runCommandsAsAdmin}
                onChange={(event) => patchPreferences({ runCommandsAsAdmin: event.target.checked })}
              />
              Rodar comandos como administrador
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={config.preferences.autostartEnabled}
                onChange={(event) => patchPreferences({ autostartEnabled: event.target.checked })}
              />
              Iniciar com Windows
            </label>

            <label>
              Atalho
              <input
                value={config.preferences.hotkey}
                onChange={(event) => patchPreferences({ hotkey: event.target.value })}
              />
            </label>
          </div>
        </aside>
      </main>
    </div>
  );
}
