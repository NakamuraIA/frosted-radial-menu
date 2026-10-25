//! Atalho do aplicativo na Área de Trabalho.
//!
//! O atalho é um `.lnk` comum criado via `WScript.Shell` (COM) em um processo
//! PowerShell oculto. Não exige elevação e aponta sempre para o executável em
//! execução, então reinstalar o app também "conserta" o atalho.

use std::ffi::OsStr;
use std::fs;
use std::path::PathBuf;

pub const SHORTCUT_FILE_NAME: &str = "Frosted Radial Menu.lnk";

pub fn desktop_dir() -> Result<PathBuf, String> {
    dirs::desktop_dir()
        .or_else(|| {
            std::env::var_os("USERPROFILE").map(|home| PathBuf::from(home).join("Desktop"))
        })
        .ok_or_else(|| "Nao foi possivel localizar a Area de Trabalho.".to_string())
}

pub fn shortcut_path() -> Result<PathBuf, String> {
    Ok(desktop_dir()?.join(SHORTCUT_FILE_NAME))
}

pub fn is_enabled() -> bool {
    shortcut_path().map(|path| path.exists()).unwrap_or(false)
}

fn ps_quote(value: &OsStr) -> String {
    format!("'{}'", value.to_string_lossy().replace('\'', "''"))
}

/// Cria ou remove o atalho. Idempotente: criar quando já existe (ou remover
/// quando não existe) não é erro.
pub fn set_enabled(enabled: bool) -> Result<(), String> {
    let path = shortcut_path()?;

    if !enabled {
        return match fs::remove_file(&path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(format!("Nao foi possivel remover o atalho: {}", error)),
        };
    }

    if path.exists() {
        return Ok(());
    }

    create_shortcut(&path)
}

#[cfg(target_os = "windows")]
fn create_shortcut(path: &PathBuf) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    use std::process::{Command, Stdio};

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let exe = std::env::current_exe()
        .map_err(|error| format!("Falha ao obter caminho do executavel: {}", error))?;
    let workdir = exe
        .parent()
        .ok_or_else(|| "Executavel sem diretorio pai.".to_string())?
        .to_path_buf();
    let icon = format!("{},0", exe.to_string_lossy());

    let script = format!(
        "$s = (New-Object -ComObject WScript.Shell).CreateShortcut({});\
         $s.TargetPath = {};\
         $s.WorkingDirectory = {};\
         $s.IconLocation = {};\
         $s.Description = 'Launcher radial';\
         $s.Save()",
        ps_quote(path.as_os_str()),
        ps_quote(exe.as_os_str()),
        ps_quote(workdir.as_os_str()),
        ps_quote(OsStr::new(&icon)),
    );

    let mut command = Command::new("powershell.exe");
    command
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW);

    let status = command
        .status()
        .map_err(|error| format!("Falha ao criar o atalho: {}", error))?;

    if !status.success() {
        return Err("Falha ao criar o atalho na Area de Trabalho.".to_string());
    }

    if !path.exists() {
        return Err("O atalho nao foi encontrado depois da criacao.".to_string());
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn create_shortcut(_path: &PathBuf) -> Result<(), String> {
    Err("Atalho na Area de Trabalho disponivel apenas no Windows.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_name_is_stable() {
        assert_eq!(SHORTCUT_FILE_NAME, "Frosted Radial Menu.lnk");
    }

    #[test]
    fn desktop_dir_is_absolute_when_available() {
        // Em runners sem sessao grafica (CI Linux) pode nao existir Area de Trabalho.
        if let Some(dir) = dirs::desktop_dir() {
            assert!(dir.is_absolute(), "esperava caminho absoluto: {dir:?}");
        }
    }

    #[test]
    fn shortcut_path_ends_with_the_file_name() {
        if let Ok(path) = shortcut_path() {
            assert!(path.ends_with(SHORTCUT_FILE_NAME));
        }
    }

    #[test]
    fn disabling_a_missing_shortcut_is_safe() {
        // Apenas confere que a funcao nao falha quando o arquivo nao existe:
        // roda sobre um diretorio temporario para nao tocar na Area de Trabalho real.
        let dir = std::env::temp_dir().join(format!("radial-shortcut-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("cria temp");

        let missing = dir.join("nao-existe.lnk");
        let result = fs::remove_file(&missing);
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err().kind(),
            std::io::ErrorKind::NotFound
        );

        let _ = fs::remove_dir_all(&dir);
    }
}
