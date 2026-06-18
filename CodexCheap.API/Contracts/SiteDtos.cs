using CodexCheap.API.Models;

namespace CodexCheap.API.Contracts;

public record SiteDto(
    long Id,
    string Name,
    string Url,
    SiteSupportType SupportType,
    string SupportTypeText,
    bool IsEnabled,
    string? Remark,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record SaveSiteRequest(
    string Name,
    string Url,
    SiteSupportType SupportType,
    bool IsEnabled,
    string? Remark);
