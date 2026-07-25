# Kudos Sprint 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working monorepo where `pnpm install && pnpm dev` brings up Postgres/Redis/MinIO in Docker, the API serves `/health`, the web app renders a login page, a seeded admin user can register/log in/log out with Redis-backed sessions, and a Socket.io "ping" round-trip works between the same authenticated browser and API.

**Architecture:** pnpm workspaces + Turborepo monorepo. Three apps (`api`, `web`, `worker` — `worker` scaffolded empty in this sprint), three shared packages (`shared`, `db`, `config`). Backend is Express + Prisma + Socket.io + Redis-backed sessions. Frontend is Vite + React + React Router + Ant Design 5 + TanStack Query. All money-adjacent DB tables from spec Section 3 are migrated in this sprint even though only `users`/`auth_identities` are exercised — subsequent sprints add code, not tables.

**Tech Stack:** Node 20+, pnpm 9+, TypeScript 5.5+, Turborepo 2, Express 4, Prisma 5, Socket.io 4, ioredis 5, connect-redis 7, express-session, bcrypt, zod, pino, Vite 5, React 18, React Router 6, Ant Design 5, TanStack Query 5, Zustand 4, Vitest 2, Testcontainers 10, MSW 2, ESLint 9 (flat config), Prettier 3, Husky 9, commitlint 19, Docker Compose.

## Global Constraints

- **Package manager:** pnpm (workspaces). Do not use npm or yarn.
- **Language:** TypeScript strict mode everywhere. No implicit any.
- **Prettier:** `semi: false`, `singleQuote: false` (double quotes), `trailingComma: "all"`, `arrowParens: "always"`. Line width 80.
- **Commit types (commitlint):** exactly `feat, fix, refactor, chore, doc`. Note the singular `doc`, not `docs`.
- **UUIDs:** UUID v7 (time-ordered). Use `uuid` package's `v7()`.
- **Timestamps:** Postgres `timestamptz` (UTC). Never `timestamp`.
- **Env parsing:** every env var read must go through `@kudos/config`'s zod-validated `env` object. No `process.env.X` in feature code.
- **DB access:** every Prisma call in `apps/api` lives in a `*.queries.ts` file inside a feature folder. No Prisma imports in route or component files.
- **No axios**, no Redux — TanStack Query + Zustand + native fetch wrapper only.
- **Enum for commit type:** `chore(sprint-0): …`, `feat(auth): …`, etc. Scope is optional but preferred.
- **Node version:** pin to `>=20.11` in every `package.json` `engines`.
- **Response envelope (all API responses):** success = `{ data, notifications? }`, error = `{ error: { code, message, fields? }, notifications? }`.
- **Error codes:** machine-readable SCREAMING_SNAKE_CASE (`INSUFFICIENT_BUDGET`, `INVALID_CREDENTIALS`, etc.). Defined once in `packages/shared/src/errors.ts`.
- **Policy constants:** `MONTHLY_GIVING_BUDGET = 200`, `MIN_KUDO_POINTS = 10`, `MAX_KUDO_POINTS = 50`, `MAX_VIDEO_SECONDS = 180`, `MAX_VIDEO_BYTES = 500_000_000`, `MAX_IMAGE_BYTES = 20_000_000`, `MAX_MEDIA_PER_KUDO = 5`, `COMPANY_TIMEZONE = "Asia/Ho_Chi_Minh"`. Defined in `packages/shared/src/constants.ts`.

---

## File Structure (created in this sprint)

```
kudos/
├── .env.example
├── .gitignore
├── .prettierrc.json
├── .prettierignore
├── commitlint.config.js
├── docker-compose.yml
├── eslint.config.js
├── package.json                              (root, private, workspaces + scripts)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
├── .github/workflows/ci.yml
├── .husky/{pre-commit,commit-msg}
│
├── packages/
│   ├── config/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/{env.ts, index.ts}
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── constants.ts
│   │       ├── api-envelope.ts
│   │       ├── errors.ts
│   │       ├── socket/events.ts
│   │       └── auth/{index.ts, schemas.ts}
│   └── db/
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       └── src/index.ts
│
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.ts
│   │   │   ├── common/
│   │   │   │   ├── errors.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── prisma-client.ts
│   │   │   │   ├── redis-client.ts
│   │   │   │   └── request-context.ts
│   │   │   ├── middleware/
│   │   │   │   ├── error-handler.ts
│   │   │   │   ├── correlation-id.ts
│   │   │   │   ├── require-auth.ts
│   │   │   │   ├── require-role.ts
│   │   │   │   ├── require-xhr.ts
│   │   │   │   └── validate.ts
│   │   │   ├── realtime/
│   │   │   │   ├── socket-server.ts
│   │   │   │   ├── socket-auth.ts
│   │   │   │   ├── rooms.ts
│   │   │   │   └── ping.handler.ts
│   │   │   └── features/
│   │   │       ├── health/health.routes.ts
│   │   │       ├── auth/
│   │   │       │   ├── auth.routes.ts
│   │   │       │   ├── auth.service.ts
│   │   │       │   ├── auth.queries.ts
│   │   │       │   ├── auth.schemas.ts
│   │   │       │   └── auth.service.test.ts
│   │   │       └── users/
│   │   │           ├── users.routes.ts
│   │   │           └── users.queries.ts
│   │   └── test/
│   │       ├── setup.ts
│   │       ├── fixtures/user.ts
│   │       └── helpers/http-client.ts
│   │
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── public/favicon.svg
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── app/
│   │       │   ├── routes.tsx
│   │       │   ├── layout/{AppShell.tsx, AuthLayout.tsx}
│   │       │   └── providers/{QueryProvider.tsx, AntdProvider.tsx, SocketProvider.tsx}
│   │       ├── common/
│   │       │   ├── api/{client.ts, queryKeys.ts, errors.ts}
│   │       │   ├── hooks/useCurrentUser.ts
│   │       │   ├── store/ui.store.ts
│   │       │   └── utils/notify.ts
│   │       ├── features/auth/
│   │       │   ├── LoginPage.tsx
│   │       │   ├── RegisterPage.tsx
│   │       │   ├── useAuth.ts
│   │       │   └── auth.api.ts
│   │       └── styles/theme.ts
│   │
│   └── worker/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/main.ts                        (empty stub — real code in Sprint 1)
│
└── docs/superpowers/                          (already exists)
```

---

## Task Dependency Graph

```
T1 monorepo scaffold
   ├──▶ T2 packages/config + packages/shared
   │       └──▶ T3 docker-compose
   │               └──▶ T4 packages/db (Prisma schema + migration + seed)
   │                       └──▶ T5 apps/api skeleton (Express, /health, middleware)
   │                               ├──▶ T6 auth backend (routes + service + tests)
   │                               │       └──▶ T8 auth frontend (LoginPage, guards)
   │                               └──▶ T9 Socket.io skeleton (backend + frontend)
   │
   └──▶ T7 apps/web skeleton (Vite, providers, fetch client)   [parallel-safe with T5–T6]
           └──▶ T8
                   └──▶ T9
                           └──▶ T10 CI workflow
```

---

## Task 1: Monorepo scaffold + root tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `commitlint.config.js`, `.husky/pre-commit`, `.husky/commit-msg`, `.nvmrc`

**Interfaces:**
- Consumes: nothing.
- Produces: `pnpm install` works. `pnpm lint` runs ESLint across the empty workspace and exits 0. `pnpm format` runs Prettier. Commit hooks fire.

- [ ] **Step 1: Initialize git**

```bash
cd /Users/hieu/Desktop/code/kudos
git init
git branch -M main
```

- [ ] **Step 2: Write `.nvmrc`**

Content: `20.11.1`

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
dist/
build/
.turbo/
coverage/
*.log
.DS_Store
.env
.env.local
.env.*.local
!.env.example
apps/*/dist/
apps/*/.turbo/
packages/*/dist/
packages/*/.turbo/
packages/db/prisma/migrations/dev.db*
.pnpm-store/
```

- [ ] **Step 4: Write `.env.example`**

```
# App
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:5173

# Postgres
DATABASE_URL=postgresql://kudos:kudos@localhost:5432/kudos?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Session
SESSION_SECRET=change-me-in-prod-please-32-chars-min-abcdef

# S3 / MinIO (used in Sprint 1)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=kudos-media
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```

Copy to `.env` for local dev: `cp .env.example .env`

- [ ] **Step 5: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 6: Write root `package.json`**

```json
{
  "name": "kudos",
  "private": true,
  "version": "0.0.0",
  "engines": {
    "node": ">=20.11",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:integration": "turbo run test:integration",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:migrate": "pnpm --filter @kudos/db exec prisma migrate dev",
    "db:deploy": "pnpm --filter @kudos/db exec prisma migrate deploy",
    "db:seed": "pnpm --filter @kudos/db exec tsx prisma/seed.ts",
    "db:reset": "pnpm --filter @kudos/db exec prisma migrate reset --force",
    "prepare": "husky"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.5.0",
    "@commitlint/config-conventional": "^19.5.0",
    "@typescript-eslint/eslint-plugin": "^8.8.0",
    "@typescript-eslint/parser": "^8.8.0",
    "eslint": "^9.11.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "globals": "^15.9.0",
    "husky": "^9.1.6",
    "lint-staged": "^15.2.10",
    "prettier": "^3.3.3",
    "turbo": "^2.1.3",
    "typescript": "^5.5.4",
    "typescript-eslint": "^8.8.0"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

- [ ] **Step 7: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": false
  }
}
```

- [ ] **Step 8: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "outputs": ["coverage/**"]
    },
    "test:integration": {
      "outputs": ["coverage/**"],
      "cache": false
    }
  }
}
```

- [ ] **Step 9: Write `.prettierrc.json`**

```json
{
  "semi": false,
  "singleQuote": false,
  "trailingComma": "all",
  "arrowParens": "always",
  "printWidth": 80
}
```

- [ ] **Step 10: Write `.prettierignore`**

```
node_modules
dist
build
coverage
.turbo
pnpm-lock.yaml
apps/web/dist
apps/api/dist
packages/db/prisma/migrations
```

- [ ] **Step 11: Write `eslint.config.js` (flat config)**

```js
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import importPlugin from "eslint-plugin-import"
import prettier from "eslint-config-prettier"
import globals from "globals"

export default [
  {
    ignores: [
      "**/dist/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/coverage/**",
      "packages/db/prisma/migrations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { import: importPlugin, "react-hooks": reactHooks },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc" },
        },
      ],
      "import/no-cycle": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  prettier,
]
```

- [ ] **Step 12: Write `commitlint.config.js`**

```js
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "chore", "doc"],
    ],
    "subject-case": [0],
  },
}
```

