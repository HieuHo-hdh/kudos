import type {
  CreateKudoInput,
  ListKudosResponse,
  KudoDetail,
} from "@kudos/shared"

import { apiFetch } from "../../common/api/client"

export const kudosApi = {
  async listKudos(
    limit: number = 10,
    cursor?: string,
  ): Promise<ListKudosResponse> {
    const params = new URLSearchParams()
    params.append("limit", String(limit))
    if (cursor) params.append("cursor", cursor)

    return apiFetch<ListKudosResponse>(`/kudos?${params.toString()}`)
  },

  async getKudoDetail(id: string): Promise<KudoDetail> {
    return apiFetch<KudoDetail>(`/kudos/${id}`)
  },

  async createKudo(input: CreateKudoInput): Promise<KudoDetail> {
    return apiFetch<KudoDetail>("/kudos", {
      method: "POST",
      body: input,
    })
  },

  async deleteKudo(id: string): Promise<void> {
    await apiFetch<void>(`/kudos/${id}`, { method: "DELETE" })
  },

  async addReaction(kudoId: string, emoji: string): Promise<void> {
    await apiFetch<void>(`/kudos/${kudoId}/reactions`, {
      method: "POST",
      body: { emoji },
    })
  },

  async removeReaction(kudoId: string, emoji: string): Promise<void> {
    await apiFetch<void>(`/kudos/${kudoId}/reactions/${emoji}`, {
      method: "DELETE",
    })
  },

  async addComment(kudoId: string, body: string): Promise<void> {
    await apiFetch<void>(`/kudos/${kudoId}/comments`, {
      method: "POST",
      body: { body },
    })
  },

  async deleteComment(kudoId: string, commentId: string): Promise<void> {
    await apiFetch<void>(`/kudos/${kudoId}/comments/${commentId}`, {
      method: "DELETE",
    })
  },
}
