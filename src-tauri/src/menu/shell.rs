//! Execução de comandos de shell (PowerShell/CMD) disparados pelas fatias.

use std::collections::HashMap;
use std::env;
use std::process::{Command, Stdio};

use crate::config::model::MenuItemConfig;

/// Expande variáveis de ambiente no formato `%NOME%`.
///
/// A comparação é case-insensitive porque o Windows é: `%windir%`, `%WINDIR%` e
/// `%Windir%` apontam para o mesmo valor, e o processo pode expor a variável em
/// qualquer caixa (nesta máquina, por exemplo, ela vem como `windir`).
pub fn expand_env_vars(input: &str) -> String {
    if !input.contains('%') {
        return input.to_string();
    }

    let variables: HashMap<String, String> = env::vars()
        .map(|(key, value)| (key.to_lowercase(), value))
        .collect();

    let characters: Vec<char> = input.chars().collect();
    let mut expanded = String::with_capacity(input.len());
    let mut index = 0;

    while index < characters.len() {
        if characters[index] == '%' {
            if let Some(end) = (index + 1..characters.len()).find(|&offset| characters[offset] == '%') {
                let name: String = characters[index + 1..end].iter().collect();
                if !name.is_empty() {
                    if let Some(value) = variables.get(&name.to_lowercase()) {
                        expanded.push_str(value);
                        index = end + 1;
                        continue;
                    }
                }
            }
        }

        expanded.push(characters[index]);
        index += 1;
    }

    expanded
}

/// Escapa um valor para ser usado como literal single-quoted no PowerShell.
#[cfg_attr(not(windows), allow(dead_code))]
pub fn ps_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

/// `true` quando o item pede para rodar sem abrir um terminal próprio.
pub fn should_hide_window(action: &MenuItemConfig) -> bool {
    action
        .window_mode
        .as_deref()
        .map(|mode| mode.eq_ignore_ascii_case("hide"))
        .unwrap_or(false)
}

/// Monta a linha de inicialização do shell escolhido.
///
/// No Windows, em modo oculto não usamos `/K` nem `-NoExit`: o processo precisa
/// terminar. No Linux/macOS o comando roda em `bash -lc`.
#[cfg(windows)]
pub fn shell_command(shell: &str, command_line: &str, hidden: bool) -> (&'static str, Vec<String>) {
    if shell.eq_ignore_ascii_case("cmd") {
        let flag = if hidden { "/C" } else { "/K" };
        ("cmd.exe", vec![flag.to_string(), command_line.to_string()])
    } else {
        let mut args = Vec::new();
        if !hidden {
            args.push("-NoExit".to_string());
        }
        args.extend([
            "-NoProfile".to_string(),
            "-ExecutionPolicy".to_string(),
            "Bypass".to_string(),
            "-Command".to_string(),
            command_line.to_string(),
        ]);
        ("powershell.exe", args)
    }
}

#[cfg(not(windows))]
pub fn shell_command(_shell: &str, command_line: &str, _hidden: bool) -> (&'static str, Vec<String>) {
    ("bash", vec!["-lc".to_string(), command_line.to_string()])
}

#[cfg(windows)]
fn apply_console_flags(command: &mut Command, hidden: bool) {
    use std::os::windows::process::CommandExt;

    const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    command.creation_flags(if hidden {
        CREATE_NO_WINDOW
    } else {
        CREATE_NEW_CONSOLE
    });
}

#[cfg(not(windows))]
fn apply_console_flags(_command: &mut Command, _hidden: bool) {}

