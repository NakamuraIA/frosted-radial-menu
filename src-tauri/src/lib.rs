//! Frosted Radial Menu — ponto de entrada do app Tauri.
//!
//! A montagem é só cola: estado, plugin de atalho global, comandos, eventos de
//! janela e o setup. Toda a lógica vive nos módulos abaixo.
//!
//! ```text
//! commands/  → superfície invoke (validação e delegação)
//! config/    → modelos, defaults e persistência em JSON
//! menu/      → resolução/execução das ações das fatias
//! platform/  → atalho global e auto-start no Windows
//! system/    → métricas de hardware
//! ui/        → janelas, posicionamento e bandeja
//! ```

mod commands;
mod config;
mod menu;
mod platform;
mod state;
mod system;
mod ui;

use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;

use crate::config::defaults::default_config;
use crate::config::store::read_config;
use crate::platform::{autostart, hotkey};
use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _request, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = ui::windows::toggle_main_window(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::config::load_config,
            commands::config::save_config,
            commands::menu::run_menu_action,
            commands::windows::open_settings_window,
            commands::windows::hide_main_window,
            commands::windows::hide_settings_window,
            commands::autostart::get_autostart_status,
            commands::system::get_system_stats,
            commands::presets::export_preset,
            commands::presets::import_preset,
        ])
        .on_window_event(|window, event| ui::windows::handle_window_event(window, event))
        .setup(|app| {
            let handle = app.handle();

            let config = read_config(handle).unwrap_or_else(|error| {
                eprintln!("Nao foi possivel carregar a configuracao inicial: {}", error);
                default_config()
            });

            let shortcut = hotkey::parse_shortcut_text(&config.preferences.hotkey)
                .unwrap_or_else(|error| {
                    eprintln!(
                        "Usando Alt+Space porque o atalho salvo e invalido: {}",
                        error
                    );
                    hotkey::default_shortcut()
                });

            if let Err(error) =
                hotkey::register(handle, app.state::<AppState>().inner(), shortcut)
            {
                eprintln!(
                    "Nao foi possivel registrar o atalho global. Verifique se outra instancia do Radial Menu esta aberta: {}",
                    error
                );
            }

            if config.preferences.autostart_enabled {
                if let Err(error) = autostart::set_enabled(true) {
                    eprintln!("Nao foi possivel sincronizar o auto-start: {}", error);
                }
            }

            ui::tray::setup(handle)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
