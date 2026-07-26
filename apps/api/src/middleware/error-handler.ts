import { ErrorCode, type ErrorResponse } from "@kudos/shared"
import type { NextFunction, Request, Response } from "express"
import { ZodError } from "zod"


import { AppError } from "../common/errors"
import { logger } from "../common/logger"

export function errorHandler() {
  return (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {}
      for (const issue of err.issues) {
        fields[issue.path.join(".") || "_"] = issue.message
      }
      const body: ErrorResponse = {
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: "Validation failed",
          fields,
        },
      }
      res.status(422).json(body)
      return
    }

    if (err instanceof AppError) {
      const body: ErrorResponse = {
        error: { code: err.code, message: err.message, fields: err.fields },
      }
      res.status(err.statusCode).json(body)
      return
    }

    logger.error({ err }, "Unhandled error")
    const body: ErrorResponse = {
      error: { code: ErrorCode.INTERNAL, message: "Something went wrong" },
    }
    res.status(500).json(body)
  }
}
