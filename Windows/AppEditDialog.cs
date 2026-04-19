// Windows/AppEditDialog.cs — Diálogo de edição de app (port de AppEditDialog em settings_window.py).
using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using MenuRadialCS.Models;
using MenuItem = MenuRadialCS.Models.MenuItem;

namespace MenuRadialCS.Windows;

/// <summary>Diálogo para adicionar/editar um item do menu.</summary>
public class AppEditDialog : Window
{
    private const string DARK_BG = "#0F111A";
    private const string PANEL_BG = "#161927";
    private const string CARD_BG = "#1C2033";
    private const string BORDER = "#2A2F45";
    private const string TEXT_PRIMARY = "#E8EAF6";
    private const string TEXT_MUTED = "#8892B0";

    private readonly string _accentHex;  // cor do tema (segue config)

    private readonly TextBox _labelEdit;
    private readonly TextBox _targetEdit;
    private readonly TextBox _iconPathEdit;
    private readonly Slider _scaleSlider;
    private string _currentAction = "run";
    private string _currentIconMode = "auto";

    // Action type pills
    private readonly string[] _actionTypes = { "run", "url", "folder", "script", "shortcut" };
    private readonly string[] _actionLabels = { "⚙ Programa", "🌐 Site", "📁 Pasta", "🐍 Script", "⌨ Atalho" };
    private readonly Button[] _actionButtons;

    // Icon mode pills
    private readonly string[] _iconModes = { "auto", "custom", "svg" };
    private readonly string[] _iconLabels = { "🖥 Sistema", "🖼 Imagem", "✦ SVG" };
    private readonly Button[] _iconButtons;

    public MenuItem ResultItem { get; private set; } = new();

