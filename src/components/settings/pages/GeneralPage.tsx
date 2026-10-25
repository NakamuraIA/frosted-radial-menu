import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import {
  Download,
  FileJson,
  MonitorDown,
  Power,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Card, ConfirmDialog, PageHeader, Switch } from '../../ui';
import { api } from '../../../lib/api';
import { isWindows } from '../../../lib/tauri';
import {
  FALLBACK_CONFIG,
  MAX_MAIN_SLICES,
  MAX_SUBMENU_ITEMS,
  flattenMenuItems,
  type DetectedApp,
  type MenuItemConfig,
  type RadialConfig,
} from '../../../lib/config';
import type { PageProps } from './types';

interface GeneralPageProps extends PageProps {
  autostartActive: boolean | null;
  dirty: boolean;
}

interface PresetMessage {
  tone: 'success' | 'danger';
  text: string;
}

/** Página Geral: inicialização, execução, presets e manutenção. */
export function GeneralPage({ config, update, autostartActive, dirty }: GeneralPageProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<RadialConfig | null>(null);
  const [presetMessage, setPresetMessage] = useState<PresetMessage | null>(null);
  const windows = isWindows();
  const [shortcutActive, setShortcutActive] = useState<boolean | null>(null);
  const [shortcutBusy, setShortcutBusy] = useState(false);
  const [shortcutMessage, setShortcutMessage] = useState<PresetMessage | null>(null);
  const [detectedApps, setDetectedApps] = useState<DetectedApp[] | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectedMessage, setDetectedMessage] = useState<PresetMessage | null>(null);

  useEffect(() => {
    let mounted = true;

    api
      .getDesktopShortcutStatus()
      .then((active) => {
        if (mounted) setShortcutActive(active);
      })
      .catch(() => {
        if (mounted) setShortcutActive(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleDesktopShortcut = async (next: boolean) => {
    setShortcutBusy(true);
    setShortcutMessage(null);

    try {
      await api.setDesktopShortcut(next);
      const active = await api.getDesktopShortcutStatus().catch(() => next);
      setShortcutActive(active);
      setShortcutMessage({
        tone: 'success',
        text: next ? 'Atalho criado na Área de Trabalho.' : 'Atalho removido.',
      });
    } catch (error) {
      setShortcutMessage({
        tone: 'danger',
        text: `Falha no atalho: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setShortcutBusy(false);
    }
  };

  const patchPreference = (patch: Partial<(typeof config)['preferences']>) => {
    update((current) => ({
      ...current,
      preferences: { ...current.preferences, ...patch },
    }));
  };

  const applyPreset = (preset: RadialConfig) => {
    update(() => preset);
    setPendingPreset(null);
    setPresetMessage({
      tone: 'success',
      text: 'Preset importado. Revise as páginas e clique em Salvar para aplicar.',
    });
  };

  const presetCommands = (preset: RadialConfig | null) =>
  preset
    ? flattenMenuItems(preset.items)
        .map(({ item }) => item)
        .filter((item) => item.actionType === 'runCommand' && item.value?.trim())
        .map((item) => ({ label: item.label, value: item.value?.trim() ?? '' }))
    : [];
const errorText = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

  const detectApps = async () => {
    setDetecting(true);
    setDetectedMessage(null);

    try {
      const apps = await api.detectInstalledApps();
      setDetectedApps(apps);
      setDetectedMessage(
        apps.length
          ? { tone: 'success', text: `${apps.length} atalhos encontrados no Menu Iniciar.` }
          : { tone: 'danger', text: 'Nenhum atalho de aplicativo encontrado.' },
      );
    } catch (error) {
      setDetectedMessage({
        tone: 'danger',
        text: `Falha ao detectar: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setDetecting(false);
    }
  };

  const addDetectedSubmenu = () => {
    if (!detectedApps?.length) return;

    const usedPaths = new Set(
      flattenMenuItems(config.items)
        .map(({ item }) => item.value)
        .filter((value): value is string => Boolean(value)),
    );
    const fresh = detectedApps.filter((app) => !usedPaths.has(app.path));

    if (!fresh.length) {
      setDetectedMessage({ tone: 'danger', text: 'Todos os apps encontrados já estão no menu.' });
      return;
    }

    const hasSlot =
      config.items.some((item) => item.id === 'apps-pc') || config.items.length < MAX_MAIN_SLICES;
    if (!hasSlot) {
      setDetectedMessage({
        tone: 'danger',
        text: `O menu já usa as ${MAX_MAIN_SLICES} fatias. Remova um item para abrir espaço.`,
      });
      return;
    }

    const palette = ['#43c7d9', '#a78bfa', '#e879d8', '#4ade9b', '#f2c46d', '#6ba8e8', '#ff5c7a', '#e8ecf4'];
    const slice = fresh.slice(0, MAX_SUBMENU_ITEMS);
    const children: MenuItemConfig[] = slice.map((app, index) => ({
      id: `app-pc-${index}-${app.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: app.label,
      icon: 'apps',
      color: palette[index % palette.length],
      actionType: 'openPath',
      value: app.path,
    }));

    update((current) => ({
      ...current,
      items: [
        ...current.items.filter((item) => item.id !== 'apps-pc'),
        {
          id: 'apps-pc',
          label: 'Apps do PC',
          icon: 'apps',
          color: '#6ba8e8',
          actionType: 'submenu',
          children,
        },
      ],
    }));

    setDetectedMessage({
      tone: 'success',
      text: `Submenu "Apps do PC" com ${slice.length} atalhos adicionado ao rascunho. Salve para aplicar.`,
    });
  };

  const handleExport = async () => {
    try {
      const path = await saveDialog({
        title: 'Exportar preset',
        defaultPath: 'frosted-radial-preset.json',
        filters: [{ name: 'Preset JSON', extensions: ['json'] }],
      });
      if (!path) return;

      await api.exportPreset(path, config);
      setPresetMessage({ tone: 'success', text: `Preset exportado: ${path}` });
    } catch (error) {
      setPresetMessage({ tone: 'danger', text: `Falha ao exportar: ${errorText(error)}` });
    }
  };

  const handleImport = async () => {
    try {
      const selected = await openDialog({
        title: 'Importar preset',
        multiple: false,
        directory: false,
        filters: [{ name: 'Preset JSON', extensions: ['json'] }],
      });
      if (!selected || Array.isArray(selected)) return;

      const imported = await api.importPreset(selected);
      // Preset de fora nunca liga execução como admin: quem decide é a config salva.
      const sanitized: RadialConfig = {
        ...imported,
        preferences: {
          ...imported.preferences,
          runCommandsAsAdmin: config.preferences.runCommandsAsAdmin,
        },
      };

      if (dirty) {
        setPendingPreset(sanitized);
        return;
      }
      applyPreset(sanitized);
    } catch (error) {
      setPresetMessage({ tone: 'danger', text: `Falha ao importar: ${errorText(error)}` });
    }
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
        description={
          windows
            ? 'Como o launcher entra em ação quando o Windows liga.'
            : 'Indisponível no Linux: o app não registra início automático aqui.'
        }
        icon={<Power size={16} />}
      >
        <Switch
          label={windows ? 'Iniciar com o Windows' : 'Iniciar com o sistema (só Windows)'}
          description={
            windows
              ? 'Registra o app na chave Run do usuário atual. Não exige permissões de administrador.'
              : 'Este recurso usa o registro do Windows e não existe no Linux.'
          }
          checked={config.preferences.autostartEnabled}
          disabled={!windows}
          onChange={(value) => patchPreference({ autostartEnabled: value })}
        />
        <p className="page-hint">
          {windows ? (
            <>
              Estado real no sistema:{' '}
              <strong>
                {autostartActive === null
                  ? 'indisponível'
                  : autostartActive
                    ? 'registrado'
                    : 'não registrado'}
              </strong>
              . A alteração é aplicada quando você salvar.
            </>
          ) : (
            'Sem equivalente no Linux — use o autostart do seu desktop, se precisar.'
          )}
        </p>
      </Card>

      <Card
        title="Atalho na Área de Trabalho"
        description={
          windows
            ? 'Um atalho .lnk apontando para este executável.'
            : 'No Linux, crie o atalho pelo seu menu de aplicativos (.desktop).'
        }
        icon={<MonitorDown size={16} />}
      >
        <Switch
          label={windows ? 'Atalho no Desktop' : 'Atalho no Desktop (só Windows)'}
          description={
            windows
              ? 'Cria ou remove na hora, sem depender do botão Salvar e sem pedir administrador.'
              : 'Atalhos .lnk são do Windows; este controle fica desligado no Linux.'
          }
          checked={shortcutActive ?? false}
          disabled={!windows || shortcutActive === null || shortcutBusy}
          onChange={(value) => void toggleDesktopShortcut(value)}
        />
        <p className="page-hint">
          Estado real:{' '}
          <strong>
            {shortcutActive === null
              ? 'indisponível'
              : shortcutActive
                ? 'atalho presente'
                : 'sem atalho'}
          </strong>
          .
        </p>
        {shortcutMessage ? (
          <p className={`preset-message is-${shortcutMessage.tone}`} role="status">
            {shortcutMessage.text}
          </p>
        ) : null}
      </Card>

      <Card
        title="Execução de comandos"
        description={
          windows
            ? 'Como os comandos de shell são disparados pelas fatias.'
            : 'No Linux os comandos rodam em bash, com os privilégios do usuário.'
        }
        icon={<ShieldAlert size={16} />}
      >
        {windows ? (
          <>
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
          </>
        ) : (
          <p className="page-hint">Elevação (UAC) é um recurso do Windows; aqui não se aplica.</p>
        )}
      </Card>

      <Card
        title="Backup e presets"
        description="Leve a configuração para outra máquina ou guarde uma cópia."
        icon={<FileJson size={16} />}
      >
        <p className="page-hint">
          O preset inclui ações, aparência e geometria. A importação valida o arquivo antes de
          aplicar e nunca aceita um preset vazio.
        </p>
        <div className="ui-inline">
          <Button icon={<Download size={15} />} onClick={() => void handleExport()}>
            Exportar preset
          </Button>
          <Button icon={<Upload size={15} />} onClick={() => void handleImport()}>
            Importar preset
          </Button>
        </div>
        {presetMessage ? (
          <p className={`preset-message is-${presetMessage.tone}`} role="status">
            {presetMessage.text}
          </p>
        ) : null}
      </Card>

      <Card
        title="Preset inicial"
        description="Descobre apps instalados a partir dos atalhos do Menu Iniciar."
        icon={<Sparkles size={16} />}
      >
        <p className="page-hint">
          Lê apenas arquivos <strong>.lnk</strong> locais do Menu Iniciar e ignora desinstaladores,
          ajuda e sites. Nada é enviado para fora da máquina.
        </p>
        <div className="ui-inline">
          <Button
            icon={<Search size={15} />}
            onClick={() => void detectApps()}
            loading={detecting}
          >
            Detectar apps
          </Button>
          <Button
            variant="secondary"
            onClick={addDetectedSubmenu}
            disabled={!detectedApps?.length}
          >
            Adicionar como submenu
          </Button>
        </div>
        {detectedApps?.length ? (
          <p className="page-hint">
            {detectedApps
              .slice(0, 6)
              .map((app) => app.label)
              .join(' · ')}
            {detectedApps.length > 6 ? ` · +${detectedApps.length - 6}` : ''}
          </p>
        ) : null}
        {detectedMessage ? (
          <p className={`preset-message is-${detectedMessage.tone}`} role="status">
            {detectedMessage.text}
          </p>
        ) : null}
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

      <ConfirmDialog
        open={Boolean(pendingPreset)}
        title="Substituir alterações não salvas?"
        description="O preset importado vai substituir o rascunho atual. Se preferir, cancele, salve o que está editando e importe de novo."
        confirmLabel="Substituir"
        tone="danger"
        onConfirm={() => {
          if (pendingPreset) applyPreset(pendingPreset);
        }}
        onCancel={() => setPendingPreset(null)}
      >
        {presetCommands(pendingPreset).length ? (
          <>
            <strong>Comandos que este preset vai rodar:</strong>
            <ul>
              {presetCommands(pendingPreset)
                .slice(0, 8)
                .map((command) => (
                  <li key={`${command.label}-${command.value}`}>
                    <strong>{command.label}</strong>: <code>{command.value}</code>
                  </li>
                ))}
            </ul>
            {presetCommands(pendingPreset).length > 8
              ? `+${presetCommands(pendingPreset).length - 8} comando(s).`
              : null}
          </>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
