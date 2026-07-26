import { Layout } from "antd"
import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <Layout
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 360,
          padding: 32,
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 24 }}>Kudos</h1>
        <Outlet />
      </div>
    </Layout>
  )
}
