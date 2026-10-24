import { Palette } from 'lucide-react';

import { RangeField } from './RangeField';
import { FONT_OPTIONS, type AppPreferences, type LayoutConfig, type ThemeConfig } from '../../lib/config';

interface AppearancePanelProps {
  theme: ThemeConfig;
  layout: LayoutConfig;
  preferences: AppPreferences;
  /** Estado real no Windows, lido do registro (pode divergir do JSON salvo). */
  autostartActive: boolean | null;
  onThemeChange: (patch: Partial<ThemeConfig>) => void;
  onLayoutChange: (patch: Partial<LayoutConfig>) => void;
  onPreferencesChange: (patch: Partial<AppPreferences>) => void;
}

/** Coluna direita: cores, tipografia, geometria do menu e preferências. */
export function AppearancePanel({
  theme,
  layout,
  preferences,
  autostartActive,
  onThemeChange,
  onLayoutChange,
  onPreferencesChange,
}: AppearancePanelProps) {
  return (
    <aside className="theme-panel">
      <div className="panel-title">
        <Palette size={17} />
        Visual
      </div>

      <div className="theme-section">
        <h3>Aparencia</h3>
        <label>
          Neon principal
          <input
            type="color"
            value={theme.accent}
            onChange={(event) => onThemeChange({ accent: event.target.value })}
          />
        </label>

        <label>
          Neon secundario
          <input
            type="color"
            value={theme.accentAlt}
            onChange={(event) => onThemeChange({ accentAlt: event.target.value })}
          />
        </label>

        <label>
          Perigo
          <input
            type="color"
            value={theme.danger}
            onChange={(event) => onThemeChange({ danger: event.target.value })}
          />
        </label>

        <label>
          Fonte
          <select
            value={layout.fontFamily}
            onChange={(event) => onLayoutChange({ fontFamily: event.target.value })}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>

        <RangeField
          label="Vidro"
          value={theme.glassOpacity}
          min={0.42}
          max={0.9}
          step={0.02}
          onChange={(value) => onThemeChange({ glassOpacity: value })}
        />
        <RangeField
          label="Animacao"
          value={theme.animationSpeed}
          min={0.65}
          max={1.45}
          step={0.05}
          unit="x"
          onChange={(value) => onThemeChange({ animationSpeed: value })}
        />
        <RangeField
          label="Glow"
          value={layout.glowIntensity}
          min={0.35}
          max={1.85}
          step={0.05}
          unit="x"
          onChange={(value) => onLayoutChange({ glowIntensity: value })}
        />
        <RangeField
          label="Escala geral"
          value={layout.menuScale}
          min={0.45}
          max={1.3}
          step={0.01}
          unit="x"
          onChange={(value) => onLayoutChange({ menuScale: value })}
        />
      </div>

      <div className="theme-section">
        <h3>Menu principal</h3>
        <RangeField
          label="Raio interno"
          value={layout.mainInnerRadius}
          min={88}
          max={220}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ mainInnerRadius: value })}
        />
        <RangeField
          label="Raio externo"
          value={layout.mainOuterRadius}
          min={170}
          max={390}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ mainOuterRadius: value })}
        />
        <RangeField
          label="Espaco entre fatias"
          value={layout.mainGap}
          min={0}
          max={10}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ mainGap: value })}
        />
        <RangeField
          label="Borda"
          value={layout.borderWidth}
          min={0.8}
          max={3.4}
          step={0.1}
          unit="px"
          onChange={(value) => onLayoutChange({ borderWidth: value })}
        />
        <RangeField
          label="Icone"
          value={layout.mainIconSize}
          min={24}
          max={72}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ mainIconSize: value })}
        />
        <RangeField
          label="Texto"
          value={layout.mainLabelSize}
          min={9}
          max={22}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ mainLabelSize: value })}
        />
      </div>

      <div className="theme-section">
        <h3>Submenu</h3>
        <RangeField
          label="Distancia"
          value={layout.submenuInnerRadius}
          min={210}
          max={450}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ submenuInnerRadius: value })}
        />
        <RangeField
          label="Largura"
          value={layout.submenuOuterRadius}
          min={260}
          max={510}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ submenuOuterRadius: value })}
        />
        <RangeField
          label="Espaco"
          value={layout.submenuGap}
          min={0}
          max={8}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ submenuGap: value })}
        />
        <RangeField
          label="Abertura"
          value={layout.submenuSpread}
          min={20}
          max={72}
          step={1}
          unit="deg"
          onChange={(value) => onLayoutChange({ submenuSpread: value })}
        />
        <RangeField
          label="Icone filho"
          value={layout.submenuIconSize}
          min={24}
          max={76}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ submenuIconSize: value })}
        />
        <RangeField
          label="Texto filho"
          value={layout.submenuLabelSize}
          min={8}
          max={22}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ submenuLabelSize: value })}
        />
      </div>

      <div className="theme-section">
        <h3>Centro e sistema</h3>
        <RangeField
          label="Centro"
          value={layout.centerSize}
          min={148}
          max={320}
          step={1}
          unit="px"
          onChange={(value) => onLayoutChange({ centerSize: value })}
        />

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={preferences.hideAfterAction}
            onChange={(event) => onPreferencesChange({ hideAfterAction: event.target.checked })}
          />
          Fechar apos executar
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={preferences.showPercentages}
            onChange={(event) => onPreferencesChange({ showPercentages: event.target.checked })}
          />
          Mostrar percentuais
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={preferences.runCommandsAsAdmin}
            onChange={(event) =>
              onPreferencesChange({ runCommandsAsAdmin: event.target.checked })
            }
          />
          Rodar comandos como administrador
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={preferences.autostartEnabled}
            onChange={(event) =>
              onPreferencesChange({ autostartEnabled: event.target.checked })
            }
          />
          Iniciar com Windows
        </label>

        {autostartActive !== null ? (
          <small className={`field-hint ${autostartActive ? 'is-on' : ''}`}>
            {autostartActive
              ? 'Registrado no Windows: ativo'
              : 'Registrado no Windows: inativo'}
          </small>
        ) : null}

        <label>
          Atalho
          <input
            value={preferences.hotkey}
            onChange={(event) => onPreferencesChange({ hotkey: event.target.value })}
          />
        </label>
      </div>
    </aside>
  );
}
