using System.Security.Claims;
using CodexCheap.API.Contracts;
using CodexCheap.API.Models;
using CodexCheap.API.Services;
using FreeSql;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CodexCheap.API.Controllers;

[Route("api/auth")]
public class AuthController(
    IFreeSql db,
    PasswordHasher<AdminUser> passwordHasher,
    IJwtTokenService jwtTokenService) : BaseApiController
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<MessageModel<LoginResponse>>> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
        {
            return FailMessage<LoginResponse>("用户名或密码不能为空", StatusCodes.Status400BadRequest);
        }

        var user = await db.Select<AdminUser>()
            .Where(x => x.UserName == request.UserName)
            .FirstAsync();

        if (user is null || !user.IsEnabled)
        {
            return FailMessage<LoginResponse>("认证失败", StatusCodes.Status401Unauthorized);
        }

        var verifyResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            return FailMessage<LoginResponse>("认证失败", StatusCodes.Status401Unauthorized);
        }

        var token = jwtTokenService.Issue(user);
        return OkMessage(new LoginResponse(token.Token, token.ExpiresAt, user.UserName), "登录成功");
    }

    [HttpGet("me")]
    [Authorize]
    public ActionResult<MessageModel<CurrentUserResponse>> Me()
    {
        var id = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var userName = User.Identity?.Name ?? string.Empty;
        return OkMessage(new CurrentUserResponse(id, userName));
    }
}
