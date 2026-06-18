using CodexCheap.API.Contracts;
using CodexCheap.API.Models;
using CodexCheap.API.Services;
using FreeSql;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodexCheap.API.Controllers;

[Route("api/admin/sites")]
[Authorize]
public class AdminSitesController(IFreeSql db) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<MessageModel<IReadOnlyList<SiteDto>>>> List()
    {
        var sites = await db.Select<Site>()
            .Where(x => x.DeletedAt == null)
            .OrderByDescending(x => x.Id)
            .ToListAsync();

        return OkMessage<IReadOnlyList<SiteDto>>(sites.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<MessageModel<SiteDto>>> Create([FromBody] SaveSiteRequest request)
    {
        var validation = Validate(request);
        if (validation is not null) return validation;

        var now = DateTime.Now;
        var site = new Site
        {
            Name = request.Name.Trim(),
            Url = request.Url.Trim(),
            SupportType = request.SupportType,
            IsEnabled = request.IsEnabled,
            Remark = request.Remark,
            CreatedAt = now,
            UpdatedAt = now
        };
        site.Id = (long)await db.Insert(site).ExecuteIdentityAsync();

        return OkMessage(ToDto(site), "创建成功");
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<MessageModel<SiteDto>>> Update(long id, [FromBody] SaveSiteRequest request)
    {
        var validation = Validate(request);
        if (validation is not null) return validation;

        var site = await db.Select<Site>().Where(x => x.Id == id && x.DeletedAt == null).FirstAsync();
        if (site is null) return FailMessage<SiteDto>("中转站不存在", StatusCodes.Status404NotFound);

        site.Name = request.Name.Trim();
        site.Url = request.Url.Trim();
        site.SupportType = request.SupportType;
        site.IsEnabled = request.IsEnabled;
        site.Remark = request.Remark;
        site.UpdatedAt = DateTime.Now;
        await db.Update<Site>().SetSource(site).ExecuteAffrowsAsync();

        return OkMessage(ToDto(site), "保存成功");
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult<MessageModel<string>>> Delete(long id)
    {
        var rows = await db.Update<Site>()
            .Set(x => x.DeletedAt, DateTime.Now)
            .Set(x => x.UpdatedAt, DateTime.Now)
            .Where(x => x.Id == id && x.DeletedAt == null)
            .ExecuteAffrowsAsync();

        return rows > 0 ? OkMessage(string.Empty, "删除成功") : FailMessage<string>("中转站不存在", StatusCodes.Status404NotFound);
    }

    private ActionResult<MessageModel<SiteDto>>? Validate(SaveSiteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return FailMessage<SiteDto>("中转站名称不能为空", StatusCodes.Status400BadRequest);
        if (string.IsNullOrWhiteSpace(request.Url))
            return FailMessage<SiteDto>("中转站地址不能为空", StatusCodes.Status400BadRequest);
        if (!Enum.IsDefined(request.SupportType))
            return FailMessage<SiteDto>("支持类型不正确", StatusCodes.Status400BadRequest);
        return null;
    }

    private static SiteDto ToDto(Site site)
    {
        return new SiteDto(site.Id, site.Name, site.Url, site.SupportType, site.SupportType.ToText(), site.IsEnabled, site.Remark, site.CreatedAt, site.UpdatedAt);
    }
}
