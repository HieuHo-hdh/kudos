import { ErrorCode, type ErrorCodeType } from "@kudos/shared"

export class AppError extends Error {
  constructor(
    public code: ErrorCodeType,
    public statusCode: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Sign in required") {
    super(ErrorCode.UNAUTHENTICATED, 401, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(codeOrMessage?: ErrorCodeType | string, message?: string) {
    if (typeof codeOrMessage === "string" && !message) {
      super(ErrorCode.FORBIDDEN, 403, codeOrMessage)
    } else if (typeof codeOrMessage !== "string") {
      super(codeOrMessage || ErrorCode.FORBIDDEN, 403, message || "Forbidden")
    } else {
      super(codeOrMessage as ErrorCodeType, 403, message || "Forbidden")
    }
  }
}

export class NotFoundError extends AppError {
  constructor(codeOrMessage?: ErrorCodeType | string, message?: string) {
    if (typeof codeOrMessage === "string" && !message) {
      super(ErrorCode.NOT_FOUND, 404, codeOrMessage)
    } else if (typeof codeOrMessage !== "string") {
      super(codeOrMessage || ErrorCode.NOT_FOUND, 404, message || "Not found")
    } else {
      super(codeOrMessage as ErrorCodeType, 404, message || "Not found")
    }
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorCodeType, message: string) {
    super(code, 409, message)
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>, message = "Validation failed") {
    super(ErrorCode.VALIDATION_FAILED, 422, message, fields)
  }
}