- [ ] **Step 13: Install dependencies**

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` created. `node_modules/` populated. No errors.

- [ ] **Step 14: Wire Husky hooks**

```bash
pnpm exec husky init
```

Overwrite `.husky/pre-commit`:

```sh
pnpm exec lint-staged
```

Create `.husky/commit-msg`:

```sh
pnpm exec commitlint --edit "$1"
```

Make executable:

```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

- [ ] **Step 15: Verify tooling works**

```bash
pnpm lint          # Should exit 0 (no files yet)
pnpm format:check  # Should exit 0
```

Expected: both commands succeed silently.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "chore: bootstrap monorepo with pnpm, turborepo, eslint, prettier, husky"
```

Expected: commit-msg hook accepts `chore:` type. Pre-commit runs (no staged files matched patterns, exits 0).

---

## Task 2: Shared packages foundation (`@kudos/config`, `@kudos/shared`, `@kudos/db` skeleton)

**Files:**
- Create: `packages/config/{package.json,tsconfig.json,src/env.ts,src/index.ts}`
- Create: `packages/shared/{package.json,tsconfig.json,src/index.ts,src/constants.ts,src/api-envelope.ts,src/errors.ts,src/socket/events.ts,src/auth/index.ts,src/auth/schemas.ts}`
- Create: `packages/db/{package.json,tsconfig.json,src/index.ts}` (empty schema.prisma added in T4)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `import { env } from "@kudos/config"` — zod-validated env object, throws on invalid.
  - `import { MONTHLY_GIVING_BUDGET, MIN_KUDO_POINTS, ... } from "@kudos/shared"` — constants.
  - `import { ErrorCode } from "@kudos/shared"` — enum of machine codes.
  - `import type { SuccessResponse, ErrorResponse } from "@kudos/shared"` — envelope types.
  - `import { LoginInput, RegisterInput, MeResponse } from "@kudos/shared"` — auth zod schemas + types.
  - `import { db, Prisma } from "@kudos/db"` — singleton Prisma client (stub for now).

- [ ] **Step 1: Write `packages/config/package.json`**

```json
{
  "name": "@kudos/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: Write `packages/config/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write `packages/config/src/env.ts`**

```ts
import "dotenv/config"
import { z } from "zod"

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
})

export type Env = z.infer<typeof EnvSchema>

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment variables:")
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error("Env validation failed — refusing to start")
}

export const env: Env = parsed.data
```

- [ ] **Step 4: Write `packages/config/src/index.ts`**

```ts
export { env } from "./env"
export type { Env } from "./env"
```

- [ ] **Step 5: Write `packages/shared/package.json`**

```json
{
  "name": "@kudos/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 6: Write `packages/shared/tsconfig.json`**

Same as config's (extends base, outDir dist, include src).

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 7: Write `packages/shared/src/constants.ts`**

```ts
export const MONTHLY_GIVING_BUDGET = 200
export const MIN_KUDO_POINTS = 10
export const MAX_KUDO_POINTS = 50
export const MAX_VIDEO_SECONDS = 180
export const MAX_VIDEO_BYTES = 500_000_000
export const MAX_IMAGE_BYTES = 20_000_000
export const MAX_MEDIA_PER_KUDO = 5
export const COMPANY_TIMEZONE = "Asia/Ho_Chi_Minh"

export const CORE_VALUES = [
  "TEAMWORK",
  "OWNERSHIP",
  "INNOVATION",
  "CUSTOMER_FIRST",
  "INTEGRITY",
] as const

export type CoreValue = (typeof CORE_VALUES)[number]
```

- [ ] **Step 8: Write `packages/shared/src/errors.ts`**

```ts
export const ErrorCode = {
  // Auth
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  // Validation
  VALIDATION_FAILED: "VALIDATION_FAILED",
  // Points / kudos
  INSUFFICIENT_BUDGET: "INSUFFICIENT_BUDGET",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  SELF_KUDO_FORBIDDEN: "SELF_KUDO_FORBIDDEN",
  MEDIA_NOT_READY: "MEDIA_NOT_READY",
  // Rewards
  REWARD_INACTIVE: "REWARD_INACTIVE",
  REWARD_OUT_OF_STOCK: "REWARD_OUT_OF_STOCK",
  // Generic
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]
```

- [ ] **Step 9: Write `packages/shared/src/api-envelope.ts`**

```ts
import { z } from "zod"

export type UserNotification = {
  type: "success" | "info" | "warning" | "error"
  message: string
  duration?: number
}

export type SuccessResponse<T> = {
  data: T
  notifications?: UserNotification[]
}

export type ErrorResponse = {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
  notifications?: UserNotification[]
}

export const UserNotificationSchema = z.object({
  type: z.enum(["success", "info", "warning", "error"]),
  message: z.string(),
  duration: z.number().optional(),
})
```

- [ ] **Step 10: Write `packages/shared/src/auth/schemas.ts`**

```ts
import { z } from "zod"

export const LoginInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
})

export type LoginInput = z.infer<typeof LoginInputSchema>

export const RegisterInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(200),
  displayName: z.string().min(1).max(80),
})

export type RegisterInput = z.infer<typeof RegisterInputSchema>

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
  avatarUrl: z.string().nullable(),
  timezone: z.string(),
  givingBudgetRemaining: z.number().int(),
  earnedBalance: z.number().int(),
})

export type MeResponse = z.infer<typeof MeResponseSchema>
```

- [ ] **Step 11: Write `packages/shared/src/auth/index.ts`**

```ts
export * from "./schemas"
```

- [ ] **Step 12: Write `packages/shared/src/socket/events.ts`**

```ts
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
```

- [ ] **Step 13: Write `packages/shared/src/index.ts`**

```ts
export * from "./constants"
export * from "./errors"
export * from "./api-envelope"
export * from "./auth"
export * as SocketEvents from "./socket/events"
```

- [ ] **Step 14: Write `packages/db/package.json`**

```json
{
  "name": "@kudos/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "generate": "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "seed": "tsx prisma/seed.ts"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" },
  "dependencies": {
    "@prisma/client": "^5.20.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "tsx": "^4.19.1",
    "typescript": "^5.5.4",
    "@kudos/config": "workspace:*",
    "@kudos/shared": "workspace:*",
    "bcrypt": "^5.1.1",
    "@types/bcrypt": "^5.0.2",
    "uuid": "^10.0.0",
    "@types/uuid": "^10.0.0"
  }
}
```

- [ ] **Step 15: Write `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 16: Write `packages/db/src/index.ts`** (client not yet generated — Prisma runs in T4)

```ts
// Prisma client is generated in Task 4 after schema is written.
// This module re-exports the singleton once available.
export * from "@prisma/client"

import { PrismaClient } from "@prisma/client"

declare global {
  var __prisma: PrismaClient | undefined
}

export const db: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db
}
```

- [ ] **Step 17: Install new dependencies**

```bash
pnpm install
```

Note: `packages/db/src/index.ts` will not typecheck yet because `@prisma/client` has no generated types. That's fixed in T4. Leave for now.

- [ ] **Step 18: Verify shared/config lint + typecheck**

```bash
pnpm --filter @kudos/config typecheck
pnpm --filter @kudos/shared typecheck
```

Expected: both pass.

- [ ] **Step 19: Commit**

```bash
git add -A
git commit -m "feat(shared): add config, shared, and db package scaffolds"
```

---

## Task 3: Docker Compose (Postgres 16, Redis 7, MinIO)

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: `.env` (`DATABASE_URL`, `REDIS_URL`, `S3_*`).
- Produces: `docker compose up -d` brings up services on ports 5432 (Postgres), 6379 (Redis), 9000 (MinIO API), 9001 (MinIO console). Named volumes persist data across restarts.

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: kudos
      POSTGRES_PASSWORD: kudos
      POSTGRES_DB: kudos
      TZ: UTC
    ports:
      - "5432:5432"
    volumes:
      - kudos_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "kudos", "-d", "kudos"]
      interval: 5s
      timeout: 3s
      retries: 20

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    volumes:
      - kudos_redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - kudos_minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 3s
      retries: 20

  minio-createbucket:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb --ignore-existing local/kudos-media;
      mc anonymous set download local/kudos-media;
      exit 0;
      "

volumes:
  kudos_pg_data:
  kudos_redis_data:
  kudos_minio_data:
```

- [ ] **Step 2: Start services**

```bash
docker compose up -d
```

- [ ] **Step 3: Verify health**

```bash
docker compose ps
```

Expected: `postgres`, `redis`, `minio` all show `(healthy)`. `minio-createbucket` shows `Exited (0)`.

Then confirm connectivity:

```bash
docker compose exec postgres pg_isready -U kudos
docker compose exec redis redis-cli ping
curl -f http://localhost:9000/minio/health/live
```

Expected: `accepting connections`, `PONG`, `200 OK`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "chore(infra): add docker-compose for postgres, redis, minio"
```

---

## Task 4: Prisma schema + initial migration + seed script

