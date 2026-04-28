use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::str::FromStr;
use std::sync::Mutex;
use sysinfo::{MemoryRefreshKind, System};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, State, WebviewWindow, WindowEvent,
};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};
use windows_sys::Win32::Foundation::POINT;
use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;

struct AppState {
    system: Mutex<System>,
    shortcut: Mutex<Option<Shortcut>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RadialConfig {
    version: u32,
    theme: ThemeConfig,
    #[serde(default = "default_layout_config")]
    layout: LayoutConfig,
    preferences: AppPreferences,
    items: Vec<MenuItemConfig>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ThemeConfig {
    accent: String,
    accent_alt: String,
    danger: String,
    glass_opacity: f32,
    animation_speed: f32,
    compact_mode: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LayoutConfig {
    menu_scale: f32,
    main_inner_radius: f32,
    main_outer_radius: f32,
    main_gap: f32,
    main_icon_size: f32,
    main_label_size: f32,
    submenu_inner_radius: f32,
    submenu_outer_radius: f32,
    submenu_gap: f32,
    submenu_icon_size: f32,
    submenu_label_size: f32,
    submenu_spread: f32,
    center_size: f32,
    border_width: f32,
    glow_intensity: f32,
    font_family: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppPreferences {
    hotkey: String,
    autostart_enabled: bool,
    hide_after_action: bool,
    show_percentages: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MenuItemConfig {
    id: String,
    label: String,
    icon: String,
    custom_icon: Option<String>,
    color: String,
    action_type: String,
    value: Option<String>,
    working_dir: Option<String>,
    shell: Option<String>,
    children: Option<Vec<MenuItemConfig>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemStats {
    cpu: f32,
    ram: f32,
    gpu: Option<f32>,
}

fn default_layout_config() -> LayoutConfig {
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

fn default_config() -> RadialConfig {
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
        },
        items: vec![
            MenuItemConfig {
                id: "terminal".into(),
                label: "Terminal".into(),
                icon: "terminal".into(),
                custom_icon: None,
                color: "#23e6ff".into(),
                action_type: "runCommand".into(),
                value: Some("wt".into()),
                working_dir: None,
                shell: Some("cmd".into()),
                children: None,
            },
            MenuItemConfig {
                id: "folders".into(),
                label: "Pastas".into(),
                icon: "folder".into(),
                custom_icon: None,
                color: "#42ffb5".into(),
                action_type: "submenu".into(),
                value: None,
                working_dir: None,
                shell: None,
                children: Some(vec![
                    MenuItemConfig {
                        id: "folder-desktop".into(),
                        label: "Desktop".into(),
                        icon: "folder".into(),
                        custom_icon: None,
                        color: "#42ffb5".into(),
                        action_type: "openPath".into(),
                        value: Some("%USERPROFILE%\\Desktop".into()),
                        working_dir: None,
                        shell: None,
                        children: None,
                    },
                    MenuItemConfig {
                        id: "folder-downloads".into(),
                        label: "Downloads".into(),
                        icon: "folder".into(),
                        custom_icon: None,
                        color: "#23e6ff".into(),
                        action_type: "openPath".into(),
                        value: Some("%USERPROFILE%\\Downloads".into()),
                        working_dir: None,
                        shell: None,
                        children: None,
                    },
                    MenuItemConfig {
                        id: "folder-docs".into(),
                        label: "Docs".into(),
                        icon: "file".into(),
                        custom_icon: None,
                        color: "#ffcf5a".into(),
                        action_type: "openPath".into(),
                        value: Some("%USERPROFILE%\\Documents".into()),
                        working_dir: None,
                        shell: None,
                        children: None,
                    },
                ]),
            },
            MenuItemConfig {
                id: "dev".into(),
                label: "Dev".into(),
                icon: "server".into(),
                custom_icon: None,
                color: "#ff3fa6".into(),
                action_type: "submenu".into(),
                value: None,
                working_dir: None,
                shell: None,
                children: Some(vec![
                    MenuItemConfig {
                        id: "dev-backend".into(),
                        label: "Backend".into(),
                        icon: "server".into(),
                        custom_icon: None,
                        color: "#23e6ff".into(),
                        action_type: "runCommand".into(),
                        value: Some("npm run dev".into()),
                        working_dir: None,
                        shell: Some("powershell".into()),
                        children: None,
                    },
                    MenuItemConfig {
                        id: "dev-frontend".into(),
                        label: "Frontend".into(),
                        icon: "globe".into(),
                        custom_icon: None,
                        color: "#42ffb5".into(),
                        action_type: "runCommand".into(),
                        value: Some("npm run dev".into()),
                        working_dir: None,
                        shell: Some("powershell".into()),
                        children: None,
                    },
                    MenuItemConfig {
                        id: "dev-db".into(),
                        label: "Database".into(),
                        icon: "database".into(),
                        custom_icon: None,
                        color: "#ffcf5a".into(),
                        action_type: "runCommand".into(),
                        value: Some("docker compose up -d".into()),
                        working_dir: None,
                        shell: Some("powershell".into()),
                        children: None,
                    },
                    MenuItemConfig {
                        id: "dev-code".into(),
                        label: "VS Code".into(),
                        icon: "code".into(),
                        custom_icon: None,
                        color: "#9b7cff".into(),
                        action_type: "runCommand".into(),
                        value: Some("code .".into()),
                        working_dir: None,
                        shell: Some("cmd".into()),
                        children: None,
                    },
                ]),
            },
            MenuItemConfig {
                id: "browser".into(),
                label: "Browser".into(),
                icon: "globe".into(),
                custom_icon: None,
                color: "#9b7cff".into(),
                action_type: "openUrl".into(),
                value: Some("https://www.google.com".into()),
                working_dir: None,
                shell: None,
                children: None,
            },
            MenuItemConfig {
                id: "files".into(),
                label: "Arquivo".into(),
                icon: "file".into(),
                custom_icon: None,
                color: "#ffcf5a".into(),
                action_type: "openPath".into(),
                value: Some("%USERPROFILE%\\Documents".into()),
                working_dir: None,
                shell: None,
                children: None,
            },
            MenuItemConfig {
                id: "apps".into(),
                label: "Apps".into(),
                icon: "apps".into(),
                custom_icon: None,
                color: "#55a7ff".into(),
                action_type: "submenu".into(),
                value: None,
                working_dir: None,
                shell: None,
                children: Some(vec![
                    MenuItemConfig {
                        id: "app-notepad".into(),
                        label: "Notas".into(),
                        icon: "file".into(),
                        custom_icon: None,
                        color: "#55a7ff".into(),
                        action_type: "runCommand".into(),
                        value: Some("notepad".into()),
                        working_dir: None,
                        shell: Some("cmd".into()),
                        children: None,
                    },
                    MenuItemConfig {
                        id: "app-calc".into(),
                        label: "Calc".into(),
                        icon: "apps".into(),
                        custom_icon: None,
                        color: "#23e6ff".into(),
                        action_type: "runCommand".into(),
                        value: Some("calc".into()),
                        working_dir: None,
                        shell: Some("cmd".into()),
                        children: None,
                    },
                ]),
            },
            MenuItemConfig {
                id: "media".into(),
                label: "Midia".into(),
                icon: "music".into(),
                custom_icon: None,
                color: "#ff7ad9".into(),
                action_type: "submenu".into(),
                value: None,
                working_dir: None,
                shell: None,
                children: Some(vec![
                    MenuItemConfig {
                        id: "media-music".into(),
                        label: "Musica".into(),
                        icon: "music".into(),
                        custom_icon: None,
                        color: "#ff7ad9".into(),
                        action_type: "none".into(),
                        value: None,
                        working_dir: None,
                        shell: None,
                        children: None,
                    },
                    MenuItemConfig {
                        id: "media-video".into(),
                        label: "Video".into(),
                        icon: "video".into(),
                        custom_icon: None,
                        color: "#23e6ff".into(),
                        action_type: "none".into(),
                        value: None,
                        working_dir: None,
                        shell: None,
                        children: None,
                    },
                    MenuItemConfig {
                        id: "media-games".into(),
                        label: "Jogos".into(),
                        icon: "gamepad".into(),
                        custom_icon: None,
                        color: "#42ffb5".into(),
                        action_type: "none".into(),
                        value: None,
                        working_dir: None,
                        shell: None,
                        children: None,
                    },
                ]),
            },
            MenuItemConfig {
                id: "settings".into(),
                label: "Config".into(),
                icon: "settings".into(),
                custom_icon: None,
                color: "#ffffff".into(),
                action_type: "settings".into(),
                value: None,
                working_dir: None,
                shell: None,
                children: None,
            },
        ],
    }
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
    Ok(dir.join("config.json"))
}

fn write_config(app: &AppHandle, config: &RadialConfig) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let payload = serde_json::to_string_pretty(config).map_err(|error| error.to_string())?;
    fs::write(path, payload).map_err(|error| error.to_string())
}

fn read_config(app: &AppHandle) -> Result<RadialConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        let config = default_config();
        write_config(app, &config)?;
        return Ok(config);
    }

    let payload = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&payload).map_err(|error| error.to_string())
}

fn find_action(items: &[MenuItemConfig], action_id: &str) -> Option<MenuItemConfig> {
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

fn expand_env_vars(input: &str) -> String {
    env::vars().fold(input.to_string(), |value, (key, replacement)| {
        value.replace(&format!("%{}%", key), &replacement)
    })
}

fn open_target(value: Option<&str>) -> Result<(), String> {
    let target = value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Nenhum caminho ou URL configurado para esta acao.".to_string())?;

    open::that(expand_env_vars(target)).map_err(|error| error.to_string())
}

fn run_shell_action(action: &MenuItemConfig) -> Result<(), String> {
    let command_line = action
        .value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Nenhum comando configurado para esta acao.".to_string())?;

    let command_line = expand_env_vars(command_line);
    let shell = action.shell.as_deref().unwrap_or("powershell");
    let mut command = Command::new("cmd");

    if shell.eq_ignore_ascii_case("cmd") {
        command.args(["/C", "start", "Radial", "cmd", "/K", &command_line]);
    } else {
        command.args([
            "/C",
            "start",
            "Radial",
            "powershell",
            "-NoExit",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &command_line,
        ]);
    }

    if let Some(working_dir) = action
        .working_dir
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        command.current_dir(expand_env_vars(working_dir));
    }

    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

fn open_settings_window_inner(app: &AppHandle) -> Result<(), String> {
    let settings_window = app
        .get_webview_window("settings")
        .ok_or_else(|| "Janela de configuracoes nao encontrada.".to_string())?;

    settings_window.show().map_err(|error| error.to_string())?;
    settings_window.set_focus().map_err(|error| error.to_string())
}

fn hide_window(app: &AppHandle, label: &str) -> Result<(), String> {
    let window = app
        .get_webview_window(label)
        .ok_or_else(|| format!("Janela '{}' nao encontrada.", label))?;

    window.hide().map_err(|error| error.to_string())?;

    if label == "main" {
        window
            .emit("menu-closed", ())
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn current_cursor_position() -> POINT {
    let mut point = POINT { x: 0, y: 0 };
    unsafe { GetCursorPos(&mut point) };
    point
}

fn clamped_window_position(window: &WebviewWindow, point: POINT) -> PhysicalPosition<i32> {
    let size = window.outer_size().ok();
    let width = size.map(|size| size.width as i32).unwrap_or(600);
    let height = size.map(|size| size.height as i32).unwrap_or(600);
    let mut x = point.x - width / 2;
    let mut y = point.y - height / 2;

    if let Ok(monitors) = window.available_monitors() {
        if let Some(monitor) = monitors.into_iter().find(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            point.x >= position.x
                && point.x <= position.x + size.width as i32
                && point.y >= position.y
                && point.y <= position.y + size.height as i32
        }) {
            let position = monitor.position();
            let size = monitor.size();
            let max_x = position.x + size.width as i32 - width;
            let max_y = position.y + size.height as i32 - height;
            x = x.clamp(position.x, max_x.max(position.x));
            y = y.clamp(position.y, max_y.max(position.y));
        }
    }

    PhysicalPosition { x, y }
}

fn show_main_window_at_cursor(window: &WebviewWindow) -> Result<(), String> {
    let point = current_cursor_position();
    window
        .set_position(tauri::Position::Physical(clamped_window_position(window, point)))
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    window
        .emit("menu-opened", ())
        .map_err(|error| error.to_string())
}

fn default_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::ALT), Code::Space)
}

