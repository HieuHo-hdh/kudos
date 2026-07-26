import { AsyncLocalStorage } from "node:async_hooks"

export type RequestContext = {
  correlationId: string
  userId?: string
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore()
}