**Files:**
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/seed.ts`
- Auto-generated: `packages/db/prisma/migrations/<ts>_init/migration.sql`

**Interfaces:**
- Consumes: `DATABASE_URL` from `@kudos/config`, running Postgres from T3.
- Produces:
  - All 12 tables from spec Section 3 exist.
  - `import { db } from "@kudos/db"` gives typed Prisma client.
  - Seed creates `admin@test.local` (role ADMIN), 5 employees, 3 rewards.

- [ ] **Step 1: Write `packages/db/prisma/schema.prisma`**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [citext]
}

// ---------- Enums ----------

enum Role {
  EMPLOYEE
  ADMIN
}

enum AuthProvider {
  PASSWORD
  GOOGLE
  MICROSOFT
}

enum CoreValue {
  TEAMWORK
  OWNERSHIP
  INNOVATION
  CUSTOMER_FIRST
  INTEGRITY
}

enum TransactionType {
  GIVE
  RECEIVE
  MONTHLY_RESET
  REDEEM
  ADJUST
}

enum NotificationType {
  MENTION
  COMMENT
  KUDO_RECEIVED
  REDEMPTION_STATUS
}

enum RedemptionStatus {
  PENDING
  FULFILLED
  CANCELLED
  FAILED
}

enum MediaKind {
  IMAGE
  VIDEO
}

enum MediaStatus {
  PENDING
  READY
  REJECTED
}

// ---------- Identity & auth ----------

model User {
  id                     String   @id @db.Uuid
  email                  String   @unique @db.Citext
  displayName            String   @map("display_name")
  avatarUrl              String?  @map("avatar_url")
  role                   Role     @default(EMPLOYEE)
  timezone               String   @default("UTC")
  givingBudgetRemaining  Int      @default(200) @map("giving_budget_remaining")
  earnedBalance          Int      @default(0) @map("earned_balance")
  mfaEnabled             Boolean  @default(false) @map("mfa_enabled")
  mfaSecret              String?  @map("mfa_secret")
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt              DateTime @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt              DateTime? @map("deleted_at") @db.Timestamptz

  authIdentities   AuthIdentity[]
  kudosSent        Kudo[]         @relation("KudoSender")
  kudosReceived    Kudo[]         @relation("KudoRecipient")
  reactions        Reaction[]
  comments         Comment[]
  pointsTxs        PointsTransaction[]
  redemptions      Redemption[]
  notifications    Notification[]
  mediaAssets      MediaAsset[]

  @@map("users")
}

model AuthIdentity {
  id             String       @id @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  provider       AuthProvider
  providerUserId String       @map("provider_user_id")
  passwordHash   String?      @map("password_hash")
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerUserId])
  @@unique([userId, provider])
  @@map("auth_identities")
}

// ---------- Kudos ----------

model Kudo {
  id             String    @id @db.Uuid
  senderId       String    @map("sender_id") @db.Uuid
  recipientId    String    @map("recipient_id") @db.Uuid
  points         Int
  message        String
  coreValue      CoreValue @map("core_value")
  idempotencyKey String    @map("idempotency_key") @db.Uuid
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt      DateTime? @map("deleted_at") @db.Timestamptz

  sender    User        @relation("KudoSender", fields: [senderId], references: [id])
  recipient User        @relation("KudoRecipient", fields: [recipientId], references: [id])
  media     KudoMedia[]
  reactions Reaction[]
  comments  Comment[]
  pointsTxs PointsTransaction[]

  @@unique([senderId, idempotencyKey])
  @@index([recipientId, createdAt(sort: Desc)])
  @@index([senderId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("kudos")
}

model KudoMedia {
  id            String @id @db.Uuid
  kudoId        String @map("kudo_id") @db.Uuid
  mediaAssetId  String @map("media_asset_id") @db.Uuid
  displayOrder  Int    @map("display_order")

  kudo  Kudo       @relation(fields: [kudoId], references: [id], onDelete: Cascade)
  asset MediaAsset @relation(fields: [mediaAssetId], references: [id])

  @@map("kudo_media")
}

model Reaction {
  id        String   @id @db.Uuid
  kudoId    String   @map("kudo_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  emoji     String
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  kudo Kudo @relation(fields: [kudoId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@unique([kudoId, userId, emoji])
  @@index([kudoId])
  @@map("reactions")
}

model Comment {
  id        String    @id @db.Uuid
  kudoId    String    @map("kudo_id") @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  body      String
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz

  kudo  Kudo           @relation(fields: [kudoId], references: [id], onDelete: Cascade)
  user  User           @relation(fields: [userId], references: [id])
  media CommentMedia[]

  @@index([kudoId, createdAt])
  @@map("comments")
}

model CommentMedia {
  id            String @id @db.Uuid
  commentId     String @map("comment_id") @db.Uuid
  mediaAssetId  String @map("media_asset_id") @db.Uuid
  displayOrder  Int?   @map("display_order")

  comment Comment    @relation(fields: [commentId], references: [id], onDelete: Cascade)
  asset   MediaAsset @relation(fields: [mediaAssetId], references: [id])

  @@map("comment_media")
}

// ---------- Points ledger ----------

model PointsTransaction {
  id            String          @id @db.Uuid
  userId        String          @map("user_id") @db.Uuid
  type          TransactionType
  amount        Int
  balanceAfter  Int             @map("balance_after")
  kudoId        String?         @map("kudo_id") @db.Uuid
  redemptionId  String?         @map("redemption_id") @db.Uuid
  note          String?
  createdAt     DateTime        @default(now()) @map("created_at") @db.Timestamptz

  user       User        @relation(fields: [userId], references: [id])
  kudo       Kudo?       @relation(fields: [kudoId], references: [id])
  redemption Redemption? @relation(fields: [redemptionId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, type, createdAt(sort: Desc)])
  @@map("points_transactions")
}

// ---------- Rewards & redemption ----------

model Reward {
  id          String   @id @db.Uuid
  name        String
  description String
  costPoints  Int      @map("cost_points")
  imageUrl    String?  @map("image_url")
  isActive    Boolean  @default(true) @map("is_active")
  stock       Int?
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  redemptions Redemption[]

  @@map("rewards")
}

model Redemption {
  id             String           @id @db.Uuid
  userId         String           @map("user_id") @db.Uuid
  rewardId       String           @map("reward_id") @db.Uuid
  costPoints     Int              @map("cost_points")
  idempotencyKey String           @map("idempotency_key") @db.Uuid
  status         RedemptionStatus @default(PENDING)
  cancelReason   String?          @map("cancel_reason")
  createdAt      DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime         @updatedAt @map("updated_at") @db.Timestamptz
  fulfilledAt    DateTime?        @map("fulfilled_at") @db.Timestamptz

  user      User                @relation(fields: [userId], references: [id])
  reward    Reward              @relation(fields: [rewardId], references: [id])
  pointsTxs PointsTransaction[]

  @@unique([userId, idempotencyKey])
  @@index([userId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@map("redemptions")
}

// ---------- Notifications ----------

model Notification {
  id        String           @id @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  payload   Json
  readAt    DateTime?        @map("read_at") @db.Timestamptz
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, readAt])
  @@map("notifications")
}

// ---------- Media ----------

model MediaAsset {
  id               String       @id @db.Uuid
  uploadedBy       String       @map("uploaded_by") @db.Uuid
  storageKey       String       @unique @map("storage_key")
  mimeType         String       @map("mime_type")
  sizeBytes        BigInt       @map("size_bytes")
  kind             MediaKind
  status           MediaStatus  @default(PENDING)
  rejectionReason  String?      @map("rejection_reason")
  durationSeconds  Int?         @map("duration_seconds")
  thumbnailKey     String?      @map("thumbnail_key")
  width            Int?
  height           Int?
  s3UploadId       String?      @map("s3_upload_id")
  s3Parts          Json?        @map("s3_parts")
  createdAt        DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  uploader     User           @relation(fields: [uploadedBy], references: [id])
  kudoMedia    KudoMedia[]
  commentMedia CommentMedia[]

  @@index([uploadedBy, createdAt(sort: Desc)])
  @@index([status])
  @@map("media_assets")
}
```

- [ ] **Step 2: Enable citext extension in a pre-migration hook**

Prisma's `postgresqlExtensions` preview handles this automatically when you write `extensions = [citext]` in the datasource, generating a `CREATE EXTENSION` in the migration.

- [ ] **Step 3: Generate the initial migration**

```bash
cd packages/db
pnpm exec prisma migrate dev --name init
```

Expected: prompts to apply migration → applies → generates client. Directory `prisma/migrations/<timestamp>_init/` appears with `migration.sql` containing `CREATE EXTENSION citext`, all 12 tables, indexes, unique constraints, enums.

Return to root:

```bash
cd ../..
```

- [ ] **Step 4: Add app-side CHECK constraints not expressible in Prisma**

Create `packages/db/prisma/migrations/<timestamp>_init/migration.sql` gets auto-generated. Append manual check constraints via a new migration:

```bash
cd packages/db
pnpm exec prisma migrate dev --name add_check_constraints --create-only
```

Edit the newly created migration.sql, replace its content with:

```sql
-- Prevent self-kudos
ALTER TABLE "kudos"
  ADD CONSTRAINT "kudos_no_self_kudo_check"
  CHECK ("sender_id" <> "recipient_id");

-- Points must be in valid range
ALTER TABLE "kudos"
  ADD CONSTRAINT "kudos_points_range_check"
  CHECK ("points" BETWEEN 10 AND 50);

-- Non-empty message
ALTER TABLE "kudos"
  ADD CONSTRAINT "kudos_message_nonempty_check"
  CHECK (char_length("message") > 0);

-- Reward cost positive
ALTER TABLE "rewards"
  ADD CONSTRAINT "rewards_cost_positive_check"
  CHECK ("cost_points" > 0);

-- Password provider must have password hash
ALTER TABLE "auth_identities"
  ADD CONSTRAINT "auth_identities_password_hash_required_check"
  CHECK ("provider" != 'PASSWORD' OR "password_hash" IS NOT NULL);

-- Partial index for feed pagination (excludes soft-deleted)
CREATE INDEX "kudos_feed_idx"
  ON "kudos" ("created_at" DESC)
  WHERE "deleted_at" IS NULL;

-- Partial index for admin PENDING redemption queue is already covered by (status, createdAt)
-- Partial index for orphan media cleanup
CREATE INDEX "media_assets_pending_idx"
  ON "media_assets" ("created_at")
  WHERE "status" = 'PENDING';

-- Partial index for unread notification badge
CREATE INDEX "notifications_unread_idx"
  ON "notifications" ("user_id")
  WHERE "read_at" IS NULL;
```

Apply:

```bash
pnpm exec prisma migrate dev
```

Return to root:

```bash
cd ../..
```

- [ ] **Step 5: Write `packages/db/prisma/seed.ts`**

```ts
import bcrypt from "bcrypt"
import { v7 as uuidv7 } from "uuid"

import { db, Prisma } from "../src/index"

const BCRYPT_COST = 12

async function main() {
  console.warn("Seeding database…")

  const users = [
    {
      email: "admin@test.local",
      displayName: "Admin Adminson",
      role: "ADMIN" as const,
      password: "adminpass123",
    },
    { email: "alice@test.local", displayName: "Alice Nguyen", password: "password123" },
    { email: "bob@test.local", displayName: "Bob Tran", password: "password123" },
    { email: "charlie@test.local", displayName: "Charlie Le", password: "password123" },
    { email: "diana@test.local", displayName: "Diana Pham", password: "password123" },
    { email: "eve@test.local", displayName: "Eve Vo", password: "password123" },
  ]

  for (const u of users) {
    const userId = uuidv7()
    const hash = await bcrypt.hash(u.password, BCRYPT_COST)

    await db.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: userId,
          email: u.email,
          displayName: u.displayName,
          role: u.role ?? "EMPLOYEE",
          timezone: "Asia/Ho_Chi_Minh",
        },
      })

      const user = await tx.user.findUniqueOrThrow({ where: { email: u.email } })

      await tx.authIdentity.upsert({
        where: {
          userId_provider: { userId: user.id, provider: "PASSWORD" },
        },
        update: { passwordHash: hash },
        create: {
          id: uuidv7(),
          userId: user.id,
          provider: "PASSWORD",
          providerUserId: u.email,
          passwordHash: hash,
        },
      })
    })

    console.warn(`  user: ${u.email}`)
  }

  const rewards: Prisma.RewardCreateInput[] = [
    {
      id: uuidv7(),
      name: "Company Hoodie",
      description: "Cozy branded hoodie, sizes S–XXL.",
      costPoints: 500,
      stock: 20,
    },
    {
      id: uuidv7(),
      name: "Friday Afternoon Off",
      description: "One PTO half-day, use within 30 days.",
      costPoints: 1000,
      stock: null,
    },
    {
      id: uuidv7(),
      name: "Coffee for a Week",
      description: "5 x company café credits.",
      costPoints: 250,
      stock: 50,
    },
  ]

  for (const r of rewards) {
    await db.reward.upsert({
      where: { id: r.id! },
      update: {},
      create: r,
    })
    console.warn(`  reward: ${r.name}`)
  }

  console.warn("Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
```

