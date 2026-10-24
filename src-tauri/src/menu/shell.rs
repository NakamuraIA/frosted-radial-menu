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
pub fn ps_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

/// Monta a linha de inicialização do shell escolhido.
fn shell_command(shell: &str, command_line: &str) -> (&'static str, Vec<String>) {
    if shell.eq_ignore_ascii_case("cmd") {
        ("cmd.exe", vec!["/K".to_string(), command_line.to_string()])
    } else {
        (
            "powershell.exe",
            vec![
                "-NoExit".to_string(),
                "-NoProfile".to_string(),
                "-ExecutionPolicy".to_string(),
                "Bypass".to_string(),
                "-Command".to_string(),
                command_line.to_string(),
            ],
        )
    }
}

/// Abre um novo terminal executando o comando configurado.
///
/// A elevação (`-Verb RunAs`) é opcional e controlada por preferência do
/// usuário; quando ligada, o Windows mostra o prompt do UAC.
pub fn run_shell_action(action: &MenuItemConfig, run_as_admin: bool) -> Result<(), String> {
    let command_line = action
        .value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Nenhum comando configurado para esta acao.".to_string())?;

    let command_line = expand_env_vars(command_line);
    let shell = action.shell.as_deref().unwrap_or("powershell");
    let working_dir = action
        .working_dir
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(expand_env_vars);

    let (program, args) = shell_command(shell, &command_line);
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

    if run_as_admin {
        script.push_str(" -Verb RunAs");
    }

    let mut command = Command::new("powershell.exe");
    command.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &script,
    ]);

    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
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
    fn cmd_shell_uses_keep_open_flag() {
        let (program, args) = shell_command("cmd", "echo hi");
        assert_eq!(program, "cmd.exe");
        assert_eq!(args, vec!["/K".to_string(), "echo hi".to_string()]);
    }

    #[test]
    fn powershell_shell_is_the_default() {
        let (program, args) = shell_command("qualquer", "echo hi");
        assert_eq!(program, "powershell.exe");
        assert_eq!(args[0], "-NoExit");
        assert_eq!(args.last().unwrap(), "echo hi");
    }
}