fn parse_shortcut_text(value: &str) -> Result<Shortcut, String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err("Atalho nao pode ficar vazio.".to_string());
    }

    Shortcut::from_str(normalized)
        .map_err(|error| format!("Atalho invalido '{}': {}", normalized, error))
}

fn register_global_shortcut(
    app: &AppHandle,
    state: &AppState,
    shortcut: Shortcut,
) -> Result<(), String> {
    let mut current_shortcut = state
        .shortcut
        .lock()
        .map_err(|_| "Falha ao acessar estado do atalho global.".to_string())?;

    let previous_shortcut = *current_shortcut;
    if let Some(previous) = previous_shortcut {
        if previous == shortcut {
            return Ok(());
        }
        let _ = app.global_shortcut().unregister(previous);
    }

    match app.global_shortcut().register(shortcut) {
        Ok(()) => {
            *current_shortcut = Some(shortcut);
            Ok(())
        }
        Err(error) => {
            if let Some(previous) = previous_shortcut {
                if app.global_shortcut().register(previous).is_ok() {
                    *current_shortcut = Some(previous);
                } else {
                    *current_shortcut = None;
                }
            }

            Err(format!(
                "Nao foi possivel registrar o atalho global: {}",
                error
            ))
        }
    }
}

fn toggle_main_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Janela principal nao encontrada.".to_string())?;

    if window.is_visible().unwrap_or(false) {
        window.hide().map_err(|error| error.to_string())?;
        window
            .emit("menu-closed", ())
            .map_err(|error| error.to_string())
    } else {
        show_main_window_at_cursor(&window)
    }
}

