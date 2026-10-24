//! Ícone e menu da bandeja do sistema.

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::AppHandle;

use crate::ui::windows::{open_settings_window, toggle_main_window};

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let quit_item = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Configuracoes", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

    TrayIconBuilder::new()
        .tooltip("Radial Menu")
        .icon(
            app.default_window_icon()
                .expect("icone padrao ausente no bundle")
                .clone(),
        )
        .menu(&menu)
        .on_menu_event(|app_handle, event| match event.id.as_ref() {
            "quit" => app_handle.exit(0),
            "settings" => {
                let _ = open_settings_window(app_handle);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            } = event
            {
                let _ = toggle_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
