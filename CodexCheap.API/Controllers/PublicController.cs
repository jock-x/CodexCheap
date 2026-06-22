using CodexCheap.API.Contracts;
using CodexCheap.API.Models;
using CodexCheap.API.Services;
using FreeSql;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodexCheap.API.Controllers;

[Route("api/public")]
[AllowAnonymous]
public class PublicController(IFreeSql db, IPricingService pricingService) : BaseApiController
{
    [HttpGet("usage-comparisons")]
    public async Task<ActionResult<MessageModel<IReadOnlyList<RechargePlanDto>>>> UsageComparisons([FromQuery] PoolGroup? poolGroup)
    {
        if (poolGroup.HasValue && !Enum.IsDefined(poolGroup.Value))
        {
            return FailMessage<IReadOnlyList<RechargePlanDto>>("号池分组不正确", StatusCodes.Status400BadRequest);
        }

        var sites = await db.Select<Site>()
            .Where(x => x.DeletedAt == null && x.IsEnabled)
            .ToListAsync();
        var siteMap = sites.Where(x => x.SupportType.SupportsUsage()).ToDictionary(x => x.Id);
        var requestedPoolGroup = poolGroup;

        var plans = await db.Select<RechargePlan>()
            .Where(x => x.DeletedAt == null && x.IsEnabled && x.CnyAmount > 0 && x.UsdCredit > 0)
            .ToListAsync();
        var planIds = plans.Select(x => x.Id).ToArray();
        var rates = planIds.Length == 0
            ? new List<RechargeRateRule>()
            : await db.Select<RechargeRateRule>()
                .Where(x => planIds.Contains(x.RechargePlanId) && x.DeletedAt == null && x.IsEnabled && x.Multiplier > 0)
                .WhereIf(requestedPoolGroup.HasValue, x => x.PoolGroupValue == (int)requestedPoolGroup!.Value)
                .ToListAsync();
        var rateMap = rates.GroupBy(x => x.RechargePlanId).ToDictionary(x => x.Key, x => x.ToList());

        var result = plans
            .Where(x => siteMap.ContainsKey(x.SiteId))
            .Select(x => pricingService.ToRechargeDto(x, siteMap[x.SiteId], rateMap.GetValueOrDefault(x.Id, new List<RechargeRateRule>())))
            .Where(x => x.Rates.Count > 0)
            .OrderBy(x => x.CnyPerUsd)
            .ThenBy(x => x.CnyAmount)
            .ToList();

        return OkMessage<IReadOnlyList<RechargePlanDto>>(result);
    }

    [HttpGet("package-comparisons")]
    public async Task<ActionResult<MessageModel<IReadOnlyList<PackagePlanDto>>>> PackageComparisons([FromQuery] PoolGroup? poolGroup)
    {
        if (poolGroup.HasValue && !Enum.IsDefined(poolGroup.Value))
        {
            return FailMessage<IReadOnlyList<PackagePlanDto>>("号池分组不正确", StatusCodes.Status400BadRequest);
        }

        var sites = await db.Select<Site>()
            .Where(x => x.DeletedAt == null && x.IsEnabled)
            .ToListAsync();
        var siteMap = sites.Where(x => x.SupportType.SupportsPackage()).ToDictionary(x => x.Id);
        var requestedPoolGroup = poolGroup;

        var plans = await db.Select<PackagePlan>()
            .Where(x => x.DeletedAt == null && x.IsEnabled && x.PriceCny > 0 && x.DurationDays > 0 && x.Multiplier > 0)
            .WhereIf(requestedPoolGroup.HasValue, x => x.PoolGroupValue == (int)requestedPoolGroup!.Value)
            .ToListAsync();
        var planIds = plans.Select(x => x.Id).ToArray();
        var rules = planIds.Length == 0
            ? new List<PackageQuotaRule>()
            : await db.Select<PackageQuotaRule>()
                .Where(x => planIds.Contains(x.PackagePlanId) && x.DeletedAt == null && x.IsEnabled && x.AmountUsd > 0)
                .ToListAsync();
        var ruleMap = rules.GroupBy(x => x.PackagePlanId).ToDictionary(x => x.Key, x => (IReadOnlyList<PackageQuotaRule>)x.ToList());

        var result = plans
            .Where(x => siteMap.ContainsKey(x.SiteId))
            .Select(x => pricingService.ToPackageDto(x, siteMap[x.SiteId], ruleMap.GetValueOrDefault(x.Id, Array.Empty<PackageQuotaRule>())))
            .Where(x => x.CnyPerUsdPerDay.HasValue)
            .OrderBy(x => x.CnyPerUsdPerDay)
            .ThenByDescending(x => x.DailyEffectiveUsd)
            .ToList();

        return OkMessage<IReadOnlyList<PackagePlanDto>>(result);
    }
}
