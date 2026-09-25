using System.Text.Json.Serialization;

namespace DocuSense.Api.Models;

public class ScanResult
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public int Words { get; set; }
    public string Draft { get; set; } = "uploaded";
    public string Date { get; set; } = string.Empty;
    public double Overall { get; set; }
    public int Flagged { get; set; }
    public string Summary { get; set; } = string.Empty;
    public List<LayerResult> Layers { get; set; } = new();
    public List<PassageResult> Passages { get; set; } = new();
}

public class LayerResult
{
    public string Key { get; set; } = string.Empty;
    public string Index { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double Score { get; set; }
    public string Note { get; set; } = string.Empty;
}

public class PassageResult
{
    public string Id { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Layer { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Reason { get; set; }
}

public class ScanListItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public int Words { get; set; }
    public string Draft { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public double Overall { get; set; }
    public int Flagged { get; set; }
    public string Summary { get; set; } = string.Empty;
    public List<LayerResult> Layers { get; set; } = new();
    public List<PassageResult> Passages { get; set; } = new();
}
