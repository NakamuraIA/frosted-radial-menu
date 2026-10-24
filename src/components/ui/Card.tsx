import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Cartão de seção: título curto, descrição e conteúdo agrupado. */
export function Card({ title, description, icon, actions, children, className }: CardProps) {
  return (
    <section className={['ui-card', className].filter(Boolean).join(' ')}>
      {title ? (
        <header className="ui-card__head">
          {icon ? <span className="ui-card__icon">{icon}</span> : null}
          <div className="ui-card__heading">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="ui-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="ui-card__body">{children}</div>
    </section>
  );
}
