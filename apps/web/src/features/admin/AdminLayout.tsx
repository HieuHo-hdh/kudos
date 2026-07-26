import { Breadcrumb } from "antd"

interface AdminLayoutProps {
  children: React.ReactNode
  breadcrumbs?: Array<{ title: string }>
}

export function AdminLayout({ children, breadcrumbs = [] }: AdminLayoutProps) {
  const defaultBreadcrumbs = [{ title: "Admin" }, ...breadcrumbs]

  return (
    <div className="space-y-4">
      <Breadcrumb items={defaultBreadcrumbs} className="mb-4!" />
      {children}
    </div>
  )
}
