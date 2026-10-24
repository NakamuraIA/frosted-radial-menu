interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** Linha de preferência com switch acessível (role="switch"). */
export function Switch({ label, description, checked, disabled, onChange }: SwitchProps) {
  return (
    <div className={`ui-switch-row ${disabled ? 'is-disabled' : ''}`}>
      <div className="ui-switch-row__text">
        <span className="ui-switch-row__label">{label}</span>
        {description ? <p className="ui-switch-row__description">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`ui-switch ${checked ? 'is-checked' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="ui-switch__thumb" />
      </button>
    </div>
  );
}
