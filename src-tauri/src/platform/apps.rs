//! Descoberta de aplicativos instalados a partir do Menu Iniciar.
//!
//! Lê apenas atalhos `.lnk` locais (usuário e todos os usuários), filtra
//! entradas que não são aplicativos (desinstaladores, ajuda, sites) e devolve
//! uma lista pronta para virar submenu. Nada sai da máquina.

use std::path::{Path, PathBuf};

use serde::Serialize;

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DetectedApp {
    pub label: String,
    pub path: String,
}

/// Palavras que indicam atalho de manutenção/site, não um aplicativo.
const BLACKLIST: &[&str] = &[
    "uninstall",
    "desinstalar",
    "remover",
    "readme",
    "leia-me",
    "leia me",
    "help",
    "ajuda",
    "website",
    "site",
    "manual",
    "license",
    "licenca",
    "licença",
    "changelog",
    "atualizar",
    "update",
    "documentation",
    "documentacao",
    "documentação",
    "support",
    "suporte",
    "administrative tools",
    "ferramentas administrativas",
    "verifier",
    "bug report",
    "windows tools",
    "ferramentas do windows",
    "system tools",
    "performance",
];

/// Menor número = maior prioridade (atalhos do usuário antes dos da máquina).
const SOURCE_USER: u8 = 0;
const SOURCE_MACHINE: u8 = 1;

pub fn is_candidate_file_name(file_name: &str) -> bool {
    let lower = file_name.to_lowercase();
    if !lower.ends_with(".lnk") {
        return false;
    }

    !BLACKLIST.iter().any(|word| lower.contains(word))
}

pub fn label_from_file_name(file_name: &str) -> String {
    let stem = file_name
        .strip_suffix(".lnk")
        .or_else(|| file_name.strip_suffix(".LNK"))
        .unwrap_or(file_name);

    stem.replace(['_', '-'], " ").trim().to_string()
}

pub fn start_menu_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if let Some(appdata) = std::env::var_os("APPDATA") {
        dirs.push(
            PathBuf::from(appdata).join("Microsoft\\Windows\\Start Menu\\Programs"),
        );
    }

    if let Some(program_data) = std::env::var_os("ProgramData") {
        dirs.push(
            PathBuf::from(program_data).join("Microsoft\\Windows\\Start Menu\\Programs"),
        );
    }

    dirs
}

fn walk(dir: &Path, out: &mut Vec<(u8, DetectedApp)>, depth: usize, source: u8) {
    if depth > 5 || out.len() >= 400 {
        return;
    }

    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            walk(&path, out, depth + 1, source);
            continue;
        }

        let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };

        if !is_candidate_file_name(file_name) {
            continue;
        }

        let label = label_from_file_name(file_name);
        if label.is_empty() {
            continue;
        }

        out.push((
            source,
            DetectedApp {
                label,
                path: path.to_string_lossy().to_string(),
            },
        ));
    }
}

/// Coleta atalhos dos dois Menus Iniciar, sem duplicar labels e em ordem alfabética.
pub fn detect(limit: usize) -> Vec<DetectedApp> {
    let mut found: Vec<(u8, DetectedApp)> = Vec::new();

    for (index, dir) in start_menu_dirs().into_iter().enumerate() {
        let source = if index == 0 { SOURCE_USER } else { SOURCE_MACHINE };
        walk(&dir, &mut found, 0, source);
    }

    // Prioriza atalhos do usuário; dentro do mesmo grupo, ordem alfabética.
    found.sort_by(|(source_a, app_a), (source_b, app_b)| {
        source_a
            .cmp(source_b)
            .then_with(|| app_a.label.to_lowercase().cmp(&app_b.label.to_lowercase()))
    });
    found.dedup_by(|(_, a), (_, b)| a.label.eq_ignore_ascii_case(&b.label));

    found
        .into_iter()
        .take(limit)
        .map(|(_, app)| app)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_app_shortcuts() {
        assert!(is_candidate_file_name("Visual Studio Code.lnk"));
        assert!(is_candidate_file_name("Steam.lnk"));
    }

    #[test]
    fn rejects_maintenance_shortcuts() {
        for name in [
            "Uninstall Steam.lnk",
            "Desinstalar Discord.lnk",
            "Readme.lnk",
            "Ajuda.lnk",
            "Website.lnk",
            "Licença.lnk",
        ] {
            assert!(!is_candidate_file_name(name), "deveria rejeitar {name}");
        }
    }

    #[test]
    fn rejects_non_shortcut_files() {
        assert!(!is_candidate_file_name("app.exe"));
        assert!(!is_candidate_file_name("atalho.url"));
    }

    #[test]
    fn builds_readable_labels() {
        assert_eq!(label_from_file_name("Visual Studio Code.lnk"), "Visual Studio Code");
        assert_eq!(label_from_file_name("OBS_Studio.lnk"), "OBS Studio");
        assert_eq!(label_from_file_name("vs-code.lnk"), "vs code");
    }

    #[test]
    fn walks_a_fake_start_menu_and_filters() {
        let root = std::env::temp_dir().join(format!("radial-apps-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("Sub")).expect("cria pasta");

        for name in [
            "Steam.lnk",
            "Discord.lnk",
            "Desinstalar Discord.lnk",
            "OBS_Studio.lnk",
        ] {
            std::fs::write(root.join(name), b"").expect("cria atalho");
        }
        std::fs::write(root.join("Sub").join("Spotify.lnk"), b"").expect("cria atalho");

        let mut found = Vec::new();
        walk(&root, &mut found, 0, SOURCE_USER);
        found.sort_by(|(_, a), (_, b)| a.label.cmp(&b.label));

        let labels: Vec<_> = found.iter().map(|(_, app)| app.label.as_str()).collect();
        assert_eq!(labels, vec!["Discord", "OBS Studio", "Spotify", "Steam"]);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn detect_respects_the_limit() {
        let apps = detect(4);
        assert!(apps.len() <= 4);
    }
}
