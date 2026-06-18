import axios from 'axios'
import type {
  ApiResponse,
  LoginResponse,
  PackagePlan,
  PackageQuotaRule,
  RechargePlan,
  RechargeRateRule,
  PoolGroup,
  Site,
  SiteSupportType,
} from '../types'
import { clearSession, getToken } from './auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5130',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession()
    }
    return Promise.reject(error)
  },
)

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>) {
  const { data } = await promise
  if (!data.success) {
    throw new Error(data.msg || '请求失败')
  }
  return data.response
}

export type SaveSitePayload = {
  name: string
  url: string
  supportType: SiteSupportType
  isEnabled: boolean
  remark?: string
}

export type SaveRechargePayload = {
  siteId: number
  cnyAmount: number
  usdCredit: number
  expireDays: number
  isEnabled: boolean
  rates: RechargeRateRule[]
}

export type SavePackagePayload = {
  siteId: number
  name: string
  priceCny: number
  durationDays: number
  multiplier: number
  poolGroup: PoolGroup
  isEnabled: boolean
  quotaRules: PackageQuotaRule[]
}

export const apiClient = {
  login: (userName: string, password: string) =>
    unwrap<LoginResponse>(api.post('/api/auth/login', { userName, password })),
  publicUsage: () => unwrap<RechargePlan[]>(api.get('/api/public/usage-comparisons')),
  publicPackages: () => unwrap<PackagePlan[]>(api.get('/api/public/package-comparisons')),
  sites: () => unwrap<Site[]>(api.get('/api/admin/sites')),
  createSite: (payload: SaveSitePayload) => unwrap<Site>(api.post('/api/admin/sites', payload)),
  updateSite: (id: number, payload: SaveSitePayload) => unwrap<Site>(api.put(`/api/admin/sites/${id}`, payload)),
  deleteSite: (id: number) => unwrap<string>(api.delete(`/api/admin/sites/${id}`)),
  recharges: () => unwrap<RechargePlan[]>(api.get('/api/admin/recharge-plans')),
  createRecharge: (payload: SaveRechargePayload) => unwrap<RechargePlan>(api.post('/api/admin/recharge-plans', payload)),
  updateRecharge: (id: number, payload: SaveRechargePayload) =>
    unwrap<RechargePlan>(api.put(`/api/admin/recharge-plans/${id}`, payload)),
  deleteRecharge: (id: number) => unwrap<string>(api.delete(`/api/admin/recharge-plans/${id}`)),
  packages: () => unwrap<PackagePlan[]>(api.get('/api/admin/package-plans')),
  createPackage: (payload: SavePackagePayload) => unwrap<PackagePlan>(api.post('/api/admin/package-plans', payload)),
  updatePackage: (id: number, payload: SavePackagePayload) =>
    unwrap<PackagePlan>(api.put(`/api/admin/package-plans/${id}`, payload)),
  deletePackage: (id: number) => unwrap<string>(api.delete(`/api/admin/package-plans/${id}`)),
}
