import type { ErrorResponse, SuccessResponse } from "@kudos/shared"

import { pushNotifications } from "../utils/notify"

import { ApiError } from "./errors"

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  signal?: AbortSignal
}

export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, signal, ...rest } = opts
  const isForm = body instanceof FormData
  const res = await fetch(path, {
    credentials: "include",
    signal: signal ?? AbortSignal.timeout(30_000),
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      ...(isForm
        ? {}
        : body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      ...headers,
    },
    body: isForm
      ? (body as FormData)
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
    ...rest,
  })

  if (res.status === 204) return undefined as T

  const raw = (await res.json().catch(() => null)) as
    SuccessResponse<T> | ErrorResponse | null

  // Don't fire on /auth/me — it IS the session check; useCurrentUser
  // catches the 401 and returns null. Firing here would clear the query
  // cache mid-flight and strand the hook in a pending state.
  if (res.status === 401 && !path.endsWith("/auth/me")) {
    window.dispatchEvent(new CustomEvent("session-expired"))
  }

  if (!raw) {
    throw new ApiError("INTERNAL", res.status, "Empty response body")
  }

  pushNotifications(raw.notifications)

  if ("error" in raw) {
    throw new ApiError(
      raw.error.code,
      res.status,
      raw.error.message,
      raw.error.fields,
    )
  }
  return raw.data
}
