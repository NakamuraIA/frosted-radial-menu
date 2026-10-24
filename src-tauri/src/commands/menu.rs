//! Comando que dispara a ação de uma fatia.

use tauri::AppHandle;

use crate::config::model::MenuItemConfig;
use crate::menu::actions::{run_action, run_item_action};

#[tauri::command]
pub fn run_menu_action(app: AppHandle, action_id: String) -> Result<(), String> {
    run_action(&app, &action_id)
}

/// Executa um item do rascunho, mesmo antes de salvar (botão "Testar ação").
#[tauri::command]
pub fn run_action_preview(
    app: AppHandle,
    item: MenuItemConfig,
    run_as_admin: bool,
) -> Result<(), String> {
    run_item_action(&app, &item, run_as_admin)
}
