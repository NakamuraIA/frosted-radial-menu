# Plano do Frosted Radial Menu

## Objetivo

Transformar o Frosted Radial Menu em um aplicativo OSS para Windows: leve, bonito, configuravel, compilavel para `.exe` e pronto para rodar no computador de qualquer pessoa sem caminhos fixos do computador do desenvolvedor.

## Estado atual

- Tauri 2 + React + TypeScript.
- Atalho global `Alt+Space`.
- Menu radial com submenus externos.
- Painel de configuracao.
- Configuracao persistida em JSON no diretorio do app do usuario.
- Personalizacao visual persistida em `layout`:
  - escala geral;
  - raios e espessuras do menu principal;
  - distancia, largura e abertura dos submenus;
  - tamanho dos icones e textos;
  - fonte, glow, borda e tamanho do centro.
- Acoes por backend Rust:
  - abrir caminho/arquivo/pasta/atalho;
  - abrir URL;
  - executar comando em PowerShell/CMD;
  - abrir configuracoes.
- Bundle Windows apontado para NSIS `.exe` em modo `currentUser`.
- Binario de release nomeado como `Frosted Radial Menu.exe`.
- Instalador cria atalho automatico na Area de Trabalho via hook NSIS.

## Regras de portabilidade

- Nao salvar caminhos pessoais no repositorio.
- Configuracoes reais do usuario ficam fora do repo, no app config dir do sistema.
- Configuracoes de exemplo devem usar variaveis como `%USERPROFILE%`, `%APPDATA%` e `%LOCALAPPDATA%`.
- O app deve funcionar apos instalacao em qualquer Windows com WebView2.
- O app final nao deve exigir Node.js nem Rust no PC do usuario.
- O instalador NSIS deve baixar/instalar WebView2 quando ausente usando `downloadBootstrapper`.
- O usuario deve conseguir trocar caminhos de apps como Brave, OBS, VS Code, pastas de projeto e scripts pelo painel de configuracao.

## Configuracao esperada

Cada item do menu deve ter:

- Nome.
- Icone interno ou icone customizado.
- Cor.
- Tipo de acao:
  - abrir caminho;
  - abrir URL;
  - rodar comando;
  - abrir submenu;
  - abrir configuracoes;
  - sem acao.
- Valor principal: caminho, URL ou comando.
- Shell: PowerShell ou CMD.
- Pasta de trabalho opcional.
- Lista de filhos para submenu.

O layout visual deve ter:

- Escala geral do radial.
- Raio interno/externo do menu principal.
- Gap entre fatias.
- Raio interno/externo do submenu.
- Abertura angular dos filhos.
- Tamanho de icones e textos por nivel.
- Fonte.
- Intensidade de glow.
- Tamanho do centro.

## Fluxo de primeira execucao

1. App inicia.
2. Se nao existir config do usuario, cria config padrao portavel.
3. Usuario abre configuracoes.
4. Usuario escolhe se quer:
   - iniciar com Windows;
   - criar atalho na Area de Trabalho;
   - importar/exportar preset;
   - customizar caminhos e comandos.

## Auto-start e atalhos

Implementado:

- Criar/remover entrada no Task Scheduler.
- Criar tarefa no logon para o usuario atual sem exigir `requireAdministrator`.
- Criar atalho automatico na Area de Trabalho durante a instalacao.

Ainda falta:

- Criar/remover atalho na Area de Trabalho pelo painel de configuracao.
- Mostrar status real da tarefa no painel de configuracao.
- Alternativa de fallback em `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`.

Preferencia tecnica: Task Scheduler, porque permite controlar melhor nome, permissao e argumentos.

## Icone do aplicativo

Substituir icone padrao do Tauri por identidade propria:

- Criar imagem base do icone em alta resolucao.
- Gerar tamanhos Tauri:
  - `32x32.png`
  - `128x128.png`
  - `128x128@2x.png`
  - `icon.ico`
  - `icon.icns`
- Usar `npm run tauri icon caminho/do/icone.png` quando a arte final existir.

Direcao visual sugerida:

- Circulo escuro/glass.
- Arco neon cyan/magenta.
- Simbolo radial simples no centro.
- Sem detalhe pequeno demais, porque icone precisa ler bem em 32px.

## Instalacao e distribuicao

1. Rodar `npm run tauri build`.
2. Publicar instalador gerado em `src-tauri/target/release/bundle/nsis/`.
3. Documentar que o app final nao exige Node.js/Rust, apenas WebView2 no Windows.
4. Documentar checksum/release notes no GitHub.

## Roadmap tecnico

- Corrigir todos os fluxos de janela: abrir, esconder, reabrir e tray.
- Melhorar editor de configuracao:
  - reordenar itens;
  - duplicar grupo;
  - testar acao;
  - importar/exportar preset.
- Adicionar auto-start real.
- Adicionar criacao de atalho na Area de Trabalho.
- Adicionar seletor de arquivo/pasta nativo.
- Adicionar suporte a icones customizados locais com copia para pasta do app.
- Adicionar gerador de preset inicial baseado no PC:
  - detectar VS Code;
  - detectar navegadores;
  - detectar pastas comuns;
  - detectar apps conhecidos sem enviar dados para fora.

## Cuidado com seguranca

- Comandos configurados pelo usuario devem ser executados localmente.
- Nao baixar ou executar scripts remotos automaticamente.
- Nao enviar caminhos, historico, configs ou dados do PC para terceiros.
- Confirmar antes de criar/remover auto-start, atalhos ou tarefas do Windows.