- [ ] **Step 6: Run the seed**

```bash
pnpm db:seed
```

Expected: prints 6 user entries and 3 reward entries. No errors.

- [ ] **Step 7: Verify data**

```bash
docker compose exec postgres psql -U kudos -d kudos -c "SELECT email, role FROM users ORDER BY role, email;"
docker compose exec postgres psql -U kudos -d kudos -c "SELECT name, cost_points FROM rewards;"
```

Expected: admin@test.local (ADMIN) plus 5 EMPLOYEE users; 3 rewards.

- [ ] **Step 8: Typecheck `packages/db`**

```bash
pnpm --filter @kudos/db typecheck
```

Expected: passes now that Prisma client is generated.

- [ ] **Step 9: Commit**

```bash
git add packages/db
git commit -m "feat(db): add prisma schema, migrations, check constraints, and seed"
```

---

## Task 5: `apps/api` skeleton (Express app, middleware, `/health`)

**Files:**
- Create: `apps/api/{package.json, tsconfig.json, vitest.config.ts}`
- Create: `apps/api/src/{main.ts, app.ts}`
- Create: `apps/api/src/common/{errors.ts, logger.ts, prisma-client.ts, redis-client.ts, request-context.ts}`
- Create: `apps/api/src/middleware/{error-handler.ts, correlation-id.ts, require-auth.ts, require-role.ts, require-xhr.ts, validate.ts}`
- Create: `apps/api/src/features/health/health.routes.ts`

**Interfaces:**
- Consumes: `@kudos/config`, `@kudos/db`, `@kudos/shared`.
- Produces:
  - `pnpm --filter @kudos/api dev` starts server on `env.PORT` (4000).
  - `GET /health` returns `{ data: { status: "ok", db: "ok", redis: "ok" } }`.
  - `AppError` class, `errorHandler` middleware, `validate(schema)` middleware, `requireAuth`, `requireRole`, `requireXhr` — all consumed by later tasks.
  - Session middleware wired using `connect-redis` (Task 6 uses it).
  - `logger` (pino) with correlation ID via `AsyncLocalStorage`.

- [ ] **Step 1: Write `apps/api/package.json`**

```json
{
  "name": "@kudos/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js",
    "lint": "eslint src test",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts"
  },
  "dependencies": {
    "@kudos/config": "workspace:*",
    "@kudos/db": "workspace:*",
    "@kudos/shared": "workspace:*",
    "@socket.io/redis-adapter": "^8.3.0",
    "bcrypt": "^5.1.1",
    "connect-redis": "^7.1.1",
    "cookie": "^0.6.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "express-session": "^1.18.0",
    "helmet": "^7.1.0",
    "ioredis": "^5.4.1",
    "pino": "^9.4.0",
    "pino-http": "^10.3.0",
    "rate-limiter-flexible": "^5.0.3",
    "socket.io": "^4.8.0",
    "uuid": "^10.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "^22.7.4",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^10.0.0",
    "supertest": "^7.0.0",
    "testcontainers": "^10.13.0",
    "tsx": "^4.19.1",
    "typescript": "^5.5.4",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Write `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node"],
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "test/**/*"]
}
```

Also `apps/api/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "rootDir": "src" },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "test/**/*"]
}
```

- [ ] **Step 3: Write `apps/api/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
})
```

- [ ] **Step 4: Write `apps/api/src/common/errors.ts`**

```ts
import { ErrorCode, type ErrorCodeType } from "@kudos/shared"

export class AppError extends Error {
  constructor(
    public code: ErrorCodeType,
    public statusCode: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Sign in required") {
    super(ErrorCode.UNAUTHENTICATED, 401, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that") {
    super(ErrorCode.FORBIDDEN, 403, message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(ErrorCode.NOT_FOUND, 404, message)
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorCodeType, message: string) {
    super(code, 409, message)
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>, message = "Validation failed") {
    super(ErrorCode.VALIDATION_FAILED, 422, message, fields)
  }
}
```

- [ ] **Step 5: Write `apps/api/src/common/request-context.ts`**

```ts
import { AsyncLocalStorage } from "node:async_hooks"

export type RequestContext = {
  correlationId: string
  userId?: string
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore()
}
```

- [ ] **Step 6: Write `apps/api/src/common/logger.ts`**

```ts
import { pino } from "pino"

import { env } from "@kudos/config"

import { getRequestContext } from "./request-context"

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  formatters: {
    log: (obj) => {
      const ctx = getRequestContext()
      return ctx ? { ...obj, correlationId: ctx.correlationId } : obj
    },
  },
  redact: {
    paths: [
      "password",
      "passwordHash",
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
    ],
    censor: "[REDACTED]",
  },
})
```

- [ ] **Step 7: Write `apps/api/src/common/prisma-client.ts`**

```ts
export { db, Prisma } from "@kudos/db"
```

- [ ] **Step 8: Write `apps/api/src/common/redis-client.ts`**

```ts
import Redis from "ioredis"

import { env } from "@kudos/config"

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
})

export const redisPub = new Redis(env.REDIS_URL)
export const redisSub = new Redis(env.REDIS_URL)
```

- [ ] **Step 9: Write `apps/api/src/middleware/correlation-id.ts`**

```ts
import type { NextFunction, Request, Response } from "express"
import { v7 as uuidv7 } from "uuid"

import { requestContext } from "../common/request-context"

export function correlationId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers["x-correlation-id"] as string) ?? uuidv7()
    res.setHeader("X-Correlation-Id", id)
    requestContext.run(
      { correlationId: id, userId: (req.session as { userId?: string })?.userId },
      next,
    )
  }
}
```

- [ ] **Step 10: Write `apps/api/src/middleware/error-handler.ts`**

```ts
import type { NextFunction, Request, Response } from "express"
import { ZodError } from "zod"

import { ErrorCode, type ErrorResponse } from "@kudos/shared"

import { AppError } from "../common/errors"
import { logger } from "../common/logger"

export function errorHandler() {
  return (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {}
      for (const issue of err.issues) {
        fields[issue.path.join(".") || "_"] = issue.message
      }
      const body: ErrorResponse = {
        error: { code: ErrorCode.VALIDATION_FAILED, message: "Validation failed", fields },
      }
      res.status(422).json(body)
      return
    }

    if (err instanceof AppError) {
      const body: ErrorResponse = {
        error: { code: err.code, message: err.message, fields: err.fields },
      }
      res.status(err.statusCode).json(body)
      return
    }

    logger.error({ err }, "Unhandled error")
    const body: ErrorResponse = {
      error: { code: ErrorCode.INTERNAL, message: "Something went wrong" },
    }
    res.status(500).json(body)
  }
}
```

- [ ] **Step 11: Write `apps/api/src/middleware/validate.ts`**

```ts
import type { NextFunction, Request, Response } from "express"
import type { ZodSchema } from "zod"

export function validate<T>(schema: ZodSchema<T>, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source])
    if (!parsed.success) {
      next(parsed.error)
      return
    }
    ;(req as Request & { validated: T }).validated = parsed.data
    next()
  }
}

export function validated<T>(req: Request): T {
  return (req as Request & { validated: T }).validated
}
```

- [ ] **Step 12: Write `apps/api/src/middleware/require-auth.ts`**

```ts
import type { NextFunction, Request, Response } from "express"

import { UnauthenticatedError } from "../common/errors"

declare module "express-session" {
  interface SessionData {
    userId?: string
    role?: "EMPLOYEE" | "ADMIN"
  }
}

export function requireAuth() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      next(new UnauthenticatedError())
      return
    }
    next()
  }
}
```

- [ ] **Step 13: Write `apps/api/src/middleware/require-role.ts`**

```ts
import type { NextFunction, Request, Response } from "express"

import { ForbiddenError, UnauthenticatedError } from "../common/errors"

export function requireRole(role: "ADMIN") {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      next(new UnauthenticatedError())
      return
    }
    if (req.session.role !== role) {
      next(new ForbiddenError())
      return
    }
    next()
  }
}
```

- [ ] **Step 14: Write `apps/api/src/middleware/require-xhr.ts`** (CSRF header check)

```ts
import type { NextFunction, Request, Response } from "express"

import { ForbiddenError } from "../common/errors"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export function requireXhr() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      next()
      return
    }
    if (req.headers["x-requested-with"] !== "XMLHttpRequest") {
      next(new ForbiddenError("Missing X-Requested-With header"))
      return
    }
    next()
  }
}
```

- [ ] **Step 15: Write `apps/api/src/features/health/health.routes.ts`**

```ts
import type { Request, Response } from "express"
import { Router } from "express"

import { db } from "../../common/prisma-client"
import { redis } from "../../common/redis-client"

export const healthRouter = Router()

healthRouter.get("/", async (_req: Request, res: Response) => {
  const [dbOk, redisOk] = await Promise.all([
    db.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redis.ping().then((r) => r === "PONG").catch(() => false),
  ])

  const overall = dbOk && redisOk
  res.status(overall ? 200 : 503).json({
    data: {
      status: overall ? "ok" : "degraded",
      db: dbOk ? "ok" : "down",
      redis: redisOk ? "ok" : "down",
    },
  })
})
```

- [ ] **Step 16: Write `apps/api/src/app.ts`**

```ts
import RedisStore from "connect-redis"
import cookieParser from "cookie-parser"
import cors from "cors"
import express, { type Express } from "express"
import session from "express-session"
import helmet from "helmet"

import { env } from "@kudos/config"

import { redis } from "./common/redis-client"
import { correlationId } from "./middleware/correlation-id"
import { errorHandler } from "./middleware/error-handler"
import { requireXhr } from "./middleware/require-xhr"
import { healthRouter } from "./features/health/health.routes"

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

  app.use(errorHandler())
  return app
}
```

Note: `requireXhr` is mounted before `/health` — but health is GET so it passes through. Auth routes in T6 mount as normal.

- [ ] **Step 17: Write `apps/api/src/main.ts`**

```ts
import { createServer } from "node:http"

import { env } from "@kudos/config"

import { createApp } from "./app"
import { logger } from "./common/logger"

const app = createApp()
const httpServer = createServer(app)

httpServer.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`)
})

const shutdown = (signal: string) => {
  logger.info(`${signal} received — shutting down`)
  httpServer.close(() => {
    logger.info("HTTP server closed")
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
```

- [ ] **Step 18: Install and typecheck**

