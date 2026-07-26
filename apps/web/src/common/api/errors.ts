export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
    this.name = "ApiError"
  }
}
