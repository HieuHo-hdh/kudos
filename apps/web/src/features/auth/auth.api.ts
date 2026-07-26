import type { LoginInput, MeResponse, RegisterInput } from "@kudos/shared"

import { apiFetch } from "../../common/api/client"

export const authApi = {
  login: (input: LoginInput) =>
    apiFetch<MeResponse>("/auth/login", { method: "POST", body: input }),

  register: (input: RegisterInput) =>
    apiFetch<MeResponse>("/auth/register", { method: "POST", body: input }),

  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
}
