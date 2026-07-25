import { z } from "zod"

export type UserNotification = {
  type: "success" | "info" | "warning" | "error"
  message: string
  duration?: number
}

export type SuccessResponse<T> = {
  data: T
  notifications?: UserNotification[]
}

export type ErrorResponse = {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
  notifications?: UserNotification[]
}

export const UserNotificationSchema = z.object({
  type: z.enum(["success", "info", "warning", "error"]),
  message: z.string(),
  duration: z.number().optional(),
})
