/** Detecta se a página está rodando dentro do Tauri (e não no preview headless). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Recursos de registro/atalho/UAC só existem no Windows. */
export function isWindows(): boolean {
  if (typeof navigator === 'undefined') return true;
  return /windows/i.test(navigator.userAgent);
}
