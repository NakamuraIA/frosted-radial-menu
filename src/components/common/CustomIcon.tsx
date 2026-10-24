import { useState, type ReactNode } from 'react';

interface CustomIconProps {
  className?: string;
  src: string;
  fallback: ReactNode;
}

/**
 * Renderiza o ícone customizado e cai no fallback do lucide se o arquivo não
 * existir ou não puder ser lido.
 */
export function CustomIcon({ className, src, fallback }: CustomIconProps) {
  const [failedSrc, setFailedSrc] = useState('');

  if (!src || failedSrc === src) {
    return <>{fallback}</>;
  }

  return <img className={className} src={src} alt="" onError={() => setFailedSrc(src)} />;
}
