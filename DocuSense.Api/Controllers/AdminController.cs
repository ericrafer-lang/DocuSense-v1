using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DocuSense.Api.Data;

namespace DocuSense.Api.Controllers;

public record UpdateUserRequest(string Name, string Role);

/// <summary>
/// Admin-only user management endpoints.
/// The [Authorize(Roles = "Admin")] attribute means the JWT must carry
/// a "Admin" role claim — the middleware enforces this before any handler runs.
/// </summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db) => _db = db;

    // GET /api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _db.Users
            .OrderBy(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                u.Role,
                createdAt = u.CreatedAt,
            })
            .ToListAsync();

        return Ok(users);
    }

    // PUT /api/admin/users/{id}
    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { error = $"User {id} not found." });

        user.Name = request.Name;
        user.Role = request.Role;
        await _db.SaveChangesAsync();

        return Ok(new { user.Id, user.Name, user.Email, user.Role });
    }

    // DELETE /api/admin/users/{id}
    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { error = $"User {id} not found." });

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
