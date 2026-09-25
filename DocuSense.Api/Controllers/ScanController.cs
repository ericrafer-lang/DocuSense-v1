using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using DocuSense.Api.Data;
using DocuSense.Api.Models;
using DocuSense.Api.Services;

namespace DocuSense.Api.Controllers;

[ApiController]
[Route("api")]
public class ScanController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DocumentReaderService _reader;
    private readonly AnalysisService _analysis;
    private readonly ILogger<ScanController> _logger;

    public ScanController(
        AppDbContext db,
        DocumentReaderService reader,
        AnalysisService analysis,
        ILogger<ScanController> logger)
    {
        _db = db;
        _reader = reader;
        _analysis = analysis;
        _logger = logger;
    }

    // POST /api/scan
    [HttpPost("scan")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB
    public async Task<IActionResult> UploadScan(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        try
        {
            _logger.LogInformation("Analyzing file: {FileName} ({Size} bytes)", file.FileName, file.Length);

            var doc = await _reader.ExtractAsync(file);
            var result = _analysis.Analyze(doc, file.FileName);

            // Persist to SQLite
            var stored = new StoredScan
            {
                Id = result.Id,
                Title = result.Title,
                Author = result.Author,
                Words = result.Words,
                Draft = result.Draft,
                Date = result.Date,
                Overall = result.Overall,
                Flagged = result.Flagged,
                Summary = result.Summary,
                LayersJson = JsonSerializer.Serialize(result.Layers),
                PassagesJson = JsonSerializer.Serialize(result.Passages),
            };

            _db.Scans.Add(stored);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Scan saved: {Id} overall={Overall}", result.Id, result.Overall);
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

    // GET /api/scans  — list all past scans (newest first)
    [HttpGet("scans")]
    public async Task<IActionResult> ListScans()
    {
        var scans = await _db.Scans
            .OrderByDescending(s => s.Date)
            .ToListAsync();

        var results = scans.Select(s => s.ToScanListItem()).ToList();
        return Ok(results);
    }

    // GET /api/scans/{id}
    [HttpGet("scans/{id}")]
    public async Task<IActionResult> GetScan(string id)
    {
        var scan = await _db.Scans.FindAsync(id);
        if (scan is null) return NotFound(new { error = $"Scan '{id}' not found." });
        return Ok(scan.ToScanListItem());
    }

    // DELETE /api/scans/{id}
    [HttpDelete("scans/{id}")]
    public async Task<IActionResult> DeleteScan(string id)
    {
        var scan = await _db.Scans.FindAsync(id);
        if (scan is null) return NotFound(new { error = $"Scan '{id}' not found." });
        _db.Scans.Remove(scan);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
