//! Comando que reporta o estado real do auto-start no sistema.

use crate::platform::autostart;

#[tauri::command]
pub fn get_autostart_status() -> bool {
    autostart::is_enabled()
}
