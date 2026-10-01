using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DocuSense.Api.Data;
using DocuSense.Api.Models;
using DocuSense.Api.Services;

namespace DocuSense.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;

    public AuthController(AppDbContext db, JwtTokenService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    // POST /api/auth/register
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
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = string.IsNullOrWhiteSpace(req.Role) ? "Student" : req.Role.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _jwt.GenerateToken(user.Id, user.Email, user.Role);
        return Ok(new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Token = token,
        });
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email and password are required." });

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        var token = _jwt.GenerateToken(user.Id, user.Email, user.Role);
        return Ok(new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Token = token,
        });
    }

    // POST /api/auth/forgot-password
    // Minimal thesis-demo implementation: stores a one-time token with 1-hour expiry.
    // No email delivery — the token is returned in the response for local demo purposes.
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { message = "Email is required." });

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        // Always return success to prevent email enumeration
        if (user == null)
            return Ok(new { message = "If that email exists, reset instructions have been dispatched." });

        // Generate a secure one-time token and store it with a 1-hour expiry
        var resetToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        var expiry = DateTime.UtcNow.AddHours(1);

        user.PasswordResetToken = resetToken;
        user.PasswordResetExpiry = expiry;
        await _db.SaveChangesAsync();

        // In a real deployment this token would be emailed; for the thesis demo it is returned.
        return Ok(new
        {
            message = "If that email exists, reset instructions have been dispatched.",
            resetToken, // only visible in demo — remove when email delivery is added
        });
    }

    // POST /api/auth/reset-password
    // Accepts the token from forgot-password and sets a new BCrypt-hashed password.
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token) || string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { message = "Token and new password are required." });

        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.PasswordResetToken == req.Token &&
            u.PasswordResetExpiry != null &&
            u.PasswordResetExpiry > DateTime.UtcNow);

        if (user == null)
            return BadRequest(new { message = "Reset token is invalid or has expired." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetExpiry = null;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password updated successfully." });
    }
}
