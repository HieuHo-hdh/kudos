import { App, ConfigProvider } from "antd"
import enUS from "antd/locale/en_US"
import type { ReactNode } from "react"

import { antdTheme } from "../../styles/theme"

export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={enUS} theme={antdTheme}>
      <App>{children}</App>
    </ConfigProvider>
  )
}
