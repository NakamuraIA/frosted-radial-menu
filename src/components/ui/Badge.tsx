import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'accent' | 'violet' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
  dot?: boolean;
}

/** Etiqueta compacta para estados (salvo, pendente, aviso, indisponível). */
export function Badge({ tone = 'neutral', children, title, dot = false }: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${tone}`} title={title}>
      {dot ? <span className="ui-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
