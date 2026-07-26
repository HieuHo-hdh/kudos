import type { NextFunction, Request, Response } from "express"
import { v7 as uuidv7 } from "uuid"

import { requestContext } from "../common/request-context"

export function correlationId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers["x-correlation-id"] as string) ?? uuidv7()
    res.setHeader("X-Correlation-Id", id)
    requestContext.run(
      {
        correlationId: id,
        userId: (req.session as { userId?: string })?.userId,
      },
      next,
    )
  }
}
