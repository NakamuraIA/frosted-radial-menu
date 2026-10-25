//! Comandos que disparam ações do menu.

use tauri::{AppHandle, WebviewWindow};

use crate::config::model::MenuItemConfig;
use crate::config::store::read_config;
use crate::menu::actions::{run_action, run_item_action};
use crate::ui::windows::SETTINGS_WINDOW;

#[tauri::command]
pub fn run_menu_action(app: AppHandle, action_id: String) -> Result<(), String> {
    run_action(&app, &action_id)
}

/// Executa um item do rascunho, mesmo antes de salvar (botão "Testar ação").
///
/// Só aceita chamadas da janela de configurações e usa o modo administrador da
/// configuração salva — o front não decide rodar algo elevado.
#[tauri::command]
pub fn run_action_preview(
    window: WebviewWindow,
    app: AppHandle,
    item: MenuItemConfig,
) -> Result<(), String> {
    if window.label() != SETTINGS_WINDOW {
        return Err("O teste de ação só funciona na janela de configurações.".to_string());
    }

    let config = read_config(&app)?;
    run_item_action(&app, &item, config.preferences.run_commands_as_admin)
}
