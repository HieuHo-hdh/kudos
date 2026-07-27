import type { CreateKudoInput, KudoDetail } from "@kudos/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { kudosApi } from "../kudos.api"

export function useCreateKudo() {
  const qc = useQueryClient()
  return useMutation<KudoDetail, Error, CreateKudoInput>({
    mutationFn: (input) => kudosApi.createKudo(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kudos"] })
    },
  })
}

export function useDeleteKudo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => kudosApi.deleteKudo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kudos"] })
    },
  })
}

export function useAddReaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kudoId, emoji }: { kudoId: string; emoji: string }) =>
      kudosApi.addReaction(kudoId, emoji),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kudos"] })
    },
  })
}

export function useRemoveReaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kudoId, emoji }: { kudoId: string; emoji: string }) =>
      kudosApi.removeReaction(kudoId, emoji),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kudos"] })
    },
  })
}

export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kudoId, body }: { kudoId: string; body: string }) =>
      kudosApi.addComment(kudoId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kudos"] })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      kudoId,
      commentId,
    }: {
      kudoId: string
      commentId: string
    }) => kudosApi.deleteComment(kudoId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kudos"] })
    },
  })
}

export function useListComments(kudoId: string) {
  return useQuery({
    queryKey: ["kudos", kudoId, "comments"],
    queryFn: () => kudosApi.listComments(kudoId),
    enabled: !!kudoId,
  })
}

export function useListReactions(kudoId: string) {
  return useQuery({
    queryKey: ["kudos", kudoId, "reactions"],
    queryFn: () => kudosApi.listReactions(kudoId),
    enabled: !!kudoId,
  })
}
