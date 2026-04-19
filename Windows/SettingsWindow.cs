// Windows/SettingsWindow.cs — Janela de configurações (Premium 2026 UI).
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Effects;
using MenuRadialCS.Controls;
using MenuRadialCS.Models;
using MenuItem = MenuRadialCS.Models.MenuItem;
using MenuRadialCS.Services;

namespace MenuRadialCS.Windows;

/// <summary>Janela de configuração do Menu Radial — Premium 2026 UI.</summary>
public class SettingsWindow : Window
{
    // ── Paleta unificada ──
    private const string DARK_BG    = "#0F111A";  // fundo principal
    private const string PANEL_BG   = "#151828";  // painéis laterais + tab bar
    private const string CARD_BG    = "#1C1F35";  // cards + seções
    private const string CARD_BG_HOV = "#232640"; // cards hover
    private const string BORDER     = "#2A2E4A";
    private const string BORDER_LIGHT = "#323660";
    private const string DANGER = "#FF3366";
    private const string SUCCESS = "#00E676";
    private const string TEXT_PRIMARY = "#E8EAF6";
    private const string TEXT_SECONDARY = "#C5CAE9";
    private const string TEXT_MUTED = "#7882A4";
    private string _accentHex;
    private bool _isSettingsTab;

    private readonly ConfigService _configService;
    private List<MenuItem> _items;
    private AppSettings _settings;
    private RadialPreviewControl? _preview;
    private StackPanel? _appsList;
    private TextBlock? _countLabel;
    private TextBlock? _statusLabel;
    private TextBlock? _breadcrumbLabel;

    // ── Settings tab controls ──
    private TextBox? _hotkeyCapture;
    private Border? _colorPreview;
    private TextBlock? _colorLabel;
    private CheckBox? _autostartCheck;

    public event Action? SettingsSaved;

    public SettingsWindow(ConfigService configService)
    {
        _configService = configService;
        _accentHex = configService.Config.Settings.AccentColor;
        _items = configService.Config.Menu.Items.Select(i => i.Clone()).ToList();
        _settings = new AppSettings
        {
            InnerRadius = configService.Config.Settings.InnerRadius,
            OuterRadius = configService.Config.Settings.OuterRadius,
            AccentColor = configService.Config.Settings.AccentColor,
            SecondaryAccentColor = configService.Config.Settings.SecondaryAccentColor,
            Hotkey = configService.Config.Settings.Hotkey,
            Autostart = configService.Config.Settings.Autostart,
            EnableMonitoring = configService.Config.Settings.EnableMonitoring,
            GhostOpacity = configService.Config.Settings.GhostOpacity,
            AnimationDurationMs = configService.Config.Settings.AnimationDurationMs,
        };

        Title = "⚙ Menu Radial — Configurações";
        WindowStyle = WindowStyle.None;
        AllowsTransparency = true;
        Background = Brushes.Transparent;
        Width = 860;
        Height = 700;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        ResizeMode = ResizeMode.NoResize;

        BuildUI();
    }

    // ═══════════════════════════════════════════════════════
    //  DRAG TO MOVE
    // ═══════════════════════════════════════════════════════
    protected override void OnMouseLeftButtonDown(MouseButtonEventArgs e)
    {
        base.OnMouseLeftButtonDown(e);
        if (e.GetPosition(this).Y < 64)
        {
            try { DragMove(); } catch { }
        }
    }

    // ═══════════════════════════════════════════════════════
    //  BUILD UI
    // ═══════════════════════════════════════════════════════
    private void BuildUI()
    {
        // Sombra exterior
        var outerBorder = new Border
        {
            Margin = new Thickness(16),
            Effect = new DropShadowEffect
            {
                Color = Colors.Black, BlurRadius = 40, ShadowDepth = 0, Opacity = 0.65,
            },
        };

        var mainBorder = new Border
        {
            CornerRadius = new CornerRadius(20),
            BorderBrush = new SolidColorBrush(Color.FromArgb(25, 255, 255, 255)),
            BorderThickness = new Thickness(1),
            Background = BrushFromHex(DARK_BG),
            ClipToBounds = true,
        };

        var mainStack = new DockPanel { LastChildFill = true };

        // Header
        var header = BuildHeader();
        DockPanel.SetDock(header, Dock.Top);
        mainStack.Children.Add(header);

        // Footer
        var footer = BuildFooter();
        DockPanel.SetDock(footer, Dock.Bottom);
        mainStack.Children.Add(footer);

        // ── Tab switcher customizado (não usar TabControl nativo) ──
        var tabContainer = new DockPanel { LastChildFill = true };

        // Tab header bar
        var tabBar = BuildTabBar(out var appsContent, out var settingsContent);
        DockPanel.SetDock(tabBar, Dock.Top);
        tabContainer.Children.Add(tabBar);

        // Content area — respeita tab ativa por rebuild (e.g. ao trocar cor)
        var contentArea = new Grid { Background = Brushes.Transparent };
        contentArea.Children.Add(appsContent);
        contentArea.Children.Add(settingsContent);
        if (_isSettingsTab)
        {
            appsContent.Visibility = Visibility.Collapsed;
            settingsContent.Visibility = Visibility.Visible;
        }
        else
        {
            settingsContent.Visibility = Visibility.Collapsed;
        }
        tabContainer.Children.Add(contentArea);

        mainStack.Children.Add(tabContainer);
        mainBorder.Child = mainStack;
        outerBorder.Child = mainBorder;
        Content = outerBorder;
    }

