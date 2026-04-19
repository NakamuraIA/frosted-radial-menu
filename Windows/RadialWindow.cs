// Windows/RadialWindow.cs — Overlay principal do menu radial.
// Port 1:1 de menu_window.py (702 linhas)
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Threading;
using MenuRadialCS.Controls;
using MenuRadialCS.Models;
using MenuRadialCS.Native;
using MenuRadialCS.Services;
using Forms = System.Windows.Forms;

namespace MenuRadialCS.Windows;

/// <summary>
/// Janela overlay transparente do menu radial.
/// Gerencia tray icon, hotkeys, hooks, e janelas filhas.
/// </summary>
public class RadialWindow : Window
{
    // Services
    private readonly ConfigService _configService;
    private readonly ActionService _actionService;
    private readonly MonitorService _monitorService;
    private HotkeyService? _hotkeyService;
    private SvgIconService? _svgService;

    // State
    private readonly StateManager _stateManager = new();
    private bool _isMenuVisible;

    // UI
    private readonly RadialControl _radialControl;

    // System Tray
    private Forms.NotifyIcon? _trayIcon;

    // Mouse hook (clicar fora)
    private IntPtr _outsideHook;
    private Win32.LowLevelMouseProc? _outsideProc;

    // Window properties
    private IntPtr _hwnd;

    public RadialWindow(ConfigService configService)
    {
        _configService = configService;
        _actionService = new ActionService();
        _monitorService = new MonitorService();

        // Window settings
        WindowStyle = WindowStyle.None;
        AllowsTransparency = true;
        Background = Brushes.Transparent;
        Topmost = true;
        ShowInTaskbar = false;
        ResizeMode = ResizeMode.NoResize;

        // RadialControl
        _radialControl = new RadialControl();
        Content = _radialControl;

        // Events
        _radialControl.ItemClicked += OnItemClicked;
        _radialControl.SubItemClicked += OnSubItemClicked;
        _radialControl.BackClicked += OnBackClicked;
        _radialControl.CloseRequested += HideMenu;
        _radialControl.EditRequested += OnEditRequested;
        _radialControl.MoveRequested += OnMoveRequested;
        _radialControl.RemoveRequested += OnRemoveRequested;

        _stateManager.LevelChanged += OnLevelChanged;
        _stateManager.MenuClosed += HideMenu;

        _monitorService.MonitorUpdated += (cpu, clock, date) =>
            _radialControl.UpdateMonitor(cpu, clock, date);

        _actionService.ActionExecuted += label =>
            Console.WriteLine($"[menu] Ação executada: {label}");

        Loaded += OnLoaded;
    }

    // ═══════════════════════════════════════════════════════
    //  LIFECYCLE
    // ═══════════════════════════════════════════════════════
    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        _hwnd = new WindowInteropHelper(this).Handle;
        DwmHelper.ApplyTransparencyFixes(_hwnd);

        var settings = _configService.Config.Settings;
        var items = _configService.Config.Menu.Items;

        // Resolve icons dir
        var baseDir = System.IO.Path.GetDirectoryName(_configService.ConfigPath) ?? ".";
        var iconsDir = System.IO.Path.Combine(baseDir, "..", "Assets", "Icons");
        if (!System.IO.Directory.Exists(iconsDir))
            iconsDir = System.IO.Path.Combine(baseDir, "Icons");
        if (!System.IO.Directory.Exists(iconsDir))
            iconsDir = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Assets", "Icons");

        _svgService = new SvgIconService(iconsDir);

        _radialControl.Setup(
            items,
            settings.InnerRadius, settings.OuterRadius,
            ParseColor(settings.AccentColor),
            ParseColor(settings.SecondaryAccentColor),
            settings.EnableMonitoring,
            settings.GhostOpacity,
            _svgService);

        _stateManager.Reset(items);

        // Monitor
        if (settings.EnableMonitoring)
            _monitorService.Start();

        // Hotkey
        _hotkeyService = new HotkeyService(settings.Hotkey, Dispatcher);
        _hotkeyService.HotkeyTriggered += OnHotkeyTriggered;

        // System Tray
        SetupTrayIcon();

        // Começar escondido
        HideMenu();

