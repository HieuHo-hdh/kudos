import type { NextFunction, Request, Response } from "express"

import { ForbiddenError } from "../common/errors"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export function requireXhr() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      next()
      return
    }
    if (req.headers["x-requested-with"] !== "XMLHttpRequest") {
      next(new ForbiddenError("Missing X-Requested-With header"))
      return
    }
    next()
  }
}
