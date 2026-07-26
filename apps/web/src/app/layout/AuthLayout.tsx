import { Layout } from "antd"
import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <Layout
      style={{ minHeight: "100vh" }}
      className="flex justify-center items-center"
    >
      <div className="h-full w-full max-w-sm mx-4 bg-white rounded-lg shadow-md p-8">
        <Outlet />
      </div>
    </Layout>
  )
}
