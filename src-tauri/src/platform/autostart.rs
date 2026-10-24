//! Auto-start via chave `Run` do usuário no registro do Windows.
//!
//! Diferente da tarefa agendada usada antes (`schtasks /sc onlogon`), escrever em
//! `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` **não exige elevação** e
//! vale só para o usuário atual, que é exatamente o modo de instalação do app.

use std::path::Path;

pub const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
pub const VALUE_NAME: &str = "FrostedRadialMenu";

/// Linha de comando gravada no registro, com aspas para caminhos com espaço.
pub fn command_for(exe: &Path) -> String {
    format!("\"{}\"", exe.display())
}

/// Liga/desliga o auto-start. Em builds de desenvolvimento não faz nada além de
/// recusar ligar, para nunca registrar um binário de `target/` no login.
#[cfg(all(target_os = "windows", not(dev)))]
pub fn set_enabled(enabled: bool) -> Result<(), String> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_SET_VALUE};
    use winreg::RegKey;

    let exe = std::env::current_exe()
        .map_err(|error| format!("Falha ao obter caminho do executavel: {}", error))?;

    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE)
        .map_err(|error| format!("Nao foi possivel abrir o registro do Windows: {}", error))?;

    if enabled {
        key.set_value(VALUE_NAME, &command_for(&exe))
            .map_err(|error| format!("Nao foi possivel gravar o auto-start: {}", error))
    } else {
        match key.delete_value(VALUE_NAME) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(format!("Nao foi possivel remover o auto-start: {}", error)),
        }
    }
}

#[cfg(not(all(target_os = "windows", not(dev))))]
pub fn set_enabled(enabled: bool) -> Result<(), String> {
    if !enabled {
        return Ok(());
    }

    let exe = std::env::current_exe()
        .map_err(|error| format!("Falha ao obter caminho do executavel: {}", error))?;

    Err(format!(
        "Iniciar com o Windows so e aplicado na versao instalada do app (comando: {}).",
        command_for(&exe)
    ))
}

/// Estado real do auto-start no Windows (independente do que está salvo no JSON).
#[cfg(target_os = "windows")]
pub fn is_enabled() -> bool {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};
    use winreg::RegKey;

    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(RUN_KEY, KEY_READ)
        .and_then(|key| key.get_value::<String, _>(VALUE_NAME))
        .is_ok()
}

#[cfg(not(target_os = "windows"))]
pub fn is_enabled() -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quotes_executable_paths_with_spaces() {
        let command = command_for(Path::new(r"C:\Users\Dev\Frosted Radial Menu.exe"));
        assert_eq!(
            command,
            r#""C:\Users\Dev\Frosted Radial Menu.exe""#
        );
    }

    #[test]
    fn disabling_autostart_is_always_safe() {
        assert!(set_enabled(false).is_ok());
    }
}
