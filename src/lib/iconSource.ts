import { convertFileSrc } from '@tauri-apps/api/core';

function isLocalWindowsPath(value: string) {
  return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('\\\\');
}

export function resolveCustomIconSrc(source?: string | null) {
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
