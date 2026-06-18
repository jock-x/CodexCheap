using CodexCheap.API.Models;

namespace CodexCheap.API.Contracts;

public record PackageQuotaRuleDto(
    long Id,
    PackageQuotaType QuotaType,
    string QuotaTypeText,
    decimal AmountUsd,
    bool IsEnabled);

public record PackagePlanDto(
    long Id,
    long SiteId,
    string SiteName,
    string SiteUrl,
    string Name,
    decimal PriceCny,
    int DurationDays,
    decimal Multiplier,
    PoolGroup PoolGroup,
    string PoolGroupText,
    bool IsEnabled,
    decimal DailyPrice,
    PackageQuotaType? BestQuotaType,
    string? BestQuotaTypeText,
    decimal? DailyEffectiveUsd,
    decimal? CnyPerUsdPerDay,
    IReadOnlyList<PackageQuotaRuleDto> QuotaRules,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record SavePackagePlanRequest(
    long SiteId,
    string Name,
    decimal PriceCny,
    int DurationDays,
    decimal Multiplier,
    PoolGroup PoolGroup,
    bool IsEnabled,
    IReadOnlyList<SavePackageQuotaRuleRequest> QuotaRules);

public record SavePackageQuotaRuleRequest(
    long? Id,
    PackageQuotaType QuotaType,
    decimal AmountUsd,
    bool IsEnabled);
