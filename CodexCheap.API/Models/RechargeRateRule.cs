using FreeSql.DataAnnotations;

namespace CodexCheap.API.Models;

[Table(Name = "recharge_rate_rules")]
public class RechargeRateRule
{
    [Column(Name = "id", IsPrimary = true, IsIdentity = true)]
    public long Id { get; set; }

    [Column(Name = "recharge_plan_id")]
    public long RechargePlanId { get; set; }

    [Column(Name = "multiplier")]
    public decimal Multiplier { get; set; } = 1m;

    [Column(Name = "pool_group")]
    public int PoolGroupValue { get; set; } = (int)PoolGroup.Plus;

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
