# Plano do Frosted Radial Menu

## Objetivo

Transformar o Frosted Radial Menu em um aplicativo OSS para Windows: leve, bonito, configuravel, compilavel para `.exe` e pronto para rodar no computador de qualquer pessoa sem caminhos fixos do computador do desenvolvedor.

## Estado atual

- Tauri 2 + React + TypeScript.
- Atalho global `Alt+Space`, re-registrado ao salvar (com aviso se estiver em uso).
- Menu radial com submenus externos, estados distintos de hover, foco e seleção.
- Painel de configuração v2 em 8 páginas (Geral, Aparência, Menu radial, Ações,
  Submenus, Atalhos, Integrações, Sobre), com barra superior de estado das
  alterações, Restaurar, Salvar e Fechar.
- Rascunho único no painel: trocar de página não perde edição; ações destrutivas
  pedem confirmação; a prévia do radial reage ao rascunho com relógio e CPU reais.
- Design tokens em `src/styles/tokens.css` e primitivas reutilizáveis em
  `src/components/ui` (base carvão/grafite, ciano/violeta/rosa pontuais).
- Configuração persistida em JSON no diretório do app do usuário, com migração
  automática do caminho antigo (Roaming → Local).
- Auto-start via `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, sem admin,
  com estado real exposto no painel.
- Personalização visual persistida em `layout`:
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

- Auto-start pela chave `Run` do usuário no registro
  (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, valor `FrostedRadialMenu`),
  sem exigir elevação.
- Estado real do auto-start lido do registro e exibido no painel.
- Atalho global configurável, re-registrado ao salvar; falha vira aviso, não silêncio.
- Atalho da Área de Trabalho criado pelo instalador (hook NSIS).

Ainda falta:

- Criar/remover atalho na Área de Trabalho pelo painel de configuração.
- Atalhos por ação (hoje existe apenas a combinação global).

Histórico: a primeira versão usava `schtasks /sc onlogon`, que exige administrador
e falhava com "Acesso negado" de forma silenciosa. Foi substituída pelo registro.

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

Concluido:

- Fluxos de janela: abrir, esconder, reabrir e tray.
- Reordenar itens e submenus por arrastar-e-soltar no painel.
- Duplicar item com os filhos.
- Auto-start real e status no painel.
- Suporte a ícones customizados locais (com fallback para o ícone interno).
- Painel v2 com páginas por categoria e prévia ao vivo.

Pendente:

- Importar/exportar preset de configuração.
- Botão "testar ação" no editor.
- Seletor nativo de arquivo/pasta para os campos de destino.
- Criar/remover atalho na Área de Trabalho pelo painel.
- Gerador de preset inicial baseado no PC:
  - detectar VS Code;
  - detectar navegadores;
  - detectar pastas comuns;
  - detectar apps conhecidos sem enviar dados para fora.
- Atalhos por ação.
- Coleta real de GPU; widget de mídia; tema claro; wallpaper; dock e painéis
  flutuantes (dependem de backend/modelo de config novo).

## Cuidado com seguranca

- Comandos configurados pelo usuario devem ser executados localmente.
- Nao baixar ou executar scripts remotos automaticamente.
- Nao enviar caminhos, historico, configs ou dados do PC para terceiros.
- Confirmar antes de criar/remover auto-start, atalhos ou tarefas do Windows.
