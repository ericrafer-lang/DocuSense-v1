using System.Globalization;
using DocuSense.Api.Models;

namespace DocuSense.Api.Data;

public static class DocumentExtensions
{
    public static ScanListItem ToScanListItem(this Document doc)
    {
        var detection = doc.DetectionResult;
        return new ScanListItem
        {
            Id = doc.Id.ToString(),
            Title = Path.GetFileNameWithoutExtension(doc.Filename),
            Author = doc.Uploader?.Name ?? "Unknown",
            Words = 0,
            Draft = detection?.Status ?? "uploaded",
            Date = doc.UploadDate.ToString("dd MMM yyyy"),
            Overall = detection?.OverallScore ?? 0,
            Flagged = detection?.HighlightedSections?.Count ?? 0,
            Summary = string.Empty,
            Layers = detection?.LayerScores?.Select(l => new LayerResult
            {
                Key = l.LayerType,
                Index = LayerIndex(l.LayerType),
                Name = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(l.LayerType),
                Score = l.Score,
                Note = l.Note,
            }).ToList() ?? new(),
            Passages = detection?.HighlightedSections?.Select((h, i) => new PassageResult
            {
                Id = $"p{i + 1}",
                Text = h.SectionText,
                Layer = h.Layer,
                Reason = h.Reason,
            }).ToList() ?? new(),
        };
    }

    private static string LayerIndex(string key) => key.ToLower() switch
    {
        "stylometric" => "01",
        "semantic"    => "02",
        "metadata"    => "03",
        "classifier"  => "04",
        _ => "00",
    };
}
