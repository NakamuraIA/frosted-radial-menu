// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api', () => {
  const config = {
    version: 1,
    theme: {
      accent: '#43c7d9',
      accentAlt: '#a78bfa',
      danger: '#ff5c7a',
      glassOpacity: 0.78,
      animationSpeed: 1,
      compactMode: false,
    },
    layout: {
      menuScale: 0.75,
      mainInnerRadius: 150,
      mainOuterRadius: 286,
      mainGap: 4,
      mainIconSize: 34,
      mainLabelSize: 14,
      submenuInnerRadius: 308,
      submenuOuterRadius: 418,
      submenuGap: 3,
      submenuIconSize: 30,
      submenuLabelSize: 12,
      submenuSpread: 28,
      centerSize: 195,
      borderWidth: 1.4,
      glowIntensity: 0.55,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    },
    preferences: {
      hotkey: 'Alt+Space',
      autostartEnabled: false,
      hideAfterAction: true,
      showPercentages: true,
      runCommandsAsAdmin: false,
    },
    items: [
      {
        id: 'terminal',
        label: 'Terminal',
        icon: 'terminal',
        color: '#43c7d9',
        actionType: 'runCommand',
        value: 'wt',
        shell: 'cmd',
      },
    ],
  };

  return {
    api: {
      loadConfig: vi.fn(async () => config),
      saveConfig: vi.fn(async () => []),
      getAutostartStatus: vi.fn(async () => false),
      getDesktopShortcutStatus: vi.fn(async () => false),
      setDesktopShortcut: vi.fn(async () => undefined),
      detectInstalledApps: vi.fn(async () => []),
      exportPreset: vi.fn(async () => undefined),
      importPreset: vi.fn(async () => config),
      runActionPreview: vi.fn(async () => undefined),
      hideSettingsWindow: vi.fn(async () => undefined),
    },
  };
});

import { SettingsShell } from './SettingsShell';

afterEach(cleanup);

describe('SettingsShell', () => {
  it('carrega a configuração e mostra as 8 páginas', async () => {
    render(<SettingsShell />);

    await screen.findByText('Alterações salvas');

    const nav = screen.getByRole('navigation', { name: 'Navegação de configurações' });
    expect(within(nav).getAllByRole('button')).toHaveLength(8);
    expect(screen.getByRole('heading', { name: 'Geral' })).toBeInTheDocument();
  });

  it('marca alterações pendentes ao editar e preserva ao trocar de página', async () => {
    render(<SettingsShell />);
    await screen.findByText('Alterações salvas');

    fireEvent.click(screen.getAllByRole('switch')[0]);
    await screen.findByText('Alterações pendentes');

    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    await screen.findByRole('heading', { name: 'Ações' });
    expect(screen.getByText('Alterações pendentes')).toBeInTheDocument();
  });

  it('descarta o rascunho pelo diálogo de Restaurar', async () => {
    render(<SettingsShell />);
    await screen.findByText('Alterações salvas');

    fireEvent.click(screen.getAllByRole('switch')[0]);
    await screen.findByText('Alterações pendentes');

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Descartar alterações?');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(screen.getByText('Alterações salvas')).toBeInTheDocument());
  });

  it('navega para Sobre e mostra a versão do app', async () => {
    render(<SettingsShell />);
    await screen.findByText('Alterações salvas');

    fireEvent.click(screen.getByRole('button', { name: 'Sobre' }));
    expect(await screen.findByRole('heading', { name: 'Sobre' })).toBeInTheDocument();
    expect(screen.getByText(/Frosted Radial Menu v/)).toBeInTheDocument();
  });
});
