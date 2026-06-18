import { ArrowRightOutlined, RiseOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Modal, Select, Skeleton, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState, type Key } from 'react'
import { apiClient } from '../services/api'
import { PoolGroup, type PackagePlan, type PackageQuotaRule, type RechargePlan, type RechargeRateRule } from '../types'
import { cost, expireText, money, packageDurationText } from '../utils/format'

type UsagePlanOption = RechargePlan & {
  selectedRate: RechargeRateRule
  selectedPoolGroup: PoolGroup
}

type UsageGroup = UsagePlanOption & {
  allPlans: UsagePlanOption[]
  planCount: number
  availablePoolGroups: PoolGroup[]
}

type PackageGroup = PackagePlan & {
  allPlans: PackagePlan[]
  planCount: number
}

type FormulaExample = {
  title: string
  input: string
  formula: string
  result: string
  tag: string
}

const usageFormulaExamples: FormulaExample[] = [
  {
    title: '等额兑换',
    input: '3.5 元换 3.5 美元，倍率 1x',
    formula: '3.5 ÷ 1 = 3.5 美元有效额度',
    result: '1.0000 元 / $1',
    tag: '直观基准',
  },
]

const packageFormulaExamples: FormulaExample[] = [
  {
    title: '月卡月限额',
    input: '98 元，30 天，月限 337.99 美元，倍率 1x',
    formula: '98 ÷ 30 = 3.27 元/天，337.99 ÷ 30 = 11.27 美元/天',
    result: '0.2899 元 / $1 / 天',
    tag: '月限额',
  },
]

const poolGroupFilterOptions = [
  { value: PoolGroup.Pro, label: 'Pro' },
  { value: PoolGroup.Plus, label: 'Plus' },
  { value: PoolGroup.Team, label: 'Team' },
  { value: PoolGroup.Unknown, label: '未知' },
]

function poolGroupColor(poolGroup: PoolGroup) {
  if (poolGroup === PoolGroup.Pro) return 'green'
  if (poolGroup === PoolGroup.Plus) return 'blue'
  if (poolGroup === PoolGroup.Team) return 'gold'
  return 'default'
}

function FormulaExamples({ examples }: { examples: FormulaExample[] }) {
  const [expanded, setExpanded] = useState(false)
  const visibleExamples = expanded ? examples : examples.slice(0, 1)
  const hiddenCount = examples.length - 1

  return (
    <div className="formula-examples">
      {visibleExamples.map((item) => (
        <article className="formula-example" key={item.title}>
          <div className="formula-example-head">
            <strong>{item.title}</strong>
            <em>{item.tag}</em>
          </div>
          <p>{item.input}</p>
          <small>{item.formula}</small>
          <b>{item.result}</b>
        </article>
      ))}
      {hiddenCount > 0 && (
        <Button className="formula-more-button" type="text" size="small" onClick={() => setExpanded((value) => !value)}>
          {expanded ? '收起案例' : `展开更多案例（${hiddenCount} 个）`}
        </Button>
      )}
    </div>
  )
}

function compareUsagePlan(a: RechargePlan, b: RechargePlan) {
  const costDiff = a.cnyPerUsd - b.cnyPerUsd
  if (costDiff !== 0) return costDiff
  return a.cnyAmount - b.cnyAmount
}

function poolGroupText(poolGroup: PoolGroup) {
  return poolGroupFilterOptions.find((item) => item.value === poolGroup)?.label ?? '未知'
}

function normalizeUsageRate(plan: RechargePlan, rate: RechargeRateRule): RechargeRateRule {
  const effectiveUsd = rate.effectiveUsd ?? plan.usdCredit / rate.multiplier
  const cnyPerUsd = rate.cnyPerUsd ?? plan.cnyAmount / effectiveUsd
  return {
    ...rate,
    poolGroupText: rate.poolGroupText ?? poolGroupText(rate.poolGroup),
    effectiveUsd,
    cnyPerUsd,
  }
}

