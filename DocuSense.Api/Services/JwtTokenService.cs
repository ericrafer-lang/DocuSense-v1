using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace DocuSense.Api.Services;

/// <summary>
/// Generates and configures signed JWTs.
/// Secret / issuer / audience are read from appsettings so they can be rotated
/// without redeploying. A development-safe fallback is provided so the app
/// starts with no configuration changes required for local dev.
/// </summary>
public class JwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(int userId, string email, string role)
    {
        var secret = _config["Jwt:Key"]
            ?? "DocuSense_SuperSecret_SecurityKey_2026_ThesisProject_MustBeLongEnough!";
        var issuer = _config["Jwt:Issuer"] ?? "DocuSense";
        var audience = _config["Jwt:Audience"] ?? "DocuSenseClient";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role),
            // "role" as a plain claim for broad client compatibility
            new Claim("role", role),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Returns the validation parameters that UseAuthentication/JwtBearer should use.
    /// Kept here so Program.cs and the service both reference the same settings.
    /// </summary>
    public TokenValidationParameters GetValidationParameters()
    {
        var secret = _config["Jwt:Key"]
            ?? "DocuSense_SuperSecret_SecurityKey_2026_ThesisProject_MustBeLongEnough!";
        var issuer = _config["Jwt:Issuer"] ?? "DocuSense";
        var audience = _config["Jwt:Audience"] ?? "DocuSenseClient";

        return new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    }
}
