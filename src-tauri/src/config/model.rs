//! Modelos de dados persistidos e compartilhados com o frontend.
//!
//! Todos os campos são `pub` porque o módulo [`crate::config::defaults`] constrói
//! a configuração padrão a partir daqui, e os demais módulos leem/escrevem a
//! configuração de forma direta.

use serde::{Deserialize, Serialize};

use crate::config::defaults::default_layout_config;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RadialConfig {
    pub version: u32,
    pub theme: ThemeConfig,
    #[serde(default = "default_layout_config")]
    pub layout: LayoutConfig,
    pub preferences: AppPreferences,
    pub items: Vec<MenuItemConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeConfig {
    pub accent: String,
    pub accent_alt: String,
    pub danger: String,
    pub glass_opacity: f32,
    pub animation_speed: f32,
    pub compact_mode: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutConfig {
    pub menu_scale: f32,
    pub main_inner_radius: f32,
    pub main_outer_radius: f32,
    pub main_gap: f32,
    pub main_icon_size: f32,
    pub main_label_size: f32,
    pub submenu_inner_radius: f32,
    pub submenu_outer_radius: f32,
    pub submenu_gap: f32,
    pub submenu_icon_size: f32,
    pub submenu_label_size: f32,
    pub submenu_spread: f32,
    pub center_size: f32,
    pub border_width: f32,
    pub glow_intensity: f32,
    pub font_family: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPreferences {
    pub hotkey: String,
    pub autostart_enabled: bool,
    pub hide_after_action: bool,
    pub show_percentages: bool,
    /// Comandos de shell só são elevados quando o usuário pede explicitamente.
    /// Configurações antigas sem esse campo assumem `false`.
    #[serde(default)]
    pub run_commands_as_admin: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuItemConfig {
    pub id: String,
    pub label: String,
    pub icon: String,
    #[serde(default)]
    pub custom_icon: Option<String>,
    pub color: String,
    pub action_type: String,
    #[serde(default)]
    pub value: Option<String>,
    #[serde(default)]
    pub working_dir: Option<String>,
    #[serde(default)]
    pub shell: Option<String>,
    /// `hide` executa o comando sem abrir um terminal extra — útil quando o
    /// próprio comando abre as janelas que precisa (ex.: um .bat que dá `start`).
    #[serde(default)]
    pub window_mode: Option<String>,
    #[serde(default)]
    pub children: Option<Vec<MenuItemConfig>>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::defaults::default_config;

    #[test]
    fn roundtrip_preserves_camel_case_shape() {
        let config = default_config();
        let json = serde_json::to_string(&config).expect("serializa");
        let parsed: RadialConfig = serde_json::from_str(&json).expect("desserializa");

        assert_eq!(parsed.version, config.version);
        assert_eq!(parsed.items.len(), config.items.len());
        assert_eq!(parsed.layout.main_inner_radius, config.layout.main_inner_radius);
        assert!(json.contains("\"mainInnerRadius\""));
        assert!(json.contains("\"actionType\""));
    }

    #[test]
    fn missing_optional_fields_fall_back_to_safe_defaults() {
        let minimal = serde_json::json!({
            "version": 1,
            "theme": {
                "accent": "#23e6ff",
                "accentAlt": "#ff3fa6",
                "danger": "#ff4f6d",
                "glassOpacity": 0.72,
                "animationSpeed": 1.0,
                "compactMode": false
            },
            "preferences": {
                "hotkey": "Alt+Space",
                "autostartEnabled": false,
                "hideAfterAction": true,
                "showPercentages": true
            },
            "items": []
        });

        let parsed: RadialConfig = serde_json::from_value(minimal).expect("desserializa minimo");

        assert!(!parsed.preferences.run_commands_as_admin);
        assert!(parsed.layout.main_inner_radius > 0.0);
    }

    #[test]
    fn empty_items_are_preserved_for_the_store_layer_to_handle() {
        let mut config = default_config();
        config.items.clear();
        let json = serde_json::to_string(&config).expect("serializa");
        let parsed: RadialConfig = serde_json::from_str(&json).expect("desserializa");
        assert!(parsed.items.is_empty());
    }
}
