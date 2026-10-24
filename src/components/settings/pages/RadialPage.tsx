import { CircleDot, LayoutGrid, SlidersHorizontal } from 'lucide-react';

import { Card, PageHeader, Slider, Switch } from '../../ui';
import { MenuPreview } from '../MenuPreview';
import type { PageProps } from './types';

/** Página Menu radial: geometria, elementos, comportamento e prévia ao vivo. */
export function RadialPage({ config, update }: PageProps) {
  const patchLayout = (patch: Partial<(typeof config)['layout']>) => {
    update((current) => ({ ...current, layout: { ...current.layout, ...patch } }));
  };

  const patchPreferences = (patch: Partial<(typeof config)['preferences']>) => {
    update((current) => ({
      ...current,
      preferences: { ...current.preferences, ...patch },
    }));
  };

  return (
    <div className="page">
      <PageHeader
        kicker="Composição"
        title="Menu radial"
        description="Geometria da roda, tamanho dos elementos e comportamento de abertura."
      />

      <div className="page-grid">
        <div className="page-column">
          <Card
            title="Geometria"
            description="Define o tamanho da roda e o espaço entre as fatias."
            icon={<LayoutGrid size={16} />}
          >
            <div className="form-grid">
              <Slider
                label="Raio interno"
                value={config.layout.mainInnerRadius}
                min={88}
                max={220}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ mainInnerRadius: value })}
              />
              <Slider
                label="Raio externo"
                value={config.layout.mainOuterRadius}
                min={170}
                max={390}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ mainOuterRadius: value })}
              />
              <Slider
                label="Espaço entre fatias"
                value={config.layout.mainGap}
                min={0}
                max={10}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ mainGap: value })}
              />
              <Slider
                label="Diâmetro do centro"
                value={config.layout.centerSize}
                min={148}
                max={320}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ centerSize: value })}
              />
            </div>
            <p className="page-hint">
              O raio interno nunca invade o centro e cada anel respeita o anterior — os valores são
              normalizados automaticamente.
            </p>
          </Card>

          <Card
            title="Elementos"
            description="Ícones, rótulos e espessura das bordas."
            icon={<SlidersHorizontal size={16} />}
          >
            <div className="form-grid">
              <Slider
                label="Tamanho dos ícones"
                value={config.layout.mainIconSize}
                min={24}
                max={72}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ mainIconSize: value })}
              />
              <Slider
                label="Tamanho do texto"
                value={config.layout.mainLabelSize}
                min={9}
                max={22}
                step={1}
                unit="px"
                onChange={(value) => patchLayout({ mainLabelSize: value })}
              />
              <Slider
                label="Espessura da borda"
                value={config.layout.borderWidth}
                min={0.8}
                max={3.4}
                step={0.1}
                unit="px"
                onChange={(value) => patchLayout({ borderWidth: value })}
              />
            </div>
          </Card>

          <Card
            title="Comportamento"
            description="Como o menu reage depois de executar uma ação."
            icon={<CircleDot size={16} />}
          >
            <Switch
              label="Fechar após executar"
              description="Fecha o menu automaticamente depois de abrir um app ou rodar um comando."
              checked={config.preferences.hideAfterAction}
              onChange={(value) => patchPreferences({ hideAfterAction: value })}
            />
            <Switch
              label="Mostrar percentuais"
              description="Exibe o percentual de CPU no centro do menu."
              checked={config.preferences.showPercentages}
              onChange={(value) => patchPreferences({ showPercentages: value })}
            />
          </Card>
        </div>

        <div className="page-column">
          <Card
            title="Pré-visualização"
            description="Reage à geometria e à aparência enquanto você edita."
          >
            <MenuPreview config={config} />
            <div className="preview-caption">
              <span>{config.items.length} fatias</span>
              <span>escala {config.layout.menuScale.toFixed(2)}x</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
