# Kudos - Employee Recognition & Rewards Platform

A full-stack web application for peer recognition with quantifiable rewards, real-time notifications, and redemption system.

## 1. Setup Instructions

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker for dev & test)

### Quick Start

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd kudos
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env
   # For testing
   cp .env.example .env.test
   # For database migrations (optional - inherits from .env)
   cp packages/db/.env.example packages/db/.env
   ```

4. **Start Docker containers**

   ```bash
   docker-compose up -d postgres postgres-test redis redis-test
   ```

5. **Run migrations**

   ```bash
   pnpm --filter @kudos/db exec prisma migrate deploy
   ```

6. **Seed database (optional)**

   ```bash
   pnpm --filter @kudos/db exec prisma db seed
   ```

7. **Start development servers**
   ```bash
   # Terminal 1: Backend API (runs on port 4000)
   pnpm --filter @kudos/api dev

   # Terminal 2: Frontend (runs on port 5173)
   pnpm --filter @kudos/web dev
   ```

### Run Tests

```bash
# All tests
pnpm test

# Specific test file
pnpm test --filter @kudos/api src/features/rewards/redemptions.routes.test.ts

# Watch mode
pnpm test --watch
```

### Stop Docker containers

```bash
docker-compose down
```

---

## 2. Architectural Choices

### Technology Stack

**Frontend: React 18 + TypeScript + Vite**

- Fast HMR with Vite for rapid development
- React Query for server state management and caching
- Ant Design for consistent UI components
- Tailwind CSS v4 for utility-first styling
- Socket.io client for real-time notifications

**Backend: Express + TypeScript + Node.js**

- Lightweight HTTP server with strong type safety
- Socket.io for WebSocket real-time communication
- Redis adapter for Socket.io to support horizontal scaling

**Database: PostgreSQL + Prisma ORM**

- **Why PostgreSQL**: Transactional integrity critical for points deduction, redemption, and ledger tracking. ACID guarantees prevent "double spending."
- **Why Prisma**: Type-safe ORM with automatic migrations, excellent dev experience, and strong TypeScript support.
- **Serializable Isolation**: Redemption transactions use `SERIALIZABLE` isolation level to handle concurrent redemption attempts safely.
- **Pessimistic Locking**: `SELECT ... FOR UPDATE` locks user rows during transaction, preventing race conditions.

**State Management & Caching**

- **React Query**: Client-side data fetching, caching, and synchronization. 30s stale time reduces API calls while maintaining freshness.
- **Redis**: Session storage, idempotency key tracking (5-min TTL), and Socket.io adapter for pub/sub across servers.

**Real-time Architecture**

- **Socket.io with Redis Adapter**: When a kudo is given or redemption status changes, events broadcast to specific user rooms via Redis pub/sub.
- **Why not polling**: Polling would generate 200+ requests/sec at scale. Socket.io reduces to event-driven updates only when state changes.

**Idempotency & Safety**

- **Server-issued Idempotency Keys**: Backend generates UUIDs stored in Redis (5-min TTL). Client must use issued keys for redemption. Prevents manual API abuse and double-spending.
- **Composite Unique Constraint**: `(userId, idempotencyKey)` ensures redemption is created exactly once, even if request retries occur.

**Race Condition Handling (Redemption)**

1. Lock user row: `SELECT ... FOR UPDATE`
2. Check user balance and reward availability
3. Deduct points atomically
4. Create PointsTransaction record
5. Update reward stock (if limited)
6. Release lock on commit

This prevents: insufficient funds errors, overselling limited rewards, and negative balances.

---

## 3. Environment Variables

### Create `.env` file for development:

```bash
# Server
NODE_ENV=development
PORT=4000
API_ORIGIN=http://localhost:4000
WEB_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://kudos:kudos@localhost:5432/kudos?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Session
SESSION_SECRET=your-secret-key-here-min-32-chars
```

### Create `.env.test` file for testing:

```bash
# Testing database (separate instance, port 5433)
# Testing Redis (separate instance, port 6380)
NODE_ENV=test
PORT=4000
WEB_ORIGIN=http://localhost:5173
API_ORIGIN=http://localhost:4000
DATABASE_URL=postgresql://test:test@localhost:5433/test?schema=public
REDIS_URL=redis://localhost:6380
SESSION_SECRET=test-secret-test-secret-test-secret
```

---
