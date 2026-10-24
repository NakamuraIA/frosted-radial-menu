import { convertFileSrc } from '@tauri-apps/api/core';

function isLocalWindowsPath(value: string) {
  return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('\\\\');
}

/**
 * Converte o caminho configurado em `src` utilizável pelo `<img>`:
 * URLs passam direto, caminhos locais viram `asset://` do Tauri.
 */
export function resolveCustomIconSrc(source?: string | null): string {
  const value = source?.trim();
  if (!value) return '';

  if (/^(https?:|data:|blob:|asset:|file:)/i.test(value)) {
    return value;
  }

  if (isLocalWindowsPath(value)) {
    return convertFileSrc(value);
  }

  return value;
}
