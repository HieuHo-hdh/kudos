export interface Notification {
  id: string
  userId: string
  type: "MENTION" | "COMMENT" | "KUDO_RECEIVED" | "REDEMPTION_STATUS"
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface KudoReceivedPayload {
  kudoId: string
  giverId: string
  message: string
  points: number
}

export interface RedemptionStatusPayload {
  redemptionId: string
  rewardId: string
  status: "FULFILLED" | "CANCELLED"
  costPoints: number
  reason?: string
  pointsRefunded?: boolean
}