    public AppEditDialog(MenuItem? existing = null, string accentColor = "#00DCFF")
    {
        _accentHex = accentColor;
        Title = existing == null ? "Adicionar App" : "Editar App";
        WindowStyle = WindowStyle.None;
        AllowsTransparency = true;
        Background = Brushes.Transparent;
        Width = 460;
        Height = 510;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        ResizeMode = ResizeMode.NoResize;

        if (existing != null)
        {
            ResultItem = existing.Clone();
            _currentAction = existing.Action;
            _currentIconMode = existing.IconMode;
        }

        var mainBorder = new Border
        {
            CornerRadius = new CornerRadius(16),
            BorderBrush = Brush(BORDER), BorderThickness = new Thickness(1.5),
            Background = Brush(DARK_BG), Padding = new Thickness(20),
        };
        _iconPathEdit = new TextBox { Text = ResultItem.CustomIcon }; // hidden, used in Save

        var stack = new StackPanel();

        // ── Header (icon + title + close) ──
        var headerGrid = new Grid { Margin = new Thickness(0, 0, 0, 12) };
        headerGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        headerGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        headerGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        // App icon no header
        var headerIcon = new Border
        {
            Width = 40, Height = 40,
            CornerRadius = new CornerRadius(12),
            Background = Brush(_accentHex),
            Margin = new Thickness(0, 0, 12, 0),
            VerticalAlignment = VerticalAlignment.Center,
        };
        if (existing != null)
        {
            var icon = Services.IconService.GetAppIcon(existing.Action, existing.Target, 32);
            if (icon != null)
            {
                var iconImg = new System.Windows.Controls.Image
                {
                    Source = icon, Width = 24, Height = 24,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    VerticalAlignment = VerticalAlignment.Center,
                };
                RenderOptions.SetBitmapScalingMode(iconImg, BitmapScalingMode.HighQuality);
                headerIcon.Child = iconImg;
            }
            else
            {
                headerIcon.Child = new TextBlock
                {
                    Text = GetActionEmoji(existing.Action),
                    FontSize = 16,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    VerticalAlignment = VerticalAlignment.Center,
                };
            }
        }
        else
        {
            headerIcon.Child = new TextBlock
            {
                Text = "➕", FontSize = 16,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
            };
        }
        Grid.SetColumn(headerIcon, 0);
        headerGrid.Children.Add(headerIcon);

        // Title + subtitle
        var headerInfo = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
        headerInfo.Children.Add(new TextBlock
        {
            Text = existing == null ? "Adicionar App" : "Editar App",
            FontSize = 15, FontWeight = FontWeights.Bold,
            Foreground = Brush(TEXT_PRIMARY),
        });
        headerInfo.Children.Add(new TextBlock
        {
            Text = "Altere as informações abaixo",
            FontSize = 10.5, Foreground = Brush(TEXT_MUTED),
        });
        Grid.SetColumn(headerInfo, 1);
        headerGrid.Children.Add(headerInfo);

        // Close button
        var closePath = new System.Windows.Shapes.Path
        {
            Data = Geometry.Parse("M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"),
            Fill = Brush(TEXT_MUTED),
            Stretch = Stretch.Uniform,
            Width = 13, Height = 13,
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center,
        };
        var closeTpl = new ControlTemplate(typeof(Button));
        var closeBorder = new FrameworkElementFactory(typeof(Border));
        closeBorder.SetValue(Border.BackgroundProperty, (System.Windows.Media.Brush)new SolidColorBrush(Color.FromArgb(20, 255, 255, 255)));
        closeBorder.SetValue(Border.CornerRadiusProperty, new CornerRadius(16));
        closeBorder.SetValue(Border.PaddingProperty, new Thickness(4));
        var closeCp = new FrameworkElementFactory(typeof(ContentPresenter));
        closeCp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
        closeCp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
        closeBorder.AppendChild(closeCp);
        closeTpl.VisualTree = closeBorder;
        var closeBtn = new Button
        {
            Content = closePath, Width = 32, Height = 32,
            Cursor = Cursors.Hand, Template = closeTpl,
        };
        closeBtn.Click += (_, _) => { DialogResult = false; Close(); };
        Grid.SetColumn(closeBtn, 2);
        headerGrid.Children.Add(closeBtn);
        stack.Children.Add(headerGrid);

        // ── Separator ──
        stack.Children.Add(new Border
        {
            Height = 1, Background = Brush(BORDER),
            Margin = new Thickness(0, 0, 0, 14),
        });

        // ── Label ──
        stack.Children.Add(Label("NOME DO APP"));
        _labelEdit = TextInput(ResultItem.Label, "Ex: Visual Studio Code");
        stack.Children.Add(_labelEdit);
        stack.Children.Add(new Border { Height = 12 });

        // ── Action type pills ──
        stack.Children.Add(Label("TIPO DE AÇÃO"));
        _actionButtons = new Button[_actionTypes.Length];
        var actionPanel = new WrapPanel { Margin = new Thickness(0, 4, 0, 0) };
        for (int i = 0; i < _actionTypes.Length; i++)
        {
            int idx = i;
            var btn = Pill(_actionLabels[i], _actionTypes[i] == _currentAction);
            btn.Click += (_, _) => SelectAction(idx);
            _actionButtons[i] = btn;
            actionPanel.Children.Add(btn);
        }
        stack.Children.Add(actionPanel);
        stack.Children.Add(new Border { Height = 12 });

        // ── Target ──
        stack.Children.Add(Label("CAMINHO / URL"));
        var targetPanel = new DockPanel();
        _targetEdit = TextInput(ResultItem.Target, "Ex: code.exe ou https://...");

        // Browse button (ícone de pasta)
        var browseBtn = new Border
        {
            Width = 40, Height = 38,
            CornerRadius = new CornerRadius(8),
            Background = Brush(_accentHex),
            Cursor = Cursors.Hand,
            Margin = new Thickness(8, 0, 0, 0),
            Child = new TextBlock
            {
                Text = "📁", FontSize = 16,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
            },
        };
        browseBtn.MouseLeftButtonDown += (_, _) => BrowseTarget();
        DockPanel.SetDock(browseBtn, Dock.Right);
        targetPanel.Children.Add(browseBtn);
        targetPanel.Children.Add(_targetEdit);
        stack.Children.Add(targetPanel);
        stack.Children.Add(new Border { Height = 12 });

        // ── Icon mode pills ──
        stack.Children.Add(Label("MODO DE ÍCONE"));
        _iconButtons = new Button[_iconModes.Length];
        var iconPanel = new WrapPanel { Margin = new Thickness(0, 4, 0, 0) };
        for (int i = 0; i < _iconModes.Length; i++)
        {
            int idx = i;
            var btn = Pill(_iconLabels[i], _iconModes[i] == _currentIconMode);
            btn.Click += (_, _) => SelectIconMode(idx);
            _iconButtons[i] = btn;
            iconPanel.Children.Add(btn);
        }
        stack.Children.Add(iconPanel);
        stack.Children.Add(new Border { Height = 12 });

        // ── Scale slider com +/- buttons ──
        var scaleHeader = new Grid();
        scaleHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        scaleHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        scaleHeader.Children.Add(Label("TAMANHO DO ÍCONE"));
        var _scaleLabel = new TextBlock
        {
            FontSize = 10.5, Foreground = Brush(TEXT_MUTED),
            HorizontalAlignment = HorizontalAlignment.Right,
            VerticalAlignment = VerticalAlignment.Center,
        };
        Grid.SetColumn(_scaleLabel, 1);
        scaleHeader.Children.Add(_scaleLabel);
        stack.Children.Add(scaleHeader);

        var sliderRow = new Grid { Margin = new Thickness(0, 4, 0, 0) };
        sliderRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        sliderRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        sliderRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        // Minus button
        var minusBtn = new Border
        {
            Width = 30, Height = 30,
            CornerRadius = new CornerRadius(15),
            Background = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)),
            Cursor = Cursors.Hand,
            Child = new TextBlock
            {
                Text = "−", FontSize = 16, FontWeight = FontWeights.Bold,
                Foreground = Brush(TEXT_PRIMARY),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
            },
        };
        Grid.SetColumn(minusBtn, 0);
        sliderRow.Children.Add(minusBtn);

        // Custom slider com track preenchida
        var sliderContainer = new Grid
        {
            Height = 30,
            Margin = new Thickness(8, 0, 8, 0),
            VerticalAlignment = VerticalAlignment.Center,
        };

        // Track background (dark)
        var trackBg = new Border
        {
            Height = 6,
            CornerRadius = new CornerRadius(3),
            Background = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
            VerticalAlignment = VerticalAlignment.Center,
        };
        sliderContainer.Children.Add(trackBg);

        // Track fill (accent color)
        var trackFill = new Border
        {
            Height = 6,
            CornerRadius = new CornerRadius(3),
            Background = Brush(_accentHex),
            VerticalAlignment = VerticalAlignment.Center,
            HorizontalAlignment = HorizontalAlignment.Left,
            Width = 0,
        };
        sliderContainer.Children.Add(trackFill);

        _scaleSlider = new Slider
        {
            Minimum = 50, Maximum = 200,
            Value = ResultItem.IconScale * 100,
            TickFrequency = 10, IsSnapToTickEnabled = true,
            VerticalAlignment = VerticalAlignment.Center,
            Background = Brushes.Transparent,
        };
        sliderContainer.Children.Add(_scaleSlider);

        // Update fill on value change
        void UpdateFill()
        {
            if (sliderContainer.ActualWidth <= 0) return;
            double pct = (_scaleSlider.Value - _scaleSlider.Minimum) / (_scaleSlider.Maximum - _scaleSlider.Minimum);
            trackFill.Width = Math.Max(6, sliderContainer.ActualWidth * pct);
        }
        _scaleSlider.ValueChanged += (_, _) => UpdateFill();
        sliderContainer.SizeChanged += (_, _) => UpdateFill();
        sliderContainer.Loaded += (_, _) => UpdateFill();

        Grid.SetColumn(sliderContainer, 1);
        sliderRow.Children.Add(sliderContainer);

        // Plus button
        var plusBtn = new Border
        {
            Width = 30, Height = 30,
            CornerRadius = new CornerRadius(15),
            Background = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)),
            Cursor = Cursors.Hand,
            Child = new TextBlock
            {
                Text = "+", FontSize = 16, FontWeight = FontWeights.Bold,
                Foreground = Brush(TEXT_PRIMARY),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
            },
        };
        Grid.SetColumn(plusBtn, 2);
        sliderRow.Children.Add(plusBtn);

        // Slider events
        void UpdateScaleLabel()
        {
            double scalePct = _scaleSlider.Value;
            double approxPx = scalePct / 100.0 * 52;
            _scaleLabel.Text = $"{scalePct:F0}% ≈ {approxPx:F0}px";
        }
        _scaleSlider.ValueChanged += (_, _) => UpdateScaleLabel();
        minusBtn.MouseLeftButtonDown += (_, _) => { _scaleSlider.Value = Math.Max(_scaleSlider.Minimum, _scaleSlider.Value - 10); };
        plusBtn.MouseLeftButtonDown += (_, _) => { _scaleSlider.Value = Math.Min(_scaleSlider.Maximum, _scaleSlider.Value + 10); };
        UpdateScaleLabel();

        stack.Children.Add(sliderRow);
        stack.Children.Add(new Border { Height = 20 });

        // ── Footer buttons ──
        var footerPanel = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            HorizontalAlignment = HorizontalAlignment.Right,
        };

        var cancelBtn = new Border
        {
            CornerRadius = new CornerRadius(10),
            Background = Brushes.Transparent,
            BorderBrush = new SolidColorBrush(Color.FromArgb(50, 255, 255, 255)),
            BorderThickness = new Thickness(1),
            Padding = new Thickness(20, 8, 20, 8),
            Cursor = Cursors.Hand,
            Margin = new Thickness(0, 0, 10, 0),
            Child = new TextBlock
            {
                Text = "Cancelar", FontSize = 12,
                Foreground = Brush(TEXT_MUTED),
                HorizontalAlignment = HorizontalAlignment.Center,
            },
        };
        cancelBtn.MouseLeftButtonDown += (_, _) => { DialogResult = false; Close(); };
        cancelBtn.MouseEnter += (_, _) => cancelBtn.Background = new SolidColorBrush(Color.FromArgb(12, 255, 255, 255));
        cancelBtn.MouseLeave += (_, _) => cancelBtn.Background = Brushes.Transparent;
        footerPanel.Children.Add(cancelBtn);

        var saveBtn = new Border
        {
            CornerRadius = new CornerRadius(10),
            Background = Brush(_accentHex),
            Padding = new Thickness(24, 8, 24, 8),
            Cursor = Cursors.Hand,
            Child = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Children =
                {
                    new TextBlock
                    {
                        Text = "Salvar  →", FontSize = 12,
                        FontWeight = FontWeights.Bold,
                        Foreground = Brushes.Black,
                    },
                },
            },
        };
        saveBtn.MouseLeftButtonDown += (_, _) => Save();
        footerPanel.Children.Add(saveBtn);

        stack.Children.Add(footerPanel);

        mainBorder.Child = stack;
        Content = mainBorder;
    }

    // ═══════════════════════════════════════════════════════
    //  PILL SELECTION
    // ═══════════════════════════════════════════════════════
    private void SelectAction(int idx)
    {
        _currentAction = _actionTypes[idx];
        for (int i = 0; i < _actionButtons.Length; i++)
            UpdatePill(_actionButtons[i], i == idx);
    }

    private void SelectIconMode(int idx)
    {
        _currentIconMode = _iconModes[idx];
        for (int i = 0; i < _iconButtons.Length; i++)
            UpdatePill(_iconButtons[i], i == idx);
    }

    private void UpdatePill(Button btn, bool active)
    {
        var bg = active ? Brush(_accentHex) : new SolidColorBrush(Color.FromArgb(15, 255, 255, 255));
        btn.Template = RoundedTemplate(bg, 8, 6);
        btn.Foreground = active ? Brushes.Black : Brush(TEXT_PRIMARY);
        btn.FontWeight = active ? FontWeights.Bold : FontWeights.Normal;
    }

    // ═══════════════════════════════════════════════════════
    //  BROWSE  
    // ═══════════════════════════════════════════════════════
    private void BrowseTarget()
    {
        var dlg = new Microsoft.Win32.OpenFileDialog
        {
            Filter = "Executáveis|*.exe;*.lnk;*.bat;*.cmd|Todos|*.*",
        };
        if (dlg.ShowDialog() == true)
            _targetEdit.Text = dlg.FileName;
    }

    private void BrowseIcon()
    {
        var dlg = new Microsoft.Win32.OpenFileDialog
        {
            Filter = "Imagens|*.png;*.ico;*.jpg;*.bmp|SVG|*.svg|Todos|*.*",
        };
        if (dlg.ShowDialog() == true)
            _iconPathEdit.Text = dlg.FileName;
    }

    // ═══════════════════════════════════════════════════════
    //  SAVE
    // ═══════════════════════════════════════════════════════
    private void Save()
    {
        ResultItem.Label = _labelEdit.Text.Trim();
        ResultItem.Action = _currentAction;
        ResultItem.Target = _targetEdit.Text.Trim();
        ResultItem.IconMode = _currentIconMode;
        ResultItem.IconScale = Math.Round(_scaleSlider.Value / 100.0, 2);
        if (_currentIconMode == "custom")
            ResultItem.CustomIcon = _iconPathEdit.Text.Trim();
        else
            ResultItem.CustomIcon = "";

        DialogResult = true;
        Close();
    }

    // ═══════════════════════════════════════════════════════
    //  UI HELPERS
    // ═══════════════════════════════════════════════════════
    protected override void OnMouseLeftButtonDown(MouseButtonEventArgs e)
    {
        base.OnMouseLeftButtonDown(e);
        if (e.GetPosition(this).Y < 40)
        {
            try { DragMove(); } catch { }
        }
    }

    private static TextBlock Label(string text) => new()
    {
        Text = text, FontSize = 11, FontWeight = FontWeights.SemiBold,
        Foreground = Brush(TEXT_MUTED), Margin = new Thickness(0, 0, 0, 4),
    };

    private static new TextBox TextInput(string value, string placeholder) => new()
    {
        Text = value, FontSize = 12,
        Foreground = Brush(TEXT_PRIMARY),
        Background = Brush(CARD_BG),
        BorderBrush = Brush(BORDER),
        BorderThickness = new Thickness(1),
        Padding = new Thickness(10, 8, 10, 8),
    };

    private Button Pill(string text, bool active)
    {
        var bg = active ? Brush(_accentHex) : new SolidColorBrush(Color.FromArgb(15, 255, 255, 255));
        return new Button
        {
            Content = text,
            Foreground = active ? Brushes.Black : Brush(TEXT_PRIMARY),
            FontWeight = active ? FontWeights.Bold : FontWeights.Normal,
            Margin = new Thickness(0, 0, 6, 6),
            Cursor = Cursors.Hand, FontSize = 11,
            Template = RoundedTemplate(bg, 8, 6),
        };
    }

    private static ControlTemplate RoundedTemplate(System.Windows.Media.Brush bg, double radius, double pad)
    {
        var template = new ControlTemplate(typeof(Button));
        var border = new FrameworkElementFactory(typeof(Border));
        border.SetValue(Border.BackgroundProperty, bg);
        border.SetValue(Border.CornerRadiusProperty, new CornerRadius(radius));
        border.SetValue(Border.PaddingProperty, new Thickness(pad + 8, pad, pad + 8, pad));
        border.SetValue(Border.SnapsToDevicePixelsProperty, true);
        var cp = new FrameworkElementFactory(typeof(ContentPresenter));
        cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
        cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
        cp.SetValue(ContentPresenter.ContentProperty,
            new TemplateBindingExtension(Button.ContentProperty));
        cp.SetValue(ContentPresenter.ContentTemplateProperty,
            new TemplateBindingExtension(Button.ContentTemplateProperty));
        border.AppendChild(cp);
        template.VisualTree = border;
        return template;
    }

    private static SolidColorBrush Brush(string hex)
    {
        try { return new SolidColorBrush((Color)ColorConverter.ConvertFromString(hex)); }
        catch { return System.Windows.Media.Brushes.White; }
    }

    private static string GetActionEmoji(string action) => action switch
    {
        "run" => "⚙",
        "url" => "🌐",
        "folder" => "📁",
        "script" => "🐍",
        "shortcut" => "⌨",
        _ => "◆",
    };
}
