using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using DocuSense.Api.Data;
using DocuSense.Api.Models;
using DocuSense.Api.Services;

namespace DocuSense.Api.Controllers;

[Authorize]
[ApiController]
[Route("api")]
public class ScanController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DocumentReaderService _reader;
    private readonly AnalysisService _analysis;
    private readonly ILogger<ScanController> _logger;
    private readonly IWebHostEnvironment _env;

    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt" };

    public ScanController(
        AppDbContext db,
        DocumentReaderService reader,
        AnalysisService analysis,
        ILogger<ScanController> logger,
        IWebHostEnvironment env)
    {
        _db = db;
        _reader = reader;
        _analysis = analysis;
        _logger = logger;
        _env = env;
    }

    // ── POST /api/scan ────────────────────────────────────────────────────────
    // UserId is populated from the authenticated JWT claim — not from a
    // client-supplied parameter, which was the earlier version's weaker approach.

    [HttpPost("scan")]
    [RequestSizeLimit(100 * 1024 * 1024)] // 100 MB — matches PRD business rule
    public async Task<IActionResult> UploadScan(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { error = $"File type '{ext}' is not supported. Accepted: {string.Join(", ", AllowedExtensions)}" });

        // Resolve uploader from JWT — never trust the client to supply this.
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var uploaderId))
            return Unauthorized(new { error = "User identity could not be verified from token." });

        var uploader = await _db.Users.FindAsync(uploaderId);
        if (uploader == null)
            return BadRequest(new { error = "User account not found." });

        // Persist the uploaded file
        var storageDir = Path.Combine(_env.ContentRootPath, "UploadedFiles");
        Directory.CreateDirectory(storageDir);
        var storedFilename = $"{Guid.NewGuid()}{ext}";
        var storagePath = Path.Combine(storageDir, storedFilename);

        await using (var fs = new FileStream(storagePath, FileMode.Create))
            await file.CopyToAsync(fs);

        try
        {
            _logger.LogInformation("Analyzing file: {FileName} ({Size} bytes)", file.FileName, file.Length);

            var doc = await _reader.ExtractAsync(file);
            var result = _analysis.Analyze(doc, file.FileName);

            // Persist Document row
            var document = new Document
            {
                UploaderId = uploaderId,
                Filename = file.FileName,
                FileType = ext,
                StoragePath = storagePath,
                UploadDate = DateTime.UtcNow,
                ExtractedText = doc.Text,
            };
            _db.Documents.Add(document);
            await _db.SaveChangesAsync();   // get document.Id

            // Persist DetectionResult
            var detection = new DetectionResult
            {
                DocumentId = document.Id,
                OverallScore = result.Overall,
                Status = result.Draft,
                CreatedAt = DateTime.UtcNow,
                LayerScores = result.Layers.Select(l => new DetectionLayerScore
                {
                    LayerType = l.Key,
                    Score = l.Score,
                    Note = l.Note,
                }).ToList(),
                HighlightedSections = result.Passages
                    .Where(p => p.Layer is not null)
                    .Select((p, i) => new HighlightedSection
                    {
                        SectionText = p.Text,
                        SectionScore = result.Overall,
                        Position = i,
                        Layer = p.Layer,
                        Reason = p.Reason,
                    }).ToList(),
            };
            _db.DetectionResults.Add(detection);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Scan saved: doc={DocId} overall={Overall}", document.Id, result.Overall);

            // Return the ScanResult shape the frontend already consumes
            return Ok(result);
        }
        catch (NotSupportedException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing file {FileName}", file.FileName);
            return StatusCode(500, new { error = "Analysis failed. Please try again." });
        }
    }

    // ── GET /api/scans ────────────────────────────────────────────────────────
    // Returns the caller's own scans.  Educators and Admins see all scans.

    [HttpGet("scans")]
    public async Task<IActionResult> ListScans()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Student";

        var query = _db.Documents
            .Include(d => d.DetectionResult)
                .ThenInclude(r => r!.LayerScores)
            .AsQueryable();

        // Students only see their own documents — Educators and Admins see all
        if (role == "Student")
            query = query.Where(d => d.UploaderId == userId);

        var docs = await query
            .OrderByDescending(d => d.UploadDate)
            .ToListAsync();

        var results = docs.Select(d =>
        {
            var detection = d.DetectionResult;
            return new ScanListItem
            {
                Id = d.Id.ToString(),
                Title = Path.GetFileNameWithoutExtension(d.Filename),
                Author = d.Uploader?.Name ?? "Unknown",
                Words = 0,
                Draft = detection?.Status ?? "uploaded",
                Date = d.UploadDate.ToString("dd MMM yyyy"),
                Overall = detection?.OverallScore ?? 0,
                Flagged = detection?.HighlightedSections?.Count ?? 0,
                Summary = string.Empty,
                Layers = detection?.LayerScores?.Select(l => new LayerResult
                {
                    Key = l.LayerType,
                    Index = LayerIndex(l.LayerType),
                    Name = System.Globalization.CultureInfo.InvariantCulture
                               .TextInfo.ToTitleCase(l.LayerType),
                    Score = l.Score,
                    Note = l.Note,
                }).ToList() ?? new(),
                Passages = new(),
            };
        }).ToList();

        return Ok(results);
    }

    // ── GET /api/scans/{id} ───────────────────────────────────────────────────

    [HttpGet("scans/{id:int}")]
    public async Task<IActionResult> GetScan(int id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Student";

        var doc = await _db.Documents
            .Include(d => d.DetectionResult)
                .ThenInclude(r => r!.LayerScores)
            .Include(d => d.DetectionResult)
                .ThenInclude(r => r!.HighlightedSections)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc is null) return NotFound(new { error = $"Scan '{id}' not found." });

        // Students may only retrieve their own scans
        if (role == "Student" && doc.UploaderId != userId)
            return Forbid();

        return Ok(doc.ToScanListItem());
    }

    // ── DELETE /api/scans/{id} ────────────────────────────────────────────────

    [HttpDelete("scans/{id:int}")]
    public async Task<IActionResult> DeleteScan(int id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Student";

        var doc = await _db.Documents.FindAsync(id);
        if (doc is null) return NotFound(new { error = $"Scan '{id}' not found." });

        // Students may only delete their own scans
        if (role == "Student" && doc.UploaderId != userId)
            return Forbid();

        _db.Documents.Remove(doc);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string LayerIndex(string key) => key.ToLower() switch
    {
        "stylometric" => "01",
        "semantic"    => "02",
        "metadata"    => "03",
        "classifier"  => "04",
        _ => "00",
    };
}
