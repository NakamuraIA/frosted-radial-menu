//! Comando de métricas de hardware.

use tauri::State;

use crate::state::AppState;
use crate::system::stats::{self, SystemStats};

#[tauri::command]
pub fn get_system_stats(state: State<AppState>) -> Result<SystemStats, String> {
    stats::collect(state.inner())
}
