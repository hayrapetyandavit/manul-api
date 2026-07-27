# AGENT.md — manul-api

> **Context for AI agents working on this codebase.**  
> Read this file before touching any code. It captures architecture decisions, conventions, and gotchas so you don't have to rediscover them.

---

## Project Overview

**manul-api** is the backend REST API for the **Manul Pro** pet-sitting marketplace.  
It connects pet **owners** with **sitters** who offer services like dog walking, daycare, home visits, and overnight stays.

| Stack | Choice |
|---|---|
| Runtime | Node.js (TypeScript) |
| Framework | NestJS 10 |
| Database | PostgreSQL |
| ORM | Prisma 7 (generated client at `generated/prisma`) |
| Auth | Google OAuth 2.0 → JWT (via Passport) |
| Validation | class-validator + class-transformer |
| Package manager | pnpm |

---

## Running Locally

```bash
# 1. Start Postgres
pnpm docker:up          # spins up docker-compose.dev.yml

# 2. Install deps
pnpm install

# 3. Generate Prisma client
pnpm prisma:generate

# 4. Run migrations
pnpm prisma:migrate

# 5. Start dev server (watch mode)
pnpm start:dev          # http://localhost:3000
```

> **Environment variables**: Copy `.env.example` to `.env` and fill in the values.  
> Required vars: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `FRONTEND_URL`, `ALLOWED_ORIGINS`.

---

## Project Structure

```
src/
├── auth/           # Google OAuth + JWT strategy, guards, decorators
│   ├── decorators/ # @CurrentUser() decorator
│   ├── dto/        # Auth-related DTOs
│   ├── types/      # JwtUser payload type
│   └── utils/      # GoogleAuthGuard, JwtAuthGuard
├── bookings/       # Booking lifecycle (CRUD + status transitions)
│   └── dto/        # CreateBookingDto, UpdateBookingDto
├── common/         # Shared utilities, interceptors, filters
├── config/         # NestJS ConfigModule setup
├── pets/           # Pet management (owner's pets)
├── prisma/         # PrismaService + PrismaClientExceptionFilter
├── sitters/        # SitterProfile + SitterService management
│   └── dto/
└── users/          # User profile management
```

---

## Domain Model

```
User
 ├── has many Pets
 ├── has many ownerBookings (as owner)
 └── has one SitterProfile (optional — only if they are a sitter)
       └── has many SitterServices (one per ServiceType)
             └── referenced by Bookings

Booking
 ├── owner     → User
 ├── pet       → Pet
 ├── sitterProfile → SitterProfile? (nullable — can be an open booking)
 └── sitterService → SitterService? (nullable)
```

### Enums

| Enum | Values |
|---|---|
| `BookingStatus` | `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED`, `COMPLETED` |
| `ServiceType` | `WALKING`, `DAYCARE`, `HOME_VISIT`, `OVERNIGHT` |
| `PetType` | `DOG`, `CAT`, `BIRD`, `OTHER` |

### Key constraints (schema)
- A `SitterProfile` has **at most one** `SitterService` per `ServiceType` (`@@unique([sitterProfileId, type])`).
- A `Booking` can be created **without** a sitter (open request) or **with** a specific sitter + service.

---

## API Endpoints

All routes require a `Bearer <JWT>` header unless marked public.

### Auth
| Method | Path | Description |
|---|---|---|
| GET | `/auth/google` | Initiate Google OAuth flow (public) |
| GET | `/auth/google/redirect` | OAuth callback → redirects to `FRONTEND_URL/auth/callback?token=...` (public) |

### Sitters
| Method | Path | Description |
|---|---|---|
| GET | `/sitters` | List all sitter profiles |
| GET | `/sitters/profile` | Get current user's sitter profile |
| POST | `/sitters/profile` | Create sitter profile for current user |
| PATCH | `/sitters/profile` | Update sitter profile |
| DELETE | `/sitters/profile` | Delete sitter profile |

### Sitter Services (nested under sitters)
| Method | Path | Description |
|---|---|---|
| POST | `/sitters/services` | Add a service to sitter profile |
| PATCH | `/sitters/services/:id` | Update a specific service |
| DELETE | `/sitters/services/:id` | Delete a specific service |

### Bookings
| Method | Path | Description |
|---|---|---|
| POST | `/bookings` | Create a booking (owner) |
| GET | `/bookings` | List all bookings for current user (owner or sitter) |
| PATCH | `/bookings/:id` | Update booking (status transitions, notes) |

