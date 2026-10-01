using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using DocuSense.Api.Models;

namespace DocuSense.Api.Data;

// ── Entity models ─────────────────────────────────────────────────────────────

/// <summary>Registered user account.</summary>
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Student";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Forgot-password one-time token (null when no reset is pending)
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetExpiry { get; set; }

    public ICollection<Document> Documents { get; set; } = new List<Document>();
}

/// <summary>
/// Uploaded document record. StoragePath is relative to ContentRoot/UploadedFiles
/// so it survives container restarts without absolute-path coupling.
/// </summary>
public class Document
{
    public int Id { get; set; }
    public int UploaderId { get; set; }
    public User? Uploader { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;    // e.g. ".pdf"
    public string StoragePath { get; set; } = string.Empty;
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    public string? ExtractedText { get; set; }

    public DetectionResult? DetectionResult { get; set; }
}

/// <summary>Top-level result row for one analysis run.</summary>
public class DetectionResult
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public Document? Document { get; set; }
    public double OverallScore { get; set; }
    public string Status { get; set; } = "uploaded";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<DetectionLayerScore> LayerScores { get; set; } = new List<DetectionLayerScore>();
    public ICollection<HighlightedSection> HighlightedSections { get; set; } = new List<HighlightedSection>();
}

/// <summary>One row per analysis layer per result (Stylometric, Semantic, Metadata, Classifier).</summary>
public class DetectionLayerScore
{
    public int Id { get; set; }
    public int ResultId { get; set; }
    public DetectionResult? Result { get; set; }
    public string LayerType { get; set; } = string.Empty;  // "stylometric"|"semantic"|"metadata"|"classifier"
    public double Score { get; set; }
    public string Note { get; set; } = string.Empty;
}

/// <summary>One row per flagged passage per result.</summary>
public class HighlightedSection
{
    public int Id { get; set; }
    public int ResultId { get; set; }
    public DetectionResult? Result { get; set; }
    public string SectionText { get; set; } = string.Empty;
    public double SectionScore { get; set; }
    public int Position { get; set; }
    public string? Layer { get; set; }
    public string? Reason { get; set; }
}

// ── DbContext ─────────────────────────────────────────────────────────────────

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Document> Documents { get; set; } = null!;
    public DbSet<DetectionResult> DetectionResults { get; set; } = null!;
    public DbSet<DetectionLayerScore> DetectionLayerScores { get; set; } = null!;
    public DbSet<HighlightedSection> HighlightedSections { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

        modelBuilder.Entity<Document>()
            .HasOne(d => d.Uploader)
            .WithMany(u => u.Documents)
            .HasForeignKey(d => d.UploaderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DetectionResult>()
            .HasOne(r => r.Document)
            .WithOne(d => d.DetectionResult)
            .HasForeignKey<DetectionResult>(r => r.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DetectionLayerScore>()
            .HasOne(l => l.Result)
            .WithMany(r => r.LayerScores)
            .HasForeignKey(l => l.ResultId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HighlightedSection>()
            .HasOne(h => h.Result)
            .WithMany(r => r.HighlightedSections)
            .HasForeignKey(h => h.ResultId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
