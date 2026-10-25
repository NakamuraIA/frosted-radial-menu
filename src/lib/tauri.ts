/** Detecta se a página está rodando dentro do Tauri (e não no preview headless). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
