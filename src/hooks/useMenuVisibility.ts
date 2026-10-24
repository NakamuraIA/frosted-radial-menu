import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { api } from '../lib/api';

const OPEN_ANIMATION_DELAY_MS = 60;
const HIDE_ANIMATION_DELAY_MS = 140;

function getPreviewActiveParentId() {
  return new URLSearchParams(window.location.search).get('activeParent');
}

/**
 * Ciclo de vida da janela do menu: aberto/fechado, submenu ativo e sincronização
 * com os eventos emitidos pelo Rust (`menu-opened`, `menu-closed`).
 */
export function useMenuVisibility(onConfigUpdated: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(
    () => getPreviewActiveParentId(),
  );

  useEffect(() => {
    const openTimer = window.setTimeout(() => setIsOpen(true), OPEN_ANIMATION_DELAY_MS);

    const unlisteners = [
      listen('menu-opened', () => {
        setIsOpen(true);
      }),
      listen('menu-closed', () => {
        setIsOpen(false);
        setActiveParentId(null);
      }),
      listen('config-updated', () => {
        onConfigUpdated();
      }),
    ];

    return () => {
      window.clearTimeout(openTimer);
      unlisteners.forEach((unlisten) => {
        void unlisten.then((dispose) => dispose());
      });
    };
  }, [onConfigUpdated]);

  const hide = useCallback(async () => {
    setIsOpen(false);
    window.setTimeout(() => {
      void api
        .hideMainWindow()
        .catch(() => getCurrentWindow().hide())
        .finally(() => {
          setActiveParentId(null);
        });
    }, HIDE_ANIMATION_DELAY_MS);
  }, []);

  return { isOpen, activeParentId, setActiveParentId, hide };
}
