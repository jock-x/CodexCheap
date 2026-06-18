export type ApiResponse<T> = {
  status: number
  success: boolean
  msg: string
  response: T
}

export const SiteSupportType = {
  Usage: 1,
  Package: 2,
  UsageAndPackage: 3,
} as const

export type SiteSupportType = (typeof SiteSupportType)[keyof typeof SiteSupportType]

export const PackageQuotaType = {
  Daily: 1,
  Weekly: 2,
  Monthly: 3,
  Total: 4,
} as const

export type PackageQuotaType = (typeof PackageQuotaType)[keyof typeof PackageQuotaType]

export type Site = {
  id: number
  name: string
  url: string
  supportType: SiteSupportType
  supportTypeText: string
  isEnabled: boolean
  remark?: string
  createdAt: string
  updatedAt: string
}

export type RechargePlan = {
  id: number
  siteId: number
  siteName: string
  siteUrl: string
  cnyAmount: number
  usdCredit: number
  multiplier: number
  expireDays: number
  isEnabled: boolean
  effectiveUsd: number
  cnyPerUsd: number
  createdAt: string
  updatedAt: string
}

export type PackageQuotaRule = {
  id?: number
  quotaType: PackageQuotaType
  quotaTypeText?: string
  amountUsd: number
  isEnabled: boolean
}

export type PackagePlan = {
  id: number
  siteId: number
  siteName: string
  siteUrl: string
  name: string
  priceCny: number
  durationDays: number
  multiplier: number
  isEnabled: boolean
  dailyPrice: number
  bestQuotaType?: PackageQuotaType
  bestQuotaTypeText?: string
  dailyEffectiveUsd?: number
  cnyPerUsdPerDay?: number
  quotaRules: PackageQuotaRule[]
  createdAt: string
  updatedAt: string
}

export type LoginResponse = {
  token: string
  expiresAt: string
  userName: string
}
