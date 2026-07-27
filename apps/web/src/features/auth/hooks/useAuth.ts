import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "../../../common/api/queryKeys"
import { authApi } from "../auth.api"

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (me) => {
      qc.setQueryData(queryKeys.me, me)
    },
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (me) => {
      qc.setQueryData(queryKeys.me, me)
    },
  })
}
