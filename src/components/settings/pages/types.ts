import type { RadialConfig } from '../../../lib/config';

export interface PageProps {
  config: RadialConfig;
  update: (updater: (current: RadialConfig) => RadialConfig) => void;
}
