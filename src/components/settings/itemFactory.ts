import { createId } from '../../lib/id';
import type { MenuItemConfig } from '../../lib/config';

/** Item novo com valores padrão sensatos para o editor. */
export function createItem(parentId?: string): MenuItemConfig {
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
