export type ActionType =
  | 'openPath'
  | 'openUrl'
  | 'runCommand'
  | 'settings'
  | 'submenu'
  | 'none';

export type ShellType = 'powershell' | 'cmd';

export interface MenuItemConfig {
  id: string;
  label: string;
  icon: string;
  customIcon?: string;
  color: string;
  actionType: ActionType;
  value?: string;
  workingDir?: string;
  shell?: ShellType;
  children?: MenuItemConfig[];
}

export interface ThemeConfig {
  accent: string;
  accentAlt: string;
  danger: string;
  glassOpacity: number;
  animationSpeed: number;
  compactMode: boolean;
}

export interface LayoutConfig {
  menuScale: number;
  mainInnerRadius: number;
  mainOuterRadius: number;
  mainGap: number;
  mainIconSize: number;
  mainLabelSize: number;
  submenuInnerRadius: number;
  submenuOuterRadius: number;
  submenuGap: number;
  submenuIconSize: number;
  submenuLabelSize: number;
  submenuSpread: number;
  centerSize: number;
  borderWidth: number;
  glowIntensity: number;
  fontFamily: string;
}

export interface AppPreferences {
  hotkey: string;
  autostartEnabled: boolean;
  hideAfterAction: boolean;
  showPercentages: boolean;
}

export interface RadialConfig {
  version: number;
  theme: ThemeConfig;
  layout: LayoutConfig;
  preferences: AppPreferences;
  items: MenuItemConfig[];
}

export interface SystemStats {
  cpu: number;
  ram: number;
  gpu: number | null;
}

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  openPath: 'Abrir app, pasta ou arquivo',
  openUrl: 'Abrir URL',
  runCommand: 'Rodar comando',
  settings: 'Abrir configuracoes',
  submenu: 'Submenu',
  none: 'Sem acao',
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

export const DEFAULT_LAYOUT: LayoutConfig = {
  menuScale: 1,
  mainInnerRadius: 142,
  mainOuterRadius: 286,
  mainGap: 4,
  mainIconSize: 34,
  mainLabelSize: 14,
  submenuInnerRadius: 296,
  submenuOuterRadius: 368,
  submenuGap: 3,
  submenuIconSize: 38,
  submenuLabelSize: 12,
  submenuSpread: 38,
  centerSize: 244,
  borderWidth: 1.4,
  glowIntensity: 1,
  fontFamily: FONT_OPTIONS[0].value,
};

export const FALLBACK_CONFIG: RadialConfig = {
  version: 1,
  theme: {
    accent: '#23e6ff',
    accentAlt: '#ff3fa6',
    danger: '#ff4f6d',
    glassOpacity: 0.72,
    animationSpeed: 1,
    compactMode: false,
  },
  layout: DEFAULT_LAYOUT,
  preferences: {
    hotkey: 'Alt+Space',
    autostartEnabled: false,
    hideAfterAction: true,
    showPercentages: true,
  },
  items: [
    {
      id: 'terminal',
      label: 'Terminal',
      icon: 'terminal',
      color: '#23e6ff',
      actionType: 'runCommand',
      value: 'wt',
      shell: 'cmd',
    },
    {
      id: 'folders',
      label: 'Pastas',
      icon: 'folder',
      color: '#42ffb5',
      actionType: 'submenu',
      children: [
        {
          id: 'folder-desktop',
          label: 'Desktop',
          icon: 'folder',
          color: '#42ffb5',
          actionType: 'openPath',
          value: '%USERPROFILE%\\Desktop',
        },
        {
          id: 'folder-downloads',
          label: 'Downloads',
          icon: 'folder',
          color: '#23e6ff',
          actionType: 'openPath',
          value: '%USERPROFILE%\\Downloads',
        },
        {
          id: 'folder-docs',
          label: 'Docs',
          icon: 'file',
          color: '#ffcf5a',
          actionType: 'openPath',
          value: '%USERPROFILE%\\Documents',
        },
      ],
    },
    {
      id: 'dev',
      label: 'Dev',
      icon: 'server',
      color: '#ff3fa6',
      actionType: 'submenu',
      children: [
        {
          id: 'dev-backend',
          label: 'Backend',
          icon: 'server',
          color: '#23e6ff',
          actionType: 'runCommand',
          value: 'npm run dev',
          shell: 'powershell',
        },
        {
          id: 'dev-frontend',
          label: 'Frontend',
          icon: 'globe',
          color: '#42ffb5',
          actionType: 'runCommand',
          value: 'npm run dev',
          shell: 'powershell',
        },
        {
          id: 'dev-db',
          label: 'Database',
          icon: 'database',
          color: '#ffcf5a',
          actionType: 'runCommand',
          value: 'docker compose up -d',
          shell: 'powershell',
        },
        {
          id: 'dev-code',
          label: 'VS Code',
          icon: 'code',
          color: '#9b7cff',
          actionType: 'runCommand',
          value: 'code .',
          shell: 'cmd',
        },
      ],
    },
    {
      id: 'browser',
      label: 'Browser',
      icon: 'globe',
      color: '#9b7cff',
      actionType: 'openUrl',
      value: 'https://www.google.com',
    },
    {
      id: 'files',
      label: 'Arquivo',
      icon: 'file',
      color: '#ffcf5a',
      actionType: 'openPath',
      value: '%USERPROFILE%\\Documents',
    },
    {
      id: 'apps',
      label: 'Apps',
      icon: 'apps',
      color: '#55a7ff',
      actionType: 'submenu',
      children: [
        {
          id: 'app-notepad',
          label: 'Notas',
          icon: 'file',
          color: '#55a7ff',
          actionType: 'runCommand',
          value: 'notepad',
          shell: 'cmd',
        },
        {
          id: 'app-calc',
          label: 'Calc',
          icon: 'apps',
          color: '#23e6ff',
          actionType: 'runCommand',
          value: 'calc',
          shell: 'cmd',
        },
      ],
    },
    {
      id: 'media',
      label: 'Midia',
      icon: 'music',
      color: '#ff7ad9',
      actionType: 'submenu',
      children: [
        {
          id: 'media-music',
          label: 'Musica',
          icon: 'music',
          color: '#ff7ad9',
          actionType: 'none',
        },
        {
          id: 'media-video',
          label: 'Video',
          icon: 'video',
          color: '#23e6ff',
          actionType: 'none',
        },
        {
          id: 'media-games',
          label: 'Jogos',
          icon: 'gamepad',
          color: '#42ffb5',
          actionType: 'none',
        },
      ],
    },
    {
      id: 'settings',
      label: 'Config',
      icon: 'settings',
      color: '#ffffff',
      actionType: 'settings',
    },
  ],
};

