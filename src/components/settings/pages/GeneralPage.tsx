import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import {
  Download,
  FileJson,
  MonitorDown,
  Power,
  RotateCcw,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Card, ConfirmDialog, PageHeader, Switch } from '../../ui';
import { api } from '../../../lib/api';
import { FALLBACK_CONFIG, type RadialConfig } from '../../../lib/config';
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
  const [shortcutActive, setShortcutActive] = useState<boolean | null>(null);
  const [shortcutBusy, setShortcutBusy] = useState(false);
  const [shortcutMessage, setShortcutMessage] = useState<PresetMessage | null>(null);

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

  const errorText = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

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
      if (dirty) {
        setPendingPreset(imported);
        return;
      }
      applyPreset(imported);
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
        title="Atalho na Área de Trabalho"
        description="Um atalho .lnk apontando para este executável."
        icon={<MonitorDown size={16} />}
      >
        <Switch
          label="Atalho no Desktop"
          description="Cria ou remove na hora, sem depender do botão Salvar e sem pedir administrador."
          checked={shortcutActive ?? false}
          disabled={shortcutActive === null || shortcutBusy}
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
      />
    </div>
  );
}