```bash
pnpm install
pnpm --filter @kudos/api typecheck
```

Expected: passes.

- [ ] **Step 19: Start dev server**

```bash
pnpm --filter @kudos/api dev
```

- [ ] **Step 20: Verify `/health` in another terminal**

```bash
curl -i http://localhost:4000/health
```

Expected: `HTTP/1.1 200 OK`, body `{"data":{"status":"ok","db":"ok","redis":"ok"}}`.

Stop the dev server (Ctrl+C in the terminal running it).

- [ ] **Step 21: Commit**

```bash
git add apps/api
git commit -m "feat(api): add express app skeleton with sessions, health check, middleware"
```

---

## Task 6: Auth backend (register, login, logout, `/me`) + integration tests

**Files:**
- Create: `apps/api/src/features/auth/{auth.routes.ts, auth.service.ts, auth.queries.ts, auth.schemas.ts, auth.service.test.ts}`
- Create: `apps/api/src/features/users/{users.routes.ts, users.queries.ts}`
- Create: `apps/api/test/{setup.ts, fixtures/user.ts, helpers/http-client.ts}`
- Create: `apps/api/vitest.integration.config.ts`
- Modify: `apps/api/src/app.ts` — mount auth and users routers

**Interfaces:**
- Consumes: `req.session`, `db`, `RegisterInput`, `LoginInput`, `MeResponse` from `@kudos/shared`.
- Produces:
  - `POST /auth/register` → creates user + PASSWORD identity, logs in, returns `MeResponse`.
  - `POST /auth/login` → verifies bcrypt, sets session, returns `MeResponse`.
  - `POST /auth/logout` → destroys session, clears cookie, returns 204.
  - `GET /auth/me` → returns `MeResponse` (401 if not authed).
  - `AuthService`: `register(input)`, `login(input)`, `getMe(userId)`.
  - `makeUser(overrides?)` fixture for tests.

- [ ] **Step 1: Write `apps/api/src/features/auth/auth.schemas.ts`**

```ts
export { LoginInputSchema, RegisterInputSchema, MeResponseSchema } from "@kudos/shared"
export type { LoginInput, RegisterInput, MeResponse } from "@kudos/shared"
```

- [ ] **Step 2: Write `apps/api/src/features/auth/auth.queries.ts`**

```ts
import { v7 as uuidv7 } from "uuid"

import { db, Prisma } from "../../common/prisma-client"

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    include: {
      authIdentities: {
        where: { provider: "PASSWORD" },
        take: 1,
      },
    },
  })
}

export async function findUserById(id: string) {
  return db.user.findUnique({ where: { id } })
}

export async function createUserWithPassword(
  email: string,
  displayName: string,
  passwordHash: string,
  tx: Prisma.TransactionClient = db,
) {
  const userId = uuidv7()
  const user = await tx.user.create({
    data: {
      id: userId,
      email,
      displayName,
      role: "EMPLOYEE",
      timezone: "Asia/Ho_Chi_Minh",
    },
  })
  await tx.authIdentity.create({
    data: {
      id: uuidv7(),
      userId: user.id,
      provider: "PASSWORD",
      providerUserId: email,
      passwordHash,
    },
  })
  return user
}
```

- [ ] **Step 3: Write `apps/api/src/features/auth/auth.service.ts`**

```ts
import bcrypt from "bcrypt"

import { ErrorCode, type MeResponse } from "@kudos/shared"

import { AppError, ConflictError, UnauthenticatedError } from "../../common/errors"
import { db } from "../../common/prisma-client"

import {
  createUserWithPassword,
  findUserByEmail,
  findUserById,
} from "./auth.queries"
import type { LoginInput, RegisterInput } from "./auth.schemas"

const BCRYPT_COST = 12

export const authService = {
  async register(input: RegisterInput): Promise<MeResponse> {
    const existing = await findUserByEmail(input.email)
    if (existing) {
      throw new ConflictError(ErrorCode.EMAIL_TAKEN, "Email already registered")
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST)
    const user = await db.$transaction((tx) =>
      createUserWithPassword(input.email, input.displayName, passwordHash, tx),
    )
    return toMeResponse(user)
  },

  async login(input: LoginInput): Promise<MeResponse> {
    const user = await findUserByEmail(input.email)
    const identity = user?.authIdentities[0]
    if (!user || !identity?.passwordHash) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 401, "Invalid email or password")
    }
    const ok = await bcrypt.compare(input.password, identity.passwordHash)
    if (!ok) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 401, "Invalid email or password")
    }
    return toMeResponse(user)
  },

  async getMe(userId: string): Promise<MeResponse> {
    const user = await findUserById(userId)
    if (!user) throw new UnauthenticatedError()
    return toMeResponse(user)
  },
}

function toMeResponse(u: {
  id: string
  email: string
  displayName: string
  role: "EMPLOYEE" | "ADMIN"
  avatarUrl: string | null
  timezone: string
  givingBudgetRemaining: number
  earnedBalance: number
}): MeResponse {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    avatarUrl: u.avatarUrl,
    timezone: u.timezone,
    givingBudgetRemaining: u.givingBudgetRemaining,
    earnedBalance: u.earnedBalance,
  }
}
```

- [ ] **Step 4: Write `apps/api/src/features/auth/auth.routes.ts`**

```ts
import { Router } from "express"

import { requireAuth } from "../../middleware/require-auth"
import { validate, validated } from "../../middleware/validate"

import { authService } from "./auth.service"
import {
  LoginInputSchema,
  RegisterInputSchema,
  type LoginInput,
  type RegisterInput,
} from "./auth.schemas"

export const authRouter = Router()

authRouter.post("/register", validate(RegisterInputSchema), async (req, res, next) => {
  try {
    const input = validated<RegisterInput>(req)
    const me = await authService.register(input)
    req.session.userId = me.id
    req.session.role = me.role
    res.status(201).json({ data: me })
  } catch (e) {
    next(e)
  }
})

authRouter.post("/login", validate(LoginInputSchema), async (req, res, next) => {
  try {
    const input = validated<LoginInput>(req)
    const me = await authService.login(input)
    req.session.regenerate((err) => {
      if (err) return next(err)
      req.session.userId = me.id
      req.session.role = me.role
      req.session.save((err2) => {
        if (err2) return next(err2)
        res.json({ data: me })
      })
    })
  } catch (e) {
    next(e)
  }
})

authRouter.post("/logout", async (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err)
    res.clearCookie("kudos.sid")
    res.status(204).end()
  })
})

authRouter.get("/me", requireAuth(), async (req, res, next) => {
  try {
    const me = await authService.getMe(req.session.userId!)
    res.json({ data: me })
  } catch (e) {
    next(e)
  }
})
```

- [ ] **Step 5: Write `apps/api/src/features/users/users.queries.ts`** (placeholder for later, empty)

```ts
// Queries added in Sprint 1.
export {}
```

- [ ] **Step 6: Write `apps/api/src/features/users/users.routes.ts`** (empty router for later)

```ts
import { Router } from "express"

export const usersRouter = Router()
```

- [ ] **Step 7: Modify `apps/api/src/app.ts` — mount routers**

Between `app.use("/health", healthRouter)` and `app.use(errorHandler())`, add:

```ts
app.use("/auth", authRouter)
app.use("/users", usersRouter)
```

Also add the imports at top:

```ts
import { authRouter } from "./features/auth/auth.routes"
import { usersRouter } from "./features/users/users.routes"
```

- [ ] **Step 8: Write `apps/api/test/setup.ts` (Testcontainers spins up Postgres + Redis)**

```ts
import { execSync } from "node:child_process"

import { GenericContainer, type StartedTestContainer } from "testcontainers"
import { afterAll, beforeAll, beforeEach } from "vitest"

let pg: StartedTestContainer
let redis: StartedTestContainer

beforeAll(async () => {
  pg = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
      POSTGRES_DB: "test",
    })
    .withExposedPorts(5432)
    .start()

  redis = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .start()

  const pgUrl = `postgresql://test:test@${pg.getHost()}:${pg.getMappedPort(5432)}/test?schema=public`
  const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`

  process.env.DATABASE_URL = pgUrl
  process.env.REDIS_URL = redisUrl
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret"
  process.env.WEB_ORIGIN = "http://localhost:5173"
  process.env.S3_ENDPOINT = "http://localhost:9000"
  process.env.S3_REGION = "us-east-1"
  process.env.S3_BUCKET = "test"
  process.env.S3_ACCESS_KEY = "test"
  process.env.S3_SECRET_KEY = "test"
  process.env.NODE_ENV = "test"

  execSync("pnpm --filter @kudos/db exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env },
  })
}, 120_000)

beforeEach(async () => {
  const { db } = await import("../src/common/prisma-client")
  const tables = [
    "comment_media",
    "kudo_media",
    "reactions",
    "comments",
    "notifications",
    "points_transactions",
    "redemptions",
    "kudos",
    "media_assets",
    "rewards",
    "auth_identities",
    "users",
  ]
  await db.$executeRawUnsafe(`TRUNCATE TABLE "${tables.join('","')}" CASCADE`)
})

afterAll(async () => {
  const { db } = await import("../src/common/prisma-client")
  await db.$disconnect()
  await pg?.stop()
  await redis?.stop()
})
```

- [ ] **Step 8b: Write `apps/api/vitest.integration.config.ts`**

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    environment: "node",
    globals: false,
    setupFiles: ["test/setup.ts"],
    testTimeout: 30_000,
    fileParallelism: false,
  },
})
```

- [ ] **Step 9: Write `apps/api/test/fixtures/user.ts`**

```ts
import bcrypt from "bcrypt"
import { v7 as uuidv7 } from "uuid"

import { db } from "../../src/common/prisma-client"

export async function makeUser(
  overrides: Partial<{
    email: string
    displayName: string
    role: "EMPLOYEE" | "ADMIN"
    password: string
    givingBudgetRemaining: number
    earnedBalance: number
  }> = {},
) {
  const email = overrides.email ?? `user-${uuidv7()}@test.local`
  const password = overrides.password ?? "password123"
  const passwordHash = await bcrypt.hash(password, 4)
  const userId = uuidv7()

  const user = await db.user.create({
    data: {
      id: userId,
      email,
      displayName: overrides.displayName ?? "Test User",
      role: overrides.role ?? "EMPLOYEE",
      givingBudgetRemaining: overrides.givingBudgetRemaining ?? 200,
      earnedBalance: overrides.earnedBalance ?? 0,
    },
  })

  await db.authIdentity.create({
    data: {
      id: uuidv7(),
      userId: user.id,
      provider: "PASSWORD",
      providerUserId: email,
      passwordHash,
    },
  })

  return { user, password }
}
```

- [ ] **Step 10: Write `apps/api/test/helpers/http-client.ts`**

```ts
import supertest, { type SuperAgentTest } from "supertest"

