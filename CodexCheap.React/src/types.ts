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

export const PoolGroup = {
  Pro: 1,
  Plus: 2,
  Team: 3,
  Unknown: 4,
} as const

export type PoolGroup = (typeof PoolGroup)[keyof typeof PoolGroup]

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

export type RechargeRateRule = {
  id?: number
  multiplier: number
  poolGroup: PoolGroup
  poolGroupText?: string
  isEnabled: boolean
  effectiveUsd?: number
  cnyPerUsd?: number
}

export type RechargePlan = {
  id: number
  rateId?: number
  siteId: number
  siteName: string
  siteUrl: string
  cnyAmount: number
  usdCredit: number
  multiplier: number
  poolGroup: PoolGroup
  poolGroupText: string
  expireDays: number
  isEnabled: boolean
  effectiveUsd: number
  cnyPerUsd: number
  rates: RechargeRateRule[]
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
  poolGroup: PoolGroup
  poolGroupText: string
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
