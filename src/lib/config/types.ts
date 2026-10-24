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
  runCommandsAsAdmin: boolean;
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

export interface FlattenedMenuItem {
  item: MenuItemConfig;
  path: string;
  depth: number;
  parentId: string | null;
}
