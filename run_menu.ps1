$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

if (Test-Path ".\.venv\Scripts\pythonw.exe") {
    Start-Process ".\.venv\Scripts\pythonw.exe" "main.py"
    exit 0
}

Write-Host "O Menu Radial ainda nao foi instalado. Abrindo o instalador..." -ForegroundColor Yellow
Start-Process ".\install_and_setup.bat"
