import type { NextFunction, Request, Response } from "express"

import { UnauthenticatedError } from "../common/errors"

declare module "express-session" {
  interface SessionData {
    userId?: string
    role?: "EMPLOYEE" | "ADMIN"
  }
}

export function requireAuth() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      next(new UnauthenticatedError())
      return
    }
    next()
  }
}
