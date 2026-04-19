// Services/HotkeyService.cs — Global hotkey listener (teclado + mouse).
// Port de hotkey_bridge.py + _install_mouse_hook do menu_window.py
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Threading;
using MenuRadialCS.Native;

namespace MenuRadialCS.Services;

/// <summary>
/// Escuta hotkeys globais (teclado ou mouse) via WH_MOUSE_LL / WH_KEYBOARD_LL.
/// Thread-safe via Dispatcher.
/// </summary>
public class HotkeyService : IDisposable
{
    private string _hotkey;
    private readonly Dispatcher _dispatcher;

    private IntPtr _mouseHook;
    private IntPtr _kbHook;
    // Manter referência dos delegates para evitar GC
    private Win32.LowLevelMouseProc? _mouseProc;
    private Win32.LowLevelKeyboardProc? _kbProc;

    // Para hotkeys de teclado: conjunto de VK codes necessários
    private HashSet<ushort>? _requiredKeys;
    private readonly HashSet<ushort> _pressedKeys = new();

    public event Action? HotkeyTriggered;

    public string Combo => _hotkey;

    public HotkeyService(string hotkey, Dispatcher dispatcher)
    {
        _hotkey = hotkey;
        _dispatcher = dispatcher;
        SetupListener();
    }

    // ═══════════════════════════════════════════════════════
    //  SETUP
    // ═══════════════════════════════════════════════════════

    private bool IsMouse => _hotkey.StartsWith("mouse_");

    private void SetupListener()
    {
        if (IsMouse)
            SetupMouseListener();
        else
            SetupKeyboardListener();
    }

    private void SetupMouseListener()
    {
        _mouseProc = MouseHookProc;
        using var proc = Process.GetCurrentProcess();
        using var mod = proc.MainModule!;
        _mouseHook = Win32.SetWindowsHookEx(Win32.WH_MOUSE_LL, _mouseProc,
            Win32.GetModuleHandle(mod.ModuleName), 0);

        if (_mouseHook != IntPtr.Zero)
            Console.WriteLine($"[hotkey] Mouse hook instalado: {_hotkey}");
        else
            Console.WriteLine($"[hotkey] Falha ao instalar mouse hook");
    }

    private void SetupKeyboardListener()
    {
        // Parse pynput format: "<alt>+<space>" → VK codes
        _requiredKeys = ParsePynputCombo(_hotkey);
        if (_requiredKeys == null || _requiredKeys.Count == 0)
        {
            Console.WriteLine($"[hotkey] Combo inválido: {_hotkey}");
            return;
        }

        _kbProc = KeyboardHookProc;
        using var proc = Process.GetCurrentProcess();
        using var mod = proc.MainModule!;
        _kbHook = Win32.SetWindowsHookEx(Win32.WH_KEYBOARD_LL, _kbProc,
            Win32.GetModuleHandle(mod.ModuleName), 0);

        if (_kbHook != IntPtr.Zero)
            Console.WriteLine($"[hotkey] Teclado hook instalado: {_hotkey}");
        else
            Console.WriteLine($"[hotkey] Falha ao instalar keyboard hook");
    }

    // ═══════════════════════════════════════════════════════
    //  HOOK CALLBACKS
    // ═══════════════════════════════════════════════════════

    private IntPtr MouseHookProc(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            var msg = (int)wParam;
            var hookStruct = Marshal.PtrToStructure<Win32.MSLLHOOKSTRUCT>(lParam);

            bool triggered = false;
            switch (_hotkey)
            {
                case "mouse_middle":
                    triggered = msg == Win32.WM_MBUTTONDOWN;
                    break;
                case "mouse_x1":
                    triggered = msg == Win32.WM_XBUTTONDOWN &&
                        ((hookStruct.mouseData >> 16) & 0xFFFF) == Win32.XBUTTON1;
                    break;
                case "mouse_x2":
                    triggered = msg == Win32.WM_XBUTTONDOWN &&
                        ((hookStruct.mouseData >> 16) & 0xFFFF) == Win32.XBUTTON2;
                    break;
            }

            if (triggered)
                _dispatcher.BeginInvoke(() => HotkeyTriggered?.Invoke());
        }
        return Win32.CallNextHookEx(_mouseHook, nCode, wParam, lParam);
    }

    private IntPtr KeyboardHookProc(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && _requiredKeys != null)
        {
            var hookStruct = Marshal.PtrToStructure<Win32.KBDLLHOOKSTRUCT>(lParam);
            var vk = (ushort)hookStruct.vkCode;
            var msg = (int)wParam;

            if (msg == Win32.WM_KEYDOWN || msg == Win32.WM_SYSKEYDOWN)
            {
                _pressedKeys.Add(vk);
                if (_requiredKeys.IsSubsetOf(_pressedKeys))
                {
                    _pressedKeys.Clear();
                    _dispatcher.BeginInvoke(() => HotkeyTriggered?.Invoke());
                }
            }
            else // keyup
            {
                _pressedKeys.Remove(vk);
            }
        }
        return Win32.CallNextHookEx(_kbHook, nCode, wParam, lParam);
    }

    // ═══════════════════════════════════════════════════════
    //  PARSE PYNPUT FORMAT
    // ═══════════════════════════════════════════════════════

    private static readonly Dictionary<string, ushort> PynputMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["alt"] = 0xA4, ["ctrl"] = 0xA2, ["shift"] = 0xA0, ["cmd"] = 0x5B,
        ["space"] = 0x20, ["tab"] = 0x09, ["enter"] = 0x0D, ["esc"] = 0x1B,
        ["backspace"] = 0x08, ["delete"] = 0x2E, ["insert"] = 0x2D,
        ["home"] = 0x24, ["end"] = 0x23, ["page_up"] = 0x21, ["page_down"] = 0x22,
        ["up"] = 0x26, ["down"] = 0x28, ["left"] = 0x25, ["right"] = 0x27,
        ["f1"] = 0x70, ["f2"] = 0x71, ["f3"] = 0x72, ["f4"] = 0x73,
        ["f5"] = 0x74, ["f6"] = 0x75, ["f7"] = 0x76, ["f8"] = 0x77,
        ["f9"] = 0x78, ["f10"] = 0x79, ["f11"] = 0x7A, ["f12"] = 0x7B,
    };

    private static HashSet<ushort>? ParsePynputCombo(string combo)
    {
        var result = new HashSet<ushort>();
        var parts = combo.Split('+', StringSplitOptions.RemoveEmptyEntries);
        foreach (var raw in parts)
        {
            var part = raw.Trim().ToLowerInvariant().Trim('<', '>');
            if (PynputMap.TryGetValue(part, out var vk))
                result.Add(vk);
            else if (part.Length == 1 && char.IsLetterOrDigit(part[0]))
                result.Add((ushort)char.ToUpper(part[0]));
            else
                return null; // inválido
        }
        return result;
    }

    // ═══════════════════════════════════════════════════════
    //  API PÚBLICA
    // ═══════════════════════════════════════════════════════

    public void UpdateHotkey(string newCombo)
    {
        Stop();
        _hotkey = newCombo;
        SetupListener();
    }

    public void Stop()
    {
        if (_mouseHook != IntPtr.Zero)
        {
            Win32.UnhookWindowsHookEx(_mouseHook);
            _mouseHook = IntPtr.Zero;
        }
        if (_kbHook != IntPtr.Zero)
        {
            Win32.UnhookWindowsHookEx(_kbHook);
            _kbHook = IntPtr.Zero;
        }
        _mouseProc = null;
        _kbProc = null;
    }

    public void Dispose()
    {
        Stop();
        GC.SuppressFinalize(this);
    }
}
