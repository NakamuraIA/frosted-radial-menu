# Menu Radial - Frosted Glass

A customizable radial productivity menu for Windows with recursive submenus, quick actions, and a frosted-glass UI.

Um menu radial para Windows feito com **PySide6**, com visual glassmorphism, atalho global e configuracao por JSON.

O objetivo deste repositorio e ser facil de usar mesmo sem compilar: baixar, dar dois cliques no instalador e usar.

## Preview

![Menu radial principal](assets/screenshots/image_2.png)

![Menu radial com submenu](assets/screenshots/image.png)

## O que ele faz

- Abre um menu radial perto do cursor com `Alt + Espaco`
- Executa programas, atalhos de teclado, pastas, scripts e URLs
- Fica rodando na bandeja do sistema
- Permite editar o menu pelo arquivo `config/config.json`
- Tem suporte a submenu e visual animado

## Instalacao Facil no Windows

1. Baixe este repositorio como ZIP e extraia a pasta.
2. Instale o Python para Windows, caso ainda nao tenha.
3. De dois cliques em `install_and_setup.bat`.
4. Aguarde a instalacao terminar.
5. Use o atalho `Menu Radial` criado na Area de Trabalho.

O instalador faz tudo isso automaticamente:

- cria um ambiente local em `.venv`
- instala as dependencias
- cria um atalho na Area de Trabalho
- pode configurar inicio automatico com o Windows

## Como usar

1. Abra o Menu Radial pelo atalho da Area de Trabalho ou por `run_menu.bat`.
2. O icone aparece na bandeja do sistema.
3. Pressione `Alt + Espaco` para abrir o menu.
4. Clique nas fatias para executar a acao desejada.
5. Pressione `Esc` ou clique fora para fechar.

## Configuracao

O arquivo publico padrao e `config/config.json`.

Se voce quiser manter uma configuracao pessoal sem subir no GitHub, crie `config/config.local.json`.
Quando esse arquivo existir, ele tem prioridade sobre o `config/config.json`.

### Exemplo rapido

```json
{
  "menu": {
    "items": [
      {
        "label": "Apps",
        "icon": "layout-grid",
        "children": [
          { "label": "Terminal", "icon": "terminal", "action": "run", "target": "wt.exe" }
        ]
      }
    ]
  },
  "settings": {
    "hotkey": "<alt>+<space>",
    "accent_color": "#00DCFF"
  }
}
```

## Arquivos importantes

- `install_and_setup.bat`: instalador de um clique
- `run_menu.bat`: inicializador visivel
- `run_hidden.vbs`: inicializador silencioso
- `setup_startup.bat`: ativa inicio automatico no Windows
- `config/config.json`: menu publico padrao
- `src/core/`: logica principal da interface e das acoes

## Observacoes

- Este projeto e focado em Windows.
- O repositorio nao precisa ser compilado para funcionar.
- Dependencias atuais: `PySide6`, `pynput` e `psutil`.
