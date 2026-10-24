//! Resolução e despacho das ações configuradas nas fatias do menu.

use tauri::AppHandle;

use crate::config::model::MenuItemConfig;
use crate::config::store::read_config;
use crate::menu::shell::{expand_env_vars, run_shell_action};
use crate::ui::windows::open_settings_window;

/// Procura uma ação por id, descendo nos submenus.
pub fn find_action(items: &[MenuItemConfig], action_id: &str) -> Option<MenuItemConfig> {
    for item in items {
        if item.id == action_id {
            return Some(item.clone());
        }

        if let Some(children) = &item.children {
            if let Some(child) = find_action(children, action_id) {
                return Some(child);
            }
        }
    }

    None
}

fn open_target(value: Option<&str>) -> Result<(), String> {
    let target = value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Nenhum caminho ou URL configurado para esta acao.".to_string())?;

    open::that(expand_env_vars(target)).map_err(|error| error.to_string())
}

/// Executa a ação de uma fatia já persistida.
pub fn run_action(app: &AppHandle, action_id: &str) -> Result<(), String> {
    let config = read_config(app)?;
    let action = find_action(&config.items, action_id)
        .ok_or_else(|| format!("Acao '{}' nao encontrada.", action_id))?;

    match action.action_type.as_str() {
        "openPath" | "openUrl" => open_target(action.value.as_deref()),
        "runCommand" => run_shell_action(&action, config.preferences.run_commands_as_admin),
        "settings" => open_settings_window(app),
        "submenu" | "none" => Ok(()),
        other => Err(format!("Tipo de acao desconhecido: {}", other)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tree() -> Vec<MenuItemConfig> {
        vec![
            MenuItemConfig {
                id: "root".into(),
                label: "Root".into(),
                icon: "apps".into(),
                custom_icon: None,
                color: "#fff".into(),
                action_type: "submenu".into(),
                value: None,
                working_dir: None,
                shell: None,
                children: Some(vec![MenuItemConfig {
                    id: "child".into(),
                    label: "Child".into(),
                    icon: "file".into(),
                    custom_icon: None,
                    color: "#fff".into(),
                    action_type: "openPath".into(),
                    value: Some("C:\\".into()),
                    working_dir: None,
                    shell: None,
                    children: None,
                }]),
            },
            MenuItemConfig {
                id: "other".into(),
                label: "Other".into(),
                icon: "file".into(),
                custom_icon: None,
                color: "#fff".into(),
                action_type: "none".into(),
                value: None,
                working_dir: None,
                shell: None,
                children: None,
            },
        ]
    }

    #[test]
    fn finds_top_level_actions() {
        assert_eq!(find_action(&tree(), "other").map(|item| item.id), Some("other".into()));
    }

    #[test]
    fn finds_nested_actions() {
        assert_eq!(find_action(&tree(), "child").map(|item| item.id), Some("child".into()));
    }

    #[test]
    fn returns_none_for_unknown_actions() {
        assert!(find_action(&tree(), "missing").is_none());
    }

    #[test]
    fn rejects_missing_target() {
        assert!(open_target(None).is_err());
        assert!(open_target(Some("   ")).is_err());
    }
}
