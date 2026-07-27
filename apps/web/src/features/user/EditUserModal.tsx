import type { UpdateUserInput, UserDetail } from "@kudos/shared"
import { Button, Form, InputNumber, Modal, Select } from "antd"
import { useEffect } from "react"

interface EditUserModalProps {
  visible: boolean
  user: UserDetail | null
  currentUserId: string
  onClose: () => void
  onSubmit: (data: UpdateUserInput) => Promise<void>
  isLoading?: boolean
}

export function EditUserModal({
  visible,
  user,
  currentUserId,
  onClose,
  onSubmit,
  isLoading,
}: EditUserModalProps) {
  const [form] = Form.useForm<UpdateUserInput>()

  useEffect(() => {
    if (user && visible) {
      form.setFieldsValue({
        role: user.role,
        active: !user.createdAt, // assuming if no deletedAt, user is active
        givingBudgetRemaining: user.givingBudgetRemaining,
      })
    }
  }, [user, visible, form])

  const handleSubmit = async (values: UpdateUserInput) => {
    try {
      await onSubmit(values)
      form.resetFields()
      onClose()
    } catch {
      // Error handled by mutation
    }
  }

  const isSelfEdit = user?.id === currentUserId

  return (
    <Modal
      title={`Edit User: ${user?.displayName || ""}`}
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
          Save Changes
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
      >
        {isSelfEdit && (
          <div className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800">
            Note: You cannot change your own role to prevent accidental lockout.
          </div>
        )}

        <Form.Item label="Role" name="role">
          <Select
            disabled={isSelfEdit}
            options={[
              { label: "Employee", value: "EMPLOYEE" },
              { label: "Admin", value: "ADMIN" },
            ]}
          />
        </Form.Item>

        <Form.Item label="Giving Budget (points)" name="givingBudgetRemaining">
          <InputNumber min={0} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
