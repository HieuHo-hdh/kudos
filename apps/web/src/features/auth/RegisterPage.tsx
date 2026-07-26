import { Alert, Button, Form, Input, Typography } from "antd"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ApiError } from "../../common/api/errors"

import { useRegister } from "./useAuth"

type Values = { email: string; displayName: string; password: string }

export function RegisterPage() {
  const [form] = Form.useForm<Values>()
  const register = useRegister()
  const navigate = useNavigate()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const onFinish = async (values: Values) => {
    setErrorMsg(null)
    try {
      await register.mutateAsync(values)
      navigate("/", { replace: true })
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "EMAIL_TAKEN") {
          form.setFields([
            { name: "email", errors: ["That email is already registered."] },
          ])
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
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Create account
      </Typography.Title>
      {errorMsg && (
        <Alert
          type="error"
          message={errorMsg}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        disabled={register.isPending}
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email" }]}
        >
          <Input autoComplete="email" autoFocus size="large" />
        </Form.Item>
        <Form.Item
          name="displayName"
          label="Display name"
          rules={[{ required: true, max: 80 }]}
        >
          <Input autoComplete="name" size="large" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, min: 10, message: "At least 10 characters" },
          ]}
        >
          <Input.Password autoComplete="new-password" size="large" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={register.isPending}
        >
          Create account
        </Button>
      </Form>
      <div style={{ marginTop: 16, textAlign: "center" }}>
        Have an account? <Link to="/login">Sign in</Link>
      </div>
    </>
  )
}
