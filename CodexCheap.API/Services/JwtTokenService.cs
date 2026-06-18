using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CodexCheap.API.Models;
using Microsoft.IdentityModel.Tokens;

namespace CodexCheap.API.Services;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAt) Issue(AdminUser user);
}

public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public (string Token, DateTime ExpiresAt) Issue(AdminUser user)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var secret = jwtSection["Secret"] ?? throw new InvalidOperationException("Jwt:Secret is missing.");
        var issuer = jwtSection["Issuer"] ?? "CodexCheap";
        var audience = jwtSection["Audience"] ?? "CodexCheap.Admin";
        var expiresMinutes = jwtSection.GetValue("ExpiresMinutes", 720);
        var expiresAt = DateTime.UtcNow.AddMinutes(expiresMinutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.UserName)
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
