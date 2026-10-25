# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [1.4.0] — não lançado

### Adicionado

- **Detecção de apps instalados**: lê atalhos `.lnk` dos dois Menus Iniciar (usuário e
  máquina), ignora desinstaladores/ajuda/sites e monta um submenu **Apps do PC** (até 8)
  no rascunho, sem duplicar apps que já estão no menu. Nada sai da máquina.
- Módulo `platform/apps` com 6 testes (filtro, rótulos, varredura de árvore e limite) —
  51 testes Rust no total.

## [1.3.0] — 2026-10-24

### Adicionado

- **Atalho na Área de Trabalho pelo painel**: cria e remove o `.lnk` apontando para o
  executável atual, com estado real exibido e sem pedir administrador.
- Módulo `platform/desktop_shortcut` com 4 testes (nome do arquivo, diretório absoluto,
  sufixo do caminho e remoção segura quando o atalho não existe) — 45 testes Rust no total.

## [1.2.0] — 2026-10-24

### Adicionado

- **Testar ação** no editor: executa o item do rascunho (mesmo não salvo) e mostra
  sucesso/erro inline. Submenus e itens sem ação ficam desabilitados.
- **Seletor nativo** de arquivo/pasta nos campos de caminho, comando e pasta de trabalho.
- Aviso na página Ações quando existem itens além do limite de fatias do radial.
- Limites compartilhados em `src/lib/config/limits.ts` (10 fatias, 8 filhos).
- **Error boundary** nas duas janelas: falha de render mostra erro + botão de
  recarregar em vez de deixar a janela em branco.

## [1.1.0] — 2026-10-24

### Adicionado

- **Painel v2** com navegação lateral em 8 páginas: Geral, Aparência, Menu radial,
  Ações, Submenus, Atalhos, Integrações e Sobre.
- Design tokens (`src/styles/tokens.css`) e primitivas reutilizáveis em
  `src/components/ui` (Button, Card, Field, Slider, Switch, Badge, ConfirmDialog,
  PageHeader).
- Rascunho com estado: indicador de alterações pendentes, Restaurar com confirmação,
  botão Fechar e avisos do backend visíveis no topo.
- Pré-visualização do radial ligada ao rascunho, com relógio e CPU reais.
- **Presets**: importar/exportar configuração em JSON com diálogo nativo, validação,
  limite de 1 MB e recusa de preset vazio.
- **Modo de janela por ação**: mostrar um terminal único (PowerShell ou CMD) ou ocultar
  a janela quando o comando já abre as próprias.
- Submenus com até **8 filhos** (antes 5), com modo compacto automático.
- Testes: 38 no Rust e 24 no frontend (Vitest).
- CI no GitHub Actions (lint, testes, build, `cargo check` e `cargo test`).

### Alterado

- Paleta padrão v2: ciano `#43c7d9`, violeta `#a78bfa`, rosa `#e879d8`; menos glow
  permanente, estados de hover/foco/seleção distinguíveis.
- Auto-start migrado de tarefa agendada (`schtasks`) para
  `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
- `%VAR%` agora é expandido de forma case-insensitive, como no Windows.
- `save_config` devolve avisos em vez de silenciar falhas de efeito colateral.
- Padrão de `runCommandsAsAdmin` passou a ser `false`.

### Corrigido

- Auto-start falhava em silêncio e exigia administrador.
- Comandos abriam dois terminais (shell intermediário + janela do comando).
- `run_menu_action` não tinha como testar item ainda não salvo (pendente para 1.2).

## [1.0.0] — 2026-04-29

- Versão pública inicial: menu radial, submenus, tray, hotkey global, painel único,
  auto-start e instalador NSIS.
