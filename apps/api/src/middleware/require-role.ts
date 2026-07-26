import type { NextFunction, Request, Response } from "express"

import { ForbiddenError, UnauthenticatedError } from "../common/errors"

export function requireRole(role: "ADMIN") {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      next(new UnauthenticatedError())
      return
    }
    if (req.session.role !== role) {
      next(new ForbiddenError())
      return
    }
    next()
  }
}
