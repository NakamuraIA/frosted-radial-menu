@echo off
setlocal
cd /d "%~dp0"

if exist ".venv\Scripts\pythonw.exe" (
    start "" ".venv\Scripts\pythonw.exe" "main.py"
    exit /b 0
)

echo O Menu Radial ainda nao foi instalado nesta pasta.
echo Vou abrir o instalador para voce agora.
start "" "%~dp0install_and_setup.bat"
exit /b 0
