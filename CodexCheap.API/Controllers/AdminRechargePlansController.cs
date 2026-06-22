using CodexCheap.API.Contracts;
using CodexCheap.API.Models;
using CodexCheap.API.Services;
using FreeSql;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodexCheap.API.Controllers;

[Route("api/admin/recharge-plans")]
[Authorize]
public class AdminRechargePlansController(IFreeSql db, IPricingService pricingService) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<MessageModel<IReadOnlyList<RechargePlanDto>>>> List([FromQuery] long? siteId)
    {
        var sites = await db.Select<Site>().Where(x => x.DeletedAt == null).ToListAsync();
        var siteMap = sites.ToDictionary(x => x.Id);
        var plans = await db.Select<RechargePlan>()
            .Where(x => x.DeletedAt == null)
            .WhereIf(siteId.HasValue, x => x.SiteId == siteId!.Value)
            .OrderByDescending(x => x.Id)
            .ToListAsync();
        var planIds = plans.Select(x => x.Id).ToArray();
        var rates = planIds.Length == 0
            ? new List<RechargeRateRule>()
            : await db.Select<RechargeRateRule>().Where(x => planIds.Contains(x.RechargePlanId) && x.DeletedAt == null).ToListAsync();
        var rateMap = rates.GroupBy(x => x.RechargePlanId).ToDictionary(x => x.Key, x => (IReadOnlyList<RechargeRateRule>)x.ToList());

        var result = plans
            .Where(x => siteMap.ContainsKey(x.SiteId) && x.CnyAmount > 0 && x.UsdCredit > 0)
            .Select(x => pricingService.ToRechargeDto(x, siteMap[x.SiteId], rateMap.GetValueOrDefault(x.Id, Array.Empty<RechargeRateRule>())))
            .ToList();

        return OkMessage<IReadOnlyList<RechargePlanDto>>(result);
    }

    [HttpPost]
    public async Task<ActionResult<MessageModel<RechargePlanDto>>> Create([FromBody] SaveRechargePlanRequest request)
    {
        var site = await db.Select<Site>().Where(x => x.Id == request.SiteId && x.DeletedAt == null).FirstAsync();
        var validation = Validate(request, site);
        if (validation is not null) return validation;

        using var uow = db.CreateUnitOfWork();
        var planRepo = uow.GetRepository<RechargePlan>();
        var rateRepo = uow.GetRepository<RechargeRateRule>();
        var now = DateTime.Now;
        var enabledRates = request.Rates.Where(x => x.IsEnabled).OrderBy(x => x.Multiplier).ToList();
        var plan = new RechargePlan
        {
            SiteId = request.SiteId,
            CnyAmount = request.CnyAmount,
            UsdCredit = request.UsdCredit,
            Multiplier = enabledRates.First().Multiplier,
            ExpireDays = request.ExpireDays,
            IsEnabled = request.IsEnabled,
            CreatedAt = now,
            UpdatedAt = now
        };
        await planRepo.InsertAsync(plan);

        var rates = request.Rates.Select(x => new RechargeRateRule
        {
            RechargePlanId = plan.Id,
            Multiplier = x.Multiplier,
            PoolGroup = x.PoolGroup,
            IsEnabled = x.IsEnabled,
            CreatedAt = now,
            UpdatedAt = now
        }).ToList();
        await rateRepo.InsertAsync(rates);
        uow.Commit();

        return OkMessage(pricingService.ToRechargeDto(plan, site!, rates), "创建成功");
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<MessageModel<RechargePlanDto>>> Update(long id, [FromBody] SaveRechargePlanRequest request)
    {
        var plan = await db.Select<RechargePlan>().Where(x => x.Id == id && x.DeletedAt == null).FirstAsync();
        if (plan is null) return FailMessage<RechargePlanDto>("按量充值不存在", StatusCodes.Status404NotFound);

        var site = await db.Select<Site>().Where(x => x.Id == request.SiteId && x.DeletedAt == null).FirstAsync();
        var validation = Validate(request, site);
        if (validation is not null) return validation;

        using var uow = db.CreateUnitOfWork();
        var now = DateTime.Now;
        var enabledRates = request.Rates.Where(x => x.IsEnabled).OrderBy(x => x.Multiplier).ToList();
        plan.SiteId = request.SiteId;
        plan.CnyAmount = request.CnyAmount;
        plan.UsdCredit = request.UsdCredit;
        plan.Multiplier = enabledRates.First().Multiplier;
        plan.ExpireDays = request.ExpireDays;
        plan.IsEnabled = request.IsEnabled;
        plan.UpdatedAt = now;
        await uow.Orm.Update<RechargePlan>().SetSource(plan).ExecuteAffrowsAsync();

        await uow.Orm.Delete<RechargeRateRule>()
            .Where(x => x.RechargePlanId == id)
            .ExecuteAffrowsAsync();

        var rates = request.Rates.Select(x => new RechargeRateRule
        {
            RechargePlanId = id,
            Multiplier = x.Multiplier,
            PoolGroup = x.PoolGroup,
            IsEnabled = x.IsEnabled,
            CreatedAt = now,
            UpdatedAt = now
        }).ToList();
        await uow.Orm.Insert(rates).ExecuteAffrowsAsync();
        uow.Commit();

        return OkMessage(pricingService.ToRechargeDto(plan, site!, rates), "保存成功");
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<MessageModel<string>>> Delete(long id)
    {
        using var uow = db.CreateUnitOfWork();
        var now = DateTime.Now;
        var rows = await uow.Orm.Update<RechargePlan>()
            .Set(x => x.DeletedAt, now)
            .Set(x => x.UpdatedAt, now)
            .Where(x => x.Id == id && x.DeletedAt == null)
            .ExecuteAffrowsAsync();
        await uow.Orm.Update<RechargeRateRule>()
            .Set(x => x.DeletedAt, now)
            .Set(x => x.UpdatedAt, now)
            .Where(x => x.RechargePlanId == id && x.DeletedAt == null)
            .ExecuteAffrowsAsync();
        uow.Commit();

        return rows > 0 ? OkMessage(string.Empty, "删除成功") : FailMessage<string>("按量充值不存在", StatusCodes.Status404NotFound);
    }

    private ActionResult<MessageModel<RechargePlanDto>>? Validate(SaveRechargePlanRequest request, Site? site)
    {
        var rates = request.Rates ?? Array.Empty<SaveRechargeRateRuleRequest>();
        if (site is null) return FailMessage<RechargePlanDto>("中转站不存在", StatusCodes.Status400BadRequest);
        if (!site.SupportType.SupportsUsage()) return FailMessage<RechargePlanDto>("该中转站不支持按量充值", StatusCodes.Status400BadRequest);
        if (request.CnyAmount <= 0) return FailMessage<RechargePlanDto>("充值人民币金额必须大于 0", StatusCodes.Status400BadRequest);
        if (request.UsdCredit <= 0) return FailMessage<RechargePlanDto>("兑换美元金额必须大于 0", StatusCodes.Status400BadRequest);
        if (request.ExpireDays < 0) return FailMessage<RechargePlanDto>("过期天数不能小于 0", StatusCodes.Status400BadRequest);
        if (rates.Count == 0) return FailMessage<RechargePlanDto>("至少需要一条倍率明细", StatusCodes.Status400BadRequest);
        if (rates.Any(x => x.Multiplier <= 0)) return FailMessage<RechargePlanDto>("倍率必须大于 0", StatusCodes.Status400BadRequest);
        if (rates.Any(x => !Enum.IsDefined(x.PoolGroup))) return FailMessage<RechargePlanDto>("号池分组不正确", StatusCodes.Status400BadRequest);
        if (rates.All(x => !x.IsEnabled)) return FailMessage<RechargePlanDto>("至少需要启用一条倍率明细", StatusCodes.Status400BadRequest);
        return null;
    }
}
