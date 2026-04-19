// Services/ConfigService.cs — Carrega e salva config.yaml.
// Port de _load_config + _on_save
using System;
using System.IO;
using MenuRadialCS.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace MenuRadialCS.Services;

/// <summary>Gerencia a leitura e escrita do config.yaml.</summary>
public class ConfigService
{
    private readonly string _configPath;
    private readonly IDeserializer _deserializer;
    private readonly ISerializer _serializer;

    public AppConfig Config { get; private set; } = new();

    public ConfigService(string configPath)
    {
        _configPath = configPath;
        _deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        _serializer = new SerializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .ConfigureDefaultValuesHandling(DefaultValuesHandling.OmitNull)
            .Build();

        Load();
    }

    /// <summary>Carrega o config.yaml. Suporta config.local.yaml override.</summary>
    public void Load()
    {
        // Tentar config.local.yaml primeiro
        var dir = Path.GetDirectoryName(_configPath) ?? ".";
        var localPath = Path.Combine(dir, "config.local.yaml");
        var pathToLoad = File.Exists(localPath) ? localPath : _configPath;

        if (!File.Exists(pathToLoad))
        {
            Console.WriteLine($"[config] Arquivo não encontrado: {pathToLoad}");
            Config = new AppConfig();
            return;
        }

        try
        {
            var yaml = File.ReadAllText(pathToLoad);
            Config = _deserializer.Deserialize<AppConfig>(yaml) ?? new AppConfig();
            Console.WriteLine($"[config] Carregado: {pathToLoad}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[config] Erro ao carregar: {ex.Message}");
            Config = new AppConfig();
        }
    }

    /// <summary>Salva o config atual em YAML.</summary>
    public void Save()
    {
        try
        {
            var dir = Path.GetDirectoryName(_configPath);
            if (!string.IsNullOrEmpty(dir))
                Directory.CreateDirectory(dir);

            var yaml = _serializer.Serialize(Config);
            File.WriteAllText(_configPath, yaml);
            Console.WriteLine("[config] Configuração salva.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[config] Erro ao salvar: {ex.Message}");
        }
    }

    /// <summary>Retorna o caminho do config resolvido.</summary>
    public string ConfigPath => _configPath;
}
