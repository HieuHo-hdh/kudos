import { Router, type Router as RouterType } from "express"

import { requireAuth } from "../../middleware/require-auth"
import { validate, validated } from "../../middleware/validate"

import {
  LoginInputSchema,
  RegisterInputSchema,
  type LoginInput,
  type RegisterInput,
} from "./auth.schemas"
import { authService } from "./auth.service"

export const authRouter: RouterType = Router()

authRouter.post(
  "/register",
  validate(RegisterInputSchema),
  async (req, res, next) => {
    try {
      const input = validated<RegisterInput>(req)
      const me = await authService.register(input)
      req.session.userId = me.id
      req.session.role = me.role
      res.status(201).json({ data: me })
    } catch (e) {
      next(e)
    }
  },
)

authRouter.post(
  "/login",
  validate(LoginInputSchema),
  async (req, res, next) => {
    try {
      const input = validated<LoginInput>(req)
      const me = await authService.login(input)
      req.session.regenerate((err) => {
        if (err) return next(err)
        req.session.userId = me.id
        req.session.role = me.role
        req.session.save((err2) => {
          if (err2) return next(err2)
          res.json({ data: me })
        })
      })
    } catch (e) {
      next(e)
    }
  },
)

authRouter.post("/logout", async (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err)
    res.clearCookie("kudos.sid")
    res.status(204).end()
  })
})

authRouter.get("/me", requireAuth(), async (req, res, next) => {
  try {
    const me = await authService.getMe(req.session.userId!)
    res.json({ data: me })
  } catch (e) {
    next(e)
  }
})
