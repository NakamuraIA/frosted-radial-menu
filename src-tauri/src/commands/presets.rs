//! Importação e exportação de presets de configuração em JSON.
//!
//! A leitura valida o arquivo antes de devolver a configuração: um preset
//! inválido ou vazio nunca substitui o menu do usuário.

use std::fs;
use std::path::Path;

use crate::config::model::RadialConfig;

const MAX_PRESET_BYTES: u64 = 1024 * 1024;

pub fn serialize_preset(config: &RadialConfig) -> Result<String, String> {
    serde_json::to_string_pretty(config)
        .map_err(|error| format!("Falha ao serializar preset: {}", error))
}

pub fn parse_preset(payload: &str) -> Result<RadialConfig, String> {
    let config: RadialConfig = serde_json::from_str(payload)
        .map_err(|error| format!("Arquivo nao e um preset valido: {}", error))?;

    if config.items.is_empty() {
        return Err(
            "Preset sem itens: importacao cancelada para nao esvaziar o menu.".to_string(),
        );
    }

    Ok(config)
}

#[tauri::command]
pub fn export_preset(path: String, config: RadialConfig) -> Result<(), String> {
    let target = Path::new(&path);

    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Nao foi possivel criar a pasta de destino: {}", error))?;
        }
    }

    let payload = serialize_preset(&config)?;
    fs::write(target, payload)
        .map_err(|error| format!("Nao foi possivel gravar o preset: {}", error))
}

#[tauri::command]
pub fn import_preset(path: String) -> Result<RadialConfig, String> {
    let metadata = fs::metadata(&path)
        .map_err(|error| format!("Nao foi possivel abrir o arquivo: {}", error))?;

    if metadata.len() > MAX_PRESET_BYTES {
        return Err("Arquivo grande demais para ser um preset (limite de 1 MB).".to_string());
    }

    let payload = fs::read_to_string(&path)
        .map_err(|error| format!("Nao foi possivel ler o preset: {}", error))?;

    parse_preset(&payload)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::defaults::default_config;

    #[test]
    fn roundtrip_preserves_the_config() {
        let config = default_config();
        let payload = serialize_preset(&config).expect("serializa");
        let parsed = parse_preset(&payload).expect("parseia");

        assert_eq!(parsed.version, config.version);
        assert_eq!(parsed.items.len(), config.items.len());
        assert_eq!(parsed.layout.main_inner_radius, config.layout.main_inner_radius);
        assert_eq!(parsed.theme.accent, config.theme.accent);
    }

    #[test]
    fn rejects_invalid_json() {
        let error = parse_preset("{ isso nao e json }").unwrap_err();
        assert!(error.starts_with("Arquivo nao e um preset valido"));
    }

    #[test]
    fn rejects_json_that_is_not_a_config() {
        let error = parse_preset(r#"{"hello":"world"}"#).unwrap_err();
        assert!(error.starts_with("Arquivo nao e um preset valido"));
    }

    #[test]
    fn rejects_empty_presets() {
        let mut config = default_config();
        config.items.clear();
        let payload = serialize_preset(&config).expect("serializa");

        assert_eq!(
            parse_preset(&payload).unwrap_err(),
            "Preset sem itens: importacao cancelada para nao esvaziar o menu."
        );
    }

    #[test]
    fn accepts_presets_without_optional_layout() {        let payload = serde_json::json!({
            "version": 1,
            "theme": {
                "accent": "#43c7d9",
                "accentAlt": "#a78bfa",
                "danger": "#ff5c7a",
                "glassOpacity": 0.78,
                "animationSpeed": 1.0,
                "compactMode": false
            },
            "preferences": {
                "hotkey": "Alt+Space",
                "autostartEnabled": false,
                "hideAfterAction": true,
                "showPercentages": true
            },
            "items": [{
                "id": "terminal",
                "label": "Terminal",
                "icon": "terminal",
                "color": "#43c7d9",
                "actionType": "runCommand",
                "value": "wt",
                "shell": "cmd"
            }]
        })
        .to_string();

        let parsed = parse_preset(&payload).expect("aceita preset minimo");
        assert_eq!(parsed.items.len(), 1);
        assert!(parsed.layout.main_outer_radius > 0.0);
    }

    fn temp_dir(label: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "radial-preset-{}-{}",
            std::process::id(),
            label
        ));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn export_and_import_roundtrip_through_disk() {
        let dir = temp_dir("roundtrip");
        let path = dir.join("preset.json");
        let path_str = path.to_string_lossy().to_string();
        let config = default_config();

        export_preset(path_str.clone(), config.clone()).expect("exporta");
        assert!(path.exists());

        let loaded = import_preset(path_str).expect("importa");
        assert_eq!(loaded.items.len(), config.items.len());
        assert_eq!(loaded.theme.accent, config.theme.accent);
        assert_eq!(loaded.layout.menu_scale, config.layout.menu_scale);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rejects_files_above_the_size_limit() {
        let dir = temp_dir("oversize");
        fs::create_dir_all(&dir).expect("cria pasta");
        let path = dir.join("big.json");
        let payload = "a".repeat((MAX_PRESET_BYTES + 1) as usize);
        fs::write(&path, payload).expect("grava");

        let error = import_preset(path.to_string_lossy().to_string()).unwrap_err();
        assert!(error.starts_with("Arquivo grande demais"));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn reports_missing_files() {
        let error = import_preset(
            std::env::temp_dir()
                .join("radial-preset-nao-existe.json")
                .to_string_lossy()
                .to_string(),
        )
        .unwrap_err();
        assert!(error.starts_with("Nao foi possivel abrir o arquivo"));
    }
}
