//! Comandos de leitura/gravação da configuração.

use tauri::{AppHandle, Emitter, State};

use crate::config::model::RadialConfig;
use crate::config::store::{read_config, write_config};
use crate::platform::{autostart, hotkey};
use crate::state::AppState;

#[tauri::command]
pub fn load_config(app: AppHandle) -> Result<RadialConfig, String> {
    read_config(&app)
}

/// Salva a configuração e aplica os efeitos colaterais (atalho e auto-start).
///
/// Falhas em efeitos colaterais não invalidam o arquivo já salvo: elas voltam
/// como avisos para o painel exibir, em vez de desaparecerem num `let _ =`.
#[tauri::command]
pub fn save_config(
    app: AppHandle,
    state: State<AppState>,
    config: RadialConfig,
) -> Result<Vec<String>, String> {
    let shortcut = hotkey::parse_shortcut_text(&config.preferences.hotkey)?;

    write_config(&app, &config)?;

    let mut warnings = Vec::new();

    if let Err(error) = hotkey::register(&app, state.inner(), shortcut) {
        warnings.push(error);
    }

    if let Err(error) = autostart::set_enabled(config.preferences.autostart_enabled) {
        warnings.push(error);
    }

    app.emit("config-updated", ())
        .map_err(|error| error.to_string())?;

    Ok(warnings)
}
