import { Router, type Router as RouterType } from "express"

import { sendEmpty, sendSuccess } from "../../common/response"
import { requireAuth } from "../../middleware/require-auth"

import { notificationsService } from "./notifications.service"

export const notificationsRouter: RouterType = Router()

notificationsRouter.use(requireAuth())

// Notifications - List user notifications
notificationsRouter.get("/", async (req, res, next) => {
  try {
    const userId = req.session.userId as string
    const page = parseInt((req.query.page as string) ?? "1")
    const limit = parseInt((req.query.limit as string) ?? "20")
    const unreadOnly = req.query.unreadOnly === "true"

    const result = await notificationsService.listUserNotifications(userId, {
      page,
      limit,
      unreadOnly,
    })
    sendSuccess(res, result)
  } catch (e) {
    next(e)
  }
})

// Notifications - Mark single notification as read
notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const notification = await notificationsService.markAsRead(
      req.params.id as string,
    )
    sendSuccess(res, notification, { message: "Notification marked as read" })
  } catch (e) {
    next(e)
  }
})

// Notifications - Mark all as read
notificationsRouter.patch("/mark-all-as-read", async (req, res, next) => {
  try {
    const userId = req.session.userId as string
    await notificationsService.markAllAsRead(userId)
    sendEmpty(res, { message: "All notifications marked as read" })
  } catch (e) {
    next(e)
  }
})

// Debug - Get all notifications for user (for testing)
notificationsRouter.get("/debug/all", async (req, res, next) => {
  try {
    const userId = req.session.userId as string
    const result = await notificationsService.listUserNotifications(userId, {
      page: 1,
      limit: 100,
      unreadOnly: false,
    })
    sendSuccess(res, result)
  } catch (e) {
    next(e)
  }
})
