# AGENTS.md — Frosted Radial Menu

Launcher radial para Windows: React + TypeScript no frontend, Rust/Tauri 2 no backend.
Este arquivo existe para que qualquer sessão de agente comece sabendo as regras que
custaram tempo para descobrir. Leia antes de mexer no código.

## Stack e versões travadas

| Peça | Versão | Por quê |
|---|---|---|
| Tauri / tauri-build | 2.12.5 / 2.7.4 | protocol-asset + tray-icon habilitados |
| React / Vite | 19.3.1 / 8.3.5 | — |
| TypeScript | **6.0.3** | `typescript-eslint` declara peer `<6.1.0`; não subir para 7 |
| sysinfo | **0.38.4** | 0.39 exige rustc 1.95; o toolchain da máquina é 1.94.1 |
| winreg | 0.55 | só Windows: auto-start no registro. `windows-sys` saiu (cursor via Tauri) |

Versão do app é **1.4.0** em `package.json`, `src-tauri/Cargo.toml` e
`src-tauri/tauri.conf.json` — mantenha os três alinhados.

## Mapa de módulos

**Rust (`src-tauri/src/`)**

- `lib.rs`: **só** a montagem do `Builder` (estado, plugin, handler, setup). Sem lógica.
- `commands/`: superfície `invoke` (config, menu, windows, system, autostart). Valida e delega.
- `config/`: `model` (structs serde camelCase), `defaults` (config padrão), `store` (JSON + migração).
- `menu/`: `actions` (dispatch por `actionType`), `shell` (PowerShell/CMD, expansão de `%VAR%`).
- `platform/`: `hotkey` (atalho global), `autostart` (registro do Windows).
- `system/`: `stats` (CPU/RAM).
- `ui/`: `windows`, `placement` (clamp no monitor), `tray`.
- `state.rs`: `AppState` (System + shortcut atual).

**Frontend (`src/`)**

- `App.tsx`: roteia a janela pelo label (`?window=settings&page=<id>` serve para QA/preview).
- `components/radial/`: `RadialMenu` (container) + `RadialCanvas`, `MainSlice`, `SubmenuSlices`,
  `CenterDashboard`, `SliceContent`, `geometry.ts` e `themeVars.ts`.
- `components/settings/`: `SettingsShell` (topbar + navegação + rascunho) e `pages/` com
  `GeneralPage`, `AppearancePage`, `RadialPage`, `ActionsPage`, `SubmenusPage`, `ShortcutsPage`,
  `IntegrationsPage` e `AboutPage`; `MenuPreview` e `itemFactory`.
- `components/ui/`: primitivas reutilizáveis (`Button`, `Card`, `Field`, `Slider`, `Switch`,
  `Badge`, `ConfirmDialog`, `PageHeader`) + `ui.css`.
- `components/common/`: `CustomIcon` e `renderIcon`.
- `hooks/`: `useRadialConfig`, `useSystemStats`, `useClock`, `useMenuVisibility`, `useSettingsDraft`.
- `lib/config/`: tipos, opções, defaults, normalização e operações de árvore (barrel `index.ts`).
- `lib/api.ts`: **único** lugar que chama `invoke`.
- `lib/icons/`, `lib/format.ts`, `lib/id.ts`; `styles/tokens.css` (design tokens) + `index.css`.

## Comandos

```bash
npm run lint                  # eslint (inclui regras do React Compiler)
npm run test                  # vitest: lógica pura + componentes (RTL/jsdom)
npm run build                 # tsc -b && vite build
cargo check --manifest-path src-tauri/Cargo.toml --all-targets
cargo test  --manifest-path src-tauri/Cargo.toml
npm run tauri build           # gera exe + instalador NSIS
npm run tauri dev             # Vite em http://127.0.0.1:5180

# Com o app aberto e WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222:
npm run qa:smoke              # smoke E2E via CDP (10 checagens, scripts/qa/smoke.mjs)
```

Antes de commitar: `npm run lint` + `npm run test` + `cargo test`. Commits pequenos e por assunto.

**Linux**: o backend compila e testa no CI (job `linux`, ubuntu-latest + WebKitGTK). Para gerar
pacotes: `npm run tauri build -- --bundles deb,appimage`. Ainda é Windows-first: hotkey/bandeja/
transparência dependem do compositor, elevação é ignorada e auto-start/atalho retornam erro.
Para QA sem hotkey: `cargo run -- --show` (ou `RADIAL_SHOW=1` no binário).

## Regras

1. **Comando Tauri novo** → criar em `commands/<area>.rs` e registrar no `generate_handler!`
   com o **caminho completo** (`commands::<area>::<fn>`): o macro procura o `__cmd__` no módulo
   onde o comando foi declarado, então re-export não funciona.