#[tauri::command]
fn load_config(app: AppHandle) -> Result<RadialConfig, String> {
    read_config(&app)
}

fn update_autostart_status(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let task_name = "Frosted Radial Menu";
        if enabled {
            let exe_path = std::env::current_exe()
                .map_err(|e| format!("Falha ao obter caminho do executavel: {}", e))?;
            let exe_path_str = exe_path
                .to_str()
                .ok_or_else(|| "Caminho do executavel invalido".to_string())?;
            let task_command = format!("\"{}\"", exe_path_str);

            // Verifica se a tarefa já existe
            let output = Command::new("schtasks")
                .args(["/query", "/tn", task_name])
                .output();

            let exists = match output {
                Ok(out) => out.status.success(),
                Err(_) => false,
            };

            if !exists {
                // Cria a tarefa: executa no logon, com privilégios altos (ajuda a evitar UAC se o app precisar)
                let status = Command::new("schtasks")
                    .args([
                        "/create",
                        "/tn",
                        task_name,
                        "/tr",
                        &task_command,
                        "/sc",
                        "onlogon",
                        "/rl",
                        "LIMITED",
                        "/f",
                    ])
                    .status()
                    .map_err(|e| format!("Erro ao disparar schtasks: {}", e))?;

                if !status.success() {
                    return Err("Falha ao criar tarefa agendada. Pode exigir permissões de administrador.".to_string());
                }
            }
        } else {
            // Remove a tarefa silenciosamente
            let _ = Command::new("schtasks")
                .args(["/delete", "/tn", task_name, "/f"])
                .status();
        }
    }
    Ok(())
}

