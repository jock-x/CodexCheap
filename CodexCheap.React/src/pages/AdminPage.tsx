import {
  DashboardOutlined,
  DeleteOutlined,
  EditOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, type SavePackagePayload, type SaveRechargePayload, type SaveSitePayload } from '../services/api'
import { clearSession, getUserName } from '../services/auth'
import {
  PackageQuotaType,
  PoolGroup,
  SiteSupportType,
  type PackagePlan,
  type RechargePlan,
  type RechargeRateRule,
  type Site,
} from '../types'
import { cost, expireText, money, packageDurationText } from '../utils/format'

const { Header, Content, Sider } = Layout

type AdminMenuKey = 'sites' | 'recharges' | 'packages'

const supportOptions = [
  { value: SiteSupportType.Usage, label: '按量' },
  { value: SiteSupportType.Package, label: '套餐' },
  { value: SiteSupportType.UsageAndPackage, label: '按量+套餐' },
]

const quotaOptions = [
  { value: PackageQuotaType.Daily, label: '日限额' },
  { value: PackageQuotaType.Weekly, label: '周限额' },
  { value: PackageQuotaType.Monthly, label: '月限额' },
  { value: PackageQuotaType.Total, label: '套餐总额度' },
]

const poolGroupOptions = [
  { value: PoolGroup.Pro, label: 'Pro' },
  { value: PoolGroup.Plus, label: 'Plus' },
  { value: PoolGroup.Team, label: 'Team' },
  { value: PoolGroup.Unknown, label: '未知' },
]

function supportsUsage(site: Site) {
  return site.supportType === SiteSupportType.Usage || site.supportType === SiteSupportType.UsageAndPackage
}

function supportsPackage(site: Site) {
  return site.supportType === SiteSupportType.Package || site.supportType === SiteSupportType.UsageAndPackage
}

function poolGroupText(poolGroup: PoolGroup) {
  return poolGroupOptions.find((item) => item.value === poolGroup)?.label ?? '未知'
}

function poolGroupColor(poolGroup: PoolGroup) {
  if (poolGroup === PoolGroup.Pro) return 'green'
  if (poolGroup === PoolGroup.Plus) return 'blue'
  if (poolGroup === PoolGroup.Team) return 'gold'
  return 'default'
}

function rateTags(row: RechargePlan) {
  const rates: RechargeRateRule[] = row.rates?.length
    ? row.rates
    : [{ multiplier: row.multiplier, poolGroup: row.poolGroup ?? PoolGroup.Plus, isEnabled: row.isEnabled }]

  return (
    <Space wrap size={[6, 6]}>
      {rates.map((rate, index) => (
        <Tag key={`${rate.id ?? index}-${rate.poolGroup}-${rate.multiplier}`} color={poolGroupColor(rate.poolGroup)}>
          {rate.poolGroupText ?? poolGroupText(rate.poolGroup)} · {money(rate.multiplier, 4)}x{rate.isEnabled ? '' : '（停用）'}
        </Tag>
      ))}
    </Space>
  )
}

