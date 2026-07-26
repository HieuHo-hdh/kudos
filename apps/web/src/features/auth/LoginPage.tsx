import { Alert, Button, Form, Input, Typography } from "antd"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ApiError } from "../../common/api/errors"

import { useLogin } from "./useAuth"

type Values = { email: string; password: string }

export function LoginPage() {
  const [form] = Form.useForm<Values>()
  const login = useLogin()
  const navigate = useNavigate()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const onFinish = async (values: Values) => {
    setErrorMsg(null)
    try {
      await login.mutateAsync(values)
      navigate("/", { replace: true })
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "INVALID_CREDENTIALS") {
          setErrorMsg("Invalid email or password.")
        } else if (e.code === "VALIDATION_FAILED" && e.fields) {
          form.setFields(
            Object.entries(e.fields).map(([name, err]) => ({
              name: name as keyof Values,
              errors: [err],
            })),
          )
        } else {
          setErrorMsg(e.message)
        }
      } else {
        setErrorMsg("Something went wrong. Please try again.")
      }
    }
  }

  return (
    <>
      <Typography.Title level={4} className="!mt-0">
        Sign in
      </Typography.Title>
      {errorMsg && (
        <Alert type="error" message={errorMsg} showIcon className="!mb-4" />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        disabled={login.isPending}
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email" }]}
        >
          <Input autoComplete="email" autoFocus />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, min: 1 }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={login.isPending}
        >
          Sign in
        </Button>
      </Form>
      <div className="mt-4 text-center">
        No account? <Link to="/register">Create one</Link>
      </div>
    </>
  )
}
