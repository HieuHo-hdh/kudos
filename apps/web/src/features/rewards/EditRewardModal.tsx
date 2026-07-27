import type { CreateRewardInput, Reward } from "@kudos/shared"
import { Button, Form, Input, InputNumber, Modal, Switch } from "antd"
import { useEffect } from "react"

interface EditRewardModalProps {
  visible: boolean
  reward: Reward | null
  onClose: () => void
  onSubmit: (data: CreateRewardInput) => Promise<void>
  isLoading?: boolean
}

export function EditRewardModal({
  visible,
  reward,
  onClose,
  onSubmit,
  isLoading,
}: EditRewardModalProps) {
  const [form] = Form.useForm<CreateRewardInput>()

  useEffect(() => {
    if (reward && visible) {
      form.setFieldsValue({
        name: reward.name,
        description: reward.description,
        costPoints: reward.costPoints,
        imageUrl: reward.imageUrl,
        isLimited: reward.isLimited,
        stock: reward.stock,
      })
    } else if (!reward && visible) {
      form.resetFields()
    }
  }, [reward, visible, form])

  const handleSubmit = async (values: CreateRewardInput) => {
    try {
      await onSubmit(values)
      form.resetFields()
      onClose()
    } catch {
      // Error handled by mutation
    }
  }

  const isEditing = !!reward

  return (
    <Modal
      title={isEditing ? `Edit Reward: ${reward?.name || ""}` : "Create Reward"}
      open={visible}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isLoading}
          onClick={() => form.submit()}
        >
          {isEditing ? "Update" : "Create"}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: "Please enter reward name" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: "Please enter description" }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item
          name="costPoints"
          label="Cost Points"
          rules={[{ required: true, message: "Please enter cost points" }]}
        >
          <InputNumber min={0} />
        </Form.Item>

        <Form.Item name="imageUrl" label="Image URL">
          <Input type="url" />
        </Form.Item>

        <Form.Item
          name="isLimited"
          label="Limited Stock"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.isLimited !== currentValues.isLimited
          }
        >
          {({ getFieldValue }) =>
            getFieldValue("isLimited") ? (
              <Form.Item
                name="stock"
                label="Stock"
                rules={[
                  {
                    required: true,
                    message: "Stock is required for limited rewards",
                  },
                  {
                    type: "number",
                    min: 1,
                    message: "Stock must be at least 1",
                  },
                ]}
              >
                <InputNumber min={1} />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  )
}
