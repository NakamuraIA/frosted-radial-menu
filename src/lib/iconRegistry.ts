import {
  AppWindow,
  BarChart3,
  Code2,
  Database,
  FileText,
  FolderOpen,
  Gamepad2,
  Globe,
  Home,
  Image,
  Keyboard,
  MessageSquare,
  Music,
  Power,
  Server,
  Settings,
  Terminal,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const iconRegistry: Record<string, LucideIcon> = {
  terminal: Terminal,
  folder: FolderOpen,
  file: FileText,
  server: Server,
  settings: Settings,
  globe: Globe,
  apps: AppWindow,
  music: Music,
  video: Video,
  gamepad: Gamepad2,
  keyboard: Keyboard,
  message: MessageSquare,
  chart: BarChart3,
  home: Home,
  code: Code2,
  database: Database,
  image: Image,
  zap: Zap,
  power: Power,
};

export function getIconComponent(icon: string): LucideIcon {
  return iconRegistry[icon] ?? AppWindow;
}
