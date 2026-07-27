import { env } from "@kudos/config"
import RedisStore from "connect-redis"
import cookieParser from "cookie-parser"
import cors from "cors"
import express, { type Express } from "express"
import session from "express-session"
import helmet from "helmet"

import { redis } from "./common/redis-client"
import { authRouter } from "./features/auth/auth.routes"
import { healthRouter } from "./features/health/health.routes"
import { kudosRouter } from "./features/kudos/kudos.routes"
import { redemptionsRouter } from "./features/rewards/redemptions.routes"
import { rewardsRouter } from "./features/rewards/rewards.routes"
import { usersRouter } from "./features/users/users.routes"
import { correlationId } from "./middleware/correlation-id"
import { errorHandler } from "./middleware/error-handler"
import { requireXhr } from "./middleware/require-xhr"

export function createApp(): Express {
  const app = express()

  app.set("trust proxy", 1)
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: "1mb" }))
  app.use(cookieParser())

  app.use(
    session({
      name: "kudos.sid",
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: new RedisStore({ client: redis, prefix: "sess:" }),
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  )

  app.use(correlationId())
  app.use(requireXhr())

  app.use("/health", healthRouter)
  app.use("/auth", authRouter)
  app.use("/users", usersRouter)
  app.use("/kudos", kudosRouter)
  app.use("/rewards", rewardsRouter)
  app.use("/redemptions", redemptionsRouter)

  app.use(errorHandler())
  return app
}
