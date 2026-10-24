//! Comando que dispara a ação de uma fatia.

use tauri::AppHandle;

use crate::menu::actions::run_action;

#[tauri::command]
pub fn run_menu_action(app: AppHandle, action_id: String) -> Result<(), String> {
    run_action(&app, &action_id)
}
