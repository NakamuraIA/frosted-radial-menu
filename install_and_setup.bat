@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Menu Radial - Instalacao

echo ==================================================
echo   Menu Radial - Instalacao Facil
echo ==================================================
echo.
echo Este instalador:
echo  1. Cria um ambiente local do Python dentro da pasta do projeto
echo  2. Instala as dependencias automaticamente
echo  3. Cria um atalho na Area de Trabalho
echo  4. Pode configurar inicio automatico com o Windows
echo.

call :find_python
if errorlevel 1 goto no_python

if exist ".venv\Scripts\python.exe" (
    echo [1/5] Ambiente virtual ja existe.
) else (
    echo [1/5] Criando ambiente virtual local...
    "%PYTHON_EXE%" %PYTHON_ARGS% -m venv ".venv"
    if errorlevel 1 goto install_failed
)

echo [2/5] Atualizando o pip...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto install_failed

echo [3/5] Instalando dependencias...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto install_failed

echo [4/5] Criando atalho na Area de Trabalho...
set "REPO_DIR=%~dp0"
set "SHORTCUT_TARGET=%REPO_DIR%run_hidden.vbs"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $shortcut = $ws.CreateShortcut((Join-Path $desktop 'Menu Radial.lnk')); $shortcut.TargetPath = $env:SHORTCUT_TARGET; $shortcut.WorkingDirectory = $env:REPO_DIR; $shortcut.IconLocation = $env:SystemRoot + '\System32\SHELL32.dll,220'; $shortcut.Save()"
if errorlevel 1 goto shortcut_failed

echo [5/5] Instalacao concluida.
echo.
choice /C SN /N /M "Deseja iniciar o Menu Radial junto com o Windows? [S/N]: "
if errorlevel 2 goto skip_startup
call "%~dp0setup_startup.bat"

:skip_startup
echo.
echo Abrindo o Menu Radial...
start "" "%~dp0run_hidden.vbs"
echo.
echo Pronto. Se quiser editar seus atalhos, abra:
echo   config\config.json
echo.
pause
exit /b 0

:find_python
set "PYTHON_EXE="
set "PYTHON_ARGS="
where py >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_EXE=py"
    set "PYTHON_ARGS=-3"
    exit /b 0
)
where python >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_EXE=python"
    set "PYTHON_ARGS="
    exit /b 0
)
exit /b 1

:no_python
echo [ERRO] Python 3 nao foi encontrado neste PC.
echo.
echo Para o Menu Radial funcionar sem compilar, o Python precisa estar instalado.
echo Vou abrir a pagina oficial do Python para Windows.
start "" "https://www.python.org/downloads/windows/"
echo.
echo Depois de instalar o Python, execute este arquivo novamente.
pause
exit /b 1

:install_failed
echo.
echo [ERRO] Nao foi possivel concluir a instalacao.
echo Tente executar este arquivo novamente. Se o erro persistir, verifique a conexao com a internet.
pause
exit /b 1

:shortcut_failed
echo.
echo [ERRO] As dependencias foram instaladas, mas o atalho da Area de Trabalho nao foi criado.
echo Voce ainda pode abrir manualmente usando run_menu.bat.
pause
exit /b 1
