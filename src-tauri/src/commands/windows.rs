//! Comandos de visibilidade das janelas.

use tauri::AppHandle;

use crate::ui::windows::{hide_window, MAIN_WINDOW, SETTINGS_WINDOW};

#[tauri::command]
pub fn open_settings_window(app: AppHandle) -> Result<(), String> {
    crate::ui::windows::open_settings_window(&app)
}

#[tauri::command]
pub fn hide_main_window(app: AppHandle) -> Result<(), String> {
    hide_window(&app, MAIN_WINDOW)
}

#[tauri::command]
pub fn hide_settings_window(app: AppHandle) -> Result<(), String> {
    hide_window(&app, SETTINGS_WINDOW)
}
