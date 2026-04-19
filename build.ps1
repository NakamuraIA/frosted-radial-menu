# build.ps1 — Build + Instalador do Menu Radial C#
# Uso: .\build.ps1

param(
    [switch]$SkipInstaller
)

$ErrorActionPreference = "Stop"
$env:PATH = "C:\Program Files\dotnet;" + $env:PATH

Write-Host ""
Write-Host ("=" * 56) -ForegroundColor Cyan
Write-Host "  Menu Radial C# — Build Instalador" -ForegroundColor Cyan
Write-Host ("=" * 56) -ForegroundColor Cyan
Write-Host ""

# ══════════════════════════════════════
# 1. Limpar builds anteriores
# ══════════════════════════════════════
Write-Host "[1/4] Limpando builds anteriores..." -ForegroundColor Yellow
if (Test-Path "publish") { Remove-Item "publish" -Recurse -Force }
if (Test-Path "Installer\Output") { Remove-Item "Installer\Output" -Recurse -Force }
Write-Host "  OK" -ForegroundColor Green

# ══════════════════════════════════════
# 2. Publicar .exe self-contained
# ══════════════════════════════════════
Write-Host ""
Write-Host "[2/4] Publicando executável..." -ForegroundColor Yellow
dotnet publish -c Release -r win-x64 --self-contained true `
    /p:PublishSingleFile=true `
    /p:IncludeNativeLibrariesForSelfExtract=true `
    -o ./publish

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO: Build falhou!" -ForegroundColor Red
    exit 1
}
Write-Host "  Executável gerado em: publish\MenuRadialCS.exe" -ForegroundColor Green

# Copiar assets que o publish não inclui automaticamente
if (-not (Test-Path "publish\Assets\Icons")) {
    New-Item -ItemType Directory -Path "publish\Assets\Icons" -Force | Out-Null
    Copy-Item "Assets\Icons\*" "publish\Assets\Icons\" -Force
}
if (-not (Test-Path "publish\Config")) {
    New-Item -ItemType Directory -Path "publish\Config" -Force | Out-Null
    Copy-Item "Config\config.yaml" "publish\Config\" -Force
}

if ($SkipInstaller) {
    Write-Host ""
    Write-Host "Instalador pulado (-SkipInstaller)." -ForegroundColor Yellow
    Write-Host "O executável está em: publish\MenuRadialCS.exe"
    explorer "publish"
    exit 0
}

# ══════════════════════════════════════
# 3. Verificar Inno Setup
# ══════════════════════════════════════
Write-Host ""
Write-Host "[3/4] Verificando Inno Setup..." -ForegroundColor Yellow

$iscc = @(
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $iscc) {
    Write-Host ""
    Write-Host "  Inno Setup 6 não encontrado." -ForegroundColor Yellow
    Write-Host "  Baixe em: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  O executável está em: publish\MenuRadialCS.exe" -ForegroundColor Green
    explorer "publish"
    exit 0
}
Write-Host "  Encontrado: $iscc" -ForegroundColor Green

# ══════════════════════════════════════
# 4. Gerar instalador
# ══════════════════════════════════════
Write-Host ""
Write-Host "[4/4] Gerando instalador..." -ForegroundColor Yellow
& $iscc "Installer\MenuRadialCS_Installer.iss"

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO: Inno Setup falhou!" -ForegroundColor Red
    Write-Host "  O executável está em: publish\MenuRadialCS.exe"
    exit 1
}

# Remover bloqueio de segurança do instalador
Unblock-File "Installer\Output\MenuRadial_Setup.exe" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host ("=" * 56) -ForegroundColor Green
Write-Host "  Instalador criado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "  Arquivo: Installer\Output\MenuRadial_Setup.exe" -ForegroundColor White
Write-Host "  Distribua APENAS esse arquivo .exe!" -ForegroundColor Yellow
Write-Host ("=" * 56) -ForegroundColor Green
Write-Host ""

explorer "Installer\Output"
