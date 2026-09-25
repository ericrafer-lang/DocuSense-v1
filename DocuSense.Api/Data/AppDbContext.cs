using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using DocuSense.Api.Models;

namespace DocuSense.Api.Data;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Student";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class StoredScan
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
    // Store layers and passages as JSON blobs
    public string LayersJson { get; set; } = "[]";
    public string PassagesJson { get; set; } = "[]";

    public ScanListItem ToScanListItem()
    {
        return new ScanListItem
        {
            Id = Id,
            Title = Title,
            Author = Author,
            Words = Words,
            Draft = Draft,
            Date = Date,
            Overall = Overall,
            Flagged = Flagged,
            Summary = Summary,
            Layers = JsonSerializer.Deserialize<List<LayerResult>>(LayersJson) ?? new(),
            Passages = JsonSerializer.Deserialize<List<PassageResult>>(PassagesJson) ?? new(),
        };
    }
}

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<StoredScan> Scans { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<StoredScan>().HasKey(s => s.Id);
        modelBuilder.Entity<User>().HasKey(u => u.Id);
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
    }
}
