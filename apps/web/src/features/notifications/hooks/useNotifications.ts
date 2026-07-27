import { useQuery, useMutation } from "@tanstack/react-query"
import { useEffect } from "react"

import { apiFetch } from "../../../common/api/client"
import { useSocket } from "../../../common/hooks/useSocket"
import type { Notification } from "../notifications.types"

interface NotificationsResponse {
  items: Notification[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export function useNotifications() {
  const socket = useSocket()

  const { data, isLoading, refetch } = useQuery<{
    data: NotificationsResponse
  }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        // apiFetch already parses JSON and returns data directly
        const result = await apiFetch<NotificationsResponse>(
          "/notifications?unreadOnly=true",
        )
        return { data: result }
      } catch (err) {
        console.error("🔔 Fetch error:", err)
        throw err
      }
    },
    staleTime: 30000,
    retry: 1,
  })

  // Listen for real-time notifications via Socket.io
  useEffect(() => {
    if (!socket) return

    const handleNewNotification = () => {
      // Refetch notifications when a new one arrives
      refetch()
    }

    socket.on("notification:new", handleNewNotification)

    return () => {
      socket.off("notification:new", handleNewNotification)
    }
  }, [socket, refetch])

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiFetch(`/notifications/${notificationId}/read`, {
        method: "PATCH",
      })
    },
    onSuccess: () => {
      refetch()
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiFetch("/notifications/mark-all-as-read", {
        method: "PATCH",
      })
    },
    onSuccess: () => {
      refetch()
    },
  })

  const notifications = data?.data.items ?? []
  const unreadCount = data?.data.total ?? 0

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    refetch,
  }
}
