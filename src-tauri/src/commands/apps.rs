//! Detecção de aplicativos instalados para montar o preset inicial.

use crate::platform::apps::{self, DetectedApp};

#[tauri::command]
pub fn detect_installed_apps(limit: Option<usize>) -> Vec<DetectedApp> {
    apps::detect(limit.unwrap_or(40).min(200))
}