2. **Nada de lógica no `lib.rs`** — ele é cola, não implementação.
3. `save_config` devolve `Result<Vec<String>, String>`: erros de efeito colateral (auto-start,
   atalho) viram **avisos** exibidos no painel. Não volte a silenciar com `let _ =`.
4. **O visual é intencional**: use `styles/tokens.css` e as primitivas de `components/ui`.
   Não invente paleta nova, gradiente forte ou glow permanente sem pedido explícito — a
   direção v2 é carvão/grafite com acentos pontuais.
5. Ícone dinâmico → use `renderIcon()` (`createElement`). `const Icon = getIconComponent(...)`
   dentro do render quebra a regra `react-hooks/static-components`.
6. Fetch inicial em `useEffect` → adie com `setTimeout(…, 0)`, senão a regra
   `react-hooks/set-state-in-effect` falha o lint.
7. Regra de negócio nova merece teste: `cargo test` para Rust, `npm test` para árvore/normalização.
8. **UI não usa cor/espaço literal**: tudo sai de `styles/tokens.css` (`--bg-surface`, `--accent`,
   `--space-*`, `--radius-*`). Páginas do painel recebem `PageProps` e editam o mesmo rascunho —
   trocar de página não pode perder alteração.
9. **Segurança de IPC**: `run_action_preview` só roda na janela `settings` e usa o
   `runCommandsAsAdmin` da config salva — o front nunca decide elevação. Preset
   importado não pode ligar admin. CSP fica definida em `tauri.conf.json`.
10. **Integrações nunca mentem**: recurso sem backend aparece como "Indisponível" (ver
   `IntegrationsPage`), nunca com estado simulado.
11. Comando que **já abre as próprias janelas** (um `.bat` com `start`) deve usar
    `windowMode: "hide"`; caso contrário o usuário vê um terminal extra vazio. No modo
    visível, o shell é iniciado direto com `CREATE_NEW_CONSOLE` — não volte a usar um
    PowerShell intermediário com `Start-Process` (gera duas janelas).
12. Limites do radial ficam em `src/lib/config/limits.ts` (`MAX_MAIN_SLICES = 10`,
    `MAX_SUBMENU_ITEMS = 8`). Menu, painel e preview importam de lá — não duplique o número.

## Armadilhas conhecidas

- **Auto-start**: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, valor `FrostedRadialMenu`.
  Nunca `schtasks /sc onlogon` — exige admin e falha com "Acesso negado". Em build de dev
  (`cfg(dev)`) ligar o auto-start devolve erro explicativo e não registra nada.
- **`%VAR%` é case-insensitive** (Windows): `%windir%`, `%WINDIR%` e `%WinDir%` precisam expandir.
- **Config real**: `%LOCALAPPDATA%\com.nakamuraia.frostedradialmenu\config.json`
  (migra automaticamente de `%APPDATA%`). Não confunda com presets do repo.
- **Janelas nascem ocultas** (`visible: false`): fechar = esconder; o app vive na bandeja.
  O menu abre centrado no cursor, com clamp por monitor, em um canvas de 1080×1080.
- O shell escala o menu por `--menu-scale`; coordenadas de clique não são as do SVG.

## Verificação sem atrapalhar o usuário

- **Preview headless** (não abre janela):
  `msedge --headless=new --screenshot=out.png "http://127.0.0.1:5180/?window=settings&page=menu"`
  (precisa de `npm run dev` no ar). `?window=main` renderiza o menu com config de fallback.
  Páginas válidas em `page=`: `geral`, `aparencia`, `menu`, `acoes`, `submenus`, `atalhos`,
  `integracoes`, `sobre`.
- **IPC real sem clicar**: suba o exe de release com
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`, ache os targets em
  `http://127.0.0.1:9222/json/list` e diferencie pela DOM (`.settings-root`), porque as duas
  páginas têm o mesmo `<title>`. Dentro da página use `window.__TAURI_INTERNALS__.invoke`.
  `Page.captureScreenshot` fotografa a janela mesmo oculta.
- **Smoke versionado**: `npm run qa:smoke` usa `scripts/qa/smoke.mjs` e espera o app com
  `--remote-debugging-port=9222` (WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS). Ele só lê a UI e chama
  comandos inofensivos; sai com código 1 se algo falhar.
- **Cuidado com clique sintético**: o menu abre sob o cursor; `mouse_event` cego acerta a fatia
  errada e pode abrir apps/terminais de verdade. Prefira hover + screenshot para calibrar.
