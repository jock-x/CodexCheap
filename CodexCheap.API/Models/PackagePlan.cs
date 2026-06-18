using FreeSql.DataAnnotations;

namespace CodexCheap.API.Models;

[Table(Name = "package_plans")]
public class PackagePlan
{
    [Column(Name = "id", IsPrimary = true, IsIdentity = true)]
    public long Id { get; set; }

    [Column(Name = "site_id")]
    public long SiteId { get; set; }

    [Column(Name = "name")]
    public string Name { get; set; } = string.Empty;

    [Column(Name = "price_cny")]
    public decimal PriceCny { get; set; }

    [Column(Name = "duration_days")]
    public int DurationDays { get; set; }

    [Column(Name = "multiplier")]
    public decimal Multiplier { get; set; } = 1m;

    [Column(Name = "pool_group")]
    public int PoolGroupValue { get; set; } = (int)PoolGroup.Unknown;

    [Column(IsIgnore = true)]
    public PoolGroup PoolGroup
    {
        get => Enum.IsDefined(typeof(PoolGroup), PoolGroupValue) ? (PoolGroup)PoolGroupValue : PoolGroup.Unknown;
        set => PoolGroupValue = (int)value;
    }

    [Column(Name = "is_enabled")]
    public bool IsEnabled { get; set; } = true;

    [Column(Name = "created_at")]
    public DateTime CreatedAt { get; set; }

    [Column(Name = "updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column(Name = "deleted_at")]
    public DateTime? DeletedAt { get; set; }
}
