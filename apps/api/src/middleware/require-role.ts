import type { NextFunction, Request, Response } from "express"

import { ForbiddenError, UnauthenticatedError } from "../common/errors"

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      next(new UnauthenticatedError())
      return
    }
    if (!roles.includes(req.session.role || "")) {
      next(new ForbiddenError())
      return
    }
    next()
  }
}
