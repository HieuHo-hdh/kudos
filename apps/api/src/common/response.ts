import type { SuccessResponse, UserNotification } from "@kudos/shared"
import type { Response } from "express"

export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: {
    statusCode?: number
    message?: string
  },
): void {
  const statusCode = options?.statusCode ?? 200
  const notifications: UserNotification[] = []

  if (options?.message) {
    notifications.push({
      type: "success",
      message: options.message,
    })
  }

  const response: SuccessResponse<T> = {
    data,
    ...(notifications.length > 0 && { notifications }),
  }

  res.status(statusCode).json(response)
}

export function sendEmpty(
  res: Response,
  options?: {
    statusCode?: number
    message?: string
  },
): void {
  const statusCode = options?.statusCode ?? 204

  if (statusCode === 204) {
    res.status(statusCode).end()
  } else {
    const notifications: UserNotification[] = []
    if (options?.message) {
      notifications.push({
        type: "success",
        message: options.message,
      })
    }

    const response = {
      ...(notifications.length > 0 && { notifications }),
    }

    res.status(statusCode).json(response)
  }
}