function usageRateFallback(plan: RechargePlan): RechargeRateRule {
  return normalizeUsageRate(plan, {
    id: plan.rateId,
    multiplier: plan.multiplier,
    poolGroup: plan.poolGroup ?? PoolGroup.Plus,
    poolGroupText: plan.poolGroupText,
    isEnabled: plan.isEnabled,
    effectiveUsd: plan.effectiveUsd,
    cnyPerUsd: plan.cnyPerUsd,
  })
}

function compareUsageRate(a: RechargeRateRule, b: RechargeRateRule) {
  const costDiff = (a.cnyPerUsd ?? 999999) - (b.cnyPerUsd ?? 999999)
  if (costDiff !== 0) return costDiff
  return a.multiplier - b.multiplier
}

function usageRatesForPlan(plan: RechargePlan) {
  return (plan.rates?.length ? plan.rates : [usageRateFallback(plan)])
    .filter((rate) => rate.multiplier > 0)
    .map((rate) => normalizeUsageRate(plan, rate))
    .sort(compareUsageRate)
}

function toUsagePlanOption(plan: RechargePlan, selectedRate: RechargeRateRule): UsagePlanOption {
  return {
    ...plan,
    rateId: selectedRate.id,
    multiplier: selectedRate.multiplier,
    poolGroup: selectedRate.poolGroup,
    poolGroupText: selectedRate.poolGroupText ?? poolGroupText(selectedRate.poolGroup),
    effectiveUsd: selectedRate.effectiveUsd ?? plan.effectiveUsd,
    cnyPerUsd: selectedRate.cnyPerUsd ?? plan.cnyPerUsd,
    selectedRate,
    selectedPoolGroup: selectedRate.poolGroup,
  }
}

function usagePlanOptionsForPool(plans: RechargePlan[], poolGroup: PoolGroup) {
  return plans
    .map((plan) => {
      const rate = usageRatesForPlan(plan).find((item) => item.isEnabled && item.poolGroup === poolGroup)
      return rate ? toUsagePlanOption(plan, rate) : undefined
    })
    .filter((item): item is UsagePlanOption => Boolean(item))
    .sort(compareUsagePlan)
}

function usagePoolGroupsForPlans(plans: RechargePlan[]) {
  const used = new Set<PoolGroup>()
  plans.forEach((plan) => {
    usageRatesForPlan(plan).forEach((rate) => {
      if (rate.isEnabled) used.add(rate.poolGroup)
    })
  })
  return poolGroupFilterOptions.map((item) => item.value).filter((value) => used.has(value))
}

function buildUsageSiteRows(
  items: RechargePlan[],
  topPoolGroup?: PoolGroup,
  rowPoolGroups: Record<number, PoolGroup | undefined> = {},
): UsageGroup[] {
  const map = new Map<number, RechargePlan[]>()
  items.forEach((item) => {
    map.set(item.siteId, [...(map.get(item.siteId) ?? []), item])
  })

  return Array.from(map.values())
    .map((plans) => {
      const availablePoolGroups = usagePoolGroupsForPlans(plans)
      const requestedPoolGroup = topPoolGroup ?? rowPoolGroups[plans[0].siteId]
      const selectedPoolGroup = requestedPoolGroup && availablePoolGroups.includes(requestedPoolGroup)
        ? requestedPoolGroup
        : undefined

      if (selectedPoolGroup) {
        const allPlans = usagePlanOptionsForPool(plans, selectedPoolGroup)
        const best = allPlans[0]
        return best
          ? {
              ...best,
              allPlans,
              planCount: allPlans.length,
              availablePoolGroups,
              selectedPoolGroup,
            }
          : undefined
      }

      const candidates = plans
        .flatMap((plan) => usageRatesForPlan(plan)
          .filter((rate) => rate.isEnabled)
          .map((rate) => toUsagePlanOption(plan, rate)))
        .sort(compareUsagePlan)
      const best = candidates[0]
      if (!best) return undefined

      const allPlans = usagePlanOptionsForPool(plans, best.poolGroup)
      return {
        ...best,
        allPlans,
        planCount: allPlans.length,
        availablePoolGroups,
        selectedPoolGroup: best.poolGroup,
      }
    })
    .filter((item): item is UsageGroup => Boolean(item))
    .sort(compareUsagePlan)
}

