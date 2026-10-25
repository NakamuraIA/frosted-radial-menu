import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { api } from '../lib/api';

const OPEN_ANIMATION_DELAY_MS = 60;
/** Precisa cobrir o fade de saída do `.radial-shell` (240ms no CSS). */
const HIDE_ANIMATION_DELAY_MS = 240;

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
  const hideTimer = useRef<number | null>(null);

  const cancelPendingHide = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const openTimer = window.setTimeout(() => setIsOpen(true), OPEN_ANIMATION_DELAY_MS);

    const unlisteners = [
      listen('menu-opened', () => {
        // Reabrir logo depois de fechar cancela o hide agendado (corrida relatada na auditoria).
        cancelPendingHide();
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
      cancelPendingHide();
      unlisteners.forEach((unlisten) => {
        void unlisten.then((dispose) => dispose());
      });
    };
  }, [onConfigUpdated, cancelPendingHide]);

  const hide = useCallback(async () => {
    setIsOpen(false);
    cancelPendingHide();

    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      void api
        .hideMainWindow()
        .catch(() => getCurrentWindow().hide())
        .finally(() => {
          setActiveParentId(null);
        });
    }, HIDE_ANIMATION_DELAY_MS);
  }, [cancelPendingHide]);

  return { isOpen, activeParentId, setActiveParentId, hide };
}
