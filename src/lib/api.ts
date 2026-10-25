import { invoke } from '@tauri-apps/api/core';

import type { MenuItemConfig, RadialConfig, SystemStats } from './config';

/**
 * Ponto único de contato com o backend Rust.
 *
 * Manter os nomes dos comandos aqui evita `invoke('...')` espalhado pelos
 * componentes e deixa o contrato (incluindo os avisos do `save_config`) em um
 * lugar só.
 */
export const api = {
  loadConfig: () => invoke<RadialConfig>('load_config'),

  /** Retorna avisos de efeitos colaterais (auto-start, atalho) que falharam. */
  saveConfig: (config: RadialConfig) => invoke<string[]>('save_config', { config }),

  runMenuAction: (actionId: string) => invoke<void>('run_menu_action', { actionId }),

  /** Testa um item do rascunho sem salvar (botão "Testar ação"). */
  runActionPreview: (item: MenuItemConfig, runAsAdmin: boolean) =>
    invoke<void>('run_action_preview', { item, runAsAdmin }),

  openSettingsWindow: () => invoke<void>('open_settings_window'),

  hideMainWindow: () => invoke<void>('hide_main_window'),

  hideSettingsWindow: () => invoke<void>('hide_settings_window'),

  getAutostartStatus: () => invoke<boolean>('get_autostart_status'),

  getDesktopShortcutStatus: () => invoke<boolean>('get_desktop_shortcut_status'),

  setDesktopShortcut: (enabled: boolean) =>
    invoke<void>('set_desktop_shortcut', { enabled }),

  getSystemStats: () => invoke<SystemStats>('get_system_stats'),

  /** Grava a configuração atual como preset JSON no caminho escolhido. */
  exportPreset: (path: string, config: RadialConfig) =>
    invoke<void>('export_preset', { path, config }),

  /** Lê e valida um preset; erro se o arquivo não for uma configuração válida. */
  importPreset: (path: string) => invoke<RadialConfig>('import_preset', { path }),
};