function groupPackagesByBestPlan(items: PackagePlan[]): PackageGroup[] {
  const map = new Map<number, PackagePlan[]>()
  items.forEach((item) => {
    map.set(item.siteId, [...(map.get(item.siteId) ?? []), item])
  })

  return Array.from(map.values())
    .map((plans) => {
      const sorted = [...plans].sort((a, b) => (a.cnyPerUsdPerDay ?? 999999) - (b.cnyPerUsdPerDay ?? 999999))
      return { ...sorted[0], allPlans: sorted, planCount: sorted.length }
    })
    .sort((a, b) => (a.cnyPerUsdPerDay ?? 999999) - (b.cnyPerUsdPerDay ?? 999999))
}

export function PublicComparePage() {
  const [usage, setUsage] = useState<RechargePlan[]>([])
  const [packages, setPackages] = useState<PackagePlan[]>([])
  const [expandedUsageKeys, setExpandedUsageKeys] = useState<Key[]>([])
  const [expandedPackageKeys, setExpandedPackageKeys] = useState<Key[]>([])
  const [selectedPackagePlan, setSelectedPackagePlan] = useState<PackagePlan | null>(null)
  const [usagePoolGroup, setUsagePoolGroup] = useState<PoolGroup>()
  const [usageRowPoolGroups, setUsageRowPoolGroups] = useState<Record<number, PoolGroup | undefined>>({})
  const [packagePoolGroup, setPackagePoolGroup] = useState<PoolGroup>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [usageData, packageData] = await Promise.all([apiClient.publicUsage(), apiClient.publicPackages()])
        if (mounted) {
          setUsage(usageData)
          setPackages(packageData)
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const filteredPackages = packagePoolGroup ? packages.filter((item) => item.poolGroup === packagePoolGroup) : packages
  const usageGroups = buildUsageSiteRows(usage, usagePoolGroup, usageRowPoolGroups)
  const packageGroups = groupPackagesByBestPlan(filteredPackages)
  const bestUsage = usageGroups[0]
  const bestPackage = packageGroups[0]

  const toggleExpanded = (keys: Key[], key: Key, setter: (keys: Key[]) => void) => {
    setter(keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key])
  }

  const changeUsageRowPoolGroup = (siteId: number, poolGroup: PoolGroup) => {
    setUsageRowPoolGroups((value) => ({ ...value, [siteId]: poolGroup }))
  }

  const packageQuotaColumns: ColumnsType<PackageQuotaRule> = [
    { title: '额度类型', dataIndex: 'quotaTypeText' },
    { title: '美元额度', dataIndex: 'amountUsd', render: (v) => `$${money(v, 2)}` },
    { title: '状态', dataIndex: 'isEnabled', render: (v) => (v ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>) },
  ]

  const usageDetailColumns: ColumnsType<UsagePlanOption> = [
    {
      title: '充值人民币',
      dataIndex: 'cnyAmount',
      sorter: (a, b) => a.cnyAmount - b.cnyAmount,
      render: (v) => `￥${money(v, 2)}`,
    },
    { title: '兑换美元', dataIndex: 'usdCredit', render: (v) => `$${money(v, 2)}` },
    {
      title: '倍率',
      dataIndex: 'multiplier',
      sorter: (a, b) => a.multiplier - b.multiplier,
      render: (v) => `${money(v, 4)}x`,
    },
    { title: '有效额度', dataIndex: 'effectiveUsd', render: (v) => `$${money(v, 2)}` },
    { title: '有效期', dataIndex: 'expireDays', render: expireText },
    {
      title: '元 / $1',
      dataIndex: 'cnyPerUsd',
      sorter: compareUsagePlan,
      defaultSortOrder: 'ascend',
      render: (v) => <strong className="price">{cost(v)}</strong>,
    },
  ]

  const packageDetailColumns: ColumnsType<PackagePlan> = [
    {
      title: '套餐',
      dataIndex: 'name',
      render: (v, row) => (
        <Button type="link" size="small" className="package-quota-trigger" onClick={() => setSelectedPackagePlan(row)}>
          {v}
        </Button>
      ),
    },
    { title: '价格', dataIndex: 'priceCny', render: (v) => `￥${money(v, 2)}` },
    { title: '时限', dataIndex: 'durationDays', render: packageDurationText },
    { title: '日均价格', dataIndex: 'dailyPrice', render: (v) => `￥${money(v, 2)}` },
    { title: '倍率', dataIndex: 'multiplier', render: (v) => `${money(v, 4)}x` },
    {
      title: '号池分组',
      dataIndex: 'poolGroupText',
      render: (v, row) => <Tag color={poolGroupColor(row.poolGroup)}>{v}</Tag>,
    },
    { title: '采用口径', dataIndex: 'bestQuotaTypeText', render: (v) => v ?? '-' },
    { title: '日均有效额度', dataIndex: 'dailyEffectiveUsd', render: (v) => `$${money(v, 2)}` },
    { title: '元 / $1 / 天', dataIndex: 'cnyPerUsdPerDay', render: (v) => <strong className="price">{cost(v)}</strong> },
  ]

  const usageColumns: ColumnsType<UsageGroup> = [
    {
      title: '排名',
      width: 76,
      render: (_, __, index) => <span className={index === 0 ? 'rank best' : 'rank'}>{index + 1}</span>,
    },
    {
      title: '中转站',
      dataIndex: 'siteName',
      render: (name, row, index) => (
        <div className="site-cell">
          <a href={row.siteUrl} target="_blank" rel="noreferrer">
            {name}
          </a>
          <span>最低按量充值套餐</span>
          {index === 0 && <Tag color="green">按量最低</Tag>}
        </div>
      ),
    },
    {
      title: '充值人民币',
      dataIndex: 'cnyAmount',
      sorter: (a, b) => a.cnyAmount - b.cnyAmount,
      render: (v) => `￥${money(v, 2)}`,
    },
    { title: '兑换美元', dataIndex: 'usdCredit', render: (v) => `$${money(v, 2)}` },
    {
      title: '倍率',
      dataIndex: 'multiplier',
      sorter: (a, b) => a.multiplier - b.multiplier,
      render: (v) => `${money(v, 4)}x`,
    },
    {
      title: '号池分组',
      dataIndex: 'selectedPoolGroup',
      render: (_, row) => {
        const options = (usagePoolGroup ? [usagePoolGroup] : row.availablePoolGroups).map((value) => ({
          value,
          label: poolGroupText(value),
        }))
        if (options.length <= 1) {
          return <Tag color={poolGroupColor(row.selectedPoolGroup)}>{poolGroupText(row.selectedPoolGroup)}</Tag>
        }

        return (
          <Select
            className="pool-row-select"
            size="small"
            value={row.selectedPoolGroup}
            options={options}
            disabled={Boolean(usagePoolGroup)}
            popupMatchSelectWidth={false}
            onChange={(value) => changeUsageRowPoolGroup(row.siteId, value)}
            style={{ width: 76 }}
          />
        )
      },
    },
    { title: '有效额度', dataIndex: 'effectiveUsd', render: (v) => `$${money(v, 2)}` },
    { title: '有效期', dataIndex: 'expireDays', render: expireText },
    { title: '方案数', dataIndex: 'planCount', render: (v) => `${v} 条` },
    {
      title: '元 / $1',
      dataIndex: 'cnyPerUsd',
      sorter: compareUsagePlan,
      defaultSortOrder: 'ascend',
      render: (v, _, index) => <strong className={index === 0 ? 'price best-price' : 'price'}>{cost(v)}</strong>,
    },
    {
      title: '全部方案',
      fixed: 'right',
      width: 120,
      render: (_, row) => {
        const expanded = expandedUsageKeys.includes(row.siteId)
        return (
          <Button size="small" onClick={() => toggleExpanded(expandedUsageKeys, row.siteId, setExpandedUsageKeys)}>
            {expanded ? '收起' : `展开 ${row.planCount}`}
          </Button>
        )
      },
    },
  ]

  const packageColumns: ColumnsType<PackageGroup> = [
    {
      title: '排名',
      width: 58,
      render: (_, __, index) => <span className={index === 0 ? 'rank best' : 'rank'}>{index + 1}</span>,
    },
    {
      title: '中转站',
      width: 170,
      render: (_, row, index) => (
        <div className="site-cell">
          <a href={row.siteUrl} target="_blank" rel="noreferrer">
            {row.siteName}
          </a>
          <span>{row.name}</span>
          {index === 0 && <Tag color="green">套餐最低</Tag>}
        </div>
      ),
    },
    { title: '价格', dataIndex: 'priceCny', width: 76, render: (v) => `￥${money(v, 2)}` },
    { title: '时限', dataIndex: 'durationDays', width: 68, render: packageDurationText },
    { title: '日均价格', dataIndex: 'dailyPrice', width: 82, render: (v) => `￥${money(v, 2)}` },
    { title: '倍率', dataIndex: 'multiplier', width: 64, render: (v) => `${money(v, 4)}x` },
    {
      title: '号池分组',
      width: 78,
      dataIndex: 'poolGroupText',
      render: (v, row) => <Tag color={poolGroupColor(row.poolGroup)}>{v}</Tag>,
    },
    { title: '采用口径', dataIndex: 'bestQuotaTypeText', width: 80, render: (v) => v ?? '-' },
    { title: '日均有效额度', dataIndex: 'dailyEffectiveUsd', width: 96, render: (v) => `$${money(v, 2)}` },
    { title: '套餐数', dataIndex: 'planCount', width: 62, render: (v) => `${v} 条` },
    {
      title: <span className="nowrap-col">元 / $1 / 天</span>,
      dataIndex: 'cnyPerUsdPerDay',
      width: 118,
      sorter: (a, b) => (a.cnyPerUsdPerDay ?? 999999) - (b.cnyPerUsdPerDay ?? 999999),
      defaultSortOrder: 'ascend',
      render: (v, _, index) => <strong className={index === 0 ? 'price best-price' : 'price'}>{cost(v)}</strong>,
    },
    {
      title: '全部套餐',
      width: 92,
      render: (_, row) => {
        const expanded = expandedPackageKeys.includes(row.siteId)
        return (
          <Button size="small" onClick={() => toggleExpanded(expandedPackageKeys, row.siteId, setExpandedPackageKeys)}>
            {expanded ? '收起' : `展开 ${row.planCount}`}
          </Button>
        )
      },
    },
  ]

  return (
    <main className="public-shell">
      <section className="hero-section">
        <nav className="topbar">
          <span className="brand-mark">CodexCheap</span>
        </nav>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Codex Relay Price Radar</p>
            <h1>把中转站价格换算到同一个单位。</h1>
            <p>按量默认展示每个中转站当前号池下最低充值套餐，点击展开后可查看该站全部充值套餐。</p>
            <a href="#compare" className="hero-action">
              查看排行 <ArrowRightOutlined />
            </a>
          </div>
          <div className="price-orbit" aria-hidden="true">
            <div className="orbit-ring" />
            <div className="orbit-card primary">
              <span>按量最低</span>
              <strong>{bestUsage ? `￥${cost(bestUsage.cnyPerUsd)}` : '-'}</strong>
              <small>元 / $1</small>
            </div>
            <div className="orbit-card secondary">
              <span>套餐最低</span>
              <strong>{bestPackage ? `￥${cost(bestPackage.cnyPerUsdPerDay)}` : '-'}</strong>
              <small>元 / $1 / 天</small>
            </div>
          </div>
        </div>
      </section>

      <section className="summary-strip">
        <div>
          <span>按量中转站</span>
          <strong>{usageGroups.length}</strong>
        </div>
        <div>
          <span>套餐中转站</span>
          <strong>{packageGroups.length}</strong>
        </div>
        <div>
          <span>全部方案</span>
          <strong>{usage.length + packages.length}</strong>
        </div>
        <div>
          <span>公式</span>
          <strong>
            <RiseOutlined /> 自动折算
          </strong>
        </div>
      </section>

      <section id="compare" className="compare-section">
        <div className="section-title">
          <p className="eyebrow">Comparison</p>
          <h2>价格比较</h2>
          <p>主列表按中转站当前号池下最低成本排序，展开后查看该站全部充值套餐。</p>
        </div>
        {error && <Alert type="error" message={error} showIcon />}
        {loading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <Tabs
            defaultActiveKey="usage"
            items={[
              {
                key: 'usage',
                label: '按量比较',
                children: usage.length ? (
                  <>
                    <div className="formula-note">
                      <div>
                        <span>按量计算方式</span>
                        <strong>有效额度 = 兑换美元 / 倍率</strong>
                        <p>最终成本 = 充值人民币 / 有效额度，主列表按每个中转站当前号池下最低“元 / $1”排序。</p>
                      </div>
                      <FormulaExamples examples={usageFormulaExamples} />
                    </div>
                    <div className="compare-toolbar">
                      <span>号池分组</span>
                      <Select
                        allowClear
                        placeholder="全部"
                        value={usagePoolGroup}
                        onChange={setUsagePoolGroup}
                        options={poolGroupFilterOptions}
                        style={{ width: 180 }}
                      />
                    </div>
                    <Table
                      rowKey="siteId"
                      columns={usageColumns}
                      dataSource={usageGroups}
                      pagination={false}
                      scroll={{ x: 1120 }}
                      expandable={{
                        expandedRowKeys: expandedUsageKeys,
                        onExpandedRowsChange: (keys) => setExpandedUsageKeys([...keys]),
                        expandIcon: () => null,
                        expandedRowRender: (row) => (
                          <div className="expanded-plans">
                            <p>该中转站当前号池下全部充值套餐，已按元 / $1 从低到高排序。</p>
                            <Table
                              rowKey="id"
                              size="small"
                              columns={usageDetailColumns}
                              dataSource={row.allPlans}
                              pagination={false}
                              scroll={{ x: 1040 }}
                            />
                          </div>
                        ),
                      }}
                    />
                  </>
                ) : (
                  <Empty description="暂无按量数据" />
                ),
              },
              {
                key: 'package',
                label: '套餐比较',
                children: packages.length ? (
                  <>
                    <div className="formula-note">
                      <div>
                        <span>套餐计算方式</span>
                        <strong>成本 = 日均价格 / 日均有效额度</strong>
                        <p>日限额直接按天算；周限额除以 7；月限额除以 30；套餐总额度除以套餐天数，再统一除以倍率。</p>
                      </div>
                      <FormulaExamples examples={packageFormulaExamples} />
                    </div>
                    <div className="compare-toolbar">
                      <span>号池分组</span>
                      <Select
                        allowClear
                        placeholder="全部"
                        value={packagePoolGroup}
                        onChange={setPackagePoolGroup}
                        options={poolGroupFilterOptions}
                        style={{ width: 180 }}
                      />
                    </div>
                    <Table
                      rowKey="siteId"
                      columns={packageColumns}
                      dataSource={packageGroups}
                      tableLayout="fixed"
                      pagination={false}
                      expandable={{
                        expandedRowKeys: expandedPackageKeys,
                        onExpandedRowsChange: (keys) => setExpandedPackageKeys([...keys]),
                        expandIcon: () => null,
                        expandedRowRender: (row) => (
                          <div className="expanded-plans">
                            <p>该中转站全部套餐，已按元 / $1 / 天从低到高排序。</p>
                            <Table
                              rowKey="id"
                              size="small"
                              columns={packageDetailColumns}
                              dataSource={row.allPlans}
                              pagination={false}
                              scroll={{ x: 1120 }}
                            />
                          </div>
                        ),
                      }}
                    />
                  </>
                ) : (
                  <Empty description="暂无套餐数据" />
                ),
              },
            ]}
          />
        )}
      </section>

      <Modal
        title={selectedPackagePlan ? `${selectedPackagePlan.siteName} · ${selectedPackagePlan.name} 套餐额度` : '套餐额度'}
        open={Boolean(selectedPackagePlan)}
        onCancel={() => setSelectedPackagePlan(null)}
        footer={null}
        destroyOnHidden
        width={720}
      >
        {selectedPackagePlan?.quotaRules?.length ? (
          <Table
            rowKey={(rule) => `${rule.id ?? rule.quotaType}`}
            columns={packageQuotaColumns}
            dataSource={[...selectedPackagePlan.quotaRules].sort((a, b) => a.quotaType - b.quotaType)}
            pagination={false}
            size="small"
          />
        ) : (
          <Empty description="暂无套餐额度" />
        )}
      </Modal>
    </main>
  )
}
