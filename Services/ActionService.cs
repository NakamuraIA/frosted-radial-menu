// Services/ActionService.cs — Executa ações dos itens do menu.
// Port 1:1 de action_handler.py
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using MenuRadialCS.Native;

namespace MenuRadialCS.Services;

/// <summary>Executa ações: run, url, folder, script, shortcut, clipboard_history.</summary>
public class ActionService
{
    public event Action<string>? ActionExecuted;
    public event Action<string>? ActionFailed;

    private static readonly Dictionary<string, ushort> KeyMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["ctrl"] = Win32.VK_LCONTROL, ["alt"] = Win32.VK_LMENU,
        ["shift"] = Win32.VK_LSHIFT, ["win"] = Win32.VK_LWIN,
        ["tab"] = Win32.VK_TAB, ["enter"] = Win32.VK_RETURN,
        ["esc"] = Win32.VK_ESCAPE, ["space"] = Win32.VK_SPACE,
        ["backspace"] = Win32.VK_BACK, ["delete"] = Win32.VK_DELETE,
        ["insert"] = Win32.VK_INSERT, ["home"] = Win32.VK_HOME,
        ["end"] = Win32.VK_END, ["pageup"] = Win32.VK_PRIOR,
        ["pagedown"] = Win32.VK_NEXT, ["up"] = Win32.VK_UP,
        ["down"] = Win32.VK_DOWN, ["left"] = Win32.VK_LEFT,
        ["right"] = Win32.VK_RIGHT, ["printscreen"] = Win32.VK_SNAPSHOT,
        ["f1"] = Win32.VK_F1, ["f2"] = (ushort)(Win32.VK_F1 + 1),
        ["f3"] = (ushort)(Win32.VK_F1 + 2), ["f4"] = (ushort)(Win32.VK_F1 + 3),
        ["f5"] = (ushort)(Win32.VK_F1 + 4), ["f6"] = (ushort)(Win32.VK_F1 + 5),
        ["f7"] = (ushort)(Win32.VK_F1 + 6), ["f8"] = (ushort)(Win32.VK_F1 + 7),
        ["f9"] = (ushort)(Win32.VK_F1 + 8), ["f10"] = (ushort)(Win32.VK_F1 + 9),
        ["f11"] = (ushort)(Win32.VK_F1 + 10), ["f12"] = (ushort)(Win32.VK_F1 + 11),
    };

    public void Execute(string action, string target, string label = "")
    {
        try
        {
            switch (action)
            {
                case "run": RunProgram(target); break;
                case "url": OpenUrl(target); break;
                case "folder": OpenFolder(target); break;
                case "script": RunScript(target); break;
                case "shortcut": SendShortcut(target); break;
                case "clipboard_history": SendShortcut("win+v"); break;
                default:
                    ActionFailed?.Invoke($"Ação desconhecida: '{action}'");
                    return;
            }
            ActionExecuted?.Invoke(string.IsNullOrEmpty(label) ? target : label);
            Console.WriteLine($"[action] Executado: {action} → {target}");
        }
        catch (Exception ex)
        {
            var msg = $"Erro ao executar '{action}' ({target}): {ex.Message}";
            ActionFailed?.Invoke(msg);
            Console.WriteLine($"[action] {msg}");
        }
    }

    private void RunProgram(string target)
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = $"/c start \"\" \"{target}\"",
            UseShellExecute = false,
            CreateNoWindow = true,
        });
    }

    private void OpenUrl(string target)
    {
        if (!target.StartsWith("http://") && !target.StartsWith("https://"))
            target = "https://" + target;
        Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
    }

    private void OpenFolder(string target)
    {
        var path = Path.GetFullPath(target);
        if (Directory.Exists(path))
            Process.Start("explorer.exe", path);
        else
            throw new DirectoryNotFoundException($"Pasta não encontrada: {path}");
    }

    private void RunScript(string target)
    {
        var path = Path.GetFullPath(target);
        if (File.Exists(path) && path.EndsWith(".py", StringComparison.OrdinalIgnoreCase))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"\"{path}\"",
                UseShellExecute = false,
                CreateNoWindow = true,
            });
        }
        else throw new FileNotFoundException($"Script não encontrado: {path}");
    }

    private void SendShortcut(string target)
    {
        var parts = target.Split('+', StringSplitOptions.TrimEntries);
        var vkCodes = new List<ushort>();

        foreach (var p in parts)
        {
            var key = p.ToLowerInvariant();
            if (KeyMap.TryGetValue(key, out var vk))
                vkCodes.Add(vk);
            else if (key.Length == 1 && char.IsLetterOrDigit(key[0]))
                vkCodes.Add((ushort)char.ToUpper(key[0]));
            else
                throw new ArgumentException($"Tecla desconhecida: '{p}'");
        }

        // Press all keys
        var inputs = new List<Win32.INPUT>();
        foreach (var vk in vkCodes)
        {
            inputs.Add(new Win32.INPUT
            {
                type = Win32.INPUT_KEYBOARD,
                u = new Win32.InputUnion { ki = new Win32.KEYBDINPUT { wVk = vk } }
            });
        }
        // Release all keys in reverse
        for (int i = vkCodes.Count - 1; i >= 0; i--)
        {
            inputs.Add(new Win32.INPUT
            {
                type = Win32.INPUT_KEYBOARD,
                u = new Win32.InputUnion { ki = new Win32.KEYBDINPUT { wVk = vkCodes[i], dwFlags = Win32.KEYEVENTF_KEYUP } }
            });
        }

        var arr = inputs.ToArray();
        Win32.SendInput((uint)arr.Length, arr, Marshal.SizeOf<Win32.INPUT>());
    }
}