import { createApp } from "../../src/app"

export function makeAgent(): SuperAgentTest {
  return supertest.agent(createApp())
}

export const XHR = { "X-Requested-With": "XMLHttpRequest" } as const
```

- [ ] **Step 11: Write the failing test `apps/api/src/features/auth/auth.service.test.ts`**

```ts
import { describe, expect, it } from "vitest"

import { makeAgent, XHR } from "../../../test/helpers/http-client"
import { makeUser } from "../../../test/fixtures/user"

describe("auth routes", () => {
  it("registers a new user, sets a session, and returns MeResponse", async () => {
    const agent = makeAgent()
    const res = await agent
      .post("/auth/register")
      .set(XHR)
      .send({
        email: "newbie@test.local",
        password: "supersecret1",
        displayName: "Newbie",
      })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      email: "newbie@test.local",
      displayName: "Newbie",
      role: "EMPLOYEE",
      givingBudgetRemaining: 200,
      earnedBalance: 0,
    })

    const me = await agent.get("/auth/me").set(XHR)
    expect(me.status).toBe(200)
    expect(me.body.data.email).toBe("newbie@test.local")
  })

  it("rejects duplicate email with EMAIL_TAKEN", async () => {
    await makeUser({ email: "dup@test.local" })
    const agent = makeAgent()
    const res = await agent
      .post("/auth/register")
      .set(XHR)
      .send({ email: "dup@test.local", password: "supersecret1", displayName: "X" })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe("EMAIL_TAKEN")
  })

  it("logs in with correct credentials and rejects wrong password", async () => {
    await makeUser({ email: "login@test.local", password: "rightpass99" })
    const agent = makeAgent()

    const bad = await agent
      .post("/auth/login")
      .set(XHR)
      .send({ email: "login@test.local", password: "wrongpass99" })
    expect(bad.status).toBe(401)
    expect(bad.body.error.code).toBe("INVALID_CREDENTIALS")

    const good = await agent
      .post("/auth/login")
      .set(XHR)
      .send({ email: "login@test.local", password: "rightpass99" })
    expect(good.status).toBe(200)
    expect(good.body.data.email).toBe("login@test.local")

    const me = await agent.get("/auth/me").set(XHR)
    expect(me.status).toBe(200)
  })

  it("logs out and clears session", async () => {
    await makeUser({ email: "logout@test.local", password: "rightpass99" })
    const agent = makeAgent()
    await agent
      .post("/auth/login")
      .set(XHR)
      .send({ email: "logout@test.local", password: "rightpass99" })

    const logout = await agent.post("/auth/logout").set(XHR)
    expect(logout.status).toBe(204)

    const me = await agent.get("/auth/me").set(XHR)
    expect(me.status).toBe(401)
    expect(me.body.error.code).toBe("UNAUTHENTICATED")
  })

  it("rejects requests missing X-Requested-With", async () => {
    const agent = makeAgent()
    const res = await agent
      .post("/auth/register")
      .send({ email: "no-xhr@test.local", password: "supersecret1", displayName: "X" })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe("FORBIDDEN")
  })

  it("returns validation errors with per-field messages", async () => {
    const agent = makeAgent()
    const res = await agent
      .post("/auth/register")
      .set(XHR)
      .send({ email: "not-an-email", password: "short", displayName: "" })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe("VALIDATION_FAILED")
    expect(res.body.error.fields).toBeDefined()
  })
})
```

- [ ] **Step 12: Run tests to verify they fail (routes not yet wired)**

Wait — routes are already wired in Step 7. Skip fail-first. Run and expect PASS:

```bash
pnpm --filter @kudos/api test:integration
```

Expected: all 6 tests pass. First run downloads container images (~2 min). Subsequent runs ~15s startup.

If any tests fail, fix the underlying issue (do not change test expectations to match broken code).

- [ ] **Step 13: Manual smoke test (dev)**

```bash
pnpm --filter @kudos/api dev
```

In another terminal:

```bash
# Login as seeded admin
curl -i -c /tmp/cookies -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"email":"admin@test.local","password":"adminpass123"}'

# /me with cookie
curl -i -b /tmp/cookies -H "X-Requested-With: XMLHttpRequest" http://localhost:4000/auth/me

# Logout
curl -i -b /tmp/cookies -c /tmp/cookies -X POST \
  -H "X-Requested-With: XMLHttpRequest" http://localhost:4000/auth/logout
```

Expected: login returns 200 with admin MeResponse, `/me` returns admin, logout returns 204. Stop server.

- [ ] **Step 14: Commit**

```bash
git add apps/api
git commit -m "feat(auth): add register/login/logout/me with redis-backed sessions and tests"
```

---

## Task 7: `apps/web` skeleton (Vite, providers, fetch client, layouts)

**Files:**
- Create: `apps/web/{package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, index.html, public/favicon.svg}`
- Create: `apps/web/src/{main.tsx, App.tsx}`
- Create: `apps/web/src/app/{routes.tsx, layout/{AppShell.tsx, AuthLayout.tsx}, providers/{QueryProvider.tsx, AntdProvider.tsx, SocketProvider.tsx}}`
- Create: `apps/web/src/common/{api/{client.ts, queryKeys.ts, errors.ts}, hooks/useCurrentUser.ts, store/ui.store.ts, utils/notify.ts}`
- Create: `apps/web/src/styles/theme.ts`

**Interfaces:**
- Consumes: `@kudos/shared` (types + schemas + error codes).
- Produces:
  - `pnpm --filter @kudos/web dev` starts Vite on 5173, proxies `/auth`, `/users`, `/health`, `/socket.io` to `http://localhost:4000`.
  - `apiFetch<T>(path, opts?)` — parses envelope, throws typed `ApiError`, auto-toasts notifications.
  - `queryKeys` — centralized query key factory.
  - `useCurrentUser()` — `useQuery({ queryKey: queryKeys.me, ... })`.
  - `AppShell` renders authenticated layout; `AuthLayout` renders login/register.
  - `<SocketProvider>` — connects when session is available (wired in T9).

- [ ] **Step 1: Write `apps/web/package.json`**

```json
{
  "name": "@kudos/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@ant-design/icons": "^5.5.1",
    "@kudos/shared": "workspace:*",
    "@tanstack/react-query": "^5.59.0",
    "antd": "^5.21.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "socket.io-client": "^4.8.0",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.1",
    "msw": "^2.4.9",
    "typescript": "^5.5.4",
    "vite": "^5.4.8",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Write `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*"]
}
```

Also `apps/web/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Write `apps/web/vite.config.ts`**

```ts
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:4000",
      "/users": "http://localhost:4000",
      "/health": "http://localhost:4000",
      "/socket.io": { target: "http://localhost:4000", ws: true },
    },
  },
})
```

- [ ] **Step 4: Write `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kudos</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `apps/web/public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#1677ff"/><text x="16" y="22" text-anchor="middle" font-family="system-ui" font-size="18" fill="white">K</text></svg>
```

- [ ] **Step 6: Write `apps/web/src/common/api/errors.ts`**

```ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
    this.name = "ApiError"
  }
}
```

- [ ] **Step 7: Write `apps/web/src/common/utils/notify.ts`**

```ts
import { message as antdMessage } from "antd"

import type { UserNotification } from "@kudos/shared"

export function pushNotifications(items?: UserNotification[]) {
  if (!items?.length) return
  for (const n of items) {
    antdMessage[n.type](n.message, n.duration ? n.duration / 1000 : undefined)
  }
}
```

- [ ] **Step 8: Write `apps/web/src/common/api/client.ts`**

```ts
import type { ErrorResponse, SuccessResponse } from "@kudos/shared"

import { pushNotifications } from "../utils/notify"

import { ApiError } from "./errors"

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  signal?: AbortSignal
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const { body, headers, signal, ...rest } = opts
  const isForm = body instanceof FormData
  const res = await fetch(path, {
    credentials: "include",
    signal: signal ?? AbortSignal.timeout(30_000),
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      ...(isForm ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  })

  if (res.status === 204) return undefined as T

  const raw = (await res.json().catch(() => null)) as
    | SuccessResponse<T>
    | ErrorResponse
    | null

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("session-expired"))
  }

  if (!raw) {
    throw new ApiError("INTERNAL", res.status, "Empty response body")
  }

  pushNotifications(raw.notifications)

  if ("error" in raw) {
    throw new ApiError(raw.error.code, res.status, raw.error.message, raw.error.fields)
  }
  return raw.data
}
```

- [ ] **Step 9: Write `apps/web/src/common/api/queryKeys.ts`**

```ts
export const queryKeys = {
  me: ["me"] as const,

  users: {
    all: ["users"] as const,
    byId: (id: string) => ["users", id] as const,
  },

  feed: ["feed"] as const,

  kudos: {
    all: ["kudos"] as const,
    detail: (id: string) => ["kudos", id] as const,
    reactions: (id: string) => ["kudos", id, "reactions"] as const,
    comments: (id: string) => ["kudos", id, "comments"] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    list: ["notifications", "list"] as const,
    unreadCount: ["notifications", "unreadCount"] as const,
  },

  rewards: {
    all: ["rewards"] as const,
    list: ["rewards", "list"] as const,
    detail: (id: string) => ["rewards", id] as const,
  },

  redemptions: {
    all: ["redemptions"] as const,
    mine: ["redemptions", "mine"] as const,
  },

  points: {
    balance: ["points", "balance"] as const,
    history: ["points", "history"] as const,
  },
} as const
```

- [ ] **Step 10: Write `apps/web/src/common/hooks/useCurrentUser.ts`**

```ts
import { useQuery } from "@tanstack/react-query"

import type { MeResponse } from "@kudos/shared"

import { apiFetch } from "../api/client"
import { queryKeys } from "../api/queryKeys"

export function useCurrentUser() {
  return useQuery<MeResponse | null>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await apiFetch<MeResponse>("/auth/me")
      } catch (e) {
        if (e instanceof Error && e.name === "ApiError" && (e as { status?: number }).status === 401) {
          return null
        }
        throw e
      }
    },
    staleTime: 60_000,
  })
}
```

- [ ] **Step 11: Write `apps/web/src/common/store/ui.store.ts`**

```ts
import { create } from "zustand"

type UiState = {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
}))
```

- [ ] **Step 12: Write `apps/web/src/styles/theme.ts`**

```ts
import type { ThemeConfig } from "antd"

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 6,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
}
```

- [ ] **Step 13: Write `apps/web/src/app/providers/QueryProvider.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

import { ApiError } from "../../common/api/errors"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status < 500) return false
              return failureCount < 2
            },
          },
          mutations: { retry: false },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

- [ ] **Step 14: Write `apps/web/src/app/providers/AntdProvider.tsx`**

