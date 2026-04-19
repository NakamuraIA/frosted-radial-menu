// Models/AppConfig.cs — Root config model for YAML serialization.
using System.Collections.Generic;
using YamlDotNet.Serialization;

namespace MenuRadialCS.Models;

public class AppConfig
{
    [YamlMember(Alias = "menu")]
    public MenuConfig Menu { get; set; } = new();

    [YamlMember(Alias = "settings")]
    public AppSettings Settings { get; set; } = new();
}

public class MenuConfig
{
    [YamlMember(Alias = "label")]
    public string Label { get; set; } = "Root";

    [YamlMember(Alias = "items")]
    public List<MenuItem> Items { get; set; } = new();
}

public class AppSettings
{
    [YamlMember(Alias = "inner_radius")]
    public int InnerRadius { get; set; } = 55;

    [YamlMember(Alias = "outer_radius")]
    public int OuterRadius { get; set; } = 155;

    [YamlMember(Alias = "max_items_per_level")]
    public int MaxItemsPerLevel { get; set; } = 8;

    [YamlMember(Alias = "animation_duration_ms")]
    public int AnimationDurationMs { get; set; } = 500;

    [YamlMember(Alias = "ghost_opacity")]
    public double GhostOpacity { get; set; } = 0.3;

    [YamlMember(Alias = "accent_color")]
    public string AccentColor { get; set; } = "#00DCFF";

    [YamlMember(Alias = "secondary_accent_color")]
    public string SecondaryAccentColor { get; set; } = "#FF007A";

    [YamlMember(Alias = "enable_monitoring")]
    public bool EnableMonitoring { get; set; } = true;

    [YamlMember(Alias = "background_tint")]
    public string BackgroundTint { get; set; } = "rgba(0, 0, 0, 0.6)";

    [YamlMember(Alias = "hotkey")]
    public string Hotkey { get; set; } = "mouse_middle";

    [YamlMember(Alias = "autostart")]
    public bool Autostart { get; set; } = false;
}
