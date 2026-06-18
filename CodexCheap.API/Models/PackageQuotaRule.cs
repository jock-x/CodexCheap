using FreeSql.DataAnnotations;

namespace CodexCheap.API.Models;

public enum PackageQuotaType
{
    Daily = 1,
    Weekly = 2,
    Monthly = 3,
    Total = 4
}

[Table(Name = "package_quota_rules")]
public class PackageQuotaRule
{
    [Column(Name = "id", IsPrimary = true, IsIdentity = true)]
    public long Id { get; set; }

    [Column(Name = "package_plan_id")]
    public long PackagePlanId { get; set; }

    [Column(Name = "quota_type")]
    public int QuotaTypeValue { get; set; }

    [Column(IsIgnore = true)]
    public PackageQuotaType QuotaType
    {
        get => Enum.IsDefined(typeof(PackageQuotaType), QuotaTypeValue)
            ? (PackageQuotaType)QuotaTypeValue
            : PackageQuotaType.Total;
        set => QuotaTypeValue = (int)value;
    }

    [Column(Name = "amount_usd")]
    public decimal AmountUsd { get; set; }

    [Column(Name = "is_enabled")]
    public bool IsEnabled { get; set; } = true;

    [Column(Name = "created_at")]
    public DateTime CreatedAt { get; set; }

    [Column(Name = "updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column(Name = "deleted_at")]
    public DateTime? DeletedAt { get; set; }
}
