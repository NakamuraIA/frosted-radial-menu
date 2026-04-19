// Models/MenuItem.cs — Modelo de dados para cada item do menu radial.
// Port 1:1 de menu_item.py
using System.Collections.Generic;
using YamlDotNet.Serialization;

namespace MenuRadialCS.Models;

/// <summary>Representa um item do menu radial com ação e/ou filhos.</summary>
public class MenuItem
{
    [YamlMember(Alias = "label")]
    public string Label { get; set; } = "";

    [YamlMember(Alias = "icon")]
    public string Icon { get; set; } = "";

    [YamlMember(Alias = "action")]
    public string Action { get; set; } = "";

    [YamlMember(Alias = "target")]
    public string Target { get; set; } = "";

    [YamlMember(Alias = "custom_icon")]
    public string CustomIcon { get; set; } = "";

    [YamlMember(Alias = "icon_mode")]
    public string IconMode { get; set; } = "auto";

    [YamlMember(Alias = "icon_scale")]
    public double IconScale { get; set; } = 1.0;

    [YamlMember(Alias = "children")]
    public List<MenuItem>? Children { get; set; }

    [YamlIgnore]
    public bool HasChildren => Children != null && Children.Count > 0;

    /// <summary>Converte para dicionário (usado pelo preview/settings).</summary>
    public Dictionary<string, object> ToDict()
    {
        var d = new Dictionary<string, object>
        {
            ["label"] = Label,
            ["icon"] = Icon,
            ["action"] = Action,
            ["target"] = Target,
            ["custom_icon"] = CustomIcon,
            ["icon_mode"] = IconMode,
            ["icon_scale"] = IconScale,
        };
        if (HasChildren)
        {
            var childList = new List<Dictionary<string, object>>();
            foreach (var c in Children!)
                childList.Add(c.ToDict());
            d["children"] = childList;
        }
        return d;
    }

    /// <summary>Clone profundo do item.</summary>
    public MenuItem Clone()
    {
        var clone = new MenuItem
        {
            Label = Label, Icon = Icon, Action = Action, Target = Target,
            CustomIcon = CustomIcon, IconMode = IconMode, IconScale = IconScale,
        };
        if (HasChildren)
        {
            clone.Children = new List<MenuItem>();
            foreach (var c in Children!)
                clone.Children.Add(c.Clone());
        }
        return clone;
    }
}
