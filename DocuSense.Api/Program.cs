using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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

// CORS — allow the frontend (any origin is fine for local thesis dev)
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

// ── JWT Authentication ────────────────────────────────────────────────────────
// Reads key/issuer/audience from appsettings so they can be set via env vars in
// production without code changes.  Falls back to a development-safe default.

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? "DocuSense_SuperSecret_SecurityKey_2026_ThesisProject_MustBeLongEnough!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "DocuSense";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "DocuSenseClient";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });

builder.Services.AddAuthorization();

// ── Database ──────────────────────────────────────────────────────────────────
// Use Supabase PostgreSQL when a real connection string is configured.
// Fall back to a local SQLite file so the app runs out-of-the-box without any
// external dependencies. The SQLite fallback is intentional — do not remove it.

var supabaseConn = builder.Configuration.GetConnectionString("Supabase");
var usePostgres = !string.IsNullOrWhiteSpace(supabaseConn)
    && !supabaseConn.Contains("[YOUR-PASSWORD]");

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

// ── Application services ──────────────────────────────────────────────────────

builder.Services.AddScoped<DocumentReaderService>();
builder.Services.AddScoped<AnalysisService>();
builder.Services.AddSingleton<JwtTokenService>();

// ── Upload limits — 100 MB matching PRD business rule ─────────────────────────

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 100L * 1024 * 1024;
});
builder.WebHost.ConfigureKestrel(k =>
    k.Limits.MaxRequestBodySize = 100L * 1024 * 1024);

// ── Logging ───────────────────────────────────────────────────────────────────

builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.SetMinimumLevel(LogLevel.Information);
});

var app = builder.Build();

// ── Database migration ────────────────────────────────────────────────────────
// Use EF Core's migration-based approach — no hand-written SQL DDL here.
// EnsureCreated is used for SQLite (dev) since it's simpler and safe when there
// are no pending schema changes; Migrate() is used for PostgreSQL (production).

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsNpgsql())
    {
        db.Database.Migrate();
    }
    else
    {
        // SQLite dev path: EnsureCreated() creates the schema from the model if
        // the file doesn't yet exist.  Delete docusense.db to reset dev data.
        db.Database.EnsureCreated();
    }
}

// ── Middleware pipeline ───────────────────────────────────────────────────────

app.UseRouting();
app.UseCors();

// Authentication + Authorization must come BEFORE MapControllers
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check
app.MapGet("/", () => Results.Ok(new { service = "DocuSense API", version = "1.1" }));

app.Run();
