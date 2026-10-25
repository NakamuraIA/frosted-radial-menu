//! Superfície de comandos exposta ao frontend via `invoke`.
//!
//! Cada submódulo é fino de propósito: valida a entrada e delega para a camada
//! de negócio (`config`, `menu`, `ui`, `system`). O `generate_handler!` do
//! `lib.rs` referencia os caminhos completos porque o macro procura os itens
//! gerados no módulo onde o comando foi declarado.

pub mod autostart;
pub mod config;
pub mod desktop;
pub mod menu;
pub mod presets;
pub mod system;
pub mod windows;
