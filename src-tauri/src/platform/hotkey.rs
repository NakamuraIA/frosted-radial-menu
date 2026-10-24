//! Atalho global configurável (padrão `Alt+Space`).

use std::str::FromStr;

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

use crate::state::AppState;

pub fn default_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::ALT), Code::Space)
}

pub fn parse_shortcut_text(value: &str) -> Result<Shortcut, String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err("Atalho nao pode ficar vazio.".to_string());
    }

    Shortcut::from_str(normalized)
        .map_err(|error| format!("Atalho invalido '{}': {}", normalized, error))
}

/// Registra o atalho, restaurando o anterior caso o novo entre em conflito.
pub fn register(app: &AppHandle, state: &AppState, shortcut: Shortcut) -> Result<(), String> {
    let mut current_shortcut = state
        .shortcut
        .lock()
        .map_err(|_| "Falha ao acessar estado do atalho global.".to_string())?;

    let previous_shortcut = *current_shortcut;
    if let Some(previous) = previous_shortcut {
        if previous == shortcut {
            return Ok(());
        }
        let _ = app.global_shortcut().unregister(previous);
    }

    match app.global_shortcut().register(shortcut) {
        Ok(()) => {
            *current_shortcut = Some(shortcut);
            Ok(())
        }
        Err(error) => {
            if let Some(previous) = previous_shortcut {
                if app.global_shortcut().register(previous).is_ok() {
                    *current_shortcut = Some(previous);
                } else {
                    *current_shortcut = None;
                }
            }

            Err(format!(
                "Nao foi possivel registrar o atalho global: {}",
                error
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_the_default_hotkey() {
        let parsed = parse_shortcut_text("Alt+Space").expect("atalho valido");
        assert_eq!(parsed, default_shortcut());
    }

    #[test]
    fn rejects_empty_hotkeys() {
        assert_eq!(
            parse_shortcut_text("   ").unwrap_err(),
            "Atalho nao pode ficar vazio."
        );
    }

    #[test]
    fn rejects_garbage_hotkeys() {
        let error = parse_shortcut_text("nao-e-um-atalho").unwrap_err();
        assert!(error.starts_with("Atalho invalido"));
    }

    #[test]
    fn trims_surrounding_whitespace() {
        assert!(parse_shortcut_text("  Alt+Space  ").is_ok());
    }
}
