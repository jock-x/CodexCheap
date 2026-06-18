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
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
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
import { PackageQuotaType, SiteSupportType, type PackagePlan, type RechargePlan, type Site } from '../types'
import { cost, expireText, money, packageDurationText } from '../utils/format'

const { Header, Content } = Layout

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

export function AdminPage() {
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
      item ?? {
        multiplier: 1,
        expireDays: 0,
        isEnabled: true,
      },
    )
  }

  const openPackageModal = (item?: PackagePlan) => {
    setPackageModal({ open: true, item })
    packageForm.setFieldsValue(
      item
        ? {
            ...item,
            quotaRules: item.quotaRules.map((rule) => ({ ...rule, isEnabled: rule.isEnabled ?? true })),
          }
        : {
            durationDays: 7,
            multiplier: 1,
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
    { title: '倍率', dataIndex: 'multiplier', render: (v) => `${money(v, 4)}x` },
    { title: '有效额度', dataIndex: 'effectiveUsd', render: (v) => `$${money(v, 2)}` },
    { title: '过期', dataIndex: 'expireDays', render: expireText },
    { title: '元/$1', dataIndex: 'cnyPerUsd', render: (v) => <b>{cost(v)}</b> },
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

  const siteFilterOptions = sites.map((site) => ({ value: site.id, label: site.name }))
  const filteredRecharges = rechargeSiteFilter
    ? recharges.filter((item) => item.siteId === rechargeSiteFilter)
    : recharges
  const filteredPackages = packageSiteFilter
    ? packages.filter((item) => item.siteId === packageSiteFilter)
    : packages

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
      <Content className="admin-content">
        <div className="admin-title">
          <div>
            <p className="eyebrow">Data Console</p>
            <h1>价格数据维护</h1>
          </div>
          <p>修改后公开页会立即使用最新数据重新排序。</p>
        </div>
        <Tabs
          items={[
            {
              key: 'sites',
              label: '中转站',
              children: (
                <>
                  <Toolbar onAdd={() => openSiteModal()} label="新增中转站" />
                  <Table rowKey="id" loading={loading} columns={siteColumns} dataSource={sites} scroll={{ x: 900 }} />
                </>
              ),
            },
            {
              key: 'recharges',
              label: '按量充值',
              children: (
                <>
                  <Toolbar onAdd={() => openRechargeModal()} label="新增按量方案" disabled={!sites.length}>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="按中转站筛选"
                      value={rechargeSiteFilter}
                      onChange={setRechargeSiteFilter}
                      options={siteFilterOptions}
                      style={{ width: 220 }}
                    />
                  </Toolbar>
                  <Table rowKey="id" loading={loading} columns={rechargeColumns} dataSource={filteredRecharges} scroll={{ x: 1000 }} />
                </>
              ),
            },
            {
              key: 'packages',
              label: '套餐',
              children: (
                <>
                  <Toolbar onAdd={() => openPackageModal()} label="新增套餐" disabled={!sites.length}>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="按中转站筛选"
                      value={packageSiteFilter}
                      onChange={setPackageSiteFilter}
                      options={siteFilterOptions}
                      style={{ width: 220 }}
                    />
                  </Toolbar>
                  <Table rowKey="id" loading={loading} columns={packageColumns} dataSource={filteredPackages} scroll={{ x: 1100 }} />
                </>
              ),
            },
          ]}
        />
      </Content>

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

      <Modal title={rechargeModal.item ? '编辑按量方案' : '新增按量方案'} open={rechargeModal.open} onOk={saveRecharge} onCancel={() => setRechargeModal({ open: false })} destroyOnHidden>
        <Form form={rechargeForm} layout="vertical">
          <Form.Item name="siteId" label="中转站" rules={[{ required: true }]}>
            <Select options={sites.map((site) => ({ value: site.id, label: site.name }))} />
          </Form.Item>
          <Form.Item name="cnyAmount" label="充值人民币" rules={[{ required: true }]}>
            <InputNumber min={0.000001} precision={6} addonBefore="￥" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="usdCredit" label="兑换美元" rules={[{ required: true }]}>
            <InputNumber min={0.000001} precision={6} addonBefore="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="multiplier" label="倍率" rules={[{ required: true }]}>
            <InputNumber min={0.000001} precision={6} addonAfter="x" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expireDays" label="过期天数">
            <InputNumber min={0} precision={0} addonAfter="天，0 表示永不过期" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isEnabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={packageModal.item ? '编辑套餐' : '新增套餐'} open={packageModal.open} onOk={savePackage} onCancel={() => setPackageModal({ open: false })} width={760} destroyOnHidden>
        <Form form={packageForm} layout="vertical">
          <Form.Item name="siteId" label="中转站" rules={[{ required: true }]}>
            <Select options={sites.map((site) => ({ value: site.id, label: site.name }))} />
          </Form.Item>
          <Form.Item name="name" label="套餐名称" rules={[{ required: true }]}>
            <Input placeholder="例如：周卡、月卡、三天套餐" />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="priceCny" label="套餐价格" rules={[{ required: true }]} style={{ width: '33%' }}>
              <InputNumber min={0.000001} precision={6} addonBefore="￥" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="durationDays" label="套餐时限" rules={[{ required: true }]} style={{ width: '33%' }}>
              <InputNumber min={1} precision={0} addonAfter="天" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="multiplier" label="倍率" rules={[{ required: true }]} style={{ width: '34%' }}>
              <InputNumber min={0.000001} precision={6} addonAfter="x" style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
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
      {disabled && <Typography.Text type="secondary">请先新增中转站</Typography.Text>}
    </div>
  )
}
