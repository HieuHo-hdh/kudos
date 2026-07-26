import { env } from "@kudos/config"
import cookie from "cookie"
import cookieParser from "cookie-parser"
import type { Socket } from "socket.io"


import { redis } from "../common/redis-client"

type SessionData = { userId?: string; role?: "EMPLOYEE" | "ADMIN" }

export async function authenticateSocket(
  socket: Socket,
): Promise<{ userId: string; role: "EMPLOYEE" | "ADMIN" } | null> {
  const rawCookie = socket.handshake.headers.cookie
  if (!rawCookie) return null

  const parsed = cookie.parse(rawCookie)
  const signedSid = parsed["kudos.sid"]
  if (!signedSid) return null

  const sid = cookieParser.signedCookie(signedSid, env.SESSION_SECRET)
  if (!sid) return null

  const raw = await redis.get(`sess:${sid}`)
  if (!raw) return null

  const sess = JSON.parse(raw) as SessionData
  if (!sess.userId || !sess.role) return null
  return { userId: sess.userId, role: sess.role }
}
