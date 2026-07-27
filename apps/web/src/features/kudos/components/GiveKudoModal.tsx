import { Modal } from "antd"

import { GiveKudoForm } from "./GiveKudoForm"

interface GiveKudoModalProps {
  open: boolean
  onClose: () => void
}

export function GiveKudoModal({ open, onClose }: GiveKudoModalProps) {
  return (
    <Modal
      title="Give Kudos"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <GiveKudoForm onSuccess={onClose} minimal />
    </Modal>
  )
}