function clampNumber(value: number | null | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function normalizeLayoutConfig(layout?: Partial<LayoutConfig> | null): LayoutConfig {
  const source = { ...DEFAULT_LAYOUT, ...(layout ?? {}) };
  const centerSize = clampNumber(source.centerSize, 188, 284, DEFAULT_LAYOUT.centerSize);
  const centerRadius = centerSize / 2;
  const mainInnerRadius = clampNumber(
    source.mainInnerRadius,
    centerRadius + 18,
    190,
    DEFAULT_LAYOUT.mainInnerRadius,
  );
  const mainOuterRadius = clampNumber(
    source.mainOuterRadius,
    mainInnerRadius + 72,
    328,
    DEFAULT_LAYOUT.mainOuterRadius,
  );
  const submenuInnerRadius = clampNumber(
    source.submenuInnerRadius,
    mainOuterRadius + 10,
    370,
    DEFAULT_LAYOUT.submenuInnerRadius,
  );
  const submenuOuterRadius = clampNumber(
    source.submenuOuterRadius,
    submenuInnerRadius + 48,
    408,
    DEFAULT_LAYOUT.submenuOuterRadius,
  );

  return {
    menuScale: clampNumber(source.menuScale, 0.72, 1.1, DEFAULT_LAYOUT.menuScale),
    mainInnerRadius,
    mainOuterRadius,
    mainGap: clampNumber(source.mainGap, 0, 10, DEFAULT_LAYOUT.mainGap),
    mainIconSize: clampNumber(source.mainIconSize, 24, 48, DEFAULT_LAYOUT.mainIconSize),
    mainLabelSize: clampNumber(source.mainLabelSize, 10, 17, DEFAULT_LAYOUT.mainLabelSize),
    submenuInnerRadius,
    submenuOuterRadius,
    submenuGap: clampNumber(source.submenuGap, 0, 8, DEFAULT_LAYOUT.submenuGap),
    submenuIconSize: clampNumber(source.submenuIconSize, 28, 56, DEFAULT_LAYOUT.submenuIconSize),
    submenuLabelSize: clampNumber(source.submenuLabelSize, 9, 16, DEFAULT_LAYOUT.submenuLabelSize),
    submenuSpread: clampNumber(source.submenuSpread, 28, 56, DEFAULT_LAYOUT.submenuSpread),
    centerSize,
    borderWidth: clampNumber(source.borderWidth, 0.8, 3.4, DEFAULT_LAYOUT.borderWidth),
    glowIntensity: clampNumber(source.glowIntensity, 0.35, 1.85, DEFAULT_LAYOUT.glowIntensity),
    fontFamily:
      typeof source.fontFamily === 'string' && source.fontFamily.trim()
        ? source.fontFamily
        : DEFAULT_LAYOUT.fontFamily,
  };
}

export function normalizeRadialConfig(
  config: Partial<RadialConfig> & { layout?: Partial<LayoutConfig> | null },
): RadialConfig {
  return {
    version: config.version ?? FALLBACK_CONFIG.version,
    theme: {
      ...FALLBACK_CONFIG.theme,
      ...(config.theme ?? {}),
    },
    layout: normalizeLayoutConfig(config.layout),
    preferences: {
      ...FALLBACK_CONFIG.preferences,
      ...(config.preferences ?? {}),
    },
    items: config.items?.length ? config.items : FALLBACK_CONFIG.items,
  };
}

export function clampPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function findMenuItem(items: MenuItemConfig[], id: string | null): MenuItemConfig | null {
  if (!id) return null;

  for (const item of items) {
    if (item.id === id) return item;
    const child = findMenuItem(item.children ?? [], id);
    if (child) return child;
  }

  return null;
}

export interface FlattenedMenuItem {
  item: MenuItemConfig;
  path: string;
}

export function flattenMenuItems(
  items: MenuItemConfig[],
  parentLabel = '',
): FlattenedMenuItem[] {
  const result: FlattenedMenuItem[] = [];

  items.forEach((item) => {
    const path = parentLabel ? `${parentLabel} / ${item.label}` : item.label;
    result.push({ item, path });
    result.push(...flattenMenuItems(item.children ?? [], path));
  });

  return result;
}
