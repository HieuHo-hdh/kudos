import { ListUsersQuerySchema, UpdateUserInputSchema } from "@kudos/shared"
import type { Router as ExpressRouter } from "express"
import { Router } from "express"

import { requireAuth } from "../../middleware/require-auth"
import { requireRole } from "../../middleware/require-role"

import { adminService } from "./admin.service"

export const adminRouter: ExpressRouter = Router()

adminRouter.use(requireAuth(), requireRole("ADMIN"))

adminRouter.get("/users", async (req, res, next) => {
  try {
    const parsed = ListUsersQuerySchema.parse(req.query)
    const result = await adminService.listUsers(parsed)
    res.json({ data: result })
  } catch (e) {
    next(e)
  }
})

adminRouter.get("/users/:id", async (req, res, next) => {
  try {
    const user = await adminService.getUserDetail(req.params.id)
    res.json({ data: user })
  } catch (e) {
    next(e)
  }
})

adminRouter.put("/users/:id", async (req, res, next) => {
  try {
    const parsed = UpdateUserInputSchema.parse(req.body)
    const user = await adminService.updateUser(
      req.params.id,
      parsed,
      req.session.userId!,
    )
    res.json({ data: user })
  } catch (e) {
    next(e)
  }
})

adminRouter.delete("/users/:id", async (req, res, next) => {
  try {
    await adminService.deleteUser(req.params.id, req.session.userId!)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

adminRouter.patch("/users/:id/reactivate", async (req, res, next) => {
  try {
    const user = await adminService.reactivateUser(req.params.id)
    res.json({ data: user })
  } catch (e) {
    next(e)
  }
})
