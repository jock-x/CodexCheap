using CodexCheap.API.Models;

namespace CodexCheap.API.Contracts;

public record RechargeRateRuleDto(
    long Id,
    decimal Multiplier,
    PoolGroup PoolGroup,
    string PoolGroupText,
    bool IsEnabled);

public record RechargePlanDto(
    long Id,
    long? RateId,
    long SiteId,
    string SiteName,
    string SiteUrl,
    decimal CnyAmount,
    decimal UsdCredit,
    decimal Multiplier,
    PoolGroup PoolGroup,
    string PoolGroupText,
    int ExpireDays,
    bool IsEnabled,
    decimal EffectiveUsd,
    decimal CnyPerUsd,
    IReadOnlyList<RechargeRateRuleDto> Rates,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record SaveRechargePlanRequest(
    long SiteId,
    decimal CnyAmount,
    decimal UsdCredit,
    int ExpireDays,
    bool IsEnabled,
    IReadOnlyList<SaveRechargeRateRuleRequest> Rates);

public record SaveRechargeRateRuleRequest(
    long? Id,
    decimal Multiplier,
    PoolGroup PoolGroup,
    bool IsEnabled);
