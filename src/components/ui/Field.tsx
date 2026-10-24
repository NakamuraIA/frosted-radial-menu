import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Rótulo + controle + dica, empilhados com espaçamento consistente. */
export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={['ui-field', className].filter(Boolean).join(' ')}>
      <span className="ui-field__label">{label}</span>
      {children}
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  );
}
