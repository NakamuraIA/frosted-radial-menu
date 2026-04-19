// App.xaml.cs — Entry point do Menu Radial C#.
// Port de main.py
using System;
using System.IO;
using System.Windows;
using MenuRadialCS.Services;
using MenuRadialCS.Windows;

namespace MenuRadialCS;

public partial class App : Application
{
    private RadialWindow? _mainWindow;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // Global exception handlers — log e não fechar silenciosamente
        DispatcherUnhandledException += (_, args) =>
        {
            Console.WriteLine($"\n[CRASH] Unhandled UI Exception:\n{args.Exception}");
            MessageBox.Show($"Erro: {args.Exception.Message}\n\n{args.Exception.StackTrace}",
                "Menu Radial - Erro", MessageBoxButton.OK, MessageBoxImage.Error);
            args.Handled = true;  // Não fechar o app
        };
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            var ex = args.ExceptionObject as Exception;
            Console.WriteLine($"\n[CRASH] Unhandled Exception:\n{ex}");
        };

        // Resolve config path
        var baseDir = AppDomain.CurrentDomain.BaseDirectory;
        var configPath = Path.Combine(baseDir, "Config", "config.yaml");

        // Se não existir, criar o diretório
        var configDir = Path.GetDirectoryName(configPath)!;
        if (!Directory.Exists(configDir))
            Directory.CreateDirectory(configDir);

        // Se não existir config, criar um padrão
        if (!File.Exists(configPath))
            CreateDefaultConfig(configPath);

        Console.WriteLine($"[main] Config: {configPath}");

        var configService = new ConfigService(configPath);

        _mainWindow = new RadialWindow(configService);
        _mainWindow.Show(); // Mostra mas fica escondido (HideMenu é chamado no OnLoaded)

        Console.WriteLine("[main] Menu Radial C# iniciado.");
    }

    protected override void OnExit(ExitEventArgs e)
    {
        base.OnExit(e);
        Console.WriteLine("[main] Menu Radial encerrado.");
    }

    private static void CreateDefaultConfig(string path)
    {
        var yaml = @"menu:
  label: Root
  items:
    - label: Explorer
      icon: folder
      action: run
      target: explorer.exe
      icon_mode: svg
      icon_scale: 0.9
    - label: Notepad
      icon: file-text
      action: run
      target: notepad.exe
      icon_mode: svg
      icon_scale: 1.0
    - label: Calc
      icon: calculator
      action: run
      target: calc.exe
      icon_mode: svg
      icon_scale: 1.0
    - label: CMD
      icon: terminal
      action: run
      target: cmd.exe
      icon_mode: svg
      icon_scale: 1.0
    - label: Google
      icon: globe
      action: url
      target: https://www.google.com
      icon_mode: svg
      icon_scale: 1.0
    - label: Clipboard
      icon: clipboard
      action: clipboard_history
      target: ''
      icon_mode: svg
      icon_scale: 1.0

settings:
  inner_radius: 55
  outer_radius: 155
  max_items_per_level: 8
  animation_duration_ms: 500
  ghost_opacity: 0.3
  accent_color: '#00DCFF'
  secondary_accent_color: '#FF007A'
  enable_monitoring: true
  background_tint: 'rgba(0, 0, 0, 0.6)'
  hotkey: mouse_middle
  autostart: false
";
        File.WriteAllText(path, yaml);
        Console.WriteLine("[main] Config padrão criada.");
    }
}