### Pets
> See `src/pets/` for the full pets controller.

---

## Auth Architecture

1. User hits `GET /auth/google` → redirected to Google consent screen.  
2. Google redirects to `GET /auth/google/redirect`.  
3. Passport `GoogleStrategy` upserts the user in Postgres (find-or-create by `googleId`).  
4. A **JWT** is signed and the user is redirected to `FRONTEND_URL/auth/callback?token=<jwt>`.  
5. All protected routes use `JwtAuthGuard`. The decoded payload is injected via `@CurrentUser()`.

**`JwtUser` type** (from `src/auth/types/jwt-payload.type.ts`):
```typescript
{ id: number; email: string }
```

---

## Booking Status Transitions

Transitions are validated in `src/bookings/booking-status.transitions.ts`.  
Invalid transitions throw an exception. The allowed flow is:

```
PENDING → ACCEPTED | DECLINED | CANCELLED
ACCEPTED → COMPLETED | CANCELLED
DECLINED → (terminal)
CANCELLED → (terminal)
COMPLETED → (terminal)
```

---

## Coding Conventions

- **Module structure**: Each domain folder contains `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.spec.ts`, and a `dto/` subfolder.
- **DTOs**: Use `class-validator` decorators. All incoming data is validated globally via `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- **Prisma client**: Import `PrismaService` from `src/prisma/prisma.service`. The generated types come from `generated/prisma/client`.
- **Auth guard**: Use `@UseGuards(JwtAuthGuard)` at the controller level (preferred) rather than per-route.
- **Current user**: Inject the authenticated user with `@CurrentUser() user: JwtUser`.
- **Error handling**: `PrismaClientExceptionFilter` (global) converts Prisma known errors (e.g., `P2002` unique violation, `P2025` not found) into proper HTTP responses.
- **Imports**: Use path alias `src/` (configured in `tsconfig.json`) for cross-module imports. Example: `import { JwtAuthGuard } from 'src/auth/utils/Guards'`.
- **Decimal fields**: Booking prices use `Decimal` (Prisma `@db.Decimal(10,2)`). Handle appropriately when serialising to JSON.
- **Timestamps**: Always use `new Date(isoString)` when writing datetime fields to Prisma (do not pass raw strings).

---

## Database Workflow

```bash
# Create a new migration after editing schema.prisma
pnpm prisma:migrate       # prisma migrate dev (prompts for migration name)

# Regenerate the Prisma client after schema changes
pnpm prisma:generate

# Open Prisma Studio (GUI for the DB)
pnpm prisma:studio
```

> **Generated client location**: `generated/prisma` (gitignored). Always run `prisma:generate` after pulling schema changes.

---

## Testing

```bash
pnpm test           # unit tests (Jest)
pnpm test:watch     # watch mode
pnpm test:cov       # coverage report
pnpm test:e2e       # end-to-end tests (test/jest-e2e.json)
```

- Unit test files live alongside source files as `*.spec.ts`.
- E2E tests live in `test/`.
- Inject dependencies via `@nestjs/testing` `Test.createTestingModule()`.
- Mock `PrismaService` in unit tests — do not hit the real database.

---

## Known TODOs / Planned Work

> From `tasks.md` and codebase context:

- [ ] Add **check constraints** to the database (e.g., `endTime > startTime`).
- [ ] When a booking is created **without** a `sitterId`, automatically match sitters by `serviceType`.
- [ ] Allow an owner to create an **ACCEPTED booking directly** by specifying `sitterId` + `serviceId`, and notify the sitter.
- [ ] Notification system (email / push) — no implementation yet.

---

## Security Notes

- **Helmet** is applied globally (`app.use(helmet())`).
- **CORS** is restricted to `ALLOWED_ORIGINS` env var (comma-separated list).
- **JWT secret** must be kept in `.env` and never committed.
- The `tasks.md` file accidentally contains a GitHub token — **rotate it immediately** if it hasn't been rotated yet.

---

## Useful pnpm Scripts Reference

| Script | Purpose |
|---|---|
| `pnpm start:dev` | Dev server with hot-reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm lint` | ESLint with auto-fix |
| `pnpm format` | Prettier format |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm docker:up` | Start Postgres via Docker Compose |
| `pnpm prisma:migrate` | Run DB migrations |
| `pnpm prisma:generate` | Regenerate Prisma client |
| `pnpm prisma:studio` | Open Prisma Studio GUI |
