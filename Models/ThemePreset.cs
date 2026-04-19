// Models/ThemePreset.cs — Preset themes for the radial menu.
using System.Collections.Generic;

namespace MenuRadialCS.Models;

public class ThemePreset
{
    public string Name { get; }
    public string AccentColor { get; }
    public string SecondaryColor { get; }
    public string Description { get; }

    public ThemePreset(string name, string accent, string secondary, string description)
    {
        Name = name;
        AccentColor = accent;
        SecondaryColor = secondary;
        Description = description;
    }

    public static readonly List<ThemePreset> All = new()
    {
        new("Default",    "#00DCFF", "#FF007A", "Cyan + Pink"),
        new("Cyberpunk",  "#FF003C", "#FFE100", "Vermelho neon + Amarelo"),
        new("Nord",       "#88C0D0", "#B48EAD", "Azul gelo + Lavanda"),
        new("Dracula",    "#BD93F9", "#FF79C6", "Roxo + Pink"),
        new("Synthwave",  "#FF00FF", "#00FFFF", "Magenta + Cyan"),
        new("Ember",      "#FF6B35", "#FFC107", "Laranja + Amber"),
        new("Ocean",      "#0077B6", "#00B4D8", "Azul marinho + Sky"),
        new("Emerald",    "#00C853", "#B2FF59", "Verde + Lima"),
        new("Sunset",     "#FF5722", "#E040FB", "Laranja quente + Fúcsia"),
    };
}
