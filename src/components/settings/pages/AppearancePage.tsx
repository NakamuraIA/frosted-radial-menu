import { Info, Palette, Sparkles, Type } from 'lucide-react';

import { Card, Field, PageHeader, Slider } from '../../ui';
import { FONT_OPTIONS } from '../../../lib/config';
import type { PageProps } from './types';

/** Página Aparência: cores, vidro, efeitos e tipografia. */
export function AppearancePage({ config, update }: PageProps) {
  const patchTheme = (patch: Partial<(typeof config)['theme']>) => {
    update((current) => ({ ...current, theme: { ...current.theme, ...patch } }));
  };

  const patchLayout = (patch: Partial<(typeof config)['layout']>) => {
    update((current) => ({
      ...current,
      layout: { ...current.layout, ...patch },
    }));
  };

  return (
    <div className="page">
      <PageHeader
        kicker="Identidade visual"
        title="Aparência"
        description="Cores de destaque, material do vidro, efeitos e tipografia do menu."
      />

      <Card
        title="Cores de destaque"
        description="Usadas nas fatias, no anel do centro e nos detalhes do menu."
        icon={<Palette size={16} />}
      >
        <div className="form-grid">
          <Field label="Destaque principal" hint="Cor dos controles e do anel de CPU.">
            <div className="ui-color-input">
              <input
                type="color"
                value={config.theme.accent}
                onChange={(event) => patchTheme({ accent: event.target.value })}
                aria-label="Destaque principal"
              />
              <input
                className="ui-input"
                value={config.theme.accent}
                onChange={(event) => patchTheme({ accent: event.target.value })}
              />
            </div>
          </Field>

          <Field label="Destaque secundário" hint="Usado no brilho ambiente do menu.">
            <div className="ui-color-input">
              <input
                type="color"
                value={config.theme.accentAlt}
                onChange={(event) => patchTheme({ accentAlt: event.target.value })}
                aria-label="Destaque secundário"
              />
              <input
                className="ui-input"
                value={config.theme.accentAlt}
                onChange={(event) => patchTheme({ accentAlt: event.target.value })}
              />
            </div>
          </Field>

          <Field label="Cor de perigo" hint="Reservada a ações destrutivas na interface.">
            <div className="ui-color-input">
              <input
                type="color"
                value={config.theme.danger}
                onChange={(event) => patchTheme({ danger: event.target.value })}
                aria-label="Cor de perigo"
              />
              <input
                className="ui-input"
                value={config.theme.danger}
                onChange={(event) => patchTheme({ danger: event.target.value })}
              />
            </div>
          </Field>
        </div>
      </Card>

      <Card
        title="Vidro e efeitos"
        description="Transparência, intensidade do brilho e velocidade das animações."
        icon={<Sparkles size={16} />}
      >
        <div className="form-grid">
          <Slider
            label="Opacidade do vidro"
            value={config.theme.glassOpacity}
            min={0.42}
            max={0.9}
            step={0.02}
            onChange={(value) => patchTheme({ glassOpacity: value })}
          />
          <Slider
            label="Intensidade do brilho"
            value={config.layout.glowIntensity}
            min={0.35}
            max={1.85}
            step={0.05}
            unit="x"
            onChange={(value) => patchLayout({ glowIntensity: value })}
          />
          <Slider
            label="Velocidade da animação"
            value={config.theme.animationSpeed}
            min={0.65}
            max={1.45}
            step={0.05}
            unit="x"
            onChange={(value) => patchTheme({ animationSpeed: value })}
          />
          <Slider
            label="Escala do menu"
            value={config.layout.menuScale}
            min={0.45}
            max={1.3}
            step={0.01}
            unit="x"
            onChange={(value) => patchLayout({ menuScale: value })}
          />
        </div>
      </Card>

      <Card
        title="Tipografia"
        description="Família de fontes aplicada às fatias e ao centro."
        icon={<Type size={16} />}
      >
        <Field label="Fonte do menu">
          <select
            className="ui-select"
            value={config.layout.fontFamily}
            onChange={(event) => patchLayout({ fontFamily: event.target.value })}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <div className="ui-note">
        <Info size={16} />
        <span>
          <strong>Tema claro, wallpaper e desfoque do sistema</strong> ainda não são suportados
          pelo backend atual. Esta página mostra apenas o que o app realmente aplica.
        </span>
      </div>
    </div>
  );
}
