import { useMemo, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Aperture,
  CircleDot,
  Info,
  Keyboard,
  ListTree,
  Palette,
  Plug,
  Save,
  Settings2,
  Undo2,
  X,
  Zap,
} from 'lucide-react';

import { Badge, Button, ConfirmDialog } from '../ui';
import '../ui/ui.css';
import './settings.css';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';
import { api } from '../../lib/api';
import { AboutPage } from './pages/AboutPage';
import { ActionsPage } from './pages/ActionsPage';
import { AppearancePage } from './pages/AppearancePage';
import { GeneralPage } from './pages/GeneralPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { RadialPage } from './pages/RadialPage';
import { ShortcutsPage } from './pages/ShortcutsPage';
import { SubmenusPage } from './pages/SubmenusPage';

type PageId =
  | 'geral'
  | 'aparencia'
  | 'menu'
  | 'acoes'
  | 'submenus'
  | 'atalhos'
  | 'integracoes'
  | 'sobre';

const NAV_ITEMS: { id: PageId; label: string; icon: typeof Settings2 }[] = [
  { id: 'geral', label: 'Geral', icon: Settings2 },
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'menu', label: 'Menu radial', icon: CircleDot },
  { id: 'acoes', label: 'Ações', icon: Zap },
  { id: 'submenus', label: 'Submenus', icon: ListTree },
  { id: 'atalhos', label: 'Atalhos', icon: Keyboard },
  { id: 'integracoes', label: 'Integrações', icon: Plug },
  { id: 'sobre', label: 'Sobre', icon: Info },
];

/** Permite abrir direto numa página via `?window=settings&page=menu` (QA/preview). */
function getInitialPage(): PageId {
  const requested = new URLSearchParams(window.location.search).get('page');
  return NAV_ITEMS.some((item) => item.id === requested) ? (requested as PageId) : 'geral';
}

/** Janela de configurações: barra superior, navegação lateral e páginas. */
export function SettingsShell() {
  const {
    draft,
    dirty,
    state,
    saving,
    warnings,
    saveError,
    autostartActive,
    update,
    revert,
    save,
  } = useSettingsDraft();

  const [page, setPage] = useState<PageId>(getInitialPage);
  const [confirmRevert, setConfirmRevert] = useState(false);

  const version = useMemo(() => (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.0.0'), []);

  /** Fecha apenas esta janela: o launcher continua vivo na bandeja. */
  const closeWindow = () => {
    void api
      .hideSettingsWindow()
      .catch(() => getCurrentWindow().hide())
      .catch(() => {});
  };

  const statusBadge = (() => {
    if (state === 'loading') return <Badge tone="neutral">Carregando configuração…</Badge>;
    if (saveError) return <Badge tone="danger" dot>Erro ao salvar</Badge>;
    if (saving) return <Badge tone="accent" dot>Salvando…</Badge>;
    if (dirty) return <Badge tone="warning" dot>Alterações pendentes</Badge>;
    if (warnings.length) return <Badge tone="warning" dot>Salvo com avisos</Badge>;
    return <Badge tone="success" dot>Alterações salvas</Badge>;
  })();

  const pageContent = (() => {
    switch (page) {
      case 'geral':
        return <GeneralPage config={draft} update={update} autostartActive={autostartActive} />;
      case 'aparencia':
        return <AppearancePage config={draft} update={update} />;
      case 'menu':
        return <RadialPage config={draft} update={update} />;
      case 'acoes':
        return <ActionsPage config={draft} update={update} />;
      case 'submenus':
        return <SubmenusPage config={draft} update={update} />;
      case 'atalhos':
        return <ShortcutsPage config={draft} update={update} />;
      case 'integracoes':
        return <IntegrationsPage config={draft} autostartActive={autostartActive} />;
      case 'sobre':
        return <AboutPage version={version} />;
      default:
        return null;
    }
  })();

  return (
    <div className="settings-root">
      <header className="settings-topbar">
        <div className="settings-brand">
          <span className="settings-brand__mark" aria-hidden="true">
            <Aperture size={18} />
          </span>
          <span className="settings-brand__text">
            <strong>Frosted Radial Menu</strong>
            <small>Configurações</small>
          </span>
        </div>

        <div className="settings-topbar__actions">
          {statusBadge}
          <Button
            variant="ghost"
            icon={<Undo2 size={15} />}
            onClick={() => setConfirmRevert(true)}
            disabled={!dirty || saving}
          >
            Restaurar
          </Button>
          <Button
            variant="primary"
            icon={<Save size={15} />}
            onClick={() => void save()}
            loading={saving}
          >
            Salvar
          </Button>
          <Button
            variant="ghost"
            icon={<X size={16} />}
            onClick={closeWindow}
            aria-label="Fechar janela de configurações"
            title="Fechar janela"
            className="settings-close"
          />
        </div>
      </header>

      {saveError ? (
        <div className="settings-banner is-danger" role="alert">
          <strong>Não foi possível salvar.</strong>
          <span>{saveError}</span>
        </div>
      ) : null}

      {warnings.length ? (
        <div className="settings-banner is-warning" role="status">
          <strong>Salvo, mas com avisos:</strong>
          <span>{warnings.join(' · ')}</span>
        </div>
      ) : null}

      {state === 'preview' ? (
        <div className="settings-banner is-neutral" role="status">
          <strong>Modo preview:</strong>
          <span>o app não respondeu; as alterações não serão persistidas.</span>
        </div>
      ) : null}

      <div className="settings-main">
        <nav className="settings-nav" aria-label="Navegação de configurações">
          <span className="settings-nav__group">Navegação</span>
          <ul>
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  className={`settings-nav__item ${page === id ? 'is-active' : ''}`}
                  aria-current={page === id ? 'page' : undefined}
                  onClick={() => setPage(id)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {dirty && id === 'acoes' ? <i className="settings-nav__pip" aria-hidden="true" /> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="settings-nav__footer">Radial Menu v{version}</div>
        </nav>

        <main className="settings-content">{pageContent}</main>
      </div>

      <ConfirmDialog
        open={confirmRevert}
        title="Descartar alterações?"
        description="As modificações não salvas voltam ao último estado gravado. Essa ação não altera o arquivo de configuração."
        confirmLabel="Descartar"
        tone="danger"
        onConfirm={() => {
          revert();
          setConfirmRevert(false);
        }}
        onCancel={() => setConfirmRevert(false)}
      />
    </div>
  );
}
