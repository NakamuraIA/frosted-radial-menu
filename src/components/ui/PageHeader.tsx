import type { ReactNode } from 'react';

interface PageHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Cabeçalho de página: sobrenome curto, título e explicação do que se edita. */
export function PageHeader({ kicker, title, description, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-head">
      <div>
        {kicker ? <span className="ui-page-head__kicker">{kicker}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="ui-page-head__actions">{actions}</div> : null}
    </header>
  );
}
