import { ListUsersQuerySchema, UpdateUserInputSchema } from "@kudos/shared"
import { Router, type Router as RouterType } from "express"

import { requireAuth } from "../../middleware/require-auth"
import { requireRole } from "../../middleware/require-role"

import { usersService } from "./users.service"

export const usersRouter: RouterType = Router()

usersRouter.use(requireAuth())

usersRouter.get(
  "/",
  requireRole("ADMIN", "EMPLOYEE"),
  async (req, res, next) => {
    try {
      const parsed = ListUsersQuerySchema.parse(req.query)
      const result = await usersService.listUsers(parsed)
      res.json({ data: result })
    } catch (e) {
      next(e)
    }
  },
)

usersRouter.get(
  "/:id",
  requireRole("ADMIN", "EMPLOYEE"),
  async (req, res, next) => {
    try {
      const user = await usersService.getUserDetail(req.params.id as string)
      res.json({ data: user })
    } catch (e) {
      next(e)
    }
  },
)

usersRouter.put("/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = UpdateUserInputSchema.parse(req.body)
    const user = await usersService.updateUser(
      req.params.id as string,
      parsed,
      req.session.userId as string,
    )
    res.json({ data: user })
  } catch (e) {
    next(e)
  }
})

usersRouter.delete("/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    await usersService.deleteUser(
      req.params.id as string,
      req.session.userId as string,
    )
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

usersRouter.patch(
  "/:id/reactivate",
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const user = await usersService.reactivateUser(req.params.id as string)
      res.json({ data: user })
    } catch (e) {
      next(e)
    }
  },
)
