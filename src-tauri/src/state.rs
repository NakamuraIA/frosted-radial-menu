//! Estado compartilhado gerenciado pelo Tauri.

use std::sync::Mutex;

use sysinfo::System;
use tauri_plugin_global_shortcut::Shortcut;

pub struct AppState {
    pub system: Mutex<System>,
    pub shortcut: Mutex<Option<Shortcut>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            system: Mutex::new(System::new_all()),
            shortcut: Mutex::new(None),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
