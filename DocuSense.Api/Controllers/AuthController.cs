using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using DocuSense.Api.Data;
using DocuSense.Api.Models;

namespace DocuSense.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email and password are required." });

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (exists)
            return BadRequest(new { message = "A user with this email already exists." });

        var user = new User
        {
            Name = string.IsNullOrWhiteSpace(req.Name) ? req.Email.Split('@')[0] : req.Name.Trim(),
            Email = req.Email.Trim(),
            PasswordHash = HashPassword(req.Password),
            Role = string.IsNullOrWhiteSpace(req.Role) ? "Student" : req.Role.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user.Id}:{user.Email}:{DateTime.UtcNow.Ticks}"))
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email and password are required." });

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (user == null || !VerifyPassword(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        return Ok(new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user.Id}:{user.Email}:{DateTime.UtcNow.Ticks}"))
        });
    }

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }

    private static bool VerifyPassword(string password, string storedHash)
    {
        return HashPassword(password) == storedHash;
    }
}
