import type { ActionType } from './types';

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  openPath: 'Abrir app, pasta ou arquivo',
  openUrl: 'Abrir URL',
  runCommand: 'Rodar comando',
  settings: 'Abrir configurações',
  submenu: 'Submenu',
  none: 'Sem ação',
};

export const ICON_OPTIONS = [
  'terminal',
  'folder',
  'file',
  'server',
  'settings',
  'globe',
  'apps',
  'music',
  'video',
  'gamepad',
  'keyboard',
  'message',
  'chart',
  'home',
  'code',
  'database',
  'image',
  'zap',
  'power',
] as const;

export const FONT_OPTIONS = [
  {
    label: 'Segoe UI Futurista',
    value: "'Segoe UI', 'Bahnschrift', system-ui, sans-serif",
  },
  {
    label: 'Bahnschrift Condensada',
    value: "'Bahnschrift', 'Segoe UI', system-ui, sans-serif",
  },
  {
    label: 'Cascadia Tech',
    value: "'Cascadia Code', 'Consolas', 'Segoe UI', monospace",
  },
  {
    label: 'Trebuchet Clean',
    value: "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif",
  },
] as const;
