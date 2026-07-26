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
  constructor(message = "You do not have permission to do that") {
    super(ErrorCode.FORBIDDEN, 403, message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(ErrorCode.NOT_FOUND, 404, message)
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
