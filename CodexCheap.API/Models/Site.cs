using FreeSql.DataAnnotations;

namespace CodexCheap.API.Models;

public enum SiteSupportType
{
    Usage = 1,
    Package = 2,
    UsageAndPackage = 3
}

[Table(Name = "sites")]
public class Site
{
    [Column(Name = "id", IsPrimary = true, IsIdentity = true)]
    public long Id { get; set; }

    [Column(Name = "name")]
    public string Name { get; set; } = string.Empty;

    [Column(Name = "url")]
    public string Url { get; set; } = string.Empty;

    [Column(Name = "support_type")]
    public int SupportTypeValue { get; set; } = (int)SiteSupportType.UsageAndPackage;

    [Column(IsIgnore = true)]
    public SiteSupportType SupportType
    {
        get => Enum.IsDefined(typeof(SiteSupportType), SupportTypeValue)
            ? (SiteSupportType)SupportTypeValue
            : SiteSupportType.UsageAndPackage;
        set => SupportTypeValue = (int)value;
    }

    [Column(Name = "is_enabled")]
    public bool IsEnabled { get; set; } = true;

    [Column(Name = "remark")]
    public string? Remark { get; set; }

    [Column(Name = "created_at")]
    public DateTime CreatedAt { get; set; }

    [Column(Name = "updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column(Name = "deleted_at")]
    public DateTime? DeletedAt { get; set; }
}
