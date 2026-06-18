using CodexCheap.API.Models;

namespace CodexCheap.API.Services;

public static class TextLabels
{
    public static string ToText(this SiteSupportType type)
    {
        return type switch
        {
            SiteSupportType.Usage => "按量",
            SiteSupportType.Package => "套餐",
            SiteSupportType.UsageAndPackage => "按量+套餐",
            _ => "未知"
        };
    }

    public static string ToText(this PackageQuotaType type)
    {
        return type switch
        {
            PackageQuotaType.Daily => "日限额",
            PackageQuotaType.Weekly => "周限额",
            PackageQuotaType.Monthly => "月限额",
            PackageQuotaType.Total => "套餐总额度",
            _ => "未知"
        };
    }

    public static string ToText(this PoolGroup group)
    {
        return group switch
        {
            PoolGroup.Pro => "Pro",
            PoolGroup.Plus => "Plus",
            PoolGroup.Team => "Team",
            PoolGroup.Unknown => "未知",
            _ => "未知"
        };
    }

    public static bool SupportsUsage(this SiteSupportType type)
    {
        return type is SiteSupportType.Usage or SiteSupportType.UsageAndPackage;
    }

    public static bool SupportsPackage(this SiteSupportType type)
    {
        return type is SiteSupportType.Package or SiteSupportType.UsageAndPackage;
    }
}
