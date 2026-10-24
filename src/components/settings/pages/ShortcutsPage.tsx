import { Keyboard, RotateCcw } from 'lucide-react';

import { Button, Card, Field, PageHeader } from '../../ui';
import type { PageProps } from './types';

/** Página Atalhos: combinação global e atalhos fixos do app. */
export function ShortcutsPage({ config, update }: PageProps) {
  const hotkey = config.preferences.hotkey;
  const isEmpty = hotkey.trim() === '';

  const patchHotkey = (value: string) => {
    update((current) => ({
      ...current,
      preferences: { ...current.preferences, hotkey: value },
    }));
  };

  return (
    <div className="page">
      <PageHeader
        kicker="Teclado"
        title="Atalhos"
        description="Combinação que abre e fecha o menu radial em qualquer aplicativo."
      />

      <Card
        title="Atalho global"
        description="Registrado pelo sistema; funciona com o app em segundo plano."
        icon={<Keyboard size={16} />}
      >
        <Field
          label="Combinação"
          hint="Formato: Alt+Space, Ctrl+Shift+R, Super+K. A validação real acontece ao salvar."
        >
          <input
            className="ui-input"
            value={hotkey}
            aria-invalid={isEmpty}
            placeholder="Alt+Space"
            onChange={(event) => patchHotkey(event.target.value)}
          />
        </Field>

        {isEmpty ? (
          <p className="page-hint" style={{ color: 'var(--danger)' }}>
            O atalho não pode ficar vazio.
          </p>
        ) : null}

        <div className="ui-inline">
          <Button
            variant="ghost"
            icon={<RotateCcw size={15} />}
            onClick={() => patchHotkey('Alt+Space')}
          >
            Usar Alt+Space
          </Button>
        </div>

        <p className="page-hint">
          Se a combinação já estiver em uso por outro aplicativo, o salvamento retorna um aviso e o
          atalho anterior continua ativo.
        </p>
      </Card>

      <Card title="Atalhos fixos" description="Ações de teclado e mouse que não são configuráveis.">
        <dl className="meta-list">
          <div>
            <dt>Abrir e fechar o menu</dt>
            <dd>{hotkey || '—'}</dd>
          </div>
          <div>
            <dt>Fechar o menu aberto</dt>
            <dd>clique no centro</dd>
          </div>
          <div>
            <dt>Abrir as configurações</dt>
            <dd>menu da bandeja</dd>
          </div>
          <div>
            <dt>Encerrar o aplicativo</dt>
            <dd>bandeja → Sair</dd>
          </div>
        </dl>
      </Card>

      <div className="ui-note">
        <Keyboard size={16} />
        <span>
          <strong>Atalhos por ação</strong> ainda não existem no backend: hoje há apenas uma
          combinação global. A página lista somente o que é realmente aplicado.
        </span>
      </div>
    </div>
  );
}