        Console.WriteLine("[menu] Menu Radial iniciado.");
    }

    // ═══════════════════════════════════════════════════════
    //  SHOW / HIDE
    // ═══════════════════════════════════════════════════════
    private void OnHotkeyTriggered()
    {
        if (_isMenuVisible)
            HideMenu();
        else
            ShowMenu();
    }

    private void ShowMenu()
    {
        if (_isMenuVisible) return;

        // Posicionar no cursor (com margem para o glow)
        var cursorPos = Forms.Cursor.Position;
        var size = _radialControl.GetSize();
        int padding = 30;  // margem para glow/shadow não ser cortado
        Left = cursorPos.X - size / 2.0 - padding;
        Top = cursorPos.Y - size / 2.0 - padding;
        Width = size + padding * 2;
        Height = size + padding * 2;

        // Reset state
        _stateManager.Reset(_configService.Config.Menu.Items);

        Show();
        Activate();
        _isMenuVisible = true;

        // Animação de abertura
        _radialControl.PlayOpenAnimation();

        // Instalar hook para clicar fora (com delay de 100ms)
        var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(100) };
        timer.Tick += (_, _) =>
        {
            timer.Stop();
            InstallOutsideClickHook();
        };
        timer.Start();
    }

    public void HideMenu()
    {
        if (!_isMenuVisible && !IsVisible) return;

        _isMenuVisible = false;
        UninstallOutsideClickHook();

        // Animação de fechamento → depois esconde a janela
        _radialControl.PlayCloseAnimation(() =>
        {
            Dispatcher.BeginInvoke(() => Hide());
        });
    }

    /// <summary>Esconde sem animação (para quando precisa ser imediato).</summary>
    private void HideMenuImmediate()
    {
        _isMenuVisible = false;
        UninstallOutsideClickHook();
        Hide();
    }

    // ═══════════════════════════════════════════════════════
    //  ITEM ACTIONS
    // ═══════════════════════════════════════════════════════
    private void OnItemClicked(MenuItem item)
    {
        // Items com children são tratados pelo submenu inline (hover)
        // Se clicar num item com children, o RadialControl já cuida
        if (!item.HasChildren)
        {
            HideMenu();
            var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(50) };
            timer.Tick += (_, _) =>
            {
                timer.Stop();
                _actionService.Execute(item.Action, item.Target, item.Label);
            };
            timer.Start();
        }
    }

    private void OnSubItemClicked(MenuItem item)
    {
        HideMenu();
        var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(50) };
        timer.Tick += (_, _) =>
        {
            timer.Stop();
            _actionService.Execute(item.Action, item.Target, item.Label);
        };
        timer.Start();
    }

    private void OnBackClicked()
    {
        _stateManager.Pop();
    }

    private void OnLevelChanged(List<MenuItem> items, int depth, string direction)
    {
        _radialControl.SetItems(items, _stateManager.GhostLevels);
    }

    // ═══════════════════════════════════════════════════════
    //  CONTEXT MENU ACTIONS
    // ═══════════════════════════════════════════════════════
    private void OnEditRequested(MenuItem item)
    {
        HideMenu();
        Dispatcher.BeginInvoke(() =>
        {
            var dlg = new AppEditDialog(item, _configService.Config.Settings.AccentColor);
            dlg.ShowDialog();
            RefreshItems();
        });
    }

    private void OnMoveRequested(int idx, int direction)
    {
        var items = _stateManager.Current;
        int newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= items.Count) return;

        // Swap
        (items[idx], items[newIdx]) = (items[newIdx], items[idx]);
        _configService.Save();
        _radialControl.SetItems(items, _stateManager.GhostLevels);
    }

    private void OnRemoveRequested(int idx)
    {
        var items = _stateManager.Current;
        if (idx < 0 || idx >= items.Count) return;

        items.RemoveAt(idx);
        _configService.Save();
        _radialControl.SetItems(items, _stateManager.GhostLevels);
    }

    private void RefreshItems()
    {
        _configService.Load();
        _stateManager.Reset(_configService.Config.Menu.Items);
    }

    // ═══════════════════════════════════════════════════════
    //  OUTSIDE CLICK HOOK
    // ═══════════════════════════════════════════════════════
    private void InstallOutsideClickHook()
    {
        if (_outsideHook != IntPtr.Zero) return;
        _outsideProc = OutsideMouseHookProc;
        using var proc = Process.GetCurrentProcess();
        using var mod = proc.MainModule!;
        _outsideHook = Win32.SetWindowsHookEx(Win32.WH_MOUSE_LL, _outsideProc,
            Win32.GetModuleHandle(mod.ModuleName), 0);
    }

    private void UninstallOutsideClickHook()
    {
        if (_outsideHook != IntPtr.Zero)
        {
            Win32.UnhookWindowsHookEx(_outsideHook);
            _outsideHook = IntPtr.Zero;
            _outsideProc = null;
        }
    }

    private IntPtr OutsideMouseHookProc(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && _isMenuVisible)
        {
            var msg = (int)wParam;
            if (msg == Win32.WM_LBUTTONDOWN || msg == Win32.WM_RBUTTONDOWN)
            {
                var hookStruct = Marshal.PtrToStructure<Win32.MSLLHOOKSTRUCT>(lParam);
                var clickPt = new Point(hookStruct.pt.X, hookStruct.pt.Y);

                // Centro do menu
                var center = new Point(Left + Width / 2, Top + Height / 2);
                double dist = Distance(clickPt, center);
                double maxR = _configService.Config.Settings.OuterRadius + 100; // extra para submenu

                if (dist > maxR)
                {
                    Dispatcher.BeginInvoke(HideMenu);
                }
            }
        }
        return Win32.CallNextHookEx(_outsideHook, nCode, wParam, lParam);
    }

    // ═══════════════════════════════════════════════════════
    //  SYSTEM TRAY
    // ═══════════════════════════════════════════════════════
    private void SetupTrayIcon()
    {
        _trayIcon = new Forms.NotifyIcon
        {
            Text = "Menu Radial",
            Visible = true,
            Icon = CreateTrayIcon(),
        };

        var menu = new Forms.ContextMenuStrip();
        menu.Items.Add("Abrir Menu", null, (_, _) => Dispatcher.BeginInvoke(ShowMenu));
        menu.Items.Add("Configurações", null, (_, _) => Dispatcher.BeginInvoke(OpenSettings));
        menu.Items.Add("Recarregar Config", null, (_, _) => Dispatcher.BeginInvoke(ReloadConfig));
        menu.Items.Add("-");
        menu.Items.Add("Sair", null, (_, _) => Dispatcher.BeginInvoke(ExitApp));

        _trayIcon.ContextMenuStrip = menu;
        _trayIcon.DoubleClick += (_, _) => Dispatcher.BeginInvoke(ShowMenu);
    }

    private static System.Drawing.Icon CreateTrayIcon()
    {
        // Criar ícone programático (círculo cyan sobre fundo transparente)
        using var bmp = new System.Drawing.Bitmap(32, 32);
        using var g = System.Drawing.Graphics.FromImage(bmp);
        g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
        g.Clear(System.Drawing.Color.Transparent);
        using var brush = new System.Drawing.SolidBrush(System.Drawing.Color.FromArgb(0, 220, 255));
        g.FillEllipse(brush, 2, 2, 28, 28);
        using var pen = new System.Drawing.Pen(System.Drawing.Color.White, 1.5f);
        g.DrawEllipse(pen, 2, 2, 28, 28);
        return System.Drawing.Icon.FromHandle(bmp.GetHicon());
    }

    private void OpenSettings()
    {
        HideMenu();
        var settings = new SettingsWindow(_configService);
        settings.SettingsSaved += () =>
        {
            ReloadConfig();
            Console.WriteLine("[menu] Configurações salvas e recarregadas.");
        };
        settings.ShowDialog();
    }

    private void ReloadConfig()
    {
        try
        {
            _configService.Load();
            var settings = _configService.Config.Settings;
            var items = _configService.Config.Menu.Items;

            _radialControl.Setup(items, settings.InnerRadius, settings.OuterRadius,
                ParseColor(settings.AccentColor), ParseColor(settings.SecondaryAccentColor),
                settings.EnableMonitoring, settings.GhostOpacity, _svgService!);

            _stateManager.Reset(items);
            _hotkeyService?.UpdateHotkey(settings.Hotkey);
            Console.WriteLine("[menu] Config recarregada.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[menu] ERRO ao recarregar config: {ex}");
        }
    }

    private void ExitApp()
    {
        _hotkeyService?.Dispose();
        _monitorService.Dispose();
        _radialControl.StopGlow();
        UninstallOutsideClickHook();
        if (_trayIcon != null)
        {
            _trayIcon.Visible = false;
            _trayIcon.Dispose();
        }
        Application.Current.Shutdown();
    }

    // ═══════════════════════════════════════════════════════
    //  KEY EVENTS
    // ═══════════════════════════════════════════════════════
    protected override void OnKeyDown(System.Windows.Input.KeyEventArgs e)
    {
        if (e.Key == System.Windows.Input.Key.Escape)
        {
            HideMenu();
            e.Handled = true;
        }
    }

    // ═══════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════
    private static double Distance(Point a, Point b)
        => Math.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y));

    public static Color ParseColor(string hex)
    {
        try { return (Color)ColorConverter.ConvertFromString(hex); }
        catch { return Color.FromArgb(255, 0, 220, 255); }
    }
}