#[tauri::command]
fn save_config(
    app: AppHandle,
    state: State<AppState>,
    config: RadialConfig,
) -> Result<(), String> {
    let autostart_enabled = config.preferences.autostart_enabled;
    let shortcut = parse_shortcut_text(&config.preferences.hotkey)?;

    write_config(&app, &config)?;
    update_autostart_status(autostart_enabled)?;
    register_global_shortcut(&app, state.inner(), shortcut)?;

    app.emit("config-updated", ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn run_menu_action(app: AppHandle, action_id: String) -> Result<(), String> {
    let config = read_config(&app)?;
    let action = find_action(&config.items, &action_id)
        .ok_or_else(|| format!("Acao '{}' nao encontrada.", action_id))?;

    match action.action_type.as_str() {
        "openPath" | "openUrl" => open_target(action.value.as_deref()),
        "runCommand" => run_shell_action(&action),
        "settings" => open_settings_window_inner(&app),
        "submenu" | "none" => Ok(()),
        other => Err(format!("Tipo de acao desconhecido: {}", other)),
    }
}

#[tauri::command]
fn open_settings_window(app: AppHandle) -> Result<(), String> {
    open_settings_window_inner(&app)
}

#[tauri::command]
fn hide_main_window(app: AppHandle) -> Result<(), String> {
    hide_window(&app, "main")
}

#[tauri::command]
fn hide_settings_window(app: AppHandle) -> Result<(), String> {
    hide_window(&app, "settings")
}

#[tauri::command]
fn get_system_stats(state: State<AppState>) -> Result<SystemStats, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            system: Mutex::new(System::new_all()),
            shortcut: Mutex::new(None),
        })
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _req, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = toggle_main_window(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            run_menu_action,
            open_settings_window,
            hide_main_window,
            hide_settings_window,
            get_system_stats
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let label = window.label();
                if label == "settings" || label == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    if label == "main" {
                        let _ = window.emit("menu-closed", ());
                    }
                }
            }
        })
        .setup(move |app| {
            let config = read_config(app.handle()).unwrap_or_else(|error| {
                eprintln!("Nao foi possivel carregar a configuracao inicial: {}", error);
                default_config()
            });

            let shortcut = parse_shortcut_text(&config.preferences.hotkey).unwrap_or_else(|error| {
                eprintln!("Usando Alt+Space porque o atalho salvo e invalido: {}", error);
                default_shortcut()
            });

            if let Err(error) =
                register_global_shortcut(app.handle(), app.state::<AppState>().inner(), shortcut)
            {
                eprintln!(
                    "Nao foi possivel registrar o atalho global. Verifique se outra instancia do Radial Menu esta aberta: {}",
                    error
                );
            }
            
            if let Ok(config) = read_config(app.handle()) {
                // Sincroniza o autostart no arranque, se estiver ativado nas preferências
                if config.preferences.autostart_enabled {
                    let _ = update_autostart_status(true);
                }
            }

            let quit_item = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let settings_item =
                MenuItem::with_id(app, "settings", "Configuracoes", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

            TrayIconBuilder::new()
                .tooltip("Radial Menu")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app_handle, event| match event.id.as_ref() {
                    "quit" => {
                        app_handle.exit(0);
                    }
                    "settings" => {
                        let _ = open_settings_window_inner(app_handle);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let _ = toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
