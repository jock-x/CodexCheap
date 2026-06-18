import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Form, Input, message } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'
import { setSession } from '../services/auth'

type LoginForm = {
  userName: string
  password: string
}

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      const result = await apiClient.login(values.userName, values.password)
      setSession(result.token, result.userName)
      message.success('登录成功')
      navigate('/admin')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <Link to="/" className="back-link">
          返回比价页
        </Link>
        <p className="eyebrow">Admin Console</p>
        <h1>CodexCheap 后台登录</h1>
        <p className="muted">后台只开放给唯一管理员，用于维护中转站、按量充值和套餐数据。</p>
        <Form<LoginForm> layout="vertical" onFinish={onFinish} className="login-form">
          <Form.Item name="userName" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input size="large" prefix={<UserOutlined />} placeholder="admin" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={loading} block>
            登录后台
          </Button>
        </Form>
      </section>
    </main>
  )
}
