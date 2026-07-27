import type { CreateKudoInput } from "@kudos/shared"
import {
  Form,
  Input,
  InputNumber,
  Select,
  Card,
  Button,
  Space,
  Typography,
  Spin,
  App,
} from "antd"
import { useMemo, useState, useCallback, useRef, useEffect } from "react"

import { useCreateKudo } from "../hooks/useKudos"
import { useUsersList } from "../hooks/useUsersList"

interface GiveKudoFormProps {
  onSuccess?: () => void
  minimal?: boolean
}

export function GiveKudoForm({
  onSuccess,
  minimal = false,
}: GiveKudoFormProps) {
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { mutate: createKudo, isPending } = useCreateKudo()
  const [search, setSearch] = useState("")
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useUsersList(search)

  const users = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? []
  }, [data])

  const userOptions = users.map((user) => ({
    label: `${user.displayName} (${user.email})`,
    value: user.id,
  }))

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleSearchChange = useCallback((value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setSearch(value.trim())
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const handlePopupScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (
      target.scrollHeight - target.scrollTop <= 100 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }

  const handleSubmit = async (values: CreateKudoInput) => {
    createKudo(values, {
      onSuccess: () => {
        message.success("Kudos sent successfully!")
        form.resetFields()
        setSearch("")
        onSuccess?.()
      },
      onError: (error) => {
        message.error(`Failed to send kudos: ${error.message}`)
      },
    })
  }

  const formContent = (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      autoComplete="off"
    >
      <Form.Item
        label="Recipient"
        name="recipientId"
        rules={[{ required: true, message: "Please select a recipient" }]}
      >
        <Select
          placeholder="Search and select teammate..."
          showSearch
          filterOption={false}
          onSearch={handleSearchChange}
          notFoundContent={
            isLoading ? (
              <Spin size="small" />
            ) : search !== "" ? (
              "No users found"
            ) : (
              "Type to search users"
            )
          }
          options={userOptions}
          onPopupScroll={handlePopupScroll}
          loading={isFetchingNextPage}
        />
      </Form.Item>

      <Form.Item
        label={
          <Space>
            <span>Points</span>
            <Typography.Text type="secondary" className="text-xs font-normal">
              (10-50, monthly budget)
            </Typography.Text>
          </Space>
        }
        name="points"
        rules={[
          { required: true, message: "Please enter points" },
          {
            type: "number",
            min: 10,
            max: 50,
            message: "Points must be between 10 and 50",
          },
        ]}
      >
        <InputNumber
          min={10}
          max={50}
          className="!w-full"
          placeholder="Enter points (10-50)"
        />
      </Form.Item>

      <Form.Item
        label="Core Value"
        name="coreValue"
        rules={[{ required: true, message: "Please select a core value" }]}
      >
        <Select
          placeholder="Select core value"
          options={[
            { label: "🤝 Teamwork", value: "TEAMWORK" },
            { label: "🎯 Ownership", value: "OWNERSHIP" },
            { label: "💡 Innovation", value: "INNOVATION" },
            { label: "👥 Customer First", value: "CUSTOMER_FIRST" },
            { label: "✅ Integrity", value: "INTEGRITY" },
          ]}
        />
      </Form.Item>

      <Form.Item
        label="Message"
        name="message"
        rules={[
          { required: true, message: "Please enter a message" },
          { max: 500, message: "Message must be less than 500 characters" },
        ]}
      >
        <Input.TextArea
          rows={4}
          placeholder="What did they do great?"
          showCount
          maxLength={500}
        />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={isPending} block>
        Send Kudos
      </Button>
    </Form>
  )

  if (minimal) {
    return formContent
  }

  return (
    <Card>
      <Space direction="vertical" size="large" className="w-full">
        <div>
          <Typography.Title level={4}>Give Kudos</Typography.Title>
          <Typography.Text type="secondary">
            Recognize your teammates for their great work
          </Typography.Text>
        </div>
        {formContent}
      </Space>
    </Card>
  )
}
