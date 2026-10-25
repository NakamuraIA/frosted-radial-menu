#!/usr/bin/env node
/**
 * Smoke E2E do app instalado via CDP (Windows).
 *
 * Uso:
 *   1) Feche outras instâncias do app.
 *   2) Inicie o app com debugging remoto:
 *        set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222
 *        start "" "%LOCALAPPDATA%\Frosted Radial Menu\Frosted Radial Menu.exe"
 *   3) npm run qa:smoke
 *
 * O script só lê a interface e chama comandos inofensivos (status + ação "none").
 * Sai com código 1 se alguma checagem falhar.
 */

const BASE = process.env.CDP_BASE ?? 'http://127.0.0.1:9222';
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function evaluate(ws, expression) {
  const result = await new Promise((resolve, reject) => {
    const socket = new WebSocket(ws);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('timeout no Runtime.evaluate'));
    }, 20000);

    socket.onopen = () =>
      socket.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true },
        }),
      );

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      clearTimeout(timer);
      socket.close();
      if (message.result?.exceptionDetails) {
        reject(new Error(JSON.stringify(message.result.exceptionDetails)));
        return;
      }
      resolve(message.result?.result?.value);
    };

    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error('websocket do CDP falhou'));
    };
  });

  return result;
}

async function findSettingsTarget(timeoutMs = 40000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const list = await (await fetch(`${BASE}/json/list`)).json();
      for (const target of list.filter((entry) => entry.type === 'page')) {
        const kind = await evaluate(
          target.webSocketDebuggerUrl,
          `document.querySelector('.settings-root') ? 'settings' : 'main'`,
        ).catch(() => null);
        if (kind === 'settings') return target;
      }
    } catch {
      // WebView2 ainda subindo
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`janela de configurações não encontrada em ${BASE}`);
}

const target = await findSettingsTarget();
const ws = target.webSocketDebuggerUrl;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await wait(600);

const shell = await evaluate(
  ws,
  `JSON.stringify({
    pages: document.querySelectorAll('.settings-nav__item').length,
    status: document.querySelector('.ui-badge')?.textContent ?? null,
    crash: Boolean(document.querySelector('.app-crash'))
  })`,
);

check('janela de configurações montou', shell !== null);
const state = JSON.parse(shell);
check('8 páginas na navegação', state.pages === 8, `encontradas: ${state.pages}`);
check('badge de status presente', Boolean(state.status), state.status ?? 'ausente');
check('sem fallback de erro na tela', state.crash === false);

await evaluate(
  ws,
  `[...document.querySelectorAll('.settings-nav__item')].find((b) => b.textContent.includes('Ações')).click()`,
);
await wait(500);

const actions = JSON.parse(
  await evaluate(
    ws,
    `JSON.stringify({
      heading: document.querySelector('.ui-page-head h1')?.textContent ?? null,
      testButton: [...document.querySelectorAll('.ui-btn')].some((b) => b.textContent.includes('Testar ação')),
      pickers: document.querySelectorAll('.picker-button').length
    })`,
  ),
);

check('página Ações abriu', actions.heading === 'Ações', actions.heading ?? 'sem heading');
check('botão Testar ação presente', actions.testButton === true);
check('seletores nativos presentes', actions.pickers >= 1, `botões: ${actions.pickers}`);

const ipc = JSON.parse(
  await evaluate(
    ws,
    `(async () => {
      const invoke = window.__TAURI_INTERNALS__.invoke;
      const noneItem = { id: 'smoke', label: 'Smoke', icon: 'file', color: '#fff', actionType: 'none' };
      await invoke('run_action_preview', { item: noneItem, runAsAdmin: false });
      const shortcut = await invoke('get_desktop_shortcut_status');
      const autostart = await invoke('get_autostart_status');
      return JSON.stringify({ shortcut, autostart });
    })()`,
  ),
);

check('comando run_action_preview respondeu', ipc !== null);
check(
  'status do atalho é booleano',
  typeof ipc?.shortcut === 'boolean',
  String(ipc?.shortcut),
);
check(
  'status do auto-start é booleano',
  typeof ipc?.autostart === 'boolean',
  String(ipc?.autostart),
);

const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} checagens passaram`);
if (failed.length) {
  console.error('Falhas:', failed.map((entry) => entry.name).join(', '));
  process.exit(1);
}
