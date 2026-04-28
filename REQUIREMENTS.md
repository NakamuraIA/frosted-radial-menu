# Requirements

## Objetivo

Criar um launcher radial desktop para Windows, bonito, leve, futurista, animado e configuravel. O frontend deve cuidar do visual e da interacao; o backend Rust deve cuidar de sistema operacional, arquivos, comandos e persistencia.

## Funcionalidades

- Abrir o menu com `Alt+Space`.
- Permitir trocar o hotkey global no painel de configuracao.
- Abrir o menu pelo icone de tray.
- Mostrar menu radial transparente com fatias clicaveis.
- Mostrar submenus em arco externo.
- Exibir percentuais no centro do menu.
- Permitir editar:
  - nome do item;
  - icone;
  - cor;
  - tipo de acao;
  - caminho, URL ou comando;
  - shell de execucao;
  - pasta de trabalho;
  - tema visual.
- Permitir personalizar layout visual:
  - escala geral;
  - raios e largura do menu principal;
  - distancia, largura e abertura dos submenus;
  - tamanho dos icones e textos;
  - fonte, borda, glow e centro.
- Persistir configuracao em JSON.
- Executar acoes no backend Rust:
  - abrir arquivo, pasta, `.lnk`, `.exe` ou URL;
  - rodar comandos em PowerShell ou CMD;
  - abrir configuracoes.
- Gerar instalador Windows `.exe` via NSIS, em modo usuario atual.
- Instalar em `%LOCALAPPDATA%` e criar atalho automatico na Area de Trabalho.

## Arquitetura

- `src/` contem apenas a aplicacao React real.
- `src-tauri/src/` contem o backend Rust.
- O React chama Rust via `invoke`.
- O Rust emite eventos para sincronizar menu e configuracoes.
- Configuracao padrao existe no frontend para preview e no Rust para persistencia real.

## Proximas melhorias

- Suporte a icones customizados locais, incluindo PNG/SVG baixados do Flaticon.
- Editor visual de ordem das fatias por drag and drop.
- Coleta real de GPU quando houver NVIDIA/AMD/Intel disponivel.
- Importar/exportar presets de configuracao.
- Criar/remover atalho na Area de Trabalho pelo painel.
