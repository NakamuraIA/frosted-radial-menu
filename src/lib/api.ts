import { invoke } from '@tauri-apps/api/core';

import type { RadialConfig, SystemStats } from './config';

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

  openSettingsWindow: () => invoke<void>('open_settings_window'),

  hideMainWindow: () => invoke<void>('hide_main_window'),

  hideSettingsWindow: () => invoke<void>('hide_settings_window'),

  getAutostartStatus: () => invoke<boolean>('get_autostart_status'),

  getSystemStats: () => invoke<SystemStats>('get_system_stats'),
};
