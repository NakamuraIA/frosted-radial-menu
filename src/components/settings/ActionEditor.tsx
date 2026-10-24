import { Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';

import { CustomIcon } from '../common/CustomIcon';
import { renderIcon } from '../common/renderIcon';
import { resolveCustomIconSrc } from '../../lib/icons';
import {
  ACTION_TYPE_LABELS,
  ICON_OPTIONS,
  type ActionType,
  type MenuItemConfig,
  type ShellType,
} from '../../lib/config';

interface ActionEditorProps {
  item: MenuItemConfig;
  onPatch: (patch: Partial<MenuItemConfig>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const NON_TARGET_ACTIONS: ActionType[] = ['settings', 'submenu'];

/** Formulário da fatia selecionada + pré-visualização. */
export function ActionEditor({ item, onPatch, onDuplicate, onDelete }: ActionEditorProps) {
  const customIconSrc = resolveCustomIconSrc(item.customIcon);
  const targetDisabled = NON_TARGET_ACTIONS.includes(item.actionType);
  const commandOnly = item.actionType !== 'runCommand';

  return (
    <section className="editor-panel">
      <div className="editor-title">
        <div>
          <span>Editando</span>
          <h2>{item.label}</h2>
        </div>
        <div className="editor-actions">
          <button type="button" onClick={onDuplicate}>
            Duplicar
          </button>
          <button type="button" className="danger-button" onClick={onDelete}>
            <Trash2 size={15} />
            Remover
          </button>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Nome
          <input
            value={item.label}
            onChange={(event) => onPatch({ label: event.target.value })}
          />
        </label>

        <label>
          Icone
          <select value={item.icon} onChange={(event) => onPatch({ icon: event.target.value })}>
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
            value={item.customIcon ?? ''}
            placeholder="C:\\Users\\...\\logo.ico, .png ou https://..."
            onChange={(event) => onPatch({ customIcon: event.target.value })}
          />
        </label>

        <label>
          Cor neon
          <div className="color-input">
            <input
              type="color"
              value={item.color}
              onChange={(event) => onPatch({ color: event.target.value })}
            />
            <input
              value={item.color}
              onChange={(event) => onPatch({ color: event.target.value })}
            />
          </div>
        </label>

        <label>
          Tipo
          <select
            value={item.actionType}
            onChange={(event) => onPatch({ actionType: event.target.value as ActionType })}
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
            value={item.value ?? ''}
            placeholder="%USERPROFILE%\\Desktop, https://..., npm run dev"
            onChange={(event) => onPatch({ value: event.target.value })}
            disabled={targetDisabled}
          />
        </label>

        <label>
          Shell
          <select
            value={item.shell ?? 'powershell'}
            onChange={(event) => onPatch({ shell: event.target.value as ShellType })}
            disabled={commandOnly}
          >
            <option value="powershell">PowerShell</option>
            <option value="cmd">CMD</option>
          </select>
        </label>

        <label>
          Pasta de trabalho
          <input
            value={item.workingDir ?? ''}
            placeholder="Opcional"
            onChange={(event) => onPatch({ workingDir: event.target.value })}
            disabled={commandOnly}
          />
        </label>
      </div>

      <div className="preview-strip">
        <div
          className="preview-button"
          style={{ '--preview-color': item.color } as CSSProperties}
        >
          <CustomIcon src={customIconSrc} fallback={renderIcon(item.icon, 28)} />
          <span>{item.label}</span>
        </div>
        <p>
          Submenus abrem em arco externo. Acoes diretas fecham o menu depois de executar, se essa
          preferencia estiver ligada.
        </p>
      </div>
    </section>
  );
}
