import { useEffect, useMemo, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { ActionEditor } from './ActionEditor';
import { AppearancePanel } from './AppearancePanel';
import { ItemsPanel } from './ItemsPanel';
import { SettingsHeader } from './SettingsHeader';
import { createItem } from './itemFactory';
import { api } from '../../lib/api';
import {
  FALLBACK_CONFIG,
  cloneItem,
  findMenuItem,
  flattenMenuItems,
  insertChild,
  moveItemBefore,
  normalizeLayoutConfig,
  normalizeRadialConfig,
  removeItem,
  updateItems,
  type LayoutConfig,
  type MenuItemConfig,
  type RadialConfig,
} from '../../lib/config';
import './SettingsPanel.css';

/**
 * Container do painel: dono do rascunho de configuração, do item selecionado e
 * das operações de árvore. Cada coluna visual é um componente separado.
 */
export function SettingsPanel() {
  const [config, setConfig] = useState<RadialConfig>(() => normalizeRadialConfig(FALLBACK_CONFIG));
  const [selectedId, setSelectedId] = useState<string>(FALLBACK_CONFIG.items[0]?.id ?? '');
  const [status, setStatus] = useState('Carregando configuracao...');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [autostartActive, setAutostartActive] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    api
      .loadConfig()
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

    api
      .getAutostartStatus()
      .then((active) => {
        if (mounted) setAutostartActive(active);
      })
      .catch(() => {
        if (mounted) setAutostartActive(null);
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
      const nextWarnings = await api.saveConfig(normalizedConfig);
      setWarnings(nextWarnings);
      setStatus(nextWarnings.length ? `Salvo com ${nextWarnings.length} aviso(s)` : 'Salvo');
      setAutostartActive(await api.getAutostartStatus().catch(() => null));
    } catch (error) {
      console.error(error);
      setStatus('Erro ao salvar');
    }
  };

  const resetConfig = () => {
    setConfig(normalizeRadialConfig(FALLBACK_CONFIG));
    setSelectedId(FALLBACK_CONFIG.items[0]?.id ?? '');
    setWarnings([]);
    setStatus('Reset local');
  };

  const handleReorder = (sourceId: string, targetId: string) => {
    setConfig((current) => ({
      ...current,
      items: moveItemBefore(current.items, sourceId, targetId),
    }));
    setSelectedId(sourceId);
    setStatus('Ordem alterada');
  };

  const closeWindow = () => {
    void api.hideSettingsWindow().catch(() => getCurrentWindow().hide());
  };

  return (
    <div className="settings-shell">
      <SettingsHeader
        status={status}
        warnings={warnings}
        onReset={resetConfig}
        onSave={() => void saveConfig()}
        onClose={closeWindow}
      />

      <main className="settings-layout">
        <ItemsPanel
          items={flatItems}
          selectedId={selectedId}
          canAddChild={Boolean(selectedItem)}
          onSelect={setSelectedId}
          onReorder={handleReorder}
          onAddRoot={addRootItem}
          onAddChild={addChildItem}
        />

        {selectedItem ? (
          <ActionEditor
            item={selectedItem}
            onPatch={patchSelected}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
          />
        ) : (
          <section className="editor-panel">
            <div className="empty-editor">Selecione um item para editar.</div>
          </section>
        )}

        <AppearancePanel
          theme={config.theme}
          layout={layout}
          preferences={config.preferences}
          autostartActive={autostartActive}
          onThemeChange={patchTheme}
          onLayoutChange={patchLayout}
          onPreferencesChange={patchPreferences}
        />
      </main>
    </div>
  );
}
