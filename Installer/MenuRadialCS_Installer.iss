; MenuRadialCS_Installer.iss
; Script Inno Setup 6 para gerar o instalador do Menu Radial C#.
;
; Pre-requisito: Inno Setup 6 instalado (gratuito)
;   https://jrsoftware.org/isdl.php
;
; Execute build.ps1 para compilar automaticamente.

#define AppName "Menu Radial"
#define AppVersion "2.0"
#define AppPublisher "Menu Radial"
#define AppExeName "MenuRadialCS.exe"

[Setup]
AppId={{8F3A7E2C-4B1D-4F9A-9C8E-2D5B6A3F1E07}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=Output
OutputBaseFilename=MenuRadial_Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName}
DisableProgramGroupPage=yes
ShowLanguageDialog=no

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar ícone na Área de Trabalho"; GroupDescription: "Criar ícones:"
Name: "startupentry"; Description: "Iniciar automaticamente com o Windows"; GroupDescription: "Opções de inicialização:"; Flags: unchecked

[Files]
; Executável e dependências (.NET self-contained publish)
Source: "..\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Pasta de ícones SVG
Source: "..\Assets\Icons\*"; DestDir: "{app}\Assets\Icons"; Flags: ignoreversion recursesubdirs createallsubdirs

; Config padrão (só copia se não existir — preserva config do usuário)
Source: "..\Config\config.yaml"; DestDir: "{app}\Config"; Flags: onlyifdoesntexist

[Icons]
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon
Name: "{autoprograms}\{#AppName}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{autoprograms}\{#AppName}\Desinstalar {#AppName}"; Filename: "{uninstallexe}"

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#AppName}"; ValueData: """{app}\{#AppExeName}"""; Flags: uninsdeletevalue; Tasks: startupentry

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Iniciar {#AppName} agora"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "taskkill.exe"; Parameters: "/f /im {#AppExeName}"; RunOnceId: "KillApp"; Flags: runhidden skipifdoesntexist

[UninstallDelete]
Type: filesandordirs; Name: "{app}\Config"
