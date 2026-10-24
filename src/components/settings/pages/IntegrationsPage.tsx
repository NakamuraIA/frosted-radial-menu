import {
  AppWindow,
  Cpu,
  Image,
  Keyboard,
  MonitorPlay,
  Power,
  Wallpaper,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge, Card, PageHeader } from '../../ui';
import type { RadialConfig } from '../../../lib/config';

interface IntegrationsPageProps {
  config: RadialConfig;
  autostartActive: boolean | null;
}

type IntegrationState = 'success' | 'warning' | 'neutral';

interface IntegrationRow {
  icon: ReactNode;
  title: string;
  description: string;
  label: string;
  tone: IntegrationState;
}

/**
 * Página Integrações: mostra o estado real do que existe no backend e marca
 * explicitamente o que ainda não foi implementado.
 */
export function IntegrationsPage({ config, autostartActive }: IntegrationsPageProps) {
  const autostartLabel =
    autostartActive === null ? 'Não verificado' : autostartActive ? 'Ativo' : 'Inativo';

  const rows: IntegrationRow[] = [
    {
      icon: <Keyboard size={16} />,
      title: 'Atalho global',
      description: `Combinação registrada pelo sistema: ${config.preferences.hotkey || 'não definida'}.`,
      label: 'Ativo',
      tone: 'success',
    },
    {
      icon: <Power size={16} />,
      title: 'Inicialização com o Windows',
      description:
        'Registro em HKCU\\...\\Run, no usuário atual. Não exige administrador nem tarefa agendada.',
      label: autostartLabel,
      tone: autostartActive ? 'success' : 'warning',
    },
    {
      icon: <AppWindow size={16} />,
      title: 'Bandeja do sistema',
      description: 'Ícone com acesso às configurações e à saída do aplicativo.',
      label: 'Ativo',
      tone: 'success',
    },
    {
      icon: <Image size={16} />,
      title: 'Ícones personalizados',
      description: 'Arquivos .ico/.png locais ou URLs por ação, com fallback para o ícone do lucide.',
      label: 'Ativo',
      tone: 'success',
    },
    {
      icon: <Cpu size={16} />,
      title: 'Métricas de GPU',
      description: 'O backend coleta CPU e RAM; a GPU ainda retorna nulo e o centro mostra apenas CPU.',
      label: 'Indisponível',
      tone: 'neutral',
    },
    {
      icon: <MonitorPlay size={16} />,
      title: 'Widget de mídia',
      description: 'Sem integração com players do sistema nesta versão.',
      label: 'Indisponível',
      tone: 'neutral',
    },
    {
      icon: <Wallpaper size={16} />,
      title: 'Wallpaper e desfoque do sistema',
      description: 'O menu usa fundo próprio; não há leitura nem desfoque do papel de parede.',
      label: 'Indisponível',
      tone: 'neutral',
    },
  ];

  return (
    <div className="page">
      <PageHeader
        kicker="Sistema"
        title="Integrações"
        description="O que está realmente conectado ao Windows hoje — sem simulações."
      />

      <Card title="Recursos do sistema" description="Estado lido do backend e do registro do Windows.">
        <div className="integration-list">
          {rows.map((row) => (
            <div className="integration-row" key={row.title}>
              <span className="integration-row__icon">{row.icon}</span>
              <div className="integration-row__text">
                <strong>{row.title}</strong>
                <p>{row.description}</p>
              </div>
              <Badge tone={row.tone} dot>
                {row.label}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <div className="ui-note">
        <Cpu size={16} />
        <span>
          Itens marcados como <strong>Indisponível</strong> aparecem aqui de propósito: o painel
          não deve fingir integração que o backend não oferece.
        </span>
      </div>
    </div>
  );
}
