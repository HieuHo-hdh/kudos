import { Card, Space } from "antd"

import { AdminLayout } from "../../user"
import { GiveKudoForm } from "../components/GiveKudoForm"

export function GiveKudosPage() {
  return (
    <AdminLayout breadcrumbs={[{ title: "Give Kudos" }]}>
      <Card className="max-w-2xl">
        <Space direction="vertical" className="w-full" size="large">
          <h1 className="text-2xl font-bold">Give Kudos</h1>
          <GiveKudoForm minimal />
        </Space>
      </Card>
    </AdminLayout>
  )
}
