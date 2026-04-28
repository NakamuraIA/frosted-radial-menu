# Frosted Radial Menu

Launcher radial desktop para Windows feito com Tauri, React e TypeScript. O objetivo e ser leve, bonito, futurista, animado, configuravel e compilavel para `.exe`.

O app nao depende de API externa. Em desenvolvimento, `npm run tauri dev` sobe o Vite e o backend Tauri juntos.

## Recursos atuais

- Menu radial transparente com efeito glass/neon.
- Submenus externos que abrem na direcao da fatia clicada.
- Centro com hora, CPU, RAM e campo de GPU.
- Janela de configuracoes para editar botoes, icones, cores, tipo de acao, comandos e caminhos.
- Personalizacao visual do radial: escala, raio interno/externo, largura, espaco entre fatias, tamanho dos icones, texto, fonte, glow, centro e submenus.
- Configuracao persistida em JSON no diretorio de configuracao do usuario, fora do repositorio.
- Backend Rust para:
  - abrir arquivo, pasta, atalho, `.exe` ou URL;
  - rodar comando em PowerShell ou CMD;
  - abrir/esconder janelas;
  - coletar CPU/RAM.
- Tray icon com configuracoes e sair.
- Hotkey global configuravel, com `Alt+Space` como padrao.
- Auto-start opcional por tarefa agendada do usuario atual.

## Stack

- Frontend: React, TypeScript, Vite, lucide-react.
- Desktop/backend: Tauri 2, Rust.
- Sistema alvo: Windows.

## Estrutura

- `src/`: interface React.
- `src/components/RadialMenu.tsx`: menu principal.
- `src/components/SettingsPanel.tsx`: painel de configuracao.
- `src/lib/menuConfig.ts`: tipos e configuracao padrao.
- `src-tauri/src/lib.rs`: comandos Rust, tray, hotkey, config e stats.
- `src-tauri/tauri.conf.json`: configuracao do app Tauri.
- `docs/PLAN.md`: plano de produto, distribuicao e portabilidade.

## Licenca

MIT. Veja `LICENSE`.

## Desenvolvimento

```bash
npm install
npm run tauri dev
```

O Vite usa `http://127.0.0.1:5180` em desenvolvimento. Se essa porta estiver ocupada, encerre o processo antigo antes de rodar o comando de novo:

```powershell
Get-NetTCPConnection -LocalPort 5180 -State Listen
Stop-Process -Id <PID> -Force
```

Se o hotkey nao abrir o menu, normalmente existe outra instancia antiga do app segurando o atalho. Feche pelo tray icon ou encerre o processo antigo antes de rodar de novo.

## Validacao

```bash
npm run lint
npm run build
cd src-tauri
cargo check
```

## Build para Windows

```bash
npm run tauri build
```

O projeto esta configurado para gerar instalador NSIS (`-setup.exe`) em:

```text
src-tauri/target/release/bundle/nsis/
```

O binario de release tambem sai com o nome do produto:

```text
src-tauri/target/release/Frosted Radial Menu.exe
```

O app final nao precisa de Node.js nem Rust no computador do usuario. Essas ferramentas sao usadas somente para desenvolvimento e build. No Windows, o runtime relevante e o Microsoft Edge WebView2; o instalador esta configurado com `downloadBootstrapper`, entao baixa/instala o WebView2 se ele estiver ausente.

O instalador usa `installMode: currentUser`, instalando para o usuario atual sem exigir administrador. Esse modo combina melhor com `%LOCALAPPDATA%`/AppData e evita UAC no uso diario.

Durante a instalacao, o NSIS copia o app para `%LOCALAPPDATA%\\Frosted Radial Menu`, cria o atalho do menu iniciar e cria automaticamente um atalho na Area de Trabalho apontando para o `.exe` instalado.

Os artefatos `.exe` e `-setup.exe` nao devem ser commitados no Git. Publique esses arquivos em GitHub Releases.

## Portabilidade

Este projeto nao deve depender de caminhos do computador do desenvolvedor. Use caminhos configuraveis e variaveis do Windows, por exemplo:

- `%USERPROFILE%\\Desktop`
- `%USERPROFILE%\\Downloads`
- `%APPDATA%`
- `%LOCALAPPDATA%`

As configuracoes reais do usuario ficam fora do repositorio. Configuracoes locais, presets pessoais, builds, screenshots de QA e caches estao no `.gitignore`.

Arquivos importados/prototipos que nao participam do entrypoint real (`src/` + `src-tauri/src/lib.rs`) tambem ficam ignorados para evitar publicar lixo de prototipo no repo OSS.

## Roadmap curto

- Criar/remover atalho na Area de Trabalho pelo painel.
- Importar/exportar presets.
- Reordenar fatias e submenus no painel.
- Detectar apps comuns do PC do usuario para montar um preset inicial local.
