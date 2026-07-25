# Kudos App — MVP Design

**Date:** 2026-07-25
**Status:** Approved for implementation
**Timeline:** Compressed (~2 days targeted build)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema](#3-database-schema)
4. [Code Structure](#4-code-structure)
5. [Core Flows](#5-core-flows)
6. [Realtime + NotificationService](#6-realtime--notificationservice)
7. [Errors, Concurrency, Security](#7-errors-concurrency-security)
8. [Testing Strategy](#8-testing-strategy)
9. [Build Sequencing](#9-build-sequencing)
10. [Future Improvements](#10-future-improvements)
11. [Key Decisions Log](#11-key-decisions-log)

---

## 1. Executive Summary

Internal recognition app. Employees give each other point-based kudos, react and comment on a live company feed, and redeem earned points for company-funded rewards.

**Tech stack (locked in):**

- **Monorepo:** pnpm workspaces + Turborepo
- **Backend:** Node.js + TypeScript, Express, Prisma
- **Frontend:** Vite + React + React Router + Ant Design 5 + TanStack Query + Zustand
- **Database:** PostgreSQL 16
- **Realtime & queues:** Redis 7 (Socket.io Redis adapter, BullMQ, sessions)
- **Object storage:** S3-compatible (MinIO for dev, S3/R2 for prod)
- **Testing:** Vitest + Testcontainers, MSW on frontend
- **Tooling:** ESLint flat config, Prettier, Husky + lint-staged, commitlint

**Three MVP use cases** (from the brief):

1. Peer Recognition — send 10-50 point kudos with mandatory description, core value tag, and optional media (images or videos ≤3 min).
2. Live Feed — global chronological stream with emoji reactions, comments (text + media), and real-time notifications for mentions.
3. Reward Redemption — catalog of admin-managed rewards; double-spend-safe redemption flow.

**Auth model for MVP:** email + password, two roles (`EMPLOYEE`, `ADMIN`). Extensibility hooks for SSO (Google/Microsoft) and MFA (TOTP) are baked into the schema but not implemented in MVP.

**Concurrency guarantees:** every money-adjacent write uses a three-layer defense — client idempotency key + DB unique constraint + Postgres `SELECT ... FOR UPDATE`. Points are stored in an append-only ledger (source of truth) plus cached balance columns (read speed), with an on-demand reconciliation function.

---

## 2. Architecture Overview

### 2.1 Monorepo layout

```
kudos/
├── apps/
│   ├── web/                  Vite + React + React Router + Ant Design (SPA)
│   ├── api/                  Node.js + Express + Prisma + Socket.io
│   └── worker/               BullMQ worker: video processing, reconciliation CLI, orphan cleanup
├── packages/
│   ├── shared/               Zod schemas → DTOs, Socket.io event contracts, constants, error codes
│   ├── db/                   Prisma schema + generated client (re-export)
│   └── config/               Env parsing (zod), logger factory
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── Dockerfile.worker
├── docker-compose.yml        Postgres, Redis, MinIO (dev)
├── docker-compose.prod.yml   Prod-shaped composition
├── .husky/
├── eslint.config.js          Flat config
├── .prettierrc.json
├── commitlint.config.js
├── turbo.json
└── pnpm-workspace.yaml
```

Why `packages/db` as its own package: both `apps/api` and `apps/worker` need the Prisma client. Keeping it in one package ensures a single generated client, single schema, single migration story.

### 2.2 Runtime topology

```
┌─────────────┐         HTTPS         ┌──────────────────┐
│  Browser    │ ────REST + WS ──────▶ │  apps/api        │
│  (React)    │                       │  Express+SocketIO│
└──────┬──────┘                       └────────┬─────────┘
       │                                       │
       │  presigned PUT (MPU parts)            │ SQL       ┌────────────┐
       │                                       ├──────────▶│ Postgres   │
       ▼                                       │           └────────────┘
┌─────────────┐                                │ pub/sub   ┌────────────┐
│  MinIO / S3 │◀──── worker reads ────────────▶├──────────▶│ Redis      │
└──────┬──────┘                                │           └─────┬──────┘
       │                                       │                 │ queue
       │                                       │                 ▼
       │                              ┌────────┴─────────┐  ┌────────────┐
       └──── worker uploads ─────────▶│  apps/worker     │◀─│  BullMQ    │
              thumbnail               │  BullMQ consumer │  │  jobs      │
                                      └──────────────────┘  └────────────┘
```

### 2.3 Process boundaries

| Process       | Responsibility                                                          | Why separate                                |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| `apps/api`    | HTTP + WebSocket, DB writes, session, presigned URL issuance            | Latency-sensitive, must stay responsive     |
| `apps/worker` | Video probe/thumbnail (ffmpeg), reconciliation CLI, orphan cleanup jobs | CPU-heavy; OOM in worker doesn't kill API   |
| Postgres      | Source of truth (ledger + all business data)                            | —                                           |
| Redis         | Sessions, Socket.io adapter (pub/sub), BullMQ queue                     | Multiple concerns, single infra             |
| S3 / MinIO    | Blob storage (media)                                                    | Offloads bytes from Node processes entirely |

### 2.4 Cross-cutting decisions

- **Env config:** `packages/config` exports a zod-validated `env` object; process refuses to start on missing/invalid vars.
- **Logging:** Pino JSON logger, request-scoped with correlation IDs via `AsyncLocalStorage`.
- **Errors:** typed `AppError` hierarchy in `packages/shared`; API middleware maps to HTTP + safe JSON body (no stack leaks).
- **HTTP framework:** Express (mature Socket.io integration, familiar).
- **API style:** REST + WebSocket. No GraphQL.

### 2.5 API response envelope (standardized)

**Success:**

```ts
{
  data: T,                                    // the actual payload
  notifications?: UserNotification[]          // optional user-facing messages
}
```

**Error:**

```ts
{
  error: {
    code: string,                             // machine-readable, e.g. 'INSUFFICIENT_BALANCE'
    message: string,                          // fallback human-readable
    fields?: Record<string, string>           // for validation errors
  },
  notifications?: UserNotification[]
}

type UserNotification = {
  type: 'success' | 'info' | 'warning' | 'error',
  message: string,
  duration?: number                           // ms; undefined = default
}
```

HTTP status codes still carry meaning: `200`/`201` success, `400` business rule violation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `422` validation with `fields`, `429` rate limited, `500` server error.

### 2.6 API response variants (typed projections, not GraphQL-style field picking)

**Rule:** never allow arbitrary column selection via query params. Define 1-3 DTO variants per resource (`Summary`, `Detail`, occasionally `WithX`) as zod schemas in `packages/shared`. Endpoints return one declared shape.

Use `?include=` **only for relations that require extra queries** (comments, reactions), not for scalar fields.

---

## 3. Database Schema

### 3.1 Design principles applied

- **Ledger for money-adjacent state** (points), cache columns for read speed.
- **Auth split from user profile** (`users` + `auth_identities`) so SSO/MFA are additive later.
- **Soft delete** on user-generated content only (kudos, comments) — never on ledger, sessions, or auth.
- **UUIDs everywhere** (v7 for time-ordered) — safe to expose in URLs, no enumeration.
- **`created_at`/`updated_at` on every table**, `deleted_at` on soft-deletable ones.
- **All FKs indexed.** Compound indexes on hot query paths.
- **Enums as Postgres native enums** for `CoreValue`, `TransactionType`, `NotificationType`, `RedemptionStatus`.
- **Timestamps** stored as `timestamptz` (UTC).

### 3.2 Identity & auth

**`users`** — profile + cached balances + timezone

```
id                        uuid pk (v7)
email                     citext unique not null
display_name              text not null
avatar_url                text null
role                      enum('EMPLOYEE','ADMIN') not null default 'EMPLOYEE'
timezone                  text not null default 'UTC'   -- IANA name, e.g. 'Asia/Ho_Chi_Minh'
giving_budget_remaining   int not null default 200      -- cache from ledger
earned_balance            int not null default 0        -- cache from ledger
mfa_enabled               bool not null default false   -- future
mfa_secret                text null                     -- future
created_at, updated_at, deleted_at
```

**`auth_identities`** — credentials, one row per provider per user

```
id                  uuid pk
user_id             uuid fk → users(id) on delete cascade
provider            enum('PASSWORD','GOOGLE','MICROSOFT') not null
provider_user_id    text not null       -- for PASSWORD: email; for OAuth: subject
password_hash       text null           -- only for PASSWORD provider (CHECK constraint)
created_at, updated_at

unique (provider, provider_user_id)      -- global duplicate prevention
unique (user_id, provider)               -- one PASSWORD (or Google, or Microsoft) per user
check (provider != 'PASSWORD' OR password_hash IS NOT NULL)
```

Sessions live in Redis (not a table).

### 3.3 Kudos

**`kudos`**

```
id              uuid pk
sender_id       uuid fk → users(id)
recipient_id    uuid fk → users(id)
points          int not null check (points between 10 and 50)
message         text not null check (char_length(message) > 0)
core_value      enum('TEAMWORK','OWNERSHIP','INNOVATION','CUSTOMER_FIRST','INTEGRITY') not null
idempotency_key uuid not null                          -- prevents double-submit
created_at, updated_at, deleted_at

check (sender_id <> recipient_id)                     -- no self-kudos
unique (sender_id, idempotency_key)                   -- idempotency guard
index (recipient_id, created_at desc)
index (sender_id, created_at desc)
index (created_at desc) where deleted_at is null      -- feed pagination
```

**`kudo_media`** — many media per kudo (max 5 enforced app-side via `MAX_MEDIA_PER_KUDO` constant)

```
id                  uuid pk
kudo_id             uuid fk → kudos(id) on delete cascade
media_asset_id      uuid fk → media_assets(id)
display_order       int not null
```

### 3.4 Reactions & comments

**`reactions`** — emoji reactions on kudos

```
id          uuid pk
kudo_id     uuid fk → kudos(id) on delete cascade
user_id     uuid fk → users(id)
emoji       text not null       -- unicode emoji, e.g. "🎉"
created_at

unique (kudo_id, user_id, emoji)   -- one instance of an emoji per user per kudo
index (kudo_id)
```

**`comments`**

```
id          uuid pk
kudo_id     uuid fk → kudos(id) on delete cascade
user_id     uuid fk → users(id)
body        text not null
created_at, updated_at, deleted_at

index (kudo_id, created_at asc)
```

**`comment_media`**

```
id                  uuid pk
comment_id          uuid fk → comments(id) on delete cascade
media_asset_id      uuid fk → media_assets(id)
display_order       int
```

### 3.5 Points ledger + cache invariant

**`points_transactions`** (append-only, source of truth)

```
id              uuid pk
user_id         uuid fk → users(id)             -- whose balance is changing
type            enum('GIVE','RECEIVE','MONTHLY_RESET','REDEEM','ADJUST') not null
amount          int not null                    -- signed: negative = debit, positive = credit
balance_after   int not null                    -- cached derived balance at time of tx (for audit)
kudo_id         uuid null fk → kudos(id)        -- set for GIVE/RECEIVE
redemption_id   uuid null fk → redemptions(id)  -- set for REDEEM
note            text null                       -- required for ADJUST (app-enforced)
created_at

index (user_id, created_at desc)
index (user_id, type, created_at desc)
```

**Invariant enforced by application code:** every mutation to `users.giving_budget_remaining` or `users.earned_balance` happens inside the same transaction as a `points_transactions` insert. Never one without the other. Enforced by keeping mutations in a single `PointsService.applyTransaction()` method — everything else calls that.

**`TransactionType.ADJUST`** = manual admin correction (bug refund, HR bonus, cancelled redemption refund). Requires `note`, admin-only, surfaced in audit view.

### 3.6 Rewards & redemption

**`rewards`** — admin-managed catalog

```
id              uuid pk
name            text not null
description     text not null
cost_points     int not null check (cost_points > 0)
image_url       text null
is_active       bool not null default true
stock           int null                        -- null = unlimited
created_at, updated_at
```

**`redemptions`**

```
id                  uuid pk
user_id             uuid fk → users(id)
reward_id           uuid fk → rewards(id)
cost_points         int not null                -- snapshot at time of redemption
idempotency_key     uuid not null
status              enum('PENDING','FULFILLED','CANCELLED','FAILED') default 'PENDING'
cancel_reason       text null                   -- populated when status flips to CANCELLED
created_at, updated_at, fulfilled_at

unique (user_id, idempotency_key)               -- the double-spend guard
index (user_id, created_at desc)
index (status, created_at desc)                 -- admin PENDING queue
```

### 3.7 Notifications

**`notifications`** — persisted so users see missed ones on reconnect

```
id          uuid pk
user_id     uuid fk → users(id)                 -- recipient
type        enum('MENTION','COMMENT','KUDO_RECEIVED','REDEMPTION_STATUS') not null
payload     jsonb not null                      -- shape depends on type
read_at     timestamptz null
created_at

index (user_id, created_at desc)
index (user_id, read_at) where read_at is null  -- unread badge count
```

**Reactions do NOT create notification rows** (see Section 5 rationale — noise avoidance).

Realtime delivery is **best-effort push**; the DB row is source of truth. On WS reconnect, client fetches `GET /notifications?since=<cursor>` for anything missed.

### 3.8 Media

**`media_assets`** — one row per uploaded file, referenced by kudos/comments

```
id                  uuid pk
uploaded_by         uuid fk → users(id)
storage_key         text unique not null        -- e.g. "media/{userId}/{uuid}.mp4"
mime_type           text not null
size_bytes          bigint not null
kind                enum('IMAGE','VIDEO') not null
status              enum('PENDING','READY','REJECTED') not null default 'PENDING'
rejection_reason    text null                   -- e.g. "duration > 180s"
duration_seconds    int null                    -- videos only, set by worker
thumbnail_key       text null                   -- videos only
width, height       int null
s3_upload_id        text null                   -- for Multipart Upload (videos)
s3_parts            jsonb null                  -- MPU part metadata (ETags)
created_at, updated_at

index (uploaded_by, created_at desc)
index (status) where status = 'PENDING'         -- worker queue backstop
```

Assets move `PENDING → READY` (worker validated) or `PENDING → REJECTED` (failed probe). Kudos/comments referencing a non-`READY` asset are hidden from the feed until `READY`.

### 3.9 Cross-cutting DB decisions

- **Timezone:** all timestamps `timestamptz`, stored as UTC. `users.timezone` for display formatting.
- **Company timezone:** `COMPANY_TIMEZONE` constant in `packages/shared/src/constants.ts` (e.g. `Asia/Ho_Chi_Minh`). Monthly reset window computed with `date_trunc('month', now() AT TIME ZONE COMPANY_TIMEZONE)`.
- **Policy constants** (`MONTHLY_GIVING_BUDGET = 200`, `MIN_KUDO_POINTS = 10`, `MAX_KUDO_POINTS = 50`, `MAX_VIDEO_SECONDS = 180`, `MAX_VIDEO_BYTES = 500_000_000`, `MAX_IMAGE_BYTES = 20_000_000`, `MAX_MEDIA_PER_KUDO = 5`) live in `packages/shared/src/constants.ts`. Not in DB — they're policy, and policy changes shouldn't be a migration.
- **Monthly reset:** implemented as a **query-time filter**, not a scheduled reset job. The `MONTHLY_RESET` transaction type is reserved for future explicit resets.
- **Deletion:** hard-delete for `reactions` (undo un-react). Soft-delete for `kudos`, `comments`.

### 3.10 Core values — enum for MVP, table for future

MVP uses a Postgres enum. Migration path to admin-managed table when needed is documented in Future Improvements. Straightforward: create `core_values` table, backfill from enum, add FK column, drop enum. Non-blocking to defer.

---

## 4. Code Structure

### 4.1 Guiding principles

- **Feature-based folders**, not layer-based (`users/`, `kudos/`, not `controllers/`, `services/`, `models/`). Each feature owns its slice end-to-end.
- **One responsibility per file.** When a file grows past ~200 lines it usually needs to split.
- **Shared code lives in `packages/shared`** or `packages/db` — never duplicated between `apps/web` and `apps/api`.
- **No cross-feature imports.** `kudos/` never imports from `redemptions/`. If they share types → move to `shared`. If they share logic → move to a `common/` module.

### 4.2 Backend — `apps/api`

```
apps/api/
├── src/
│   ├── main.ts                        # bootstrap: server + Socket.io + graceful shutdown
│   ├── app.ts                         # Express app factory (testable)
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── middleware/
│   │   ├── error-handler.ts           # AppError → HTTP mapping
│   │   ├── request-context.ts         # correlation ID via AsyncLocalStorage
│   │   ├── require-auth.ts            # session → req.user
│   │   ├── require-role.ts
│   │   └── validate.ts                # zod body/query/param parsing
│   │
│   ├── realtime/
│   │   ├── socket-server.ts           # Socket.io + Redis adapter
│   │   ├── socket-auth.ts             # session cookie → user, room join
│   │   ├── notification.service.ts    # DOMAIN service — the only emitter
│   │   ├── kudo-subscribe.handler.ts
│   │   └── rooms.ts
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts         # POST /register, /login, /logout, GET /me
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── auth.service.test.ts
│   │   │
│   │   ├── users/
│   │   ├── kudos/
│   │   │   ├── kudos.routes.ts
│   │   │   ├── kudos.service.ts
│   │   │   ├── kudos.queries.ts       # all Prisma calls
│   │   │   ├── kudos.schemas.ts
│   │   │   └── kudos.service.test.ts
│   │   │
│   │   ├── reactions/
│   │   ├── comments/
│   │   │
│   │   ├── points/                    # cross-cutting: ledger + cache
│   │   │   ├── points.service.ts      # applyTransaction() — sole writer
│   │   │   ├── points.reconciler.ts
│   │   │   └── points.service.test.ts
│   │   │
│   │   ├── rewards/
│   │   │   ├── rewards.admin.routes.ts
│   │   │   ├── rewards.public.routes.ts
│   │   │   ├── rewards.service.ts
│   │   │   └── rewards.queries.ts
│   │   │
│   │   ├── redemptions/
│   │   ├── media/
│   │   │   ├── media.routes.ts        # presign + MPU endpoints
│   │   │   ├── media.service.ts
│   │   │   ├── media.queries.ts
│   │   │   └── s3-client.ts
│   │   │
│   │   └── notifications/
│   │
│   ├── common/
│   │   ├── errors.ts                  # AppError, domain error classes
│   │   ├── logger.ts
│   │   ├── prisma-client.ts
│   │   └── time.ts                    # month boundary, timezone utils
│   │
│   └── cli/
│       └── reconcile-user.ts          # `pnpm reconcile:user <id>`
│
├── test/
│   ├── setup.ts                       # Testcontainers Postgres + Redis + MinIO
│   ├── fixtures/                      # makeUser, makeKudo, makeReward
│   └── helpers/                       # request client, session cookie helpers
│
└── vitest.config.ts
```

**Per-feature file conventions:**

| File                  | Owns                                                                               |
| --------------------- | ---------------------------------------------------------------------------------- |
| `foo.routes.ts`       | Express router — thin. Parses input via zod, calls service, maps to HTTP.          |
| `foo.service.ts`      | Business logic. Transactions here.                                                 |
| `foo.queries.ts`      | DB queries only. All Prisma calls in one file per feature.                         |
| `foo.schemas.ts`      | Zod request/response schemas. Re-exports types from `packages/shared` when shared. |
| `foo.service.test.ts` | Integration tests against real Postgres.                                           |

### 4.3 The "one writer" rule for points

`PointsService.applyTransaction(input, tx)` is the **only** function anywhere that writes to `points_transactions` or the balance cache columns. Every feature touching points (kudos, redemptions, admin adjustments) calls this.

```ts
export class PointsService {
  async applyTransaction(
    input: PointsTransactionInput,
    tx: Prisma.TransactionClient, // caller owns the tx; we participate
  ): Promise<PointsTransaction> {
    // 1. INSERT points_transactions row
    // 2. UPDATE users cache column atomically
    // 3. Return the created row
  }

  async reconcileUser(userId: string): Promise<ReconcileResult> {
    // Pure read — computes true balance from ledger, compares to cache
  }
}
```

Enforced by convention + code review (grep for `.pointsTransaction.create` should only appear in `points.service.ts`) + optional ESLint `no-restricted-imports` rule.

### 4.4 Frontend — `apps/web`

```
apps/web/
├── src/
│   ├── main.tsx                       # React root, ConfigProvider, QueryClient
│   ├── App.tsx                        # Routes + layout shell
│   │
│   ├── app/
│   │   ├── routes.tsx                 # React Router route tree
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   └── AuthLayout.tsx
│   │   └── providers/
│   │       ├── QueryProvider.tsx      # TanStack Query
│   │       ├── AntdProvider.tsx       # theme + locale
│   │       └── SocketProvider.tsx     # Socket.io client + auto-reconnect
│   │
│   ├── features/                      # mirrors backend feature folders
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── useAuth.ts
│   │   │   └── auth.api.ts
│   │   │
│   │   ├── kudos/
│   │   │   ├── FeedPage.tsx
│   │   │   ├── ComposeKudoModal.tsx
│   │   │   ├── KudoCard.tsx
│   │   │   ├── KudoDetailPage.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useInfiniteFeed.ts
│   │   │   │   ├── useSendKudo.ts
│   │   │   │   ├── useLiveFeed.ts
│   │   │   │   └── useKudoRoom.ts
│   │   │   ├── models/
│   │   │   │   └── kudo.viewmodel.ts    # FE-only: hasReactedByMe, isOwnKudo
│   │   │   ├── types/
│   │   │   │   └── kudo.local.ts        # FE-only enums/unions
│   │   │   └── kudos.api.ts
│   │   │
│   │   ├── reactions/
│   │   ├── comments/
│   │   ├── rewards/
│   │   │   ├── CatalogPage.tsx
│   │   │   ├── RewardCard.tsx
│   │   │   ├── RedeemConfirmModal.tsx
│   │   │   ├── admin/
│   │   │   │   ├── AdminRewardsPage.tsx
│   │   │   │   └── RewardFormModal.tsx
│   │   │   └── rewards.api.ts
│   │   │
│   │   ├── redemptions/
│   │   ├── media/
│   │   │   ├── MediaUploader.tsx        # AntD Upload wrapper, MPU + IndexedDB
│   │   │   └── media.api.ts
│   │   │
│   │   └── notifications/
│   │       ├── NotificationBell.tsx
│   │       ├── hooks/
│   │       │   ├── useUnreadCount.ts
│   │       │   ├── useNotifications.ts
│   │       │   ├── useMarkRead.ts
│   │       │   └── useLiveNotifications.ts
│   │       └── notifications.api.ts
│   │
│   ├── common/
│   │   ├── api/
│   │   │   ├── client.ts                # fetch wrapper with credentials + envelope handling
│   │   │   ├── queryKeys.ts             # centralized query key factory
│   │   │   └── errors.ts                # ApiError class
│   │   ├── components/
│   │   │   ├── UserAvatar.tsx
│   │   │   ├── PointsBadge.tsx
│   │   │   ├── CoreValueTag.tsx
│   │   │   └── RequireRole.tsx
│   │   ├── hooks/
│   │   │   ├── useCurrentUser.ts
│   │   │   ├── useIntersectionObserver.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── useCopyToClipboard.ts
│   │   │   └── useMediaUpload.ts        # presigned URL + MPU + progress
│   │   ├── store/                       # Zustand slices
│   │   │   └── ui.store.ts              # sidebar collapse, theme mode, etc.
│   │   └── utils/
│   │       ├── formatDate.ts            # uses user.timezone
│   │       └── notify.ts                # consistent toast helper
│   │
│   └── styles/
│       └── theme.ts                     # AntD ConfigProvider theme tokens
│
├── public/
├── index.html
└── vite.config.ts
```

**Frontend conventions:**

| File                    | Owns                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `*.api.ts`              | Fetch calls. All network I/O for a feature. Returns typed data via shared zod schemas. |
| `hooks/use*.ts`         | TanStack Query hooks. Components never call `.api.ts` directly.                        |
| `models/*.viewmodel.ts` | Type extensions specific to FE (e.g., `hasReactedByMe`).                               |
| `types/*.local.ts`      | FE-only enums/unions not on the wire.                                                  |
| `*Page.tsx`             | Top-level route component.                                                             |
| `admin/` subfolder      | Admin-only components wrapped in `<RequireRole role="ADMIN">`.                         |

### 4.5 State management

| Kind of state                             | Tool                                                  |
| ----------------------------------------- | ----------------------------------------------------- |
| Server data (from API)                    | **TanStack Query** — 95% of app state                 |
| Global UI state (sidebar collapse, theme) | **Zustand** — one small store                         |
| Local component state                     | `useState` / `useReducer`                             |
| Session (`me`)                            | TanStack Query with key `['me']` — `useCurrentUser()` |

No Redux. Reasoning: TanStack Query handles all server state including infinite queries, optimistic updates, cache invalidation. Zustand covers the small amount of global UI state. Redux adds boilerplate without capability gain for this app.

### 4.6 HTTP client

Thin wrapper around **native `fetch`**. No axios (past CVEs, bundle weight, xhr baggage). ~30 lines handling:

- Auto-inclusion of credentials for session cookies
- Auto-parsing of the response envelope
- Auto-throwing typed `ApiError`
- Auto-pushing `notifications[]` to toast queue
- Timeout via `AbortSignal.timeout(30_000)`

### 4.7 Query key factory

Single source of truth in `apps/web/src/common/api/queryKeys.ts`:

```ts
export const queryKeys = {
  me: ["me"] as const,

  users: {
    all: ["users"] as const,
    byId: (id: string) => ["users", id] as const,
  },

  feed: ["feed"] as const, // single global feed, no filters, infinite scroll

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

**Naming rule:** plural for resource collections (`users`, `kudos`, `rewards`), singular for named views/instances/domain namespaces (`me`, `feed`, `auth`, `points`).

### 4.8 Cache invalidation matrix

| Mutation                   | Invalidates                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Send kudo                  | `feed`, `points.balance`, `points.history`, `me`                                         |
| React to kudo              | `kudos.reactions(kudoId)` (optimistic first)                                             |
| Comment on kudo            | `kudos.comments(kudoId)`, `kudos.detail(kudoId)`                                         |
| Redeem reward              | `points.balance`, `points.history`, `redemptions.mine`, `rewards.detail(rewardId)`, `me` |
| Admin create/update reward | `rewards.all`                                                                            |
| Mark notification read     | `notifications.unreadCount` + optimistic on `notifications.list`                         |
| Mark all read              | `notifications.all`                                                                      |
| Update profile             | `me`                                                                                     |

**Socket events → invalidation:**

| Event                         | Invalidates                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `kudo:created`                | `feed`                                                             |
| `kudo:reaction:added/removed` | `kudos.reactions(kudoId)`                                          |
| `kudo:comment:added`          | `kudos.comments(kudoId)`, `kudos.detail(kudoId)`                   |
| `notification:new`            | `notifications.list`, `notifications.unreadCount` + optional toast |
| `media:status`                | `["media", mediaId]`                                               |

**Reset on session change:** `queryClient.clear()` + `socket.disconnect()` on logout/session expiry. Prevents cross-user data leakage.

### 4.9 Refetch policies

```ts
const queryClient = new QueryClient({
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
})
```

Per-query overrides: `me` (60s staleTime), `feed` (0s), `points.balance` (10s), `rewards.list` (5min).

### 4.10 `packages/shared` — the contract layer

```
packages/shared/src/
├── index.ts
├── constants.ts                   # MONTHLY_GIVING_BUDGET, COMPANY_TIMEZONE, etc.
├── api-envelope.ts                # SuccessResponse<T>, ErrorResponse
├── errors.ts                      # ErrorCode enum
├── kudos/                         # KudoSummary, KudoDetail, SendKudoInput
├── reactions/
├── comments/
├── rewards/
├── redemptions/
├── notifications/
├── auth/
├── users/
├── media/
└── socket/
    └── events.ts                  # Socket.io event names + payload schemas
```

**Rule:** anything that crosses the wire lives here. Never a BE-only or FE-only concept.

### 4.11 `packages/db`

```
packages/db/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                    # dev data: admin, sample users, sample rewards
├── src/
│   └── index.ts                   # export { PrismaClient, Prisma }
└── package.json
```

Both `apps/api` and `apps/worker` depend on `packages/db`. Migrations run via `pnpm --filter @kudos/db migrate:deploy`.

### 4.12 Tooling configuration

| Tool              | Choice                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| ESLint            | Flat config (`eslint.config.js`)                                                                       |
| ESLint preset     | `@typescript-eslint/recommended-type-checked` + `eslint-plugin-react-hooks` + `eslint-config-prettier` |
| Import ordering   | `eslint-plugin-import` (`import/order` grouped, `import/no-cycle`, `import/no-unused-modules`)         |
| Commit convention | commitlint with allowed types: `feat, fix, refactor, chore, doc`                                       |
| Line width        | 80 (Prettier default)                                                                                  |
| Semicolons        | **No** — `"semi": false`                                                                               |
| Quotes            | **Double** — `"singleQuote": false`                                                                    |

Prettier config:

```json
{
  "semi": false,
  "singleQuote": false,
  "trailingComma": "all",
  "arrowParens": "always"
}
```

Husky:

- `pre-commit` → `lint-staged` (prettier + eslint --fix on staged files, type-check on changed package)
- `commit-msg` → commitlint

---

## 5. Core Flows

### 5.1 Login → session → WebSocket handshake

- Client posts credentials → server verifies via `auth_identities` + bcrypt → issues session in Redis with TTL → sets HttpOnly Secure SameSite=Lax cookie
- WS handshake reuses the same cookie: `io.use()` middleware reads cookie, hits Redis for session, resolves to user, joins `user:${id}` and `feed` rooms
- Logout: `DEL sess:xxx` in Redis + clear cookie + `socket.disconnect()`

**Session TTL:** 7 days sliding (extended on each authed request via `EXPIRE`).

**CSRF:** `SameSite=Lax` blocks cross-site form POSTs. All state-changing endpoints additionally require `X-Requested-With: XMLHttpRequest` header. Fetch wrapper always sends it. No token-based CSRF needed.

### 5.2 Send kudo (with optional media)

**Phase A — Upload media (before submit).** For each file, independently:

1. Client: `POST /media/mpu/init` (video) or `POST /media/presign` (image ≤20MB) with `{ mime, size, kind }`. Server validates size + mime cap, inserts `media_assets` row with `status='PENDING'`, returns `{ mediaId, uploadUrl, s3UploadId? }`.
2. For MPU (videos): client chunks file, requests presigned PUT per part via `POST /media/mpu/presign-part`, uploads chunks in parallel, tracks `{uploadId, part N, ETag}` in IndexedDB.
3. For single-part (images): browser PUTs bytes direct to S3 with presigned URL.
4. Client: `POST /media/mpu/complete` (video) or `POST /media/:id/complete` (image). Server verifies object in S3, for videos enqueues `probe-media` BullMQ job.
5. Worker (async): ffprobe duration/dimensions/codec → if video >180s or mime mismatch → `status='REJECTED'`; else ffmpeg thumbnail → `status='READY'` + updates dimensions, duration, `thumbnail_key`.
6. Client polls `GET /media/:id` OR receives `media:status` socket event on completion.

Compose form Submit is disabled while any attached media is `PENDING`.

**Resumability:** IndexedDB stores in-progress MPU state (uploadId + completed parts + File blob). On page refresh, client detects in-progress upload, resumes from next part. Compose form itself is persisted via localStorage (recipient, message, points, coreValue, attachedMediaIds — the IDs, not the File objects).

**Orphan cleanup:** nightly job deletes `media_assets` where `status='PENDING' AND created_at < now() - interval '24h'`. S3 lifecycle rule auto-aborts incomplete MPUs after 7 days.

**Phase B — Submit the kudo:**

```
BEGIN TX
  1. Idempotency check: SELECT kudos WHERE sender=me AND idempotency_key=?
     IF FOUND → COMMIT, return existing (200)
  2. SELECT giving_budget_remaining FROM users WHERE id=me FOR UPDATE
  3. Recompute month-to-date given from ledger (defense against cache drift):
     SUM(-amount) FROM points_transactions WHERE user=me
       AND type='GIVE'
       AND created_at >= date_trunc('month', now() AT TIME ZONE COMPANY_TZ)
  4. IF (MONTHLY_GIVING_BUDGET - month_given) < points: ROLLBACK, throw INSUFFICIENT_BUDGET
  5. Verify all media IDs are READY and uploaded_by=me. Fail if mismatch.
  6. INSERT kudos + kudo_media rows
  7. PointsService.applyTransaction(GIVE -points, sender, tx)
     PointsService.applyTransaction(RECEIVE +points, recipient, tx)
  8. INSERT notifications for recipient (KUDO_RECEIVED) + each @mention (MENTION)
COMMIT

POST-COMMIT (never inside tx):
  NotificationService.broadcastNewKudo(kudo) → emit to `feed` room
  NotificationService.emit persisted notifications to recipient + mentions
```

**Notifications persist BEFORE broadcast.** If broadcast fires before commit and tx rolls back, users see kudos that don't exist. Persist first, emit second.

### 5.3 Redeem a reward

```
BEGIN TX
  1. Idempotency check: SELECT redemptions WHERE user=me AND idempotency_key=?
     IF FOUND → COMMIT, return existing (200)
  2. SELECT earned_balance FROM users WHERE id=me FOR UPDATE
  3. SELECT cost_points, stock, is_active FROM rewards WHERE id=? FOR UPDATE
  4. Guards: is_active, balance >= cost, stock IS NULL OR stock > 0
     Any fail → ROLLBACK + 400 (with typed error code)
  5. INSERT redemption (status='PENDING', cost_points snapshot, idempotency_key)
     Race caught by unique(user_id, idempotency_key) if concurrent request sneaks in
  6. PointsService.applyTransaction(REDEEM -cost, me, tx)
  7. IF stock NOT NULL: UPDATE rewards SET stock = stock - 1 WHERE id=?
COMMIT (releases both locks)
```

**Lock ordering** is fixed (`users` before `rewards`) → no deadlocks across concurrent redemptions.

Client generates `idempotencyKey` when the confirmation modal opens; discards on close; re-uses on retry. Refresh generates a new key (new intent).

**Admin fulfillment:** `PATCH /admin/redemptions/:id/status` with `FULFILLED` or `CANCELLED { reason }`. On cancel: `PointsService.applyTransaction(ADJUST +cost, note='Refund for cancelled redemption #X')` inside the same tx. `NotificationService.notifyRedemptionStatus` fires post-commit.

### 5.4 React to a kudo (optimistic)

- Client optimistically updates cache immediately
- `POST /kudos/:id/reactions { emoji }` → `INSERT reactions ... ON CONFLICT DO NOTHING` (unique on `(kudo, user, emoji)` — toggle handled via `DELETE`)
- Server emits `kudo:reaction:added` to `kudo:${id}` room
- No notification rows created (see Section 6.4 rationale)

### 5.5 Notifications routing (when B sends kudos to A)

**Persistent (row + bell/toast):**

- **A** → `KUDO_RECEIVED` (always)
- **B** → nothing (already got success toast)
- **@mentions in message** → `MENTION` per mentioned user

**Broadcast (no rows, cache invalidation only):**

- Everyone in `feed` room → `kudo:created` (~200 bytes, IDs only)
- A specifically → `notification:new`
- Each @mention → `notification:new`

If B kudos A AND @mentions A, A gets both notifications for MVP. Dedup deferred (see Future Improvements).

### 5.6 Cross-cutting patterns

1. **Idempotency key + row lock** together protect every points mutation.
2. **`PointsService.applyTransaction` is the single ledger writer.**
3. **Notifications persist BEFORE realtime emit.** DB is source of truth.
4. **Transactions commit BEFORE broadcasts.** Never broadcast state that could roll back.
5. **Media handled entirely outside the compose transaction.** Compose tx just references validated `media_assets.id`s.
6. **Cache drift is healed passively.** Month-to-date ledger recomputation in send-kudo tx means the answer is right even if cache lies.

---

## 6. Realtime + NotificationService

### 6.1 Socket.io topology

- Single default namespace, `@socket.io/redis-adapter` for cross-pod fanout
- Session-cookie handshake auth (no separate WS token)
- CORS locked to app origin

**Rooms:**

| Room             | Who joins                                                               | Purpose                                          |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| `user:${userId}` | The user, on every device (joined at handshake)                         | Targeted delivery (notifications)                |
| `feed`           | Everyone authenticated (joined at handshake)                            | Broadcast (`kudo:created`)                       |
| `kudo:${kudoId}` | Anyone viewing that kudo's detail page (on-demand via `kudo:subscribe`) | Fine-grained updates (new reaction, new comment) |

### 6.2 Event contracts

Defined once in `packages/shared/src/socket/events.ts` as zod schemas + typed event map. Client-side handlers are typed against this map — no drift.

**Server → client:**

- `kudo:created` (to `feed` room)
- `kudo:reaction:added`, `kudo:reaction:removed`, `kudo:comment:added` (to `kudo:${id}` room)
- `notification:new` (to `user:${id}` room)
- `media:status` (to uploader's `user:${id}` room)

**Client → server (few):**

- `kudo:subscribe { kudoId }` — join kudo detail room on page mount
- `kudo:unsubscribe { kudoId }` — leave on unmount

### 6.3 `NotificationService`

The **only** class that talks to Socket.io. Application code never calls `io.emit` directly (enforced by ESLint `no-restricted-imports`).

Two shapes:

- **Persist + emit** (`notifyMention`, `notifyKudoReceived`, `notifyRedemptionStatus`) — accepts a `tx?` for persistence inside caller's transaction, then emits post-commit
- **Broadcast only** (`broadcastNewKudo`, `broadcastReaction`, `broadcastCommentAdded`, `emitMediaStatus`) — no persistence

**Rule (commit-first pattern):** persist notifications inside the caller's tx; emit only after the caller commits. Enforced by splitting service methods into `persist` (in-tx) and `emit` (post-tx) pairs.

The pathological "crashed between commit and emit" case is acceptable at MVP maturity — the DB row exists, so on next page load / socket reconnect the fresh fetch surfaces it. Transactional outbox pattern deferred (see Future Improvements).

### 6.4 Reactions notification decision

**Reactions do NOT create notification rows.** Rationale:

- Highest-volume interaction type — 20-50 reactions per popular kudo → notification table explosion
- Bell noise — users would learn to ignore, hiding real notifications
- Notification center clutter

Alternative (deferred): aggregated view ("5 people reacted to your kudo") computed on-read from `reactions` table.

### 6.5 Client integration

`SocketProvider` connects on user session available. `useRealtimeSync` hook mounted in `AppShell` maps each socket event to at most 1-2 TanStack Query invalidations. `useKudoRoom(kudoId)` auto-subscribes on kudo detail mount.

### 6.6 Reconnect + missed-message recovery

Three overlapping mechanisms:

1. On `socket.on('connect', ...)` reconnect: invalidate `feed` + `notifications.all`
2. Bell badge 60-second poll safety net
3. TanStack Query `refetchOnReconnect` + `refetchOnWindowFocus`

Missed messages don't stay missed more than a minute.

### 6.7 Rate limiting realtime writes

Token bucket per socket for client-initiated events (`kudo:subscribe`, `kudo:unsubscribe`). 20-token capacity, refill 5/sec. Rejects with `RATE_LIMITED` ack.

---

## 7. Errors, Concurrency, Security

### 7.1 Error handling

**`AppError` hierarchy** in `apps/api/src/common/errors.ts`. Error codes exported from `packages/shared/src/errors.ts` for FE typing.

Central Express error middleware maps `AppError` → typed envelope response, `ZodError` → 422 with field map, everything else → 500 with safe message (logs full detail + request ID).

**Rule:** never leak internal error messages, stack traces, or DB constraint text to clients.

**Client-side:** fetch wrapper throws typed `ApiError` on non-2xx. Component-level handling branches on `error.code` for special UX (e.g., highlight points input on `INSUFFICIENT_BUDGET`). Otherwise, toasts are auto-fired from the envelope's `notifications` field.

**401 handling:** fetch wrapper on 401 → global `session-expired` event → root effect clears TanStack cache + disconnects socket + navigates to login with flash message.

### 7.2 Concurrency & double-spend defense

**Three-layer defense on every money-adjacent write:**

| Layer                                                         | Guards against                                          |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| **Client idempotency key** (uuid, per-intent, in React state) | Network retries, double-clicks in one tab               |
| **Unique DB constraint** on `(user_id, idempotency_key)`      | Race between concurrent processes with same key         |
| **`SELECT ... FOR UPDATE`** on the row being decremented      | Multi-device concurrent intents (2 tabs, phone+desktop) |

**Additional invariants:**

- Ledger recomputation inside the tx makes the check authoritative even if cache drifted
- Fixed lock ordering (`users` → `rewards`) prevents deadlocks
- `PointsService.applyTransaction` is single writer for cache + ledger

**Write path summary:**

| Write         | Locked rows                            | Idempotency key                     | Ledger entries |
| ------------- | -------------------------------------- | ----------------------------------- | -------------- |
| Send kudo     | sender's `users` row                   | Yes (`kudos.idempotency_key`)       | GIVE + RECEIVE |
| Redeem reward | receiver's `users` row + `rewards` row | Yes (`redemptions.idempotency_key`) | REDEEM         |
| Admin adjust  | target user's `users` row              | No (low frequency, low collision)   | ADJUST         |

### 7.3 Authentication & sessions

- **Passwords:** bcrypt cost 12. Min length 10. No composition rules (per NIST 800-63B).
- **Session cookie:** `HttpOnly`, `Secure` (prod), `SameSite=Lax`, TTL 7 days sliding.
- **Session storage:** Redis `sess:${sessionId}` → JSON `{ userId, role, createdAt }`. Rotate session ID on privilege change.
- **Login rate limit:** 5 attempts per IP per 15min + 5 per account per 15min. Generic "invalid credentials" error.
- **Password reset:** OUT of MVP scope. Admin CLI reset script only.

### 7.4 Authorization

- Middleware `requireAuth` on all routes except `/auth/*` and `/health`
- Middleware `requireRole('ADMIN')` on `/admin/**`
- **Resource-level checks in services**, not middleware (e.g., "does this user own this comment?")
- Return **404** (not 403) for authorized-but-not-yours resources — don't leak existence

### 7.5 CSRF, CORS, CSP

- **CSRF:** `SameSite=Lax` + required `X-Requested-With: XMLHttpRequest` header on all state-changing endpoints
- **CORS:** exact origin allowlist, `credentials: true`, no wildcards. Dev: `http://localhost:5173`
- **CSP:** strict — `script-src 'self'`, `default-src 'self'`, `img-src`/`media-src` for the S3 bucket, `connect-src` for API + WS, `frame-ancestors 'none'`. `style-src 'self' 'unsafe-inline'` (required by AntD css-in-js)

### 7.6 Input validation & injection

- Every request body/query/param is parsed by a zod schema before the handler runs
- Zod parse failures → 422 with per-field messages
- Handlers never touch `req.body` directly
- **SQL:** Prisma parameterizes all queries. Any `$queryRaw` uses tagged-template form (`${var}`). Never `$queryRawUnsafe`.
- **XSS:** React auto-escapes. No `dangerouslySetInnerHTML` (enforced by ESLint). Kudo messages are plain text (no markdown in MVP). @mention parsing uses strict regex, resolved to user IDs; rendered as React component, never injected HTML.

### 7.7 Media security

- **Mime enforcement:** presigned URL issued with declared mime; S3 rejects mismatches
- **Server verification:** worker's ffprobe detects actual codec, rejects mismatches (client can lie)
- **Size caps:** enforced server-side on presign (500MB video, 20MB image) + S3 `Content-Length-Range` on presigned URL
- **Duration cap** (180s) enforced by worker
- **Bucket privacy:** private bucket. Presigned GET URLs (5-min TTL) for viewing. Never public.
- **Path per user:** `media/${uploaderId}/${uuid}` — defense-in-depth against bucket-listing misconfiguration
- **Orphan cleanup:** nightly job + S3 lifecycle rule

### 7.8 Rate limiting (write endpoints)

Redis-backed via `rate-limiter-flexible`:

| Endpoint                                     | Limit                        |
| -------------------------------------------- | ---------------------------- |
| `POST /auth/login`                           | 5 / 15min per IP + per email |
| `POST /auth/register`                        | 3 / hour per IP              |
| `POST /kudos`                                | 30 / hour per user           |
| `POST /redemptions`                          | 10 / hour per user           |
| `POST /media/*/presign`, `POST /media/mpu/*` | 100 / hour per user          |
| `POST /kudos/:id/reactions`                  | 60 / minute per user         |

429 responses include `Retry-After` header + toast: "Please wait a moment before trying again."

### 7.9 Secrets & config

- All secrets in env vars, never committed
- `.env.example` with dummy values
- `packages/config/env.ts` zod-parses on boot; missing/invalid = process refuses to start

### 7.10 Logging & PII

- Pino JSON logs with correlation IDs
- Redaction rules for `password`, `passwordHash`, `Authorization`, `Cookie`, `sessionId`
- Request bodies logged only at debug level, through redactor
- User IDs logged (support); emails NOT in normal path
- Error stacks captured for 500s, never sent to client

### 7.11 Observability (MVP subset)

- Structured Pino JSON logs
- `GET /health` returns 200 with DB + Redis connectivity check
- Reconciliation CLI (Section 4.3) — primary "did the money math right" tool
- Metrics, tracing, Sentry-style aggregation deferred (see Future Improvements)

---

## 8. Testing Strategy

### 8.1 Test types

**Unit (Vitest, no infra):** pure functions in `packages/shared/*`, time/timezone helpers, error classes, viewmodel transforms, React components with mocked hooks via React Testing Library. Whole unit suite <5s. No Prisma, no Redis, no mocking of your own services.

**Integration (Vitest + Testcontainers):** services and routes that touch real infra. `test/setup.ts` spins up Postgres + Redis + MinIO per suite (~15s startup); `beforeEach` truncates all tables for clean state. Covers `points.service`, `kudos.service`, `redemptions.service`, `auth.service`, `media.service`, and route-level supertest suites.

**E2E (Playwright):** deferred for MVP.

### 8.2 Concurrency tests (first-class, not optional)

Every money mutation service has explicit race tests. Pattern:

```ts
it("prevents double-spend when 2 concurrent requests race", async () => {
  const user = await makeUser({ earnedBalance: 200 })
  const reward = await makeReward({ costPoints: 150, stock: null })

  const results = await Promise.allSettled([
    redemptions.redeem({
      userId: user.id,
      rewardId: reward.id,
      idempotencyKey: uuidv7(),
    }),
    redemptions.redeem({
      userId: user.id,
      rewardId: reward.id,
      idempotencyKey: uuidv7(),
    }),
  ])

  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1)

  const finalUser = await db.user.findUnique({ where: { id: user.id } })
  expect(finalUser?.earnedBalance).toBe(50)

  // Critical assertion — reconciliation confirms no drift
  const drift = await points.reconcileUser(user.id)
  expect(drift).toEqual({ givingDrift: 0, earnedDrift: 0 })
})
```

**Every money-mutation test ends with `reconcileUser === 0 drift`.** Catches "test passed but ledger and cache silently disagreed."

Scenarios covered:

- Double-spend (concurrent requests different keys)
- Idempotency replay (same key returns same result)
- Last-in-stock race (2 users, 1 hoodie)
- Monthly budget bust (2 concurrent kudos exceeding remaining budget)

### 8.3 Test fixtures

Colocated factories in `test/fixtures/`: `makeUser`, `makeKudo`, `makeReward`, etc. Deterministic IDs (no Faker), return real DB rows, composable.

### 8.4 Frontend tests

- Vitest + React Testing Library + jsdom
- API mocked via **MSW** (Mock Service Worker) — not by mocking `apiFetch`. Exercises the fetch wrapper + zod parsing + error handling.
- Socket mocked via `mock-socket`
- Fresh `QueryClient` per test (`retry: false`, `gcTime: 0`)
- Coverage: compose kudo form (validation, submit, error, media attach, draft persistence), feed page (initial load, infinite scroll, socket-triggered refresh), redemption confirm modal (idempotency, disable-during-submit, error mapping)

### 8.5 CI

`.github/workflows/ci.yml`: lint + typecheck + unit + integration + build. Security audit (`pnpm audit --prod --audit-level=high`) blocks on high/critical.

### 8.6 Coverage targets

- Overall floor: 70%
- Money paths (`points.service`, `redemptions.service`, `kudos.service`): 90%+ line + branch
- `NotificationService`: 80%
- UI: 60% for pages, higher for hooks

Coverage is a signal, not a goal. A test suite at 100% coverage that never asserts business rules is worse than 60% coverage with explicit "kudo cannot bust budget" tests.

---

## 9. Build Sequencing

Approach: **Foundation-first, then vertical slices per use case.** Each sprint ends in a demo-able state.

### Sprint 0 — Foundation

**Goal:** everything scaffolded, schema complete, auth works, one page deployable.

- Monorepo scaffold (pnpm + Turborepo, apps + packages, ESLint flat, Prettier, Husky, commitlint)
- Docker Compose (Postgres 16, Redis 7, MinIO)
- Prisma schema — **ALL** entities from Section 3 (users, auth_identities, kudos, kudo_media, reactions, comments, comment_media, points_transactions, rewards, redemptions, notifications, media_assets)
- Initial migration + seed script (1 admin, 5 users, 3 rewards)
- Auth end-to-end (register/login/logout/`/me`) with Redis-backed sessions
- Login + register pages in `apps/web`
- `packages/shared` foundations (api-envelope, errors, constants)
- `packages/config/env.ts` zod-validated
- Pino logger factory + request-id middleware
- Socket.io skeleton (Redis adapter, cookie handshake, `SocketProvider` connects and joins rooms, one trivial round-trip)
- CI (lint, typecheck, unit, integration, build) + branch protection
- Deploy target chosen + "hello world" running against real Postgres/Redis somewhere

**Done when:** new dev clones repo, `pnpm install && pnpm dev` brings everything up, migrations apply, seed runs, login as `admin@test.local` succeeds, `/me` returns admin. Deploy verified against staging. CI green.

### Sprint 1 — Peer Recognition

**Goal:** users can send kudos with media. Points correctly debited/credited. Reconciliation function exists and used in tests.

- `PointsService` with `applyTransaction(input, tx)` — sole ledger + cache writer
- `points.reconciler.ts` with `reconcileUser(userId)` pure function
- CLI: `pnpm reconcile:user <id>`
- `POST /kudos` with idempotency check, row-locked budget check, ledger recomputation, media validation, kudo insert, two `applyTransaction` calls, notification row inserts (KUDO_RECEIVED + MENTIONs)
- `GET /users/me` returns balance/budget for header display
- Integration tests: happy path, insufficient budget, self-kudo rejection, media not ready, concurrency
- Media pipeline — MPU flow: `POST /media/mpu/init`, `/mpu/presign-part`, `/mpu/complete`, `/mpu/abort` + single-part `/media/presign`, `/media/:id/complete`
- Client: IndexedDB persistence, chunk splitting, resume-on-mount, progress
- Worker: BullMQ `probe-media` consumer (ffprobe, thumbnail, status transition)
- Nightly orphan cleanup scaffolded
- S3 lifecycle rule documented
- Compose kudo modal (recipient picker, points, message, core value, media uploader)
- Draft persistence via localStorage (form + attachedMediaIds)
- `beforeunload` warning during upload
- Temporary "My received" / "My sent" pages

**Done when:** Alice sends Bob a 30-pt kudo with a 90s video. Video uploads via MPU (survives refresh). Bob's `earnedBalance` increases. Reconciliation returns 0 drift. Concurrency tests pass.

### Sprint 2 — Live Feed

**Goal:** real-time global feed with reactions, comments, notifications.

- `GET /kudos` cursor-paginated, latest→oldest, excludes soft-deleted and non-READY media
- `GET /kudos/:id`, `GET /kudos/:id/comments`, `GET /kudos/:id/reactions`
- `POST /kudos/:id/reactions` (INSERT ON CONFLICT DO NOTHING) + DELETE for toggle
- `POST /kudos/:id/comments` (with optional mediaIds), PATCH edit, DELETE soft
- `NotificationService` fully wired (persist+emit + broadcast methods)
- Retrofit `POST /kudos` from Sprint 1 to emit `kudo:created` + persisted notifications
- Retrofit media worker to `emitMediaStatus` on job finish
- `GET /notifications`, `/notifications/unread-count`, PATCH read + read-all
- Frontend feed: `FeedPage` with `useInfiniteFeed` + intersection observer, `KudoCard`, `KudoDetailPage` with `useKudoRoom`, `ReactionRow` with optimistic add/remove, `CommentForm`
- `useRealtimeSync` mounted in `AppShell` — socket event → query invalidation
- `NotificationBell` component, `useUnreadCount` with 60s poll, toast on `notification:new` for MENTION/KUDO_RECEIVED/REDEMPTION_STATUS

**Done when:** Alice sends kudo. Charlie viewing feed sees it appear <1s. Bob gets toast + bell. Charlie reacts 🎉. Alice viewing detail sees reaction. Bob comments. Alice sees comment count + bell notification. Offline user sees missed notifications on reopen.

### Sprint 3 — Reward Redemption

**Goal:** users browse and redeem rewards. Admin manages catalog and fulfills.

- Admin catalog: `POST/PATCH/DELETE /admin/rewards`, `GET /admin/rewards` (including inactive), `requireRole('ADMIN')` guard
- Public catalog: `GET /rewards` (active only), `GET /rewards/:id`
- `POST /redemptions` — full Section 5.3 flow (idempotency, dual FOR UPDATE, guards, insert, applyTransaction, stock decrement)
- `GET /redemptions/me`
- Admin fulfillment: `GET /admin/redemptions?status=PENDING`, `PATCH /admin/redemptions/:id/status` (FULFILLED or CANCELLED with reason + refund via ADJUST)
- On status change: `notifyRedemptionStatus`
- Frontend: `CatalogPage`, `RedeemConfirmModal` (idempotencyKey on open, disable after click), `MyRedemptionsPage`, `AdminRewardsPage`, `AdminRedemptionsPage`, `RequireRole` gate
- Toasts: "Your Company Hoodie has been shipped! 🎉" / "Sorry, your Friday Off request was cancelled: {reason}. Points refunded."

**Done when:** Alice redeems, admin fulfills, Alice notified. Admin cancels, balance restored, ADJUST visible in ledger. Two users concurrently redeem last-in-stock — one wins, one gets REWARD_OUT_OF_STOCK. Reconciliation returns 0 drift.

### Sprint-level dependency graph

```
Sprint 0 ──▶ Sprint 1 ──▶ Sprint 2 ──▶ Sprint 3
   │            │            │            │
   ▼            ▼            ▼            ▼
schema      kudos      feed + WS    redemption
auth        media MPU  notifications admin
CI          reconcile  live sync    fulfillment
deploy      points
```

Nothing in Sprint N breaks Sprint N-1. Each sprint ends demo-able.

---

## 10. Future Improvements

Not in MVP. Prioritized later based on real user feedback.

### Business-facing

1. **Reward stock periodic reset** — HR-managed monthly/yearly replenishment. Start with manual admin restock UI; add auto-reset schedule via `rewards.initial_stock`, `stock_reset_cadence` if load justifies.
2. **Earned points annual expiration** — fiscal-year use-it-or-lose-it. Requires HR/finance stakeholder input first. Implementation: add `expires_at` to `RECEIVE` ledger rows, new `EXPIRE` transaction type, scheduled expiration job with user warning notifications ("500 pts expire in 30 days"). Grandfathered via nullable column.
3. **Reactions aggregation notification** — "N people reacted to your kudo" computed on-read from `reactions` table. No new rows.
4. **Notification dedup** — suppress `MENTION` when a `KUDO_RECEIVED` is already firing for the same user + kudo.

### Auth / security

5. **Self-serve password reset via email** — SMTP integration, token-based reset flow.
6. **SSO providers (Google, Microsoft)** — hook already in `auth_identities`. Add OAuth2 flow.
7. **MFA (TOTP)** — hook already in `users` (`mfa_enabled`, `mfa_secret`). Add TOTP setup + verification UI.

### Reliability / ops

8. **Transactional outbox pattern** for guaranteed notification delivery (handles the rare "crash between commit and emit" case).
9. **Reconciliation cron + alerting** behind feature flag — scheduled BullMQ job + Slack/PagerDuty on drift detection. Function ships in MVP; scheduler deferred.
10. **Metrics + tracing** — Prometheus + OpenTelemetry.
11. **Sentry-style error aggregation.**

### Quality / testing

12. **E2E test suite** — Playwright, one smoke test → expand.
13. **Load / performance testing.**
14. **Formal accessibility audit.**

### Product

15. **Per-team feeds** — team scoping if global feed becomes noisy at scale. `feed:team:${teamId}` room.
16. **Trending / algorithmic feed sort.**
17. **Follow-only feed.**
18. **Reward availability windows** (seasonal, `available_from`/`available_until`).
19. **Reward per-user redemption caps** (`max_per_user_per_period`).
20. **Redemption fulfillment deadlines.**
21. **Configurable monthly giving budget via settings table.**
22. **Multi-region timezone support** — per-user month boundaries instead of company-wide.
23. **Core values → admin-managed table** — migration path documented in Section 3.10.
24. **Rich reward types** (repeatedly-usable balances like "café credits").
25. **Auto-fulfillment for digital rewards** (`rewards.fulfillment_type` enum with SMTP integration).

---

## 11. Key Decisions Log

| Decision                    | Chosen                                                                         | Rationale                                      |
| --------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| Auth model                  | Email + password, 2 roles                                                      | MVP; SSO/MFA hooks in schema                   |
| Media storage               | S3-compatible + presigned URLs                                                 | Server never touches bytes, no OOM             |
| Video upload                | S3 Multipart Upload + IndexedDB resume                                         | User explicitly opted in vs simpler single-PUT |
| Realtime                    | Socket.io + Redis adapter                                                      | Rooms, reconnect, matches stack requirement    |
| Realtime service pattern    | Domain `NotificationService`, not transport adapter                            | Clarity + testability without over-abstraction |
| Monorepo                    | pnpm workspaces + Turborepo                                                    | Industry default 2026                          |
| ORM                         | Prisma + Postgres                                                              | User preference; DX + typed schema             |
| Frontend                    | Vite + React + React Router + AntD 5                                           | Internal app, no SSR need                      |
| API style                   | REST + WS with typed variants (Summary/Detail)                                 | Type safety over GraphQL-style field picking   |
| ORM query file naming       | `.queries.ts`                                                                  | Reads naturally                                |
| Session                     | Redis-backed                                                                   | Shared with Socket.io handshake                |
| Points model                | Ledger (source of truth) + cached columns                                      | Auditability + fast reads                      |
| Reconciliation              | Function in MVP, scheduler deferred                                            | Observability without ops cost                 |
| State management (FE)       | TanStack Query + Zustand, no Redux                                             | Right size for this app                        |
| HTTP client                 | Native fetch wrapper                                                           | No axios (bundle, past CVEs)                   |
| Testing                     | Vitest + Testcontainers + MSW                                                  | Real integration for money paths               |
| Concurrency defense         | Idempotency key + unique constraint + FOR UPDATE                               | Three-layer defense                            |
| Reactions notifications     | None persisted                                                                 | Volume + noise                                 |
| Feed                        | Single global chronological, no filters                                        | Matches use case; no scope creep               |
| Notifications persist-first | Yes, then broadcast post-commit                                                | Correctness over convenience                   |
| Admin fulfillment           | Manual (2 endpoints, 1 admin page)                                             | Real-world action; automation is post-MVP      |
| Response format             | Standard envelope with `data`/`error`/`notifications`                          | Consistent toast handling                      |
| Timestamps                  | UTC in DB, display per `users.timezone`, monthly window per `COMPANY_TIMEZONE` | Simple for MVP                                 |
| Core values                 | Postgres enum in MVP, table for future                                         | Type safety now, admin editing later           |
| Compose form persistence    | localStorage                                                                   | UX win for tiny cost                           |
