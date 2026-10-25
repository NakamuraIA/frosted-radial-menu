//! Comandos que reportam e alteram o atalho da Área de Trabalho.

use crate::platform::desktop_shortcut;

#[tauri::command]
pub fn get_desktop_shortcut_status() -> bool {
    desktop_shortcut::is_enabled()
}

#[tauri::command]
pub fn set_desktop_shortcut(enabled: bool) -> Result<(), String> {
    desktop_shortcut::set_enabled(enabled)
}
