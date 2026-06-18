using CodexCheap.API.Contracts;
using CodexCheap.API.Models;

namespace CodexCheap.API.Services;

public interface IPricingService
{
    RechargePlanDto ToRechargeDto(RechargePlan plan, Site site, IReadOnlyList<RechargeRateRule> rateRules);
    RechargePlanDto ToRechargeDto(RechargePlan plan, RechargeRateRule rateRule, Site site);
    PackagePlanDto ToPackageDto(PackagePlan plan, Site site, IReadOnlyList<PackageQuotaRule> quotaRules);
}

public class PricingService : IPricingService
{
    public RechargePlanDto ToRechargeDto(RechargePlan plan, Site site, IReadOnlyList<RechargeRateRule> rateRules)
    {
        var validRates = rateRules
            .Where(x => x.DeletedAt == null && x.Multiplier > 0)
            .OrderBy(x => x.PoolGroup)
            .ThenBy(x => x.Multiplier)
            .ThenBy(x => x.Id)
            .ToList();
        var bestRate = validRates
            .Where(x => x.IsEnabled)
            .OrderBy(x => CalculateRechargeCost(plan, x))
            .ThenBy(x => plan.CnyAmount)
            .FirstOrDefault()
            ?? validRates.FirstOrDefault()
            ?? new RechargeRateRule
            {
                Multiplier = plan.Multiplier > 0 ? plan.Multiplier : 1m,
                PoolGroup = PoolGroup.Unknown,
                IsEnabled = true
            };

        var dto = ToRechargeDto(plan, bestRate, site, validRates.Select(ToRateDto).ToList());
        return dto with { RateId = bestRate.Id > 0 ? bestRate.Id : null };
    }

    public RechargePlanDto ToRechargeDto(RechargePlan plan, RechargeRateRule rateRule, Site site)
    {
        return ToRechargeDto(plan, rateRule, site, Array.Empty<RechargeRateRuleDto>());
    }

    public PackagePlanDto ToPackageDto(PackagePlan plan, Site site, IReadOnlyList<PackageQuotaRule> quotaRules)
    {
        var enabledRules = quotaRules.Where(q => q.IsEnabled && q.DeletedAt == null).ToList();
        var dailyPrice = SafeRound(plan.PriceCny / plan.DurationDays, 6);

        var candidates = enabledRules
            .Select(rule =>
            {
                var rawDailyUsd = rule.QuotaType switch
                {
                    PackageQuotaType.Daily => rule.AmountUsd,
                    PackageQuotaType.Weekly => rule.AmountUsd / 7m,
                    PackageQuotaType.Monthly => rule.AmountUsd / 30m,
                    PackageQuotaType.Total => rule.AmountUsd / plan.DurationDays,
                    _ => 0m
                };

                var dailyEffectiveUsd = rawDailyUsd / plan.Multiplier;
                var cost = dailyEffectiveUsd > 0 ? dailyPrice / dailyEffectiveUsd : decimal.MaxValue;
                return new
                {
                    Rule = rule,
                    DailyEffectiveUsd = SafeRound(dailyEffectiveUsd, 6),
                    Cost = SafeRound(cost, 6)
                };
            })
            .Where(x => x.DailyEffectiveUsd > 0 && x.Cost < decimal.MaxValue)
            .OrderBy(x => x.Cost)
            .ToList();

        var best = candidates.FirstOrDefault();
        var ruleDtos = quotaRules
            .Where(q => q.DeletedAt == null)
            .OrderBy(q => q.QuotaType)
            .ThenBy(q => q.Id)
            .Select(q => new PackageQuotaRuleDto(q.Id, q.QuotaType, q.QuotaType.ToText(), q.AmountUsd, q.IsEnabled))
            .ToList();

        return new PackagePlanDto(
            plan.Id,
            plan.SiteId,
            site.Name,
            site.Url,
            plan.Name,
            plan.PriceCny,
            plan.DurationDays,
            plan.Multiplier,
            plan.PoolGroup,
            plan.PoolGroup.ToText(),
            plan.IsEnabled,
            dailyPrice,
            best?.Rule.QuotaType,
            best?.Rule.QuotaType.ToText(),
            best?.DailyEffectiveUsd,
            best?.Cost,
            ruleDtos,
            plan.CreatedAt,
            plan.UpdatedAt);
    }

    private static RechargePlanDto ToRechargeDto(
        RechargePlan plan,
        RechargeRateRule rateRule,
        Site site,
        IReadOnlyList<RechargeRateRuleDto> rates)
    {
        var effectiveUsd = SafeRound(plan.UsdCredit / rateRule.Multiplier, 6);
        var cnyPerUsd = SafeRound(plan.CnyAmount / effectiveUsd, 6);

        return new RechargePlanDto(
            plan.Id,
            rateRule.Id > 0 ? rateRule.Id : null,
            plan.SiteId,
            site.Name,
            site.Url,
            plan.CnyAmount,
            plan.UsdCredit,
            rateRule.Multiplier,
            rateRule.PoolGroup,
            rateRule.PoolGroup.ToText(),
            plan.ExpireDays,
            plan.IsEnabled && rateRule.IsEnabled,
            effectiveUsd,
            cnyPerUsd,
            rates,
            plan.CreatedAt,
            plan.UpdatedAt);
    }

    private static RechargeRateRuleDto ToRateDto(RechargeRateRule rate)
    {
        return new RechargeRateRuleDto(rate.Id, rate.Multiplier, rate.PoolGroup, rate.PoolGroup.ToText(), rate.IsEnabled);
    }

    private static decimal CalculateRechargeCost(RechargePlan plan, RechargeRateRule rate)
    {
        var effectiveUsd = plan.UsdCredit / rate.Multiplier;
        return effectiveUsd > 0 ? plan.CnyAmount / effectiveUsd : decimal.MaxValue;
    }

    private static decimal SafeRound(decimal value, int decimals)
    {
        return Math.Round(value, decimals, MidpointRounding.AwayFromZero);
    }
}
