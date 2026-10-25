import { defineConfig } from 'vitest/config';

// Config separada do Vite do app: testes de componente usam jsdom por arquivo
// (`// @vitest-environment jsdom`), e os matchers do jest-dom entram via setup.
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
    environment: 'node',
  },
});
