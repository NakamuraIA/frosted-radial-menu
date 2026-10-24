import { RotateCcw, Save, X } from 'lucide-react';

interface SettingsHeaderProps {
  status: string;
  warnings: string[];
  onReset: () => void;
  onSave: () => void;
  onClose: () => void;
}

export function SettingsHeader({ status, warnings, onReset, onSave, onClose }: SettingsHeaderProps) {
  return (
    <header className="settings-header">
      <div>
        <span>Radial Menu</span>
        <h1>Configuracoes</h1>
      </div>
      <div className="settings-actions">
        <span
          className={`status-chip ${warnings.length ? 'is-warning' : ''}`}
          title={warnings.join('\n')}
        >
          {status}
        </span>
        <button type="button" className="ghost-button" onClick={onReset}>
          <RotateCcw size={16} />
          Reset
        </button>
        <button type="button" className="primary-button" onClick={onSave}>
          <Save size={16} />
          Salvar
        </button>
        <button type="button" className="icon-button" onClick={onClose} title="Fechar">
          <X size={18} />
        </button>
      </div>
    </header>
  );
}
