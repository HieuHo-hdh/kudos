import type { UserNotification } from "@kudos/shared"
import { message as antdMessage } from "antd"


export function pushNotifications(items?: UserNotification[]) {
  if (!items?.length) return
  for (const n of items) {
    antdMessage[n.type](n.message, n.duration ? n.duration / 1000 : undefined)
  }
}
