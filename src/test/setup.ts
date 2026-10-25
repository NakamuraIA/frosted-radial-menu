import '@testing-library/jest-dom/vitest';

// Os testes do painel assumem Windows (switches de auto-start/atalho/UAC só
// existem lá); o app de verdade decide pelo userAgent do sistema. Os testes de
// lógica rodam em ambiente node, onde `window` não existe.
if (typeof window !== 'undefined') {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    configurable: true,
  });
}