```tsx
import { App, ConfigProvider } from "antd"
import enUS from "antd/locale/en_US"
import type { ReactNode } from "react"

import { antdTheme } from "../../styles/theme"

export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={enUS} theme={antdTheme}>
      <App>{children}</App>
    </ConfigProvider>
  )
}
```

- [ ] **Step 15: Write `apps/web/src/app/providers/SocketProvider.tsx`** (stub — Task 9 fills in)

```tsx
import { createContext, useContext, type ReactNode } from "react"
import type { Socket } from "socket.io-client"

const SocketContext = createContext<Socket | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  // Filled in Task 9.
  return <SocketContext.Provider value={null}>{children}</SocketContext.Provider>
}

export function useSocket() {
  return useContext(SocketContext)
}
```

- [ ] **Step 16: Write `apps/web/src/app/layout/AuthLayout.tsx`**

```tsx
import { Layout } from "antd"
import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <Layout style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 360, padding: 32, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <h1 style={{ marginTop: 0, marginBottom: 24 }}>Kudos</h1>
        <Outlet />
      </div>
    </Layout>
  )
}
```

- [ ] **Step 17: Write `apps/web/src/app/layout/AppShell.tsx`**

```tsx
import { Button, Layout, Space, Typography } from "antd"
import { Outlet, useNavigate } from "react-router-dom"

import { apiFetch } from "../../common/api/client"
import { useCurrentUser } from "../../common/hooks/useCurrentUser"

const { Header, Content } = Layout

export function AppShell() {
  const { data: me } = useCurrentUser()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await apiFetch("/auth/logout", { method: "POST" })
    navigate("/login", { replace: true })
    window.location.reload()
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Kudos
        </Typography.Title>
        <Space>
          {me && (
            <>
              <span>Hi, {me.displayName}</span>
              <span style={{ color: "#666" }}>
                {me.givingBudgetRemaining} to give · {me.earnedBalance} earned
              </span>
              <Button onClick={handleLogout}>Log out</Button>
            </>
          )}
        </Space>
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
```

- [ ] **Step 18: Write `apps/web/src/app/routes.tsx`** (references pages built in T8)

```tsx
import { Navigate, Route, Routes } from "react-router-dom"
import type { ReactNode } from "react"
import { Spin } from "antd"

import { useCurrentUser } from "../common/hooks/useCurrentUser"
import { LoginPage } from "../features/auth/LoginPage"
import { RegisterPage } from "../features/auth/RegisterPage"

import { AppShell } from "./layout/AppShell"
import { AuthLayout } from "./layout/AuthLayout"

function Protected({ children }: { children: ReactNode }) {
  const { data, isLoading } = useCurrentUser()
  if (isLoading) return <Spin fullscreen />
  if (!data) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AlreadyAuthed({ children }: { children: ReactNode }) {
  const { data, isLoading } = useCurrentUser()
  if (isLoading) return <Spin fullscreen />
  if (data) return <Navigate to="/" replace />
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <AlreadyAuthed>
            <AuthLayout />
          </AlreadyAuthed>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="/" element={<div>Welcome. Feed lands in Sprint 2.</div>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 19: Write `apps/web/src/App.tsx`**

```tsx
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"

import { AntdProvider } from "./app/providers/AntdProvider"
import { QueryProvider } from "./app/providers/QueryProvider"
import { SocketProvider } from "./app/providers/SocketProvider"
import { AppRoutes } from "./app/routes"

function SessionExpiryHandler() {
  const qc = useQueryClient()
  useEffect(() => {
    const handler = () => {
      qc.clear()
    }
    window.addEventListener("session-expired", handler)
    return () => window.removeEventListener("session-expired", handler)
  }, [qc])
  return null
}

export function App() {
  return (
    <QueryProvider>
      <AntdProvider>
        <BrowserRouter>
          <SessionExpiryHandler />
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </BrowserRouter>
      </AntdProvider>
    </QueryProvider>
  )
}
```

- [ ] **Step 20: Write `apps/web/src/main.tsx`**

```tsx
import React from "react"
import ReactDOM from "react-dom/client"

import { App } from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 21: Install and typecheck**

```bash
pnpm install
pnpm --filter @kudos/web typecheck
```

Expected: passes. Note: `LoginPage` and `RegisterPage` are unresolved imports — T8 creates them. For now, add temporary stubs so this typechecks:

Create `apps/web/src/features/auth/LoginPage.tsx`:

```tsx
export function LoginPage() {
  return <div>Login (built in Task 8)</div>
}
```

Create `apps/web/src/features/auth/RegisterPage.tsx`:

```tsx
export function RegisterPage() {
  return <div>Register (built in Task 8)</div>
}
```

Re-run typecheck.

- [ ] **Step 22: Start dev server, smoke test the shell**

```bash
pnpm --filter @kudos/web dev
```

Open http://localhost:5173. Expected: redirects to `/login`, shows "Login (built in Task 8)" in a centered card. No console errors.

Stop dev server.

- [ ] **Step 23: Commit**

```bash
git add apps/web
git commit -m "feat(web): add vite + react shell with routing, providers, and fetch client"
```

---

## Task 8: Auth frontend (`LoginPage`, `RegisterPage`, `useAuth`)

**Files:**
- Modify: `apps/web/src/features/auth/LoginPage.tsx` (replace stub)
- Modify: `apps/web/src/features/auth/RegisterPage.tsx` (replace stub)
- Create: `apps/web/src/features/auth/useAuth.ts`
- Create: `apps/web/src/features/auth/auth.api.ts`

**Interfaces:**
- Consumes: `apiFetch`, `queryKeys`, shared auth schemas.
- Produces:
  - `useLogin()` — mutation calling `POST /auth/login`, invalidates `queryKeys.me`.
  - `useRegister()` — mutation calling `POST /auth/register`, invalidates `queryKeys.me`.
  - `LoginPage` — form with email/password, `Link` to register, error mapping.
  - `RegisterPage` — form with email/displayName/password, `Link` to login, error mapping.

- [ ] **Step 1: Write `apps/web/src/features/auth/auth.api.ts`**

```ts
import type { LoginInput, MeResponse, RegisterInput } from "@kudos/shared"

import { apiFetch } from "../../common/api/client"

export const authApi = {
  login: (input: LoginInput) =>
    apiFetch<MeResponse>("/auth/login", { method: "POST", body: input }),

  register: (input: RegisterInput) =>
    apiFetch<MeResponse>("/auth/register", { method: "POST", body: input }),

  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
}
```

- [ ] **Step 2: Write `apps/web/src/features/auth/useAuth.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "../../common/api/queryKeys"

import { authApi } from "./auth.api"

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
```

- [ ] **Step 3: Overwrite `apps/web/src/features/auth/LoginPage.tsx`**

```tsx
import { Alert, Button, Form, Input } from "antd"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ApiError } from "../../common/api/errors"

import { useLogin } from "./useAuth"

type Values = { email: string; password: string }

export function LoginPage() {
  const [form] = Form.useForm<Values>()
  const login = useLogin()
  const navigate = useNavigate()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const onFinish = async (values: Values) => {
    setErrorMsg(null)
    try {
      await login.mutateAsync(values)
      navigate("/", { replace: true })
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "INVALID_CREDENTIALS") {
          setErrorMsg("Invalid email or password.")
        } else if (e.code === "VALIDATION_FAILED" && e.fields) {
          const fieldErrors = Object.entries(e.fields).map(([name, errors]) => ({
            name,
            errors: [errors],
          }))
          form.setFields(fieldErrors)
        } else {
          setErrorMsg(e.message)
        }
      } else {
        setErrorMsg("Something went wrong. Please try again.")
      }
    }
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Sign in</h2>
      {errorMsg && (
        <Alert
          type="error"
          message={errorMsg}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Form form={form} layout="vertical" onFinish={onFinish} disabled={login.isPending}>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email" }]}
        >
          <Input autoComplete="email" autoFocus />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, min: 1 }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={login.isPending}
        >
          Sign in
        </Button>
      </Form>
      <div style={{ marginTop: 16, textAlign: "center" }}>
        No account? <Link to="/register">Create one</Link>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Overwrite `apps/web/src/features/auth/RegisterPage.tsx`**

```tsx
import { Alert, Button, Form, Input } from "antd"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ApiError } from "../../common/api/errors"

import { useRegister } from "./useAuth"

type Values = { email: string; displayName: string; password: string }

export function RegisterPage() {
  const [form] = Form.useForm<Values>()
  const register = useRegister()
  const navigate = useNavigate()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const onFinish = async (values: Values) => {
    setErrorMsg(null)
    try {
      await register.mutateAsync(values)
      navigate("/", { replace: true })
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "EMAIL_TAKEN") {
          form.setFields([{ name: "email", errors: ["That email is already registered."] }])
        } else if (e.code === "VALIDATION_FAILED" && e.fields) {
          form.setFields(
            Object.entries(e.fields).map(([name, err]) => ({ name, errors: [err] })),
          )
        } else {
          setErrorMsg(e.message)
        }
      } else {
        setErrorMsg("Something went wrong. Please try again.")
      }
    }
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Create account</h2>
      {errorMsg && (
        <Alert type="error" message={errorMsg} showIcon style={{ marginBottom: 16 }} />
      )}
      <Form form={form} layout="vertical" onFinish={onFinish} disabled={register.isPending}>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email" }]}
        >
          <Input autoComplete="email" autoFocus />
        </Form.Item>
        <Form.Item
          name="displayName"
          label="Display name"
          rules={[{ required: true, max: 80 }]}
        >
          <Input autoComplete="name" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, min: 10, message: "At least 10 characters" }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={register.isPending}
        >
          Create account
        </Button>
      </Form>
      <div style={{ marginTop: 16, textAlign: "center" }}>
        Have an account? <Link to="/login">Sign in</Link>
      </div>
    </>
  )
}
```

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @kudos/web typecheck
```

Expected: passes.

- [ ] **Step 6: Manual smoke test**

Ensure Postgres/Redis are up (`docker compose ps`), then in two terminals:

```bash
# Terminal A
pnpm --filter @kudos/api dev
```

```bash
# Terminal B
pnpm --filter @kudos/web dev
```

Open http://localhost:5173:

1. Redirects to `/login`.
2. Log in as `admin@test.local` / `adminpass123` → lands on `/`, header shows "Hi, Admin Adminson · 200 to give · 0 earned".
3. Click "Log out" → redirects to `/login`, no user shown.
4. Go to `/register`, register `new@test.local` / `newuser` / `password12345` → lands on `/`, header shows the new user.
5. Try registering the same email again → email field shows "That email is already registered."
6. Log in with wrong password → red alert "Invalid email or password."

