@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "REPO_DIR=%~dp0"
set "SHORTCUT_TARGET=%REPO_DIR%run_hidden.vbs"
set "STARTUP_SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Menu Radial.lnk"

if /I "%~1"=="--remove" goto remove_shortcut

echo Criando atalho de inicializacao automatica...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $shortcut = $ws.CreateShortcut($env:STARTUP_SHORTCUT); $shortcut.TargetPath = $env:SHORTCUT_TARGET; $shortcut.WorkingDirectory = $env:REPO_DIR; $shortcut.IconLocation = $env:SystemRoot + '\System32\SHELL32.dll,220'; $shortcut.Save()"

if errorlevel 1 (
    echo [ERRO] Nao foi possivel configurar o inicio automatico.
    exit /b 1
)

echo Sucesso. O Menu Radial vai iniciar junto com o Windows.
exit /b 0

:remove_shortcut
if exist "%STARTUP_SHORTCUT%" (
    del /q "%STARTUP_SHORTCUT%"
    echo Inicio automatico removido.
) else (
    echo Nenhum atalho de inicio automatico foi encontrado.
)
exit /b 0
