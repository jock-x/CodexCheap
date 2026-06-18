namespace CodexCheap.API.Contracts;

public record LoginRequest(string UserName, string Password);

public record LoginResponse(string Token, DateTime ExpiresAt, string UserName);

public record CurrentUserResponse(long Id, string UserName);