    private Border BuildHeader()
    {
        var header = new Border
        {
            Background = BrushFromHex(DARK_BG),
            BorderBrush = new SolidColorBrush(Color.FromArgb(10, 255, 255, 255)),
            BorderThickness = new Thickness(0, 0, 0, 1),
            Padding = new Thickness(28, 18, 20, 18),
        };

        var grid = new Grid();
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        // Logo / icone
        var logoCircle = new Border
        {
            Width = 38, Height = 38,
            CornerRadius = new CornerRadius(19),
            Background = AccentBrush(20),
            Margin = new Thickness(0, 0, 14, 0),
            VerticalAlignment = VerticalAlignment.Center,
            Child = new TextBlock
            {
                Text = "◎", FontSize = 18,
                Foreground = BrushFromHex(_accentHex),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
            },
        };
        Grid.SetColumn(logoCircle, 0);
        grid.Children.Add(logoCircle);

        var titleStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
        titleStack.Children.Add(new TextBlock
        {
            Text = "Menu Radial",
            FontSize = 17, FontWeight = FontWeights.Bold,
            Foreground = BrushFromHex(TEXT_PRIMARY),
        });
        titleStack.Children.Add(new TextBlock
        {
            Text = "Configurações e personalização",
            FontSize = 11, Foreground = BrushFromHex(TEXT_MUTED),
            Margin = new Thickness(0, 2, 0, 0),
        });
        Grid.SetColumn(titleStack, 1);
        grid.Children.Add(titleStack);

        var closeBtn = MakeGeometryIconButton(CloseIconGeometry(), BrushFromHex(TEXT_MUTED), 36, 36, 12);
        closeBtn.Template = RoundedButtonTemplate(
            new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)), Brushes.Transparent, 18);
        closeBtn.Click += (_, _) => Close();
        Grid.SetColumn(closeBtn, 2);
        grid.Children.Add(closeBtn);

        header.Child = grid;
        return header;
    }

    private Border BuildTabBar(out UIElement appsContent, out UIElement settingsContent)
    {
        var appsPanel = BuildAppsTab();
        var settingsPanel = BuildSettingsTab();
        appsContent = appsPanel;
        settingsContent = settingsPanel;

        var bar = new Border
        {
            Background = BrushFromHex(DARK_BG),
            BorderBrush = new SolidColorBrush(Color.FromArgb(15, 255, 255, 255)),
            BorderThickness = new Thickness(0, 0, 0, 1),
            Padding = new Thickness(28, 10, 28, 0),
        };

        var tabStack = new StackPanel { Orientation = Orientation.Horizontal };

        var appsTab = MakeTabButton("📱  Apps", !_isSettingsTab);
        var settingsTab = MakeTabButton("⚙  Configurações", _isSettingsTab);

        appsTab.Click += (_, _) =>
        {
            _isSettingsTab = false;
            SetActiveTab(appsTab, settingsTab);
            appsPanel.Visibility = Visibility.Visible;
            settingsPanel.Visibility = Visibility.Collapsed;
        };
        settingsTab.Click += (_, _) =>
        {
            _isSettingsTab = true;
            SetActiveTab(settingsTab, appsTab);
            settingsPanel.Visibility = Visibility.Visible;
            appsPanel.Visibility = Visibility.Collapsed;
        };

        tabStack.Children.Add(appsTab);
        tabStack.Children.Add(settingsTab);

        bar.Child = tabStack;
        return bar;
    }

    private Button MakeTabButton(string text, bool active)
    {
        var accentColor = ParseAccentColor();
        var btn = new Button
        {
            Content = text,
            FontSize = 12.5,
            FontWeight = active ? FontWeights.SemiBold : FontWeights.Normal,
            Foreground = active ? BrushFromHex(_accentHex) : BrushFromHex(TEXT_MUTED),
            Background = Brushes.Transparent,
            BorderThickness = new Thickness(0, 0, 0, 2),
            BorderBrush = active ? BrushFromHex(_accentHex) : Brushes.Transparent,
            Padding = new Thickness(16, 10, 16, 10),
            Margin = new Thickness(0, 0, 4, 0),
            Cursor = Cursors.Hand,
            Tag = active,
        };

        // Remove chrome
        btn.FocusVisualStyle = null;
        return btn;
    }

    private void SetActiveTab(Button active, Button inactive)
    {
        active.FontWeight = FontWeights.SemiBold;
        active.Foreground = BrushFromHex(_accentHex);
        active.BorderBrush = BrushFromHex(_accentHex);
        active.Tag = true;

        inactive.FontWeight = FontWeights.Normal;
        inactive.Foreground = BrushFromHex(TEXT_MUTED);
        inactive.BorderBrush = Brushes.Transparent;
        inactive.Tag = false;
    }

    private Border BuildFooter()
    {
        var footer = new Border
        {
            Background = BrushFromHex(DARK_BG),
            BorderBrush = new SolidColorBrush(Color.FromArgb(10, 255, 255, 255)),
            BorderThickness = new Thickness(0, 1, 0, 0),
            Padding = new Thickness(28, 16, 28, 16),
        };

        var grid = new Grid();
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        _statusLabel = new TextBlock
        {
            Foreground = BrushFromHex(SUCCESS), FontSize = 11.5,
            VerticalAlignment = VerticalAlignment.Center,
        };
        Grid.SetColumn(_statusLabel, 0);
        grid.Children.Add(_statusLabel);

        var cancelBtn = MakePillButton("Cancelar", CARD_BG, TEXT_SECONDARY, hasBorder: true);
        cancelBtn.Click += (_, _) => Close();
        cancelBtn.Margin = new Thickness(0, 0, 10, 0);
        Grid.SetColumn(cancelBtn, 1);
        grid.Children.Add(cancelBtn);

        var saveBtn = MakePillButton("  💾  Salvar  ", _accentHex, "#000000", isBold: true);
        saveBtn.Click += (_, _) => OnSave();
        Grid.SetColumn(saveBtn, 2);
        grid.Children.Add(saveBtn);

        footer.Child = grid;
        return footer;
    }

    // ═══════════════════════════════════════════════════════
    //  APPS TAB
    // ═══════════════════════════════════════════════════════
    private UIElement BuildAppsTab()
    {
        var grid = new Grid { Background = Brushes.Transparent };
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(330) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

        // ── Esquerda: Preview ──
        var leftPanel = new Border
        {
            Background = BrushFromHex(DARK_BG),
            BorderBrush = new SolidColorBrush(Color.FromArgb(12, 255, 255, 255)),
            BorderThickness = new Thickness(0, 0, 1, 0),
            Padding = new Thickness(20, 18, 20, 18),
        };

        var leftStack = new StackPanel { HorizontalAlignment = HorizontalAlignment.Center };

        _breadcrumbLabel = new TextBlock
        {
            Text = "Root", FontSize = 10.5, FontWeight = FontWeights.SemiBold,
            Foreground = BrushFromHex(_accentHex),
            HorizontalAlignment = HorizontalAlignment.Center,
            Margin = new Thickness(0, 0, 0, 10),
        };
        leftStack.Children.Add(_breadcrumbLabel);

        _preview = new RadialPreviewControl(_items, GetIconsDir());
        _preview.Changed += () => RefreshAppsList();
        _preview.NavLabel += label =>
        {
            if (_breadcrumbLabel != null)
                _breadcrumbLabel.Text = label;
        };
        leftStack.Children.Add(_preview);

        var hint = new TextBlock
        {
            Text = "💡 Clique para editar  ·  Direito para opções  ·  🟠 = submenu",
            FontSize = 9.5, Foreground = BrushFromHex(TEXT_MUTED),
            TextWrapping = TextWrapping.Wrap,
            HorizontalAlignment = HorizontalAlignment.Center,
            Margin = new Thickness(0, 12, 0, 0),
        };
        leftStack.Children.Add(hint);

        leftPanel.Child = leftStack;
        Grid.SetColumn(leftPanel, 0);
        grid.Children.Add(leftPanel);

        // ── Direita: Lista ──
        var rightPanel = new DockPanel
        {
            Background = Brushes.Transparent,
            Margin = new Thickness(20, 18, 20, 14),
        };

        // Action bar
        var actionBar = new DockPanel { Margin = new Thickness(0, 0, 0, 12) };

        var addBtn = MakePillButton("＋  Adicionar", _accentHex, "#000000", isBold: true);
        addBtn.Click += (_, _) => AddApp();
        DockPanel.SetDock(addBtn, Dock.Left);
        actionBar.Children.Add(addBtn);

        _countLabel = new TextBlock
        {
            FontSize = 11, Foreground = BrushFromHex(TEXT_MUTED),
            VerticalAlignment = VerticalAlignment.Center,
            HorizontalAlignment = HorizontalAlignment.Right,
        };
        actionBar.Children.Add(_countLabel);

        DockPanel.SetDock(actionBar, Dock.Top);
        rightPanel.Children.Add(actionBar);

        var scroll = new ScrollViewer
        {
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
            Background = Brushes.Transparent,
            BorderThickness = new Thickness(0),
        };

        // ── Scrollbar discreta (fina e sutil) ──
        ApplyMinimalScrollbarStyle(scroll);

        _appsList = new StackPanel { Background = Brushes.Transparent };
        scroll.Content = _appsList;
        rightPanel.Children.Add(scroll);

        Grid.SetColumn(rightPanel, 1);
        grid.Children.Add(rightPanel);

        RefreshAppsList();
        return grid;
    }

    private UIElement BuildSettingsTab()
    {
        var scroll = new ScrollViewer
        {
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            Background = Brushes.Transparent,
            BorderThickness = new Thickness(0),
        };

        var stack = new StackPanel
        {
            Background = Brushes.Transparent,
            Margin = new Thickness(28, 20, 28, 20),
        };

        // ── Hotkey section ──
        var hotkeySection = MakeSection("🎹  Tecla de Atalho", "Defina a tecla para abrir o menu");
        var hotkeyStack = new StackPanel { Margin = new Thickness(0, 8, 0, 0) };

        _hotkeyCapture = new TextBox
        {
            Text = _settings.Hotkey,
            IsReadOnly = true, FontSize = 15, FontWeight = FontWeights.SemiBold,
            Foreground = BrushFromHex(_accentHex),
            Background = BrushFromHex(DARK_BG),
            BorderBrush = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)),
            BorderThickness = new Thickness(1.5),
            Padding = new Thickness(16, 12, 16, 12),
            Cursor = Cursors.Hand,
            TextAlignment = TextAlignment.Center,
        };
        // Rounded corners via template would be complex, so use a wrapper
        _hotkeyCapture.PreviewKeyDown += OnHotkeyKeyDown;
        _hotkeyCapture.PreviewMouseDown += OnHotkeyMouseDown;
        hotkeyStack.Children.Add(_hotkeyCapture);

        hotkeyStack.Children.Add(new TextBlock
        {
            Text = "Pressione a combinação desejada ou clique com botão do mouse",
            FontSize = 10, Foreground = BrushFromHex(TEXT_MUTED),
            Margin = new Thickness(2, 6, 0, 0),
        });

        ((StackPanel)hotkeySection.Tag).Children.Add(hotkeyStack);
        stack.Children.Add(hotkeySection);

        // ── Color section ──
        var colorSection = MakeSection("🎨  Cor de Destaque", "Define a cor principal da interface");
        var colorGrid = new Grid { Margin = new Thickness(0, 8, 0, 0) };
        colorGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        colorGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        colorGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        _colorPreview = new Border
        {
            Width = 42, Height = 42,
            CornerRadius = new CornerRadius(12),
            Background = BrushFromHex(_settings.AccentColor),
            BorderBrush = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255)),
            BorderThickness = new Thickness(1.5),
            Margin = new Thickness(0, 0, 14, 0),
        };
        Grid.SetColumn(_colorPreview, 0);
        colorGrid.Children.Add(_colorPreview);

        _colorLabel = new TextBlock
        {
            Text = _settings.AccentColor,
            FontSize = 14, FontWeight = FontWeights.SemiBold,
            Foreground = BrushFromHex(TEXT_PRIMARY),
            VerticalAlignment = VerticalAlignment.Center,
        };
        Grid.SetColumn(_colorLabel, 1);
        colorGrid.Children.Add(_colorLabel);

        var pickBtn = MakePillButton("🎯  Escolher", CARD_BG, TEXT_PRIMARY, hasBorder: true);
        pickBtn.Click += (_, _) => PickColor();
        Grid.SetColumn(pickBtn, 2);
        colorGrid.Children.Add(pickBtn);

        ((StackPanel)colorSection.Tag).Children.Add(colorGrid);
        stack.Children.Add(colorSection);

        // ── Themes Presets section ──
        var themesSection = MakeSection("🎭  Temas Predefinidos", "Paletas de cores prontas para usar");
        var themesWrap = new System.Windows.Controls.WrapPanel
        {
            Margin = new Thickness(0, 8, 0, 0),
            HorizontalAlignment = HorizontalAlignment.Left,
        };

        foreach (var theme in Models.ThemePreset.All)
        {
            // Container principal — círculo accent
            var outer = new Border
            {
                Width = 50, Height = 50,
                CornerRadius = new CornerRadius(25),
                Background = BrushFromHex(theme.AccentColor),
                Margin = new Thickness(0, 0, 10, 10),
                Cursor = System.Windows.Input.Cursors.Hand,
                BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderThickness = new Thickness(2),
                ToolTip = $"{theme.Name} — {theme.Description}",
            };

            // Grid interno pra stackar secondary + nome
            var innerGrid = new Grid();

            // Círculo secondary (canto inferior direito)
            var secondaryCircle = new Border
            {
                Width = 20, Height = 20,
                CornerRadius = new CornerRadius(10),
                Background = BrushFromHex(theme.SecondaryColor),
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Bottom,
                Margin = new Thickness(0, 0, -2, -2),
            };

            // Nome do tema
            var nameLabel = new TextBlock
            {
                Text = theme.Name.Length > 6 ? theme.Name[..6] : theme.Name,
                FontSize = 7.5,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                Effect = new System.Windows.Media.Effects.DropShadowEffect
                {
                    Color = Colors.Black, ShadowDepth = 0, BlurRadius = 5
                },
            };

            innerGrid.Children.Add(nameLabel);
            innerGrid.Children.Add(secondaryCircle);
            outer.Child = innerGrid;

            // Hover efeito
            outer.MouseEnter += (_, _) => outer.BorderBrush = new SolidColorBrush(Colors.White);
            outer.MouseLeave += (_, _) => outer.BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255));

            var capturedTheme = theme;
            outer.MouseLeftButtonDown += (_, _) =>
            {
                _settings.AccentColor = capturedTheme.AccentColor;
                _settings.SecondaryAccentColor = capturedTheme.SecondaryColor;
                _accentHex = capturedTheme.AccentColor;

                _colorPreview!.Background = BrushFromHex(capturedTheme.AccentColor);
                _colorLabel!.Text = capturedTheme.AccentColor;

                SaveAndRebuild();
            };

            themesWrap.Children.Add(outer);
        }

        ((StackPanel)themesSection.Tag).Children.Add(themesWrap);
        stack.Children.Add(themesSection);

        // ── Autostart section ──
        var startupSection = MakeSection("🚀  Iniciar com o Windows", "Abrir automaticamente ao ligar o PC");
        var startupGrid = new Grid { Margin = new Thickness(0, 8, 0, 0) };
        startupGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        startupGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        _autostartCheck = new CheckBox
        {
            Content = "  Ativar início automático",
            IsChecked = _settings.Autostart,
            Foreground = BrushFromHex(TEXT_PRIMARY),
            FontSize = 13,
            VerticalAlignment = VerticalAlignment.Center,
        };
        Grid.SetColumn(_autostartCheck, 0);
        startupGrid.Children.Add(_autostartCheck);

        ((StackPanel)startupSection.Tag).Children.Add(startupGrid);
        stack.Children.Add(startupSection);

        scroll.Content = stack;
        return scroll;
    }

    private Border MakeSection(string title, string subtitle)
    {
        var section = new Border
        {
            Background = BrushFromHex(CARD_BG),
            BorderBrush = new SolidColorBrush(Color.FromArgb(18, 255, 255, 255)),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(14),
            Margin = new Thickness(0, 0, 0, 16),
            Padding = new Thickness(20, 16, 20, 18),
        };

        var contentStack = new StackPanel();

        // Header
        contentStack.Children.Add(new TextBlock
        {
            Text = title, FontSize = 13.5, FontWeight = FontWeights.Bold,
            Foreground = BrushFromHex(TEXT_PRIMARY),
        });
        contentStack.Children.Add(new TextBlock
        {
            Text = subtitle, FontSize = 10.5,
            Foreground = BrushFromHex(TEXT_MUTED),
            Margin = new Thickness(0, 2, 0, 0),
        });

        section.Tag = contentStack;
        section.Child = contentStack;
        return section;
    }

    // ═══════════════════════════════════════════════════════
    //  APPS LIST
    // ═══════════════════════════════════════════════════════
    private void RefreshAppsList()
    {
        if (_appsList == null) return;
        _appsList.Children.Clear();

        for (int i = 0; i < _items.Count; i++)
        {
            var card = CreateAppCard(i, _items[i]);
            _appsList.Children.Add(card);
        }

        if (_countLabel != null)
            _countLabel.Text = $"{_items.Count} app{(_items.Count != 1 ? "s" : "")}";

        if (_preview != null)
            _preview.SetItems(_items);
    }

    private Border CreateAppCard(int index, MenuItem item)
    {
        var card = new Border
        {
            Background = BrushFromHex(CARD_BG),
            BorderBrush = new SolidColorBrush(Color.FromArgb(12, 255, 255, 255)),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(12),
            Padding = new Thickness(12, 10, 12, 10),
            Margin = new Thickness(0, 0, 0, 6),
            Cursor = Cursors.Hand,
        };

        // Hover effect
        card.MouseEnter += (_, _) =>
        {
            card.Background = BrushFromHex(CARD_BG_HOV);
            card.BorderBrush = AccentBrush(40);
        };
        card.MouseLeave += (_, _) =>
        {
            card.Background = BrushFromHex(CARD_BG);
            card.BorderBrush = new SolidColorBrush(Color.FromArgb(12, 255, 255, 255));
        };

        var grid = new Grid();
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });   // Icon
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }); // Info
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });   // Buttons

        // ── App icon (real system icon) ──
        var iconContainer = new Border
        {
            Width = 36, Height = 36,
            CornerRadius = new CornerRadius(8),
            Background = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255)),
            Margin = new Thickness(0, 0, 12, 0),
            VerticalAlignment = VerticalAlignment.Center,
        };

        // Tentar extrair ícone real do app
        var appIcon = IconService.GetAppIcon(item.Action, item.Target, 32);
        if (appIcon != null)
        {
            var img = new System.Windows.Controls.Image
            {
                Source = appIcon,
                Width = 24, Height = 24,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
            };
            RenderOptions.SetBitmapScalingMode(img, BitmapScalingMode.HighQuality);
            iconContainer.Child = img;
        }
        else
        {
            // Fallback: emoji do tipo de ação
            iconContainer.Child = new TextBlock
            {
                Text = GetActionEmoji(item.Action),
                FontSize = 16,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
            };
        }
        Grid.SetColumn(iconContainer, 0);
        grid.Children.Add(iconContainer);

        // ── Info (label + subtitle com tipo e caminho) ──
        string actionLabel = item.Action switch
        {
            "run" => "Programa / .exe / .lnk",
            "url" => "Site / URL",
            "folder" => "Pasta",
            "script" => "Script",
            "shortcut" => "Atalho",
            _ => item.Action
        };
        string subtitle = string.IsNullOrEmpty(item.Target)
            ? actionLabel
            : $"{actionLabel} · {TruncatePath(item.Target, 30)}";

        var info = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
        info.Children.Add(new TextBlock
        {
            Text = item.Label, FontSize = 13, FontWeight = FontWeights.SemiBold,
            Foreground = BrushFromHex(TEXT_PRIMARY),
        });
        info.Children.Add(new TextBlock
        {
            Text = subtitle,
            FontSize = 10, Foreground = BrushFromHex(TEXT_MUTED),
            Margin = new Thickness(0, 2, 0, 0),
        });
        Grid.SetColumn(info, 1);
        grid.Children.Add(info);

        // ── Buttons ──
        var btns = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };

        int idx = index;
        var editBtn = MakeGeometryIconButton(EditIconGeometry(), BrushFromHex(_accentHex), 32, 32, 13);
        editBtn.Click += (_, _) => EditApp(idx);
        btns.Children.Add(editBtn);

        var delBtn = MakeGeometryIconButton(TrashIconGeometry(), BrushFromHex(DANGER), 32, 32, 14);
        delBtn.Click += (_, _) => RemoveApp(idx);
        btns.Children.Add(delBtn);

        Grid.SetColumn(btns, 2);
        grid.Children.Add(btns);

        card.Child = grid;
        return card;
    }

    // ═══════════════════════════════════════════════════════
    //  APP CRUD
    // ═══════════════════════════════════════════════════════
    private void AddApp()
    {
        var dlg = new AppEditDialog(accentColor: _accentHex);
        dlg.Owner = this;
        if (dlg.ShowDialog() == true)
        {
            _items.Add(dlg.ResultItem);
            RefreshAppsList();
        }
    }

    private void EditApp(int index)
    {
        if (index < 0 || index >= _items.Count) return;
        var dlg = new AppEditDialog(_items[index], _accentHex);
        dlg.Owner = this;
        if (dlg.ShowDialog() == true)
        {
            _items[index] = dlg.ResultItem;
            RefreshAppsList();
        }
    }

    private void RemoveApp(int index)
    {
        if (index < 0 || index >= _items.Count) return;
        var name = _items[index].Label;
        var result = MessageBox.Show($"Remover \"{name}\" do menu?", "Remover App",
            MessageBoxButton.YesNo, MessageBoxImage.Question);
        if (result == MessageBoxResult.Yes)
        {
            _items.RemoveAt(index);
            RefreshAppsList();
        }
    }

    // ═══════════════════════════════════════════════════════
    //  HOTKEY CAPTURE
    // ═══════════════════════════════════════════════════════
    private void OnHotkeyKeyDown(object sender, KeyEventArgs e)
    {
        string combo = "";
        if (Keyboard.Modifiers.HasFlag(ModifierKeys.Control)) combo += "ctrl+";
        if (Keyboard.Modifiers.HasFlag(ModifierKeys.Alt)) combo += "alt+";
        if (Keyboard.Modifiers.HasFlag(ModifierKeys.Shift)) combo += "shift+";
        if (Keyboard.Modifiers.HasFlag(ModifierKeys.Windows)) combo += "win+";

        var key = e.Key == Key.System ? e.SystemKey : e.Key;
        if (key != Key.LeftCtrl && key != Key.RightCtrl &&
            key != Key.LeftAlt && key != Key.RightAlt &&
            key != Key.LeftShift && key != Key.RightShift &&
            key != Key.LWin && key != Key.RWin)
        {
            combo += key.ToString().ToLowerInvariant();
        }

        if (!string.IsNullOrEmpty(combo) && _hotkeyCapture != null)
        {
            combo = combo.TrimEnd('+');
            var parts = combo.Split('+');
            var pynput = string.Join("+", parts.Select(p => $"<{p}>"));
            _hotkeyCapture.Text = pynput;
            _settings.Hotkey = pynput;
        }
        e.Handled = true;
    }

    private void OnHotkeyMouseDown(object sender, MouseButtonEventArgs e)
    {
        string? mouseKey = null;
        if (e.ChangedButton == MouseButton.Middle) mouseKey = "mouse_middle";
        else if (e.ChangedButton == MouseButton.XButton1) mouseKey = "mouse_x1";
        else if (e.ChangedButton == MouseButton.XButton2) mouseKey = "mouse_x2";

        if (mouseKey != null && _hotkeyCapture != null)
        {
            _hotkeyCapture.Text = mouseKey;
            _settings.Hotkey = mouseKey;
            e.Handled = true;
        }
    }

    // ═══════════════════════════════════════════════════════
    //  COLOR PICKER
    // ═══════════════════════════════════════════════════════
    private void PickColor()
    {
        var dlg = new System.Windows.Forms.ColorDialog();
        try
        {
            var current = (Color)ColorConverter.ConvertFromString(_settings.AccentColor);
            dlg.Color = System.Drawing.Color.FromArgb(current.R, current.G, current.B);
        }
        catch { }

        if (dlg.ShowDialog() == System.Windows.Forms.DialogResult.OK)
        {
            var c = dlg.Color;
            var hex = $"#{c.R:X2}{c.G:X2}{c.B:X2}";
            _settings.AccentColor = hex;
            _accentHex = hex;
            // Rebuild toda a UI com a cor nova (live refresh)
            BuildUI();
        }
    }

    // ═══════════════════════════════════════════════════════
    //  SAVE
    // ═══════════════════════════════════════════════════════
    private void SaveAndRebuild()
    {
        _configService.Config.Settings = _settings;
        _configService.Save();
        BuildUI(); // live refresh com a nova cor
    }

    private void OnSave()
    {
        _settings.Autostart = _autostartCheck?.IsChecked ?? false;
        _settings.AccentColor = _accentHex; // sincronizar cor visual com settings

        _configService.Config.Menu.Items = _items;
        _configService.Config.Settings = _settings;
        _configService.Save();

        SetAutostart(_settings.Autostart);

        if (_statusLabel != null)
            _statusLabel.Text = "✓ Salvo com sucesso!";

        var timer = new System.Windows.Threading.DispatcherTimer
        { Interval = TimeSpan.FromMilliseconds(2500) };
        timer.Tick += (_, _) =>
        {
            timer.Stop();
            if (_statusLabel != null) _statusLabel.Text = "";
        };
        timer.Start();

        SettingsSaved?.Invoke();
        Console.WriteLine("[settings] Configurações salvas.");
    }

    private void SetAutostart(bool enabled)
    {
        try
        {
            using var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Run", true);
            if (key == null) return;

            if (enabled)
            {
                var exePath = System.Diagnostics.Process.GetCurrentProcess().MainModule?.FileName ?? "";
                if (!string.IsNullOrEmpty(exePath))
                    key.SetValue("Menu Radial", $"\"{exePath}\"");
            }
            else
            {
                key.DeleteValue("Menu Radial", false);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[settings] Erro ao configurar autostart: {ex.Message}");
        }
    }

    // ═══════════════════════════════════════════════════════
    //  UI COMPONENTS
    // ═══════════════════════════════════════════════════════
    private Button MakePillButton(string text, string bgHex, string fgHex,
        bool isBold = false, bool hasBorder = false)
    {
        var bg = BrushFromHex(bgHex);
        var fg = BrushFromHex(fgHex);
        var borderBr = hasBorder
            ? new SolidColorBrush(Color.FromArgb(25, 255, 255, 255))
            : Brushes.Transparent;

        var btn = new Button
        {
            Content = text,
            Foreground = fg,
            FontSize = 12.5,
            FontWeight = isBold ? FontWeights.Bold : FontWeights.SemiBold,
            Cursor = Cursors.Hand,
            Template = RoundedButtonTemplate(bg, borderBr, 10),
        };

        btn.MouseEnter += (_, _) => btn.Opacity = 0.85;
        btn.MouseLeave += (_, _) => btn.Opacity = 1.0;
        return btn;
    }

    private static Button MakeIconButton(string icon, string fgHex, int w, int h, double fontSize)
    {
        var normalBg = new SolidColorBrush(Color.FromArgb(10, 255, 255, 255));
        var hoverBg = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255));

        var btn = new Button
        {
            Content = icon,
            Width = w, Height = h,
            Foreground = BrushFromHex(fgHex),
            Cursor = Cursors.Hand,
            FontSize = fontSize,
            Template = RoundedButtonTemplate(normalBg, Brushes.Transparent, 8),
        };

        btn.MouseEnter += (_, _) =>
        {
            var border = btn.Template?.FindName("PART_Border", btn) as Border;
            if (border != null) border.Background = hoverBg;
        };
        btn.MouseLeave += (_, _) =>
        {
            var border = btn.Template?.FindName("PART_Border", btn) as Border;
            if (border != null) border.Background = normalBg;
        };
        return btn;
    }

    /// <summary>Cria botão com ícone vetorial (Path geometry) — renderiza perfeitamente em qualquer sistema.</summary>
    private static Button MakeGeometryIconButton(Geometry geometry, Brush fill, int w, int h, double iconSize)
    {
        var normalBg = new SolidColorBrush(Color.FromArgb(10, 255, 255, 255));
        var hoverBg = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255));

        var path = new System.Windows.Shapes.Path
        {
            Data = geometry,
            Fill = fill,
            Stretch = Stretch.Uniform,
            Width = iconSize, Height = iconSize,
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center,
        };

        // Template compacto — usa padding mínimo para caber dentro de botões pequenos (32x32)
        var template = new ControlTemplate(typeof(Button));
        var borderFactory = new FrameworkElementFactory(typeof(Border));
        borderFactory.Name = "PART_Border";
        borderFactory.SetValue(Border.BackgroundProperty, (Brush)normalBg);
        borderFactory.SetValue(Border.CornerRadiusProperty, new CornerRadius(8));
        borderFactory.SetValue(Border.PaddingProperty, new Thickness(4));
        borderFactory.SetValue(Border.SnapsToDevicePixelsProperty, true);
        var cp = new FrameworkElementFactory(typeof(ContentPresenter));
        cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
        cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
        cp.SetValue(ContentPresenter.ContentProperty, new TemplateBindingExtension(Button.ContentProperty));
        cp.SetValue(ContentPresenter.ContentTemplateProperty, new TemplateBindingExtension(Button.ContentTemplateProperty));
        borderFactory.AppendChild(cp);
        template.VisualTree = borderFactory;

        var btn = new Button
        {
            Content = path,
            Width = w, Height = h,
            Cursor = Cursors.Hand,
            Template = template,
        };

        btn.MouseEnter += (_, _) =>
        {
            var border = btn.Template?.FindName("PART_Border", btn) as Border;
            if (border != null) border.Background = hoverBg;
        };
        btn.MouseLeave += (_, _) =>
        {
            var border = btn.Template?.FindName("PART_Border", btn) as Border;
            if (border != null) border.Background = normalBg;
        };
        return btn;
    }

    // ── Icon Geometries ──
    private static Geometry CloseIconGeometry() =>
        Geometry.Parse("M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z");

    private static Geometry EditIconGeometry() =>
        Geometry.Parse("M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z");

    private static Geometry TrashIconGeometry() =>
        Geometry.Parse("M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z");

    /// <summary>Cria um ControlTemplate com Border arredondado para Button.</summary>
    private static ControlTemplate RoundedButtonTemplate(Brush bg, Brush borderBrush, double radius)
    {
        var template = new ControlTemplate(typeof(Button));

        var borderFactory = new FrameworkElementFactory(typeof(Border));
        borderFactory.Name = "PART_Border";
        borderFactory.SetValue(Border.BackgroundProperty, bg);
        borderFactory.SetValue(Border.BorderBrushProperty, borderBrush);
        borderFactory.SetValue(Border.BorderThicknessProperty, new Thickness(0));
        borderFactory.SetValue(Border.CornerRadiusProperty, new CornerRadius(radius));
        borderFactory.SetValue(Border.PaddingProperty, new Thickness(14, 7, 14, 7));
        borderFactory.SetValue(Border.SnapsToDevicePixelsProperty, true);

        var contentPresenter = new FrameworkElementFactory(typeof(ContentPresenter));
        contentPresenter.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
        contentPresenter.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
        // Use TemplateBindingExtension — a forma correta no WPF
        contentPresenter.SetValue(ContentPresenter.ContentProperty,
            new TemplateBindingExtension(Button.ContentProperty));
        contentPresenter.SetValue(ContentPresenter.ContentTemplateProperty,
            new TemplateBindingExtension(Button.ContentTemplateProperty));

        borderFactory.AppendChild(contentPresenter);
        template.VisualTree = borderFactory;

        return template;
    }

    // ═══════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════
    private string GetIconsDir()
    {
        var baseDir = Path.GetDirectoryName(_configService.ConfigPath) ?? ".";
        var iconsDir = Path.Combine(baseDir, "..", "Assets", "Icons");
        if (!Directory.Exists(iconsDir))
            iconsDir = Path.Combine(baseDir, "Icons");
        if (!Directory.Exists(iconsDir))
            iconsDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Assets", "Icons");
        return iconsDir;
    }

    private static SolidColorBrush BrushFromHex(string hex)
    {
        try { return new SolidColorBrush((Color)ColorConverter.ConvertFromString(hex)); }
        catch { return Brushes.White; }
    }

    private Color ParseAccentColor()
    {
        try { return (Color)ColorConverter.ConvertFromString(_accentHex); }
        catch { return Color.FromRgb(0, 220, 255); }
    }

    private SolidColorBrush AccentBrush(byte alpha)
    {
        var c = ParseAccentColor();
        return new SolidColorBrush(Color.FromArgb(alpha, c.R, c.G, c.B));
    }

    private static string GetActionEmoji(string action) => action switch
    {
        "run" => "⚙",
        "url" => "🌐",
        "folder" => "📁",
        "script" => "🐍",
        "shortcut" => "⌨",
        "clipboard_history" => "📋",
        _ => "📌",
    };

    private static string TruncatePath(string path, int max)
    {
        if (path.Length <= max) return path;
        return "…" + path[^(max - 1)..];
    }

    /// <summary>Aplica scrollbar fina e discreta ao ScrollViewer.</summary>
    private static void ApplyMinimalScrollbarStyle(ScrollViewer sv)
    {
        // XAML inline pra scrollbar minimalista
        var xaml = @"
<Style xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation'
       xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml'
       TargetType='ScrollBar'>
  <Setter Property='Width' Value='6'/>
  <Setter Property='Background' Value='Transparent'/>
  <Setter Property='Template'>
    <Setter.Value>
      <ControlTemplate TargetType='ScrollBar'>
        <Grid>
          <Border Background='#10FFFFFF' CornerRadius='3'/>
          <Track Name='PART_Track' IsDirectionReversed='true'>
            <Track.Thumb>
              <Thumb>
                <Thumb.Template>
                  <ControlTemplate TargetType='Thumb'>
                    <Border Background='#40FFFFFF' CornerRadius='3' MinHeight='20'
                            Margin='1,0,1,0'/>
                  </ControlTemplate>
                </Thumb.Template>
              </Thumb>
            </Track.Thumb>
          </Track>
        </Grid>
      </ControlTemplate>
    </Setter.Value>
  </Setter>
</Style>";

        try
        {
            var style = (Style)System.Windows.Markup.XamlReader.Parse(xaml);
            sv.Resources.Add(typeof(System.Windows.Controls.Primitives.ScrollBar), style);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[scrollbar] Falha ao aplicar estilo: {ex.Message}");
        }
    }
}
