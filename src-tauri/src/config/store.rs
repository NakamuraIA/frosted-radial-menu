//! Persistência da configuração em disco.
//!
//! O arquivo fica em `app_local_data_dir()/config.json`. Configurações antigas
//! gravadas em `app_config_dir()` (Roaming) são migradas na primeira leitura.
//!
//! Grava sempre em um `.tmp` e renomeia por cima, para uma queda no meio da
//! escrita não deixar o config pela metade. Se o JSON estiver corrompido, guarda
//! uma cópia `.corrupt` antes de reportar o erro (o chamador decide o fallback).

use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::config::defaults::default_config;
use crate::config::model::RadialConfig;

pub fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?;
    Ok(dir.join("config.json"))
}

pub fn legacy_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
    Ok(dir.join("config.json"))
}

pub fn write_config(app: &AppHandle, config: &RadialConfig) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let payload = serde_json::to_string_pretty(config).map_err(|error| error.to_string())?;
    let temporary = path.with_extension("json.tmp");

    fs::write(&temporary, payload).map_err(|error| error.to_string())?;

    // `rename` não sobrescreve no Windows; remover antes mantém o efeito atômico
    // o suficiente (se falhar, o `.tmp` ainda tem a versão nova).
    if path.exists() {
        fs::remove_file(&path).map_err(|error| error.to_string())?;
    }

    fs::rename(&temporary, &path).map_err(|error| error.to_string())
}

/// Lê a configuração do disco, migrando a versão legada e criando o arquivo
/// padrão quando ele ainda não existe.
pub fn read_config(app: &AppHandle) -> Result<RadialConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        if let Ok(legacy_path) = legacy_config_path(app) {
            if legacy_path.exists() {
                if let Some(parent) = path.parent() {
                    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
                }
                fs::copy(&legacy_path, &path).map_err(|error| error.to_string())?;
            }
        }
    }

    if !path.exists() {
        let config = default_config();
        write_config(app, &config)?;
        return Ok(config);
    }

    let payload = fs::read_to_string(&path).map_err(|error| error.to_string())?;

    match serde_json::from_str::<RadialConfig>(&payload) {
        Ok(mut config) => {
            if config.schema_version == 0 {
                config.schema_version = 1;
            }
            Ok(config)
        }
        Err(error) => {
            // Preserva o arquivo original para inspeção antes de o app regravar.
            let backup = path.with_extension("json.corrupt");
            let _ = fs::copy(&path, &backup);
            Err(format!(
                "Configuracao invalida (backup em {}): {}",
                backup.display(),
                error
            ))
        }
    }
}
