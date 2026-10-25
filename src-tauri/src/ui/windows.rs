//! Mostrar, esconder e alternar as janelas do app.

use tauri::{AppHandle, Emitter, Manager, WebviewWindow, Window, WindowEvent};

use crate::ui::placement::{clamped_window_position, current_cursor_position};

pub const MAIN_WINDOW: &str = "main";
pub const SETTINGS_WINDOW: &str = "settings";

pub fn show_main_window_at_cursor(window: &WebviewWindow) -> Result<(), String> {
    let point = current_cursor_position(window);
    window
        .set_position(tauri::Position::Physical(clamped_window_position(window, point)))
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    window
        .emit("menu-opened", ())
        .map_err(|error| error.to_string())
}

pub fn hide_window(app: &AppHandle, label: &str) -> Result<(), String> {
    let window = app
        .get_webview_window(label)
        .ok_or_else(|| format!("Janela '{}' nao encontrada.", label))?;

    window.hide().map_err(|error| error.to_string())?;

    if label == MAIN_WINDOW {
        window
            .emit("menu-closed", ())
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn toggle_main_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(MAIN_WINDOW)
        .ok_or_else(|| "Janela principal nao encontrada.".to_string())?;

    if window.is_visible().unwrap_or(false) {
        window.hide().map_err(|error| error.to_string())?;
        window
            .emit("menu-closed", ())
            .map_err(|error| error.to_string())
    } else {
        show_main_window_at_cursor(&window)
    }
}

pub fn open_settings_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(SETTINGS_WINDOW)
        .ok_or_else(|| "Janela de configuracoes nao encontrada.".to_string())?;

    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

/// Fechar as janelas apenas as esconde: o app continua vivo na bandeja.
pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        let label = window.label();
        if label == MAIN_WINDOW || label == SETTINGS_WINDOW {
            api.prevent_close();
            let _ = window.hide();
            if label == MAIN_WINDOW {
                let _ = window.emit("menu-closed", ());
            }
        }
    }
}
