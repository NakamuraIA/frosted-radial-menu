//! Valores padrão da configuração.
//!
//! O frontend mantém uma cópia equivalente em `src/lib/config/defaults.ts` para
//! pré-visualizar o menu antes do primeiro `load_config`.

use crate::config::model::{
    AppPreferences, LayoutConfig, MenuItemConfig, RadialConfig, ThemeConfig,
};

pub fn default_layout_config() -> LayoutConfig {
    LayoutConfig {
        menu_scale: 1.0,
        main_inner_radius: 142.0,
        main_outer_radius: 286.0,
        main_gap: 4.0,
        main_icon_size: 34.0,
        main_label_size: 14.0,
        submenu_inner_radius: 296.0,
        submenu_outer_radius: 368.0,
        submenu_gap: 3.0,
        submenu_icon_size: 38.0,
        submenu_label_size: 12.0,
        submenu_spread: 38.0,
        center_size: 244.0,
        border_width: 1.4,
        glow_intensity: 1.0,
        font_family: "'Segoe UI', 'Bahnschrift', system-ui, sans-serif".into(),
    }
}

fn item(
    id: &str,
    label: &str,
    icon: &str,
    color: &str,
    action_type: &str,
    value: Option<&str>,
    shell: Option<&str>,
    children: Option<Vec<MenuItemConfig>>,
) -> MenuItemConfig {
    MenuItemConfig {
        id: id.into(),
        label: label.into(),
        icon: icon.into(),
        custom_icon: None,
        color: color.into(),
        action_type: action_type.into(),
        value: value.map(str::to_string),
        working_dir: None,
        shell: shell.map(str::to_string),
        children,
    }
}

pub fn default_config() -> RadialConfig {
    RadialConfig {
        version: 1,
        theme: ThemeConfig {
            accent: "#23e6ff".into(),
            accent_alt: "#ff3fa6".into(),
            danger: "#ff4f6d".into(),
            glass_opacity: 0.72,
            animation_speed: 1.0,
            compact_mode: false,
        },
        layout: default_layout_config(),
        preferences: AppPreferences {
            hotkey: "Alt+Space".into(),
            autostart_enabled: false,
            hide_after_action: true,
            show_percentages: true,
            run_commands_as_admin: false,
        },
        items: vec![
            item(
                "terminal",
                "Terminal",
                "terminal",
                "#23e6ff",
                "runCommand",
                Some("wt"),
                Some("cmd"),
                None,
            ),
            item(
                "folders",
                "Pastas",
                "folder",
                "#42ffb5",
                "submenu",
                None,
                None,
                Some(vec![
                    item(
                        "folder-desktop",
                        "Desktop",
                        "folder",
                        "#42ffb5",
                        "openPath",
                        Some("%USERPROFILE%\\Desktop"),
                        None,
                        None,
                    ),
                    item(
                        "folder-downloads",
                        "Downloads",
                        "folder",
                        "#23e6ff",
                        "openPath",
                        Some("%USERPROFILE%\\Downloads"),
                        None,
                        None,
                    ),
                    item(
                        "folder-docs",
                        "Docs",
                        "file",
                        "#ffcf5a",
                        "openPath",
                        Some("%USERPROFILE%\\Documents"),
                        None,
                        None,
                    ),
                ]),
            ),
            item(
                "dev",
                "Dev",
                "server",
                "#ff3fa6",
                "submenu",
                None,
                None,
                Some(vec![
                    item(
                        "dev-backend",
                        "Backend",
                        "server",
                        "#23e6ff",
                        "runCommand",
                        Some("npm run dev"),
                        Some("powershell"),
                        None,
                    ),
                    item(
                        "dev-frontend",
                        "Frontend",
                        "globe",
                        "#42ffb5",
                        "runCommand",
                        Some("npm run dev"),
                        Some("powershell"),
                        None,
                    ),
                    item(
                        "dev-db",
                        "Database",
                        "database",
                        "#ffcf5a",
                        "runCommand",
                        Some("docker compose up -d"),
                        Some("powershell"),
                        None,
                    ),
                    item(
                        "dev-code",
                        "VS Code",
                        "code",
                        "#9b7cff",
                        "runCommand",
                        Some("code ."),
                        Some("cmd"),
                        None,
                    ),
                ]),
            ),
            item(
                "browser",
                "Browser",
                "globe",
                "#9b7cff",
                "openUrl",
                Some("https://www.google.com"),
                None,
                None,
            ),
            item(
                "files",
                "Arquivo",
                "file",
                "#ffcf5a",
                "openPath",
                Some("%USERPROFILE%\\Documents"),
                None,
                None,
            ),
            item(
                "apps",
                "Apps",
                "apps",
                "#55a7ff",
                "submenu",
                None,
                None,
                Some(vec![
                    item(
                        "app-notepad",
                        "Notas",
                        "file",
                        "#55a7ff",
                        "runCommand",
                        Some("notepad"),
                        Some("cmd"),
                        None,
                    ),
                    item(
                        "app-calc",
                        "Calc",
                        "apps",
                        "#23e6ff",
                        "runCommand",
                        Some("calc"),
                        Some("cmd"),
                        None,
                    ),
                ]),
            ),
            item(
                "media",
                "Midia",
                "music",
                "#ff7ad9",
                "submenu",
                None,
                None,
                Some(vec![
                    item("media-music", "Musica", "music", "#ff7ad9", "none", None, None, None),
                    item("media-video", "Video", "video", "#23e6ff", "none", None, None, None),
                    item("media-games", "Jogos", "gamepad", "#42ffb5", "none", None, None, None),
                ]),
            ),
            item(
                "settings",
                "Config",
                "settings",
                "#ffffff",
                "settings",
                None,
                None,
                None,
            ),
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_is_serializable_and_populated() {
        let config = default_config();
        assert!(!config.items.is_empty());
        assert!(serde_json::to_string(&config).is_ok());
        assert!(!config.preferences.run_commands_as_admin);
    }

    #[test]
    fn default_items_have_unique_ids() {
        fn walk(items: &[MenuItemConfig], seen: &mut Vec<String>) {
            for item in items {
                assert!(!seen.contains(&item.id), "id duplicado: {}", item.id);
                seen.push(item.id.clone());
                if let Some(children) = &item.children {
                    walk(children, seen);
                }
            }
        }

        let mut seen = Vec::new();
        walk(&default_config().items, &mut seen);
        assert!(seen.len() >= 15);
    }
}
