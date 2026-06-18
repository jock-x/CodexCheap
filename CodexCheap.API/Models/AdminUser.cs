using FreeSql.DataAnnotations;

namespace CodexCheap.API.Models;

[Table(Name = "admin_users")]
public class AdminUser
{
    [Column(Name = "id", IsPrimary = true, IsIdentity = true)]
    public long Id { get; set; }

    [Column(Name = "user_name")]
    public string UserName { get; set; } = string.Empty;

    [Column(Name = "password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [Column(Name = "is_enabled")]
    public bool IsEnabled { get; set; } = true;

    [Column(Name = "created_at")]
    public DateTime CreatedAt { get; set; }

    [Column(Name = "updated_at")]
    public DateTime UpdatedAt { get; set; }
}
