import { Power, RotateCcw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { Button, Card, ConfirmDialog, PageHeader, Switch } from '../../ui';
import { FALLBACK_CONFIG } from '../../../lib/config';
import type { PageProps } from './types';

interface GeneralPageProps extends PageProps {
  autostartActive: boolean | null;
}

/** Página Geral: inicialização, execução e manutenção. */
export function GeneralPage({ config, update, autostartActive }: GeneralPageProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const patchPreference = (patch: Partial<(typeof config)['preferences']>) => {
    update((current) => ({
      ...current,
      preferences: { ...current.preferences, ...patch },
    }));
  };

  return (
    <div className="page">
      <PageHeader
        kicker="Preferências"
        title="Geral"
        description="Inicialização, comportamento de execução e manutenção do aplicativo."
      />

      <Card
        title="Inicialização"
        description="Como o launcher entra em ação quando o Windows liga."
        icon={<Power size={16} />}
      >
        <Switch
          label="Iniciar com o Windows"
          description="Registra o app na chave Run do usuário atual. Não exige permissões de administrador."
          checked={config.preferences.autostartEnabled}
          onChange={(value) => patchPreference({ autostartEnabled: value })}
        />
        <p className="page-hint">
          Estado real no sistema:{' '}
          <strong>
            {autostartActive === null
              ? 'indisponível'
              : autostartActive
                ? 'registrado'
                : 'não registrado'}
          </strong>
          . A alteração é aplicada quando você salvar.
        </p>
      </Card>

      <Card
        title="Execução de comandos"
        description="Como os comandos de shell são disparados pelas fatias."
        icon={<ShieldAlert size={16} />}
      >
        <Switch
          label="Rodar comandos como administrador"
          description="Cada comando abre o prompt de elevação (UAC) do Windows. Desligado, roda com os privilégios do usuário."
          checked={config.preferences.runCommandsAsAdmin}
          onChange={(value) => patchPreference({ runCommandsAsAdmin: value })}
        />
        <p className="page-hint">
          Recomendado deixar desligado, exceto para comandos que realmente precisam de
          privilégio elevado.
        </p>
      </Card>

      <Card
        title="Manutenção"
        description="Volta a configuração ao padrão de fábrica."
        icon={<RotateCcw size={16} />}
      >
        <p className="page-hint">
          Restaurar os padrões altera apenas o rascunho: ações, aparência e geometria voltam ao
          padrão. Nada é gravado até você clicar em <strong>Salvar</strong>.
        </p>
        <div>
          <Button variant="danger" icon={<RotateCcw size={15} />} onClick={() => setConfirmReset(true)}>
            Restaurar padrões
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Restaurar configuração padrão?"
        description="As ações, cores e geometria personalizadas no rascunho serão substituídas pelo padrão. Você ainda pode revisar antes de salvar."
        confirmLabel="Restaurar"
        tone="danger"
        onConfirm={() => {
          update(() => structuredClone(FALLBACK_CONFIG));
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
