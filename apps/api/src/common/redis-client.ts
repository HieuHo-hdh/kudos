import { env } from "@kudos/config"
import Redis from "ioredis"


export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
})

export const redisPub = new Redis(env.REDIS_URL)
export const redisSub = new Redis(env.REDIS_URL)