/// Executa um comando no shell escolhido.
///
/// - `window_mode = hide` → sem janela; serve para comandos que já abrem as
///   próprias janelas (um `.bat` que dá `start`, por exemplo).
/// - janela visível → um único terminal (nada de shell intermediário).
/// - `run_as_admin` → `Start-Process -Verb RunAs`, que mostra o UAC.
pub fn run_shell_action(action: &MenuItemConfig, run_as_admin: bool) -> Result<(), String> {
    let command_line = action
        .value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Nenhum comando configurado para esta acao.".to_string())?;

    let command_line = expand_env_vars(command_line);
    let shell = action.shell.as_deref().unwrap_or("powershell");
    let hidden = should_hide_window(action);
    let working_dir = action
        .working_dir
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(expand_env_vars);

    let (program, args) = shell_command(shell, &command_line, hidden);

    if run_as_admin {
        let argument_list = args
            .iter()
            .map(|arg| ps_single_quote(arg))
            .collect::<Vec<_>>()
            .join(", ");

        let mut script = format!(
            "Start-Process -FilePath {} -ArgumentList @({})",
            ps_single_quote(program),
            argument_list
        );

        if let Some(working_dir) = working_dir {
            script.push_str(&format!(" -WorkingDirectory {}", ps_single_quote(&working_dir)));
        }

        if hidden {
            script.push_str(" -WindowStyle Hidden");
        }

        script.push_str(" -Verb RunAs");

        let mut helper = Command::new("powershell.exe");
        helper.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &script,
        ]);
        helper
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        apply_console_flags(&mut helper, true);

        return helper.spawn().map(|_| ()).map_err(|error| error.to_string());
    }

    let mut command = Command::new(program);
    command.args(&args);

    if let Some(working_dir) = working_dir {
        command.current_dir(working_dir);
    }

    if hidden {
        command
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
    }

    apply_console_flags(&mut command, hidden);

    command.spawn().map(|_| ()).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn action(value: &str, shell: Option<&str>) -> MenuItemConfig {
        MenuItemConfig {
            id: "test".into(),
            label: "Test".into(),
            icon: "terminal".into(),
            custom_icon: None,
            color: "#fff".into(),
            action_type: "runCommand".into(),
            value: Some(value.into()),
            working_dir: None,
            shell: shell.map(str::to_string),
            window_mode: None,
            children: None,
        }
    }

    #[test]
    fn quotes_single_quotes_for_powershell() {
        assert_eq!(ps_single_quote("it's"), "'it''s'");
        assert_eq!(ps_single_quote("%USERPROFILE%\\Desktop"), "'%USERPROFILE%\\Desktop'");
    }

    #[test]
    fn expands_known_environment_variables() {
        let expanded = expand_env_vars("%WINDIR%");
        assert!(!expanded.contains('%'), "nao expandiu: {expanded}");
        assert!(expanded.len() > 3);
    }

    #[test]
    fn expansion_is_case_insensitive_like_windows() {
        let upper = expand_env_vars("%WINDIR%");
        let lower = expand_env_vars("%windir%");
        let mixed = expand_env_vars("%WinDir%");

        assert_eq!(upper, lower);
        assert_eq!(upper, mixed);
    }

    #[test]
    fn expands_variables_inside_larger_paths() {
        let expanded = expand_env_vars("%USERPROFILE%\\Desktop");
        assert!(expanded.ends_with("\\Desktop"));
        assert!(!expanded.contains("%USERPROFILE%"));
    }

    #[test]
    fn keeps_unknown_placeholders_untouched() {
        let input = "%RADIAL_MENU_VARIAVEL_INEXISTENTE%";
        assert_eq!(expand_env_vars(input), input);
    }

    #[test]
    fn rejects_empty_command() {
        let error = run_shell_action(&action("   ", Some("cmd")), false).unwrap_err();
        assert_eq!(error, "Nenhum comando configurado para esta acao.");
    }

    #[test]
    fn cmd_shell_keeps_the_window_open_when_visible() {
        let (program, args) = shell_command("cmd", "echo hi", false);
        assert_eq!(program, "cmd.exe");
        assert_eq!(args, vec!["/K".to_string(), "echo hi".to_string()]);
    }

    #[test]
    fn cmd_shell_exits_when_hidden() {
        let (_, args) = shell_command("cmd", "echo hi", true);
        assert_eq!(args[0], "/C");
    }

    #[test]
    fn powershell_shell_is_the_default_and_stays_open() {
        let (program, args) = shell_command("qualquer", "echo hi", false);
        assert_eq!(program, "powershell.exe");
        assert_eq!(args[0], "-NoExit");
        assert_eq!(args.last().unwrap(), "echo hi");
    }

    #[test]
    fn powershell_hidden_omits_no_exit() {
        let (_, args) = shell_command("qualquer", "echo hi", true);
        assert!(!args.iter().any(|arg| arg == "-NoExit"));
        assert_eq!(args.last().unwrap(), "echo hi");
    }

    #[test]
    fn window_mode_hide_is_recognized() {
        let mut item = action("echo hi", Some("cmd"));
        assert!(!should_hide_window(&item));

        item.window_mode = Some("hide".into());
        assert!(should_hide_window(&item));

        item.window_mode = Some("HIDE".into());
        assert!(should_hide_window(&item));

        item.window_mode = Some("show".into());
        assert!(!should_hide_window(&item));
    }
}