Stop both dev servers.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(auth): add login and register pages with error mapping"
```

---

## Task 9: Socket.io skeleton (backend + frontend, `ping` round-trip)

**Files:**
- Create: `apps/api/src/realtime/{socket-server.ts, socket-auth.ts, rooms.ts, ping.handler.ts}`
- Modify: `apps/api/src/main.ts` — attach Socket.io to HTTP server
- Modify: `apps/web/src/app/providers/SocketProvider.tsx` — real implementation
- Create: `apps/web/src/common/hooks/useSocket.ts` (accessor + typed helpers)
- Modify: `apps/web/src/app/routes.tsx` — add temporary "Ping" button on `/` for verification

**Interfaces:**
- Consumes: express session store (Redis), `SocketEvents` from `@kudos/shared`.
- Produces:
  - Backend Socket.io namespace on default `/`, authenticates via session cookie, joins `user:${userId}` and `feed` rooms on connect.
  - Emits `connection:established` on connect.
  - Handles `ping` → emits `pong` back to same socket with server timestamp.
  - Frontend `<SocketProvider>` connects when user session exists; disconnects on logout.
  - `useSocket()` returns the typed socket or null.

- [ ] **Step 1: Write `apps/api/src/realtime/rooms.ts`**

```ts
export const feedRoom = "feed"
export const userRoom = (userId: string) => `user:${userId}`
export const kudoRoom = (kudoId: string) => `kudo:${kudoId}`
```

- [ ] **Step 2: Write `apps/api/src/realtime/socket-auth.ts`**

```ts
import cookie from "cookie"
import cookieParser from "cookie-parser"
import type { Socket } from "socket.io"

import { env } from "@kudos/config"

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
```

- [ ] **Step 3: Write `apps/api/src/realtime/ping.handler.ts`**

```ts
import type { Socket } from "socket.io"

import { SocketEvents } from "@kudos/shared"

export function registerPingHandler(socket: Socket, userId: string) {
  socket.on("ping", (payload) => {
    const parsed = SocketEvents.PingEventSchema.safeParse(payload)
    if (!parsed.success) return
    socket.emit("pong", {
      clientTs: parsed.data.clientTs,
      serverTs: Date.now(),
      userId,
    })
  })
}
```

- [ ] **Step 4: Write `apps/api/src/realtime/socket-server.ts`**

```ts
import { createAdapter } from "@socket.io/redis-adapter"
import type { Server as HttpServer } from "node:http"
import { Server } from "socket.io"

import { env } from "@kudos/config"

import { logger } from "../common/logger"
import { redisPub, redisSub } from "../common/redis-client"

import { registerPingHandler } from "./ping.handler"
import { feedRoom, userRoom } from "./rooms"
import { authenticateSocket } from "./socket-auth"

export function attachSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    adapter: createAdapter(redisPub, redisSub),
  })

  io.use(async (socket, next) => {
    const auth = await authenticateSocket(socket)
    if (!auth) return next(new Error("unauthorized"))
    socket.data.userId = auth.userId
    socket.data.role = auth.role
    next()
  })

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string
    await socket.join([userRoom(userId), feedRoom])
    socket.emit("connection:established", { userId })
    registerPingHandler(socket, userId)

    logger.info({ userId, socketId: socket.id }, "socket connected")
    socket.on("disconnect", (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, "socket disconnected")
    })
  })

  return io
}
```

- [ ] **Step 5: Modify `apps/api/src/main.ts`**

Replace file contents with:

```ts
import { createServer } from "node:http"

import { env } from "@kudos/config"

import { createApp } from "./app"
import { logger } from "./common/logger"
import { attachSocketServer } from "./realtime/socket-server"

const app = createApp()
const httpServer = createServer(app)
attachSocketServer(httpServer)

httpServer.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`)
})

const shutdown = (signal: string) => {
  logger.info(`${signal} received — shutting down`)
  httpServer.close(() => {
    logger.info("HTTP server closed")
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
```

- [ ] **Step 6: Overwrite `apps/web/src/app/providers/SocketProvider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { io, type Socket } from "socket.io-client"

import { useCurrentUser } from "../../common/hooks/useCurrentUser"

const SocketContext = createContext<Socket | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: me } = useCurrentUser()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!me) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      return
    }
    const s = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
    })
    setSocket(s)
    return () => {
      s.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

export function useSocket() {
  return useContext(SocketContext)
}
```

- [ ] **Step 7: Write `apps/web/src/common/hooks/useSocket.ts`**

```ts
export { useSocket } from "../../app/providers/SocketProvider"
```

- [ ] **Step 8: Modify `apps/web/src/app/routes.tsx`**

Replace the `<div>Welcome. Feed lands in Sprint 2.</div>` with a component that lets us verify the round-trip. Add above `AppRoutes`:

```tsx
import { useEffect, useState } from "react"
import { Button, Space, Typography } from "antd"

import { useSocket } from "../common/hooks/useSocket"

function HomePlaceholder() {
  const socket = useSocket()
  const [status, setStatus] = useState<string>("connecting…")
  const [lastPong, setLastPong] = useState<string | null>(null)

  useEffect(() => {
    if (!socket) return
    const onConnect = () => setStatus("connected")
    const onDisconnect = () => setStatus("disconnected")
    const onEstablished = (payload: { userId: string }) =>
      setStatus(`connected as ${payload.userId}`)
    const onPong = (payload: { clientTs: number; serverTs: number }) =>
      setLastPong(`Round trip: ${Date.now() - payload.clientTs}ms (server ${payload.serverTs})`)

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("connection:established", onEstablished)
    socket.on("pong", onPong)

    if (socket.connected) onConnect()
    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("connection:established", onEstablished)
      socket.off("pong", onPong)
    }
  }, [socket])

  return (
    <Space direction="vertical" size="middle">
      <Typography.Title level={3}>Welcome</Typography.Title>
      <div>Socket status: <b>{status}</b></div>
      <Button
        type="primary"
        disabled={!socket}
        onClick={() => socket?.emit("ping", { clientTs: Date.now() })}
      >
        Ping server
      </Button>
      {lastPong && <div>{lastPong}</div>}
      <Typography.Text type="secondary">Feed lands in Sprint 2.</Typography.Text>
    </Space>
  )
}
```

Then replace the `path="/"` element:

```tsx
<Route path="/" element={<HomePlaceholder />} />
```

- [ ] **Step 9: Typecheck both apps**

```bash
pnpm --filter @kudos/api typecheck
pnpm --filter @kudos/web typecheck
```

Both must pass.

- [ ] **Step 10: Manual smoke test**

Ensure infra is up (`docker compose ps`). Terminals A and B:

```bash
# A
pnpm --filter @kudos/api dev
```

```bash
# B
pnpm --filter @kudos/web dev
```

Open http://localhost:5173, log in as `admin@test.local` / `adminpass123`.

Expected on `/`:
- "Socket status: **connected as <uuid>**"
- Click "Ping server" → "Round trip: 3ms (server ...)"
- API log shows: `socket connected` with userId + socketId.

Log out → socket status becomes empty (redirect to login).

- [ ] **Step 11: Commit**

```bash
git add apps/api apps/web
git commit -m "feat(realtime): add socket.io skeleton with session-cookie auth and ping round-trip"
```

---

## Task 10: CI workflow + `apps/worker` empty stub + finalize

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `apps/worker/{package.json, tsconfig.json, src/main.ts}`

**Interfaces:**
- Consumes: everything above.
- Produces: pushes trigger GH Actions running lint, typecheck, unit test, integration test, build. Failing build blocks merge.

- [ ] **Step 1: Write `apps/worker/package.json`**

```json
{
  "name": "@kudos/worker",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@kudos/config": "workspace:*",
    "@kudos/db": "workspace:*",
    "@kudos/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.7.4",
    "tsx": "^4.19.1",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: Write `apps/worker/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

And `apps/worker/tsconfig.build.json`:

```json
{ "extends": "./tsconfig.json", "include": ["src/**/*"] }
```

- [ ] **Step 3: Write `apps/worker/src/main.ts`** (stub for Sprint 1)

```ts
import { env } from "@kudos/config"

console.warn(`Worker stub — NODE_ENV=${env.NODE_ENV}. Real jobs land in Sprint 1.`)
```

- [ ] **Step 4: Install**

```bash
pnpm install
```

- [ ] **Step 5: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 3s
          --health-retries 20
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 20

    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/test?schema=public
      REDIS_URL: redis://localhost:6379
      SESSION_SECRET: ci-secret-ci-secret-ci-secret-ci-abc
      WEB_ORIGIN: http://localhost:5173
      S3_ENDPOINT: http://localhost:9000
      S3_REGION: us-east-1
      S3_BUCKET: kudos-media
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with:
          node-version: 20.11.1
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Prisma generate + migrate
        run: |
          pnpm --filter @kudos/db exec prisma generate
          pnpm --filter @kudos/db exec prisma migrate deploy

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit tests
        run: pnpm test

      - name: Integration tests
        run: pnpm --filter @kudos/api test:integration

      - name: Build
        run: pnpm build

      - name: Audit (block on high/critical)
        run: pnpm audit --prod --audit-level=high
        continue-on-error: false
```

- [ ] **Step 6: Verify everything typechecks + lints locally**

```bash
pnpm typecheck
pnpm lint
```

Both must pass. If not, fix.

- [ ] **Step 7: Verify build succeeds**

```bash
pnpm build
```

Expected: all packages/apps build to their `dist/` folder without errors.

- [ ] **Step 8: Sprint 0 acceptance check**

Spin everything up:

```bash
docker compose up -d
pnpm --filter @kudos/api dev &
pnpm --filter @kudos/web dev &
```

Verify:
- http://localhost:4000/health returns `{"data":{"status":"ok","db":"ok","redis":"ok"}}`
- http://localhost:5173 login works as `admin@test.local` / `adminpass123`
- Header shows `Hi, Admin Adminson · 200 to give · 0 earned`
- "Ping server" button returns a pong

Kill background dev servers:

```bash
kill %1 %2 2>/dev/null; wait 2>/dev/null
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore(ci): add github actions workflow, worker stub"
```

- [ ] **Step 10: (Optional) Push to remote and verify CI green**

If a remote is configured:

```bash
git push -u origin main
```

Watch the Actions tab for green. If any step fails, fix locally and push again.

---

## Sprint 0 Done Check

- [ ] Fresh clone → `pnpm install && docker compose up -d && pnpm db:deploy && pnpm db:seed && pnpm dev` brings up the whole stack
- [ ] `admin@test.local` / `adminpass123` can log in via the web UI
- [ ] `GET /health` returns 200 with all subsystems ok
- [ ] Socket.io ping round-trip works
- [ ] `pnpm test` and `pnpm --filter @kudos/api test:integration` pass locally
- [ ] `pnpm typecheck` and `pnpm lint` pass across the workspace
- [ ] CI workflow file exists (green run optional if no remote yet)
- [ ] All 12 tables from spec Section 3 exist in the DB
- [ ] Seed produces 1 admin + 5 employees + 3 rewards
