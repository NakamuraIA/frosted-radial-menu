import { Info, MonitorCog, ScrollText } from 'lucide-react';
import { useMemo } from 'react';

import { Card, PageHeader } from '../../ui';
import { isWindows } from '../../../lib/tauri';

interface AboutPageProps {
  version: string;
}

/** Página Sobre: versão, ambiente e diagnóstico recolhível. */
export function AboutPage({ version }: AboutPageProps) {
  const diagnostics = useMemo(() => {
    const reducedMotion =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    return {
      'WebView': navigator.userAgent,
      'Plataforma': navigator.platform,
      'Idioma': navigator.language,
      'Tela': `${window.screen.width}×${window.screen.height}`,
      'Escala': `${window.devicePixelRatio}x`,
      'Movimento reduzido': reducedMotion ? 'sim' : 'não',
    };
  }, []);

  return (
    <div className="page">
      <PageHeader
        kicker="Aplicativo"
        title="Sobre"
        description="Versão, ambiente de execução e informações técnicas."
      />

      <div className="about-grid">
        <Card title="Versão" icon={<Info size={16} />}>
          <dl className="meta-list">
            <div>
              <dt>Aplicativo</dt>
              <dd>Frosted Radial Menu v{version}</dd>
            </div>
            <div>
              <dt>Licença</dt>
              <dd>MIT</dd>
            </div>
            <div>
              <dt>Plataforma alvo</dt>
              <dd>{isWindows() ? 'Windows 10/11 (x64)' : 'Linux (experimental, x64)'}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{isWindows() ? 'WebView2' : 'WebKitGTK'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Ambiente" icon={<MonitorCog size={16} />}>
          <dl className="meta-list">
            <div>
              <dt>Idioma</dt>
              <dd>{diagnostics['Idioma']}</dd>
            </div>
            <div>
              <dt>Tela</dt>
              <dd>{diagnostics['Tela']}</dd>
            </div>
            <div>
              <dt>Escala</dt>
              <dd>{diagnostics['Escala']}</dd>
            </div>
            <div>
              <dt>Movimento reduzido</dt>
              <dd>{diagnostics['Movimento reduzido']}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card
        title="Diagnóstico"
        description="Detalhes técnicos para relatar problemas."
        icon={<ScrollText size={16} />}
      >
        <details className="diagnostics">
          <summary>Mostrar informações técnicas</summary>
          <pre>
            {Object.entries(diagnostics)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')}
          </pre>
        </details>
      </Card>

      <Card title="Configuração" description="Onde o app grava o arquivo JSON.">
        <p className="page-hint">
          Arquivo de configuração:{' '}
          <strong>%LOCALAPPDATA%\com.nakamuraia.frostedradialmenu\config.json</strong>
        </p>
        <p className="page-hint">
          Faça backup desse arquivo antes de editar presets ou experimentar o botão de restaurar
          padrões.
        </p>
      </Card>
    </div>
  );
}
