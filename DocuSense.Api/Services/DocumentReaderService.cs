using System.IO.Compression;
using System.Text;
using System.Xml.Linq;
using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace DocuSense.Api.Services;

public class ExtractedDocument
{
    public string Text { get; set; } = string.Empty;
    public string Author { get; set; } = "Unknown";
    public DateTime? Created { get; set; }
    public DateTime? Modified { get; set; }
    public int WordCount { get; set; }
}

public class DocumentReaderService
{
    public async Task<ExtractedDocument> ExtractAsync(IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

        return ext switch
        {
            ".pdf" => await ExtractPdfAsync(file),
            ".docx" => await ExtractDocxAsync(file),
            ".doc" => await ExtractDocxAsync(file),   // Best-effort for .doc
            ".txt" => await ExtractTxtAsync(file),
            ".rtf" => await ExtractRtfAsync(file),
            ".odt" => await ExtractOdtAsync(file),
            _ => throw new NotSupportedException($"File type '{ext}' is not supported.")
        };
    }

    // ── PDF ──────────────────────────────────────────────────────────────────
    private static Task<ExtractedDocument> ExtractPdfAsync(IFormFile file)
    {
        using var stream = file.OpenReadStream();
        using var pdf = PdfDocument.Open(stream);

        var sb = new StringBuilder();
        foreach (var page in pdf.GetPages())
            sb.AppendLine(page.Text);

        var text = sb.ToString();
        var info = pdf.Information;

        return Task.FromResult(new ExtractedDocument
        {
            Text = text,
            Author = info.Author ?? "Unknown",
            Created = ParsePdfDate(info.CreationDate),
            Modified = ParsePdfDate(info.ModifiedDate),
            WordCount = CountWords(text),
        });
    }

    private static DateTime? ParsePdfDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        // PDF dates look like: D:20250314120000+08'00'
        if (raw.StartsWith("D:") && raw.Length >= 16)
        {
            var datePart = raw[2..16];
            if (DateTime.TryParseExact(datePart, "yyyyMMddHHmmss",
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var dt))
                return dt;
        }
        return null;
    }

    // ── DOCX ─────────────────────────────────────────────────────────────────
    private static Task<ExtractedDocument> ExtractDocxAsync(IFormFile file)
    {
        using var stream = file.OpenReadStream();
        using var doc = WordprocessingDocument.Open(stream, false);

        // Text
        var body = doc.MainDocumentPart?.Document?.Body;
        var text = body?.InnerText ?? string.Empty;

        // Core properties
        var core = doc.PackageProperties;
        var author = core.Creator ?? "Unknown";
        var created = core.Created;
        var modified = core.Modified;

        return Task.FromResult(new ExtractedDocument
        {
            Text = text,
            Author = author,
            Created = created,
            Modified = modified,
            WordCount = CountWords(text),
        });
    }

    // ── TXT ──────────────────────────────────────────────────────────────────
    private static async Task<ExtractedDocument> ExtractTxtAsync(IFormFile file)
    {
        using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
        var text = await reader.ReadToEndAsync();
        return new ExtractedDocument
        {
            Text = text,
            Author = "Unknown",
            WordCount = CountWords(text),
        };
    }

    // ── RTF (strip control words) ─────────────────────────────────────────────
    private static async Task<ExtractedDocument> ExtractRtfAsync(IFormFile file)
    {
        using var reader = new StreamReader(file.OpenReadStream(), Encoding.ASCII);
        var rtf = await reader.ReadToEndAsync();

        // Very lightweight RTF text extraction: remove control words and groups
        var sb = new StringBuilder();
        bool inControl = false;
        for (int i = 0; i < rtf.Length; i++)
        {
            var c = rtf[i];
            if (c == '\\') { inControl = true; continue; }
            if (inControl && (c == ' ' || c == '\n' || c == '\r')) { inControl = false; continue; }
            if (inControl && !char.IsLetter(c)) { inControl = false; }
            if (inControl) continue;
            if (c == '{' || c == '}') continue;
            sb.Append(c);
        }

        var text = sb.ToString().Trim();
        return new ExtractedDocument
        {
            Text = text,
            Author = "Unknown",
            WordCount = CountWords(text),
        };
    }

    // ── ODT (ODF ZIP + content.xml) ───────────────────────────────────────────
    private static async Task<ExtractedDocument> ExtractOdtAsync(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        ms.Position = 0;

        using var zip = new ZipArchive(ms, ZipArchiveMode.Read);
        var entry = zip.GetEntry("content.xml");
        if (entry is null) return new ExtractedDocument { Text = "", WordCount = 0 };

        using var entryStream = entry.Open();
        var xdoc = await XDocument.LoadAsync(entryStream, LoadOptions.None, CancellationToken.None);

        var text = string.Concat(xdoc.Descendants().Where(e => !e.HasElements).Select(e => e.Value + " "));

        return new ExtractedDocument
        {
            Text = text,
            Author = "Unknown",
            WordCount = CountWords(text),
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static int CountWords(string text) =>
        text.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries).Length;
}
