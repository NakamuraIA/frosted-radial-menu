// Services/MonitorService.cs — Monitoramento de CPU e relógio.
// Port de _update_monitoring do menu_window.py
using System;
using System.Diagnostics;
using System.Globalization;
using System.Windows.Threading;

namespace MenuRadialCS.Services;

/// <summary>Monitora CPU% e relógio/data em tempo real.</summary>
public class MonitorService : IDisposable
{
    private readonly DispatcherTimer _timer;
    private PerformanceCounter? _cpuCounter;

    public float CpuPercent { get; private set; }
    public string ClockText { get; private set; } = "--:--";
    public string DateText { get; private set; } = "";

    public event Action<float, string, string>? MonitorUpdated;

    public MonitorService()
    {
        try
        {
            _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
            _cpuCounter.NextValue(); // Primeiro valor sempre retorna 0
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[monitor] PerformanceCounter falhou: {ex.Message}");
            _cpuCounter = null;
        }

        _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _timer.Tick += OnTick;
    }

    public void Start()
    {
        OnTick(this, EventArgs.Empty); // Primeira leitura imediata
        _timer.Start();
    }

    public void Stop() => _timer.Stop();

    private void OnTick(object? sender, EventArgs e)
    {
        try
        {
            CpuPercent = _cpuCounter?.NextValue() ?? 0f;
            var now = DateTime.Now;
            ClockText = now.ToString("HH:mm");
            DateText = now.ToString("ddd, MMM dd", CultureInfo.InvariantCulture).ToUpper();
            MonitorUpdated?.Invoke(CpuPercent, ClockText, DateText);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[monitor] Erro: {ex.Message}");
        }
    }

    public void Dispose()
    {
        _timer.Stop();
        _cpuCounter?.Dispose();
        GC.SuppressFinalize(this);
    }
}
