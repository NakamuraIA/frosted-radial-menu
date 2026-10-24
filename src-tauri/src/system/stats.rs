//! Coleta de estatísticas de hardware exibidas no centro do menu.

use serde::Serialize;
use sysinfo::MemoryRefreshKind;

use crate::state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStats {
    pub cpu: f32,
    pub ram: f32,
    /// Reservado para quando houver coleta real de GPU (ver REQUESTMENTS/roadmap).
    pub gpu: Option<f32>,
}

pub fn collect(state: &AppState) -> Result<SystemStats, String> {
    let mut system = state
        .system
        .lock()
        .map_err(|_| "Falha ao acessar estatisticas do sistema.".to_string())?;

    system.refresh_cpu_usage();
    system.refresh_memory_specifics(MemoryRefreshKind::everything());

    let total_memory = system.total_memory();
    let ram = if total_memory == 0 {
        0.0
    } else {
        (system.used_memory() as f32 / total_memory as f32) * 100.0
    };

    Ok(SystemStats {
        cpu: system.global_cpu_usage(),
        ram,
        gpu: None,
    })
}