export function AdminPage() {
  const [activeMenu, setActiveMenu] = useState<AdminMenuKey>('sites')
  const [sites, setSites] = useState<Site[]>([])
  const [recharges, setRecharges] = useState<RechargePlan[]>([])
  const [packages, setPackages] = useState<PackagePlan[]>([])
  const [rechargeSiteFilter, setRechargeSiteFilter] = useState<number>()
  const [packageSiteFilter, setPackageSiteFilter] = useState<number>()
  const [loading, setLoading] = useState(false)
  const [siteModal, setSiteModal] = useState<{ open: boolean; item?: Site }>({ open: false })
  const [rechargeModal, setRechargeModal] = useState<{ open: boolean; item?: RechargePlan }>({ open: false })
  const [packageModal, setPackageModal] = useState<{ open: boolean; item?: PackagePlan }>({ open: false })
  const [siteForm] = Form.useForm<SaveSitePayload>()
  const [rechargeForm] = Form.useForm<SaveRechargePayload>()
  const [packageForm] = Form.useForm<SavePackagePayload>()
  const navigate = useNavigate()

  const usageSites = sites.filter(supportsUsage)
  const packageSites = sites.filter(supportsPackage)
  const usageSiteOptions = usageSites.map((site) => ({ value: site.id, label: site.name }))
  const packageSiteOptions = packageSites.map((site) => ({ value: site.id, label: site.name }))

  const nextRatePoolGroup = () => {
    const rates = (rechargeForm.getFieldValue('rates') ?? []) as RechargeRateRule[]
    const used = new Set(rates.map((rate) => rate?.poolGroup).filter(Boolean))
    return poolGroupOptions.find((option) => !used.has(option.value))?.value ?? PoolGroup.Plus
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [siteData, rechargeData, packageData] = await Promise.all([
        apiClient.sites(),
        apiClient.recharges(),
        apiClient.packages(),
      ])
      setSites(siteData)
      setRecharges(rechargeData)
      setPackages(packageData)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const logout = () => {
    clearSession()
    navigate('/admin/login')
  }

  const openSiteModal = (item?: Site) => {
    setSiteModal({ open: true, item })
    siteForm.setFieldsValue(
      item ?? {
        supportType: SiteSupportType.UsageAndPackage,
        isEnabled: true,
      },
    )
  }

  const openRechargeModal = (item?: RechargePlan) => {
    setRechargeModal({ open: true, item })
    rechargeForm.setFieldsValue(
      item
        ? {
            siteId: item.siteId,
            cnyAmount: item.cnyAmount,
            usdCredit: item.usdCredit,
            expireDays: item.expireDays,
            isEnabled: item.isEnabled,
            rates: item.rates?.length
              ? item.rates.map((rate) => ({
                  multiplier: rate.multiplier,
                  poolGroup: rate.poolGroup,
                  isEnabled: rate.isEnabled ?? true,
                }))
              : [{ multiplier: item.multiplier, poolGroup: item.poolGroup ?? PoolGroup.Plus, isEnabled: true }],
          }
        : {
            expireDays: 0,
            isEnabled: true,
            rates: [{ multiplier: 1, poolGroup: PoolGroup.Plus, isEnabled: true }],
          },
    )
  }

  const openPackageModal = (item?: PackagePlan) => {
    setPackageModal({ open: true, item })
    packageForm.setFieldsValue(
      item
        ? {
            ...item,
            poolGroup: item.poolGroup ?? PoolGroup.Plus,
            quotaRules: item.quotaRules.map((rule) => ({ ...rule, isEnabled: rule.isEnabled ?? true })),
          }
        : {
            durationDays: 30,
            multiplier: 1,
            poolGroup: PoolGroup.Plus,
            isEnabled: true,
            quotaRules: [{ quotaType: PackageQuotaType.Total, amountUsd: 300, isEnabled: true }],
          },
    )
  }

  const saveSite = async () => {
    const values = await siteForm.validateFields()
    if (siteModal.item) await apiClient.updateSite(siteModal.item.id, values)
    else await apiClient.createSite(values)
    message.success('中转站已保存')
    setSiteModal({ open: false })
    loadAll()
  }

  const saveRecharge = async () => {
    const values = await rechargeForm.validateFields()
    if (rechargeModal.item) await apiClient.updateRecharge(rechargeModal.item.id, values)
    else await apiClient.createRecharge(values)
    message.success('按量方案已保存')
    setRechargeModal({ open: false })
    loadAll()
  }

  const savePackage = async () => {
    const values = await packageForm.validateFields()
    if (packageModal.item) await apiClient.updatePackage(packageModal.item.id, values)
    else await apiClient.createPackage(values)
    message.success('套餐已保存')
    setPackageModal({ open: false })
    loadAll()
  }

  const siteColumns: ColumnsType<Site> = [
    { title: '名称', dataIndex: 'name' },
    {
      title: '地址',
      dataIndex: 'url',
      render: (url) => (
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      ),
    },
    { title: '支持类型', dataIndex: 'supportTypeText', render: (v) => <Tag color="green">{v}</Tag> },
    { title: '状态', dataIndex: 'isEnabled', render: (v) => (v ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>) },
    { title: '备注', dataIndex: 'remark' },
    {
      title: '操作',
      width: 170,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openSiteModal(row)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={async () => (await apiClient.deleteSite(row.id), loadAll())}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const rechargeColumns: ColumnsType<RechargePlan> = [
    { title: '中转站', dataIndex: 'siteName' },
    { title: '充值', dataIndex: 'cnyAmount', render: (v) => `￥${money(v, 2)}` },
    { title: '兑换', dataIndex: 'usdCredit', render: (v) => `$${money(v, 2)}` },
    { title: '倍率/号池', dataIndex: 'rates', render: (_, row) => rateTags(row) },
    { title: '最低有效额度', dataIndex: 'effectiveUsd', render: (v) => `$${money(v, 2)}` },
    { title: '过期', dataIndex: 'expireDays', render: expireText },
    { title: '最低元/$1', dataIndex: 'cnyPerUsd', render: (v) => <b>{cost(v)}</b> },
    { title: '状态', dataIndex: 'isEnabled', render: (v) => (v ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>) },
    {
      title: '操作',
      width: 170,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openRechargeModal(row)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={async () => (await apiClient.deleteRecharge(row.id), loadAll())}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const packageColumns: ColumnsType<PackagePlan> = [
    { title: '中转站', dataIndex: 'siteName' },
    { title: '套餐', dataIndex: 'name' },
    { title: '价格', dataIndex: 'priceCny', render: (v) => `￥${money(v, 2)}` },
    { title: '时限', dataIndex: 'durationDays', render: packageDurationText },
    { title: '倍率', dataIndex: 'multiplier', render: (v) => `${money(v, 4)}x` },
    {
      title: '号池分组',
      dataIndex: 'poolGroupText',
      render: (v, row) => <Tag color={poolGroupColor(row.poolGroup)}>{v}</Tag>,
    },
    { title: '采用口径', dataIndex: 'bestQuotaTypeText', render: (v) => v ?? '-' },
    { title: '日均额度', dataIndex: 'dailyEffectiveUsd', render: (v) => `$${money(v, 2)}` },
    { title: '元/$1/天', dataIndex: 'cnyPerUsdPerDay', render: (v) => <b>{cost(v)}</b> },
    { title: '状态', dataIndex: 'isEnabled', render: (v) => (v ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>) },
    {
      title: '操作',
      width: 170,
      render: (_, row) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openPackageModal(row)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={async () => (await apiClient.deletePackage(row.id), loadAll())}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const filteredRecharges = rechargeSiteFilter
    ? recharges.filter((item) => item.siteId === rechargeSiteFilter)
    : recharges
  const filteredPackages = packageSiteFilter
    ? packages.filter((item) => item.siteId === packageSiteFilter)
    : packages

  const contentTitle = activeMenu === 'sites' ? '中转站维护' : activeMenu === 'recharges' ? '按量充值维护' : '套餐维护'
  const contentHint =
    activeMenu === 'sites'
      ? '维护中转站名称、地址和支持类型。'
      : activeMenu === 'recharges'
        ? '一条充值方案可以维护多个倍率和号池分组。'
        : '套餐会按号池分组参与公开页筛选。'

  const renderContent = () => {
    if (activeMenu === 'sites') {
      return (
        <>
          <Toolbar onAdd={() => openSiteModal()} label="新增中转站" />
          <Table rowKey="id" loading={loading} columns={siteColumns} dataSource={sites} scroll={{ x: 900 }} />
        </>
      )
    }

    if (activeMenu === 'recharges') {
      return (
        <>
          <Toolbar onAdd={() => openRechargeModal()} label="新增按量方案" disabled={!usageSites.length}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="按中转站筛选"
              value={rechargeSiteFilter}
              onChange={setRechargeSiteFilter}
              options={usageSiteOptions}
              style={{ width: 220 }}
            />
          </Toolbar>
          <Table rowKey="id" loading={loading} columns={rechargeColumns} dataSource={filteredRecharges} scroll={{ x: 1120 }} />
        </>
      )
    }

    return (
      <>
        <Toolbar onAdd={() => openPackageModal()} label="新增套餐" disabled={!packageSites.length}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="按中转站筛选"
            value={packageSiteFilter}
            onChange={setPackageSiteFilter}
            options={packageSiteOptions}
            style={{ width: 220 }}
          />
        </Toolbar>
        <Table rowKey="id" loading={loading} columns={packageColumns} dataSource={filteredPackages} scroll={{ x: 1240 }} />
      </>
    )
  }

  return (
    <Layout className="admin-layout">
      <Header className="admin-header">
        <div>
          <span className="brand-mark">CodexCheap</span>
          <Typography.Text type="secondary">后台维护台</Typography.Text>
        </div>
        <Space>
          <Tag icon={<DashboardOutlined />} color="green">
            {getUserName()}
          </Tag>
          <Button icon={<ReloadOutlined />} onClick={loadAll}>
            刷新
          </Button>
          <Button icon={<LogoutOutlined />} onClick={logout}>
            退出
          </Button>
        </Space>
      </Header>
      <Layout className="admin-workbench">
        <Sider className="admin-sider" width={220}>
          <Menu
            mode="inline"
            selectedKeys={[activeMenu]}
            onClick={({ key }) => setActiveMenu(key as AdminMenuKey)}
            items={[
              { key: 'sites', label: '中转站' },
              { key: 'recharges', label: '按量充值' },
              { key: 'packages', label: '套餐' },
            ]}
          />
        </Sider>
        <Content className="admin-content">
          <div className="admin-title">
            <div>
              <p className="eyebrow">Data Console</p>
              <h1>{contentTitle}</h1>
            </div>
            <p>{contentHint}</p>
          </div>
          {renderContent()}
        </Content>
      </Layout>

      <Modal title={siteModal.item ? '编辑中转站' : '新增中转站'} open={siteModal.open} onOk={saveSite} onCancel={() => setSiteModal({ open: false })} destroyOnHidden>
        <Form form={siteForm} layout="vertical">
          <Form.Item name="name" label="中转站名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="url" label="中转站地址" rules={[{ required: true }]}>
            <Input placeholder="https://example.com" />
          </Form.Item>
          <Form.Item name="supportType" label="支持类型" rules={[{ required: true }]}>
            <Select options={supportOptions} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isEnabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={rechargeModal.item ? '编辑按量方案' : '新增按量方案'} open={rechargeModal.open} onOk={saveRecharge} onCancel={() => setRechargeModal({ open: false })} width={780} destroyOnHidden>
        <Form form={rechargeForm} layout="vertical">
          <Form.Item name="siteId" label="中转站" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={usageSiteOptions} />
          </Form.Item>
          <Form.Item name="cnyAmount" label="充值人民币" rules={[{ required: true }]}>
            <InputNumber min={0.000001} precision={6} addonBefore="￥" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="usdCredit" label="兑换美元" rules={[{ required: true }]}>
            <InputNumber min={0.000001} precision={6} addonBefore="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expireDays" label="过期天数">
            <InputNumber min={0} precision={0} addonAfter="天，0 表示永不过期" style={{ width: '100%' }} />
          </Form.Item>
          <Form.List name="rates">
            {(fields, { add, remove }) => (
              <div className="quota-list">
                <div className="quota-header">
                  <Typography.Text strong>倍率明细</Typography.Text>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    disabled={fields.length >= poolGroupOptions.length}
                    onClick={() => add({ multiplier: 1, poolGroup: nextRatePoolGroup(), isEnabled: true })}
                  >
                    新增倍率
                  </Button>
                </div>
                {fields.map((field) => (
                  <Space key={field.key} align="start" className="quota-row">
                    <Form.Item name={[field.name, 'multiplier']} rules={[{ required: true }]}>
                      <InputNumber min={0.000001} precision={6} addonAfter="x" style={{ width: 190 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'poolGroup']} rules={[{ required: true }]}>
                      <Select options={poolGroupOptions} style={{ width: 150 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'isEnabled']} valuePropName="checked">
                      <Switch checkedChildren="启用" unCheckedChildren="停用" />
                    </Form.Item>
                    <Button danger icon={<DeleteOutlined />} disabled={fields.length === 1} onClick={() => remove(field.name)} />
                  </Space>
                ))}
              </div>
            )}
          </Form.List>
          <Form.Item name="isEnabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={packageModal.item ? '编辑套餐' : '新增套餐'} open={packageModal.open} onOk={savePackage} onCancel={() => setPackageModal({ open: false })} width={820} destroyOnHidden>
        <Form form={packageForm} layout="vertical">
          <Form.Item name="siteId" label="中转站" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={packageSiteOptions} />
          </Form.Item>
          <Form.Item name="name" label="套餐名称" rules={[{ required: true }]}>
            <Input placeholder="例如：周卡、月卡、三天套餐" />
          </Form.Item>
          <div className="package-fields-grid">
            <Form.Item name="priceCny" label="套餐价格" rules={[{ required: true }]}>
              <InputNumber min={0.000001} precision={6} addonBefore="￥" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="durationDays" label="套餐时限" rules={[{ required: true }]}>
              <InputNumber min={1} precision={0} addonAfter="天" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="multiplier" label="倍率" rules={[{ required: true }]}>
              <InputNumber min={0.000001} precision={6} addonAfter="x" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="poolGroup" label="号池分组" rules={[{ required: true }]}>
              <Select options={poolGroupOptions} />
            </Form.Item>
          </div>
          <Form.List name="quotaRules">
            {(fields, { add, remove }) => (
              <div className="quota-list">
                <div className="quota-header">
                  <Typography.Text strong>套餐额度</Typography.Text>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => add({ quotaType: PackageQuotaType.Total, amountUsd: 0, isEnabled: true })}>
                    新增额度
                  </Button>
                </div>
                {fields.map((field) => (
                  <Space key={field.key} align="start" className="quota-row">
                    <Form.Item name={[field.name, 'quotaType']} rules={[{ required: true }]}>
                      <Select options={quotaOptions} style={{ width: 150 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'amountUsd']} rules={[{ required: true }]}>
                      <InputNumber min={0.000001} precision={6} addonBefore="$" style={{ width: 190 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'isEnabled']} valuePropName="checked">
                      <Switch checkedChildren="启用" unCheckedChildren="停用" />
                    </Form.Item>
                    <Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                  </Space>
                ))}
              </div>
            )}
          </Form.List>
          <Form.Item name="isEnabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

function Toolbar({
  onAdd,
  label,
  disabled,
  children,
}: {
  onAdd: () => void
  label: string
  disabled?: boolean
  children?: ReactNode
}) {
  return (
    <div className="table-toolbar">
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} disabled={disabled}>
        {label}
      </Button>
      {children}
      {disabled && <Typography.Text type="secondary">请先新增支持该类型的中转站</Typography.Text>}
    </div>
  )
}
