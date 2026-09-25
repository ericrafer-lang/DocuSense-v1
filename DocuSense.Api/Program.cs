using Microsoft.EntityFrameworkCore;
using DocuSense.Api.Data;
using DocuSense.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// CORS — allow the frontend (ports 8080, 3000, 5173, etc.)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Database: Supabase PostgreSQL (or fallback to local SQLite if password not set)
var supabaseConn = builder.Configuration.GetConnectionString("Supabase");
var usePostgres = !string.IsNullOrWhiteSpace(supabaseConn) && !supabaseConn.Contains("[YOUR-PASSWORD]");

if (usePostgres)
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(supabaseConn));
}
else
{
    var dbPath = Path.Combine(AppContext.BaseDirectory, "docusense.db");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite($"Data Source={dbPath}"));
}

// Application services
builder.Services.AddScoped<DocumentReaderService>();
builder.Services.AddScoped<AnalysisService>();

// Allow large uploads (50 MB)
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 50 * 1024 * 1024;
});
builder.WebHost.ConfigureKestrel(k =>
    k.Limits.MaxRequestBodySize = 50 * 1024 * 1024);

builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.SetMinimumLevel(LogLevel.Information);
});

var app = builder.Build();

// ── Database setup ────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (!db.Database.IsNpgsql())
    {
        db.Database.EnsureCreated();   // Creates SQLite file + tables on first run
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS Users (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Email TEXT NOT NULL UNIQUE,
                PasswordHash TEXT NOT NULL,
                Role TEXT NOT NULL,
                CreatedAt TEXT NOT NULL
            );");
    }
    else
    {
        // PostgreSQL (Supabase): ensure required tables exist
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS public.""Users"" (
                ""Id""           SERIAL PRIMARY KEY,
                ""Name""         TEXT NOT NULL,
                ""Email""        TEXT NOT NULL UNIQUE,
                ""PasswordHash"" TEXT NOT NULL,
                ""Role""         TEXT NOT NULL,
                ""CreatedAt""    TIMESTAMP NOT NULL
            );");

        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS public.""Scans"" (
                ""Id""           TEXT NOT NULL PRIMARY KEY,
                ""Title""        TEXT NOT NULL DEFAULT '',
                ""Author""       TEXT NOT NULL DEFAULT '',
                ""Words""        INTEGER NOT NULL DEFAULT 0,
                ""Draft""        TEXT NOT NULL DEFAULT 'uploaded',
                ""Date""         TEXT NOT NULL DEFAULT '',
                ""Overall""      DOUBLE PRECISION NOT NULL DEFAULT 0,
                ""Flagged""      INTEGER NOT NULL DEFAULT 0,
                ""Summary""      TEXT NOT NULL DEFAULT '',
                ""LayersJson""   TEXT NOT NULL DEFAULT '[]',
                ""PassagesJson"" TEXT NOT NULL DEFAULT '[]'
            );");
    }
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseRouting();
app.UseCors();
app.MapControllers();

// Health check
app.MapGet("/", () => Results.Ok(new { service = "DocuSense API", version = "1.0" }));

app.Run();
