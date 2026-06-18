using CodexCheap.API.Contracts;
using CodexCheap.API.Models;
using CodexCheap.API.Services;
using FreeSql;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodexCheap.API.Controllers;

[Route("api/admin/package-plans")]
[Authorize]
public class AdminPackagePlansController(IFreeSql db, IPricingService pricingService) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<MessageModel<IReadOnlyList<PackagePlanDto>>>> List([FromQuery] long? siteId)
    {
        var sites = await db.Select<Site>().Where(x => x.DeletedAt == null).ToListAsync();
        var siteMap = sites.ToDictionary(x => x.Id);
        var plans = await db.Select<PackagePlan>()
            .Where(x => x.DeletedAt == null)
            .WhereIf(siteId.HasValue, x => x.SiteId == siteId!.Value)
            .OrderByDescending(x => x.Id)
            .ToListAsync();
        var planIds = plans.Select(x => x.Id).ToArray();
        var rules = planIds.Length == 0
            ? new List<PackageQuotaRule>()
            : await db.Select<PackageQuotaRule>().Where(x => planIds.Contains(x.PackagePlanId) && x.DeletedAt == null).ToListAsync();
        var ruleMap = rules.GroupBy(x => x.PackagePlanId).ToDictionary(x => x.Key, x => (IReadOnlyList<PackageQuotaRule>)x.ToList());

        var result = plans
            .Where(x => siteMap.ContainsKey(x.SiteId) && x.PriceCny > 0 && x.DurationDays > 0 && x.Multiplier > 0)
            .Select(x => pricingService.ToPackageDto(x, siteMap[x.SiteId], ruleMap.GetValueOrDefault(x.Id, Array.Empty<PackageQuotaRule>())))
            .ToList();

        return OkMessage<IReadOnlyList<PackagePlanDto>>(result);
    }

    [HttpPost]
    public async Task<ActionResult<MessageModel<PackagePlanDto>>> Create([FromBody] SavePackagePlanRequest request)
    {
        var site = await db.Select<Site>().Where(x => x.Id == request.SiteId && x.DeletedAt == null).FirstAsync();
        var validation = Validate(request, site);
        if (validation is not null) return validation;

        using var uow = db.CreateUnitOfWork();
        var repo = uow.GetRepository<PackagePlan>();
        var ruleRepo = uow.GetRepository<PackageQuotaRule>();
        var now = DateTime.Now;
        var plan = new PackagePlan
        {
            SiteId = request.SiteId,
            Name = request.Name.Trim(),
            PriceCny = request.PriceCny,
            DurationDays = request.DurationDays,
            Multiplier = request.Multiplier,
            PoolGroup = request.PoolGroup,
            IsEnabled = request.IsEnabled,
            CreatedAt = now,
            UpdatedAt = now
        };
        await repo.InsertAsync(plan);
        var rules = request.QuotaRules.Select(x => new PackageQuotaRule
        {
            PackagePlanId = plan.Id,
            QuotaType = x.QuotaType,
            AmountUsd = x.AmountUsd,
            IsEnabled = x.IsEnabled,
            CreatedAt = now,
            UpdatedAt = now
        }).ToList();
        await ruleRepo.InsertAsync(rules);
        uow.Commit();

        return OkMessage(pricingService.ToPackageDto(plan, site!, rules), "创建成功");
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<MessageModel<PackagePlanDto>>> Update(long id, [FromBody] SavePackagePlanRequest request)
    {
        var plan = await db.Select<PackagePlan>().Where(x => x.Id == id && x.DeletedAt == null).FirstAsync();
        if (plan is null) return FailMessage<PackagePlanDto>("套餐不存在", StatusCodes.Status404NotFound);

        var site = await db.Select<Site>().Where(x => x.Id == request.SiteId && x.DeletedAt == null).FirstAsync();
        var validation = Validate(request, site);
        if (validation is not null) return validation;

        using var uow = db.CreateUnitOfWork();
        plan.SiteId = request.SiteId;
        plan.Name = request.Name.Trim();
        plan.PriceCny = request.PriceCny;
        plan.DurationDays = request.DurationDays;
        plan.Multiplier = request.Multiplier;
        plan.PoolGroup = request.PoolGroup;
        plan.IsEnabled = request.IsEnabled;
        plan.UpdatedAt = DateTime.Now;
        await uow.Orm.Update<PackagePlan>().SetSource(plan).ExecuteAffrowsAsync();

        await uow.Orm.Update<PackageQuotaRule>()
            .Set(x => x.DeletedAt, DateTime.Now)
            .Set(x => x.UpdatedAt, DateTime.Now)
            .Where(x => x.PackagePlanId == id && x.DeletedAt == null)
            .ExecuteAffrowsAsync();

        var now = DateTime.Now;
        var rules = request.QuotaRules.Select(x => new PackageQuotaRule
        {
            PackagePlanId = id,
            QuotaType = x.QuotaType,
            AmountUsd = x.AmountUsd,
            IsEnabled = x.IsEnabled,
            CreatedAt = now,
            UpdatedAt = now
        }).ToList();
        await uow.Orm.Insert(rules).ExecuteAffrowsAsync();
        uow.Commit();

        return OkMessage(pricingService.ToPackageDto(plan, site!, rules), "保存成功");
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<MessageModel<string>>> Delete(long id)
    {
        using var uow = db.CreateUnitOfWork();
        var now = DateTime.Now;
        var rows = await uow.Orm.Update<PackagePlan>()
            .Set(x => x.DeletedAt, now)
            .Set(x => x.UpdatedAt, now)
            .Where(x => x.Id == id && x.DeletedAt == null)
            .ExecuteAffrowsAsync();
        await uow.Orm.Update<PackageQuotaRule>()
            .Set(x => x.DeletedAt, now)
            .Set(x => x.UpdatedAt, now)
            .Where(x => x.PackagePlanId == id && x.DeletedAt == null)
            .ExecuteAffrowsAsync();
        uow.Commit();

        return rows > 0 ? OkMessage(string.Empty, "删除成功") : FailMessage<string>("套餐不存在", StatusCodes.Status404NotFound);
    }

    private ActionResult<MessageModel<PackagePlanDto>>? Validate(SavePackagePlanRequest request, Site? site)
    {
        if (site is null) return FailMessage<PackagePlanDto>("中转站不存在", StatusCodes.Status400BadRequest);
        if (!site.SupportType.SupportsPackage()) return FailMessage<PackagePlanDto>("该中转站不支持套餐", StatusCodes.Status400BadRequest);
        if (string.IsNullOrWhiteSpace(request.Name)) return FailMessage<PackagePlanDto>("套餐名称不能为空", StatusCodes.Status400BadRequest);
        if (request.PriceCny <= 0) return FailMessage<PackagePlanDto>("套餐价格必须大于 0", StatusCodes.Status400BadRequest);
        if (request.DurationDays <= 0) return FailMessage<PackagePlanDto>("套餐时限必须大于 0", StatusCodes.Status400BadRequest);
        if (request.Multiplier <= 0) return FailMessage<PackagePlanDto>("倍率必须大于 0", StatusCodes.Status400BadRequest);
        if (!Enum.IsDefined(request.PoolGroup)) return FailMessage<PackagePlanDto>("号池分组不正确", StatusCodes.Status400BadRequest);
        if (request.QuotaRules.Count == 0) return FailMessage<PackagePlanDto>("至少需要一条套餐额度", StatusCodes.Status400BadRequest);
        if (request.QuotaRules.Any(x => !Enum.IsDefined(x.QuotaType))) return FailMessage<PackagePlanDto>("额度类型不正确", StatusCodes.Status400BadRequest);
        if (request.QuotaRules.Any(x => x.AmountUsd <= 0)) return FailMessage<PackagePlanDto>("额度金额必须大于 0", StatusCodes.Status400BadRequest);
        return null;
    }
}
