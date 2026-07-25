import { z } from "zod"

export const PingEventSchema = z.object({
  clientTs: z.number(),
})

export type PingEvent = z.infer<typeof PingEventSchema>

export const PongEventSchema = z.object({
  clientTs: z.number(),
  serverTs: z.number(),
  userId: z.string().uuid(),
})

export type PongEvent = z.infer<typeof PongEventSchema>

export type ServerToClientEvents = {
  "connection:established": (payload: { userId: string }) => void
  pong: (payload: PongEvent) => void
}

export type ClientToServerEvents = {
  ping: (payload: PingEvent) => void
}
