# AGENTS.md

## Purpose

This document guides AI agents and human reviewers on this repository's architecture, commands, conventions, and review standards. It is the entry point to understanding how to safely develop and review code in `manul-api`.

## Start here

This is a **single NestJS 10 + Prisma 7 / PostgreSQL backend service** (no monorepo inside this package, no frontend). All development uses **pnpm**, **Jest**, and **Prisma**. The service is the REST API for the Manul Pro pet-sitting marketplace: owners, pets, sitter profiles, sitter services, and bookings.

- **Core entry points:** `src/main.ts` (bootstrap), `src/app.module.ts` (root module), `nest-cli.json` (source root), `prisma/schema.prisma`, `prisma.config.ts`
- **API design:** NestJS controllers + services. Services call `PrismaService` directly. There is no repository layer and no CQRS.
- **Database:** One PostgreSQL database. Prisma 7 uses the `prisma-client` generator and the `@prisma/adapter-pg` driver adapter.
- **Auth:** Google OAuth 2.0 via Passport, then a JWT. Protected routes use `JwtAuthGuard`.
- **Validation:** Global `ValidationPipe` (`whitelist`, `transform`, `forbidNonWhitelisted`) plus `class-validator` DTOs.
- **Errors:** Nest HTTP exceptions for domain rule failures. `PrismaClientExceptionFilter` maps known Prisma errors to HTTP.
- **Runtime:** The API is stateless. Do not add process-local state that must be shared across requests or instances.

**Before implementing changes:** Inspect the existing feature module, `prisma/schema.prisma`, `package.json`, and nearby DTOs. Follow established patterns. Do not introduce another ORM, a repository layer, or CQRS unless explicitly requested.

## Repo map

```text
prisma/
  schema.prisma                 # Single PostgreSQL schema
  migrations/                   # Prisma Migrate history
prisma.config.ts                # Prisma 7 config; DATABASE_URL lives here

src/
  main.ts                       # Bootstrap: configureApp, then listen
  app.setup.ts                  # Helmet, ValidationPipe, CORS, Prisma filter
  app.module.ts                 # Root module
  app.controller.ts             # Public GET /

  auth/                         # Google OAuth + JWT
    decorators/                 # @CurrentUser()
    types/                      # JwtUser
    utils/                      # GoogleStrategy, JwtStrategy, guards
  users/                        # Current-user profile
  pets/                         # Owner pets
  sitters/                      # Sitter profiles and services
  bookings/                     # Booking create/list/update and status transitions
  reviews/                      # Reviews for completed bookings
  common/
    middleware/                 # HTTP request logging
    validators/                 # Custom class-validator constraints
  config/                       # ConfigModule loader (port, allowed origins)
  prisma/                       # PrismaService, global module, exception filter

generated/prisma/               # Generated client (gitignored). Do not edit.
test/                           # E2E Jest config, helpers, and tests
docker-compose.dev.yml          # Local Postgres
```

## Core repo rules

### 1. Prisma patterns

- Use **Prisma Client** for all database access.
- Never introduce TypeORM entities, repositories, decorators, or query builders.
- Access the database through the global injectable `PrismaService` in `src/prisma/prisma.service.ts`.
- Do not instantiate `PrismaClient` or `Pool` in feature services. `PrismaService` already constructs the `PrismaPg` adapter from `DATABASE_URL`.
- Keep queries in the feature service. This codebase does not use a repository layer.
- Define models, relations, indexes, and constraints in `prisma/schema.prisma`.
- Use Prisma-generated types from `generated/prisma/client`. That entry re-exports enums. `generated/prisma/enums` is also a public entry point.
- Never import from `generated/prisma/internal/`.
- Never edit generated client code.
- Use DTOs for API validation. Do not accept Prisma input types as request bodies.
- Use `select` and `include` deliberately. Avoid fetching unused relations.
- Avoid unnecessary queries and N+1 patterns.
- Use `$transaction()` when multiple writes must succeed or fail together.
- Let `PrismaClientExceptionFilter` handle `P2002` (409) and `P2025` (404). Translate other expected Prisma failures in the service when the caller needs a specific message.
- Use raw SQL only when Prisma Client cannot reasonably express the operation. Always parameterize it. Never concatenate untrusted input into SQL.

**Database schema and migrations:**

- There is one schema and one database.
- The connection URL is configured in `prisma.config.ts`, not inside the `datasource` block.
- Keep schema changes scoped to the requested feature.
- Do not change existing columns, constraints, or relationships without understanding their impact.
- Ask before creating or executing migrations.
- Inspect generated SQL before applying database changes.
- Never use `prisma db push` against a shared or production database.
- Create migrations with the existing script: `pnpm prisma:migrate` (`prisma migrate dev`).

**Prisma Client generation:**

- Regenerate with `pnpm prisma:generate` after schema changes.
- Keep the existing generator: `provider = "prisma-client"`, `output = "../generated/prisma"`.
- `generated/prisma` is gitignored. Run generate after a fresh clone or a schema pull.
- Do not introduce another ORM.

**Model constraints agents must respect:**

- A user has at most one `SitterProfile` (`userId` is unique).
- A sitter profile has at most one `SitterService` per `ServiceType` (`@@unique([sitterProfileId, type])`).
- A booking may be an open request (`sitterProfileId` and `sitterServiceId` both null) or a request aimed at one sitter. Those two ids are supplied together or not at all.
- `Booking.price` and `Pet.weightKg` are `Decimal`. Do not assume they serialize as plain numbers.
- `User` deletion is a soft delete: `UsersService.remove` sets `isActive: false` and `deletedAt`. List queries that mean "active users" filter `deletedAt: null`.

### 2. Error handling

- Throw Nest HTTP exceptions for business-rule failures (`BadRequestException`, `NotFoundException`, and similar).
- Status transitions live in `src/bookings/booking-status.transitions.ts`. Extend that map instead of scattering transition checks.
- Allowed booking flow:

```text
PENDING → sitter: ACCEPTED | DECLINED; owner: CANCELLED
ACCEPTED → sitter: CANCELLED | COMPLETED (complete only after endTime); owner: CANCELLED
DECLINED, CANCELLED, COMPLETED → terminal
```

Owner notes change only while `PENDING`. Sitter notes change only while `PENDING` or `ACCEPTED`. `PATCH /bookings/:id` accepts status and those notes only.

- `PrismaClientExceptionFilter` maps `P2025` to 404 and `P2002` to 409 with generic messages. Other known Prisma errors return a generic 500. Do not log or return the raw Prisma message.
- Do not expose SQL, credentials, stack traces, or Prisma client internals in new API error messages.
- Do not add a parallel error-code or interceptor system unless explicitly requested.

### 3. Class validation and transformation

- Put `class-validator` decorators on DTOs.
- The global pipe already whitelists, transforms, and rejects unknown properties. Do not weaken it.
- Update DTOs use `PartialType()` from `@nestjs/mapped-types` when the update is a partial create payload (`UpdatePetDto`). Add extra fields explicitly when the update is not a subset of create (`UpdateBookingDto`).
- Custom constraints belong in `src/common/validators/`.
- Validate incoming data before it reaches Prisma.
- Never rely on TypeScript types alone for runtime validation.
- Parse route ids with `ParseIntPipe`.

### 4. Module organization

- Co-locate `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.spec.ts`, and `dto/` inside the feature directory.
- Sitters are one module with two controllers: profiles on `SittersController`, services on `SitterServicesController`.
- Apply `@UseGuards(JwtAuthGuard)` at the controller class when every route is protected.
- Inject the caller with `@CurrentUser() user: JwtUser`.
- Scope owner and sitter queries by the authenticated user. Do not trust an owner id, sitter user id, or profile id from the body when it can be taken from `JwtUser`.
- `JwtUser` is `{ id: number; email: string }`, built from JWT `sub` and `email` in `JwtStrategy.validate`.
- Import shared validators from `src/common/validators/`.
- Follow existing dependency injection. `PrismaModule` is global; feature modules do not need to import it.

**Do not copy these mismatches into new code:**

- `JWT_SECRET` and the JWT module currently fall back to `'default'`, and token expiry is not configured. Do not add new secret fallbacks.

Leave that behavior alone unless the task is to change it.

Sitter booking lookups go through `sitterProfile.userId`, not `sitterProfileId`. `GET /users/:id` loads an active user by numeric id via `UsersService.findById` and does not return email or pets.

### 5. Auth

Public routes are `GET /`, `GET /auth/google`, and `GET /auth/google/redirect`. Every other controller route requires `Authorization: Bearer <jwt>`.

1. `GET /auth/google` starts the Google consent flow.
2. Google calls `GET /auth/google/redirect`.
3. `GoogleStrategy` upserts the user by `googleId` through `AuthService.validateUser`.
4. `AuthService.generateJwtToken` signs `{ sub, email }` and the controller redirects to `FRONTEND_URL/auth/callback?token=<jwt>`.
5. `JwtStrategy` maps that payload to `JwtUser`.

`PassportModule` is registered with `session: false`. Do not build new flows on `SessionSerializer` or `req.login`.

Google client settings are `CLIENT_ID`, `CLIENT_SECRET`, and `REDIRECT_URI`. Do not rename them to `GOOGLE_CLIENT_*` in code unless the task is to change the env contract.

### 6. Logging

- Use `Logger` from `@nestjs/common`.
- `LoggingMiddleware` already logs method, URL, status, size, user agent, IP, and duration for every route.
- Do not add `console.log` for request or auth debugging.
- Never log credentials, tokens, raw authorization headers, or unnecessary PII.

### 7. Imports

- `tsconfig.json` sets `baseUrl` to `./`. Cross-module imports use that root, for example `import { PrismaService } from 'src/prisma/prisma.service'`.
- There is no `paths` alias map. Do not add one unless asked.
- Import the Prisma client from `generated/prisma/client`.
- Prefer the existing import style in the file you are editing.
- Ignore `.env` and `tasks.md` in all contexts. `tasks.md` is gitignored and may contain credentials. Do not read those values into source, docs, or commits.

### 8. Date and time

- Use **Luxon** for date comparisons, ranges, and arithmetic. `DateRange` in `src/common/validators/date-range.validator.ts` is the existing constraint.
- DTOs accept ISO strings (`@IsDateString()`).
- Prisma `DateTime` writes take a JavaScript `Date`. Convert at the database boundary with `new Date(isoString)`, as `PetsService` and `BookingsService` do.
- Do not pass raw ISO strings into Prisma date fields.
- Booking create limits: `startTime` is from now through six months ahead; `endTime` is from `startTime` through seven days after `startTime`.

### 9. Naming and review hygiene

- Names should reflect the full behavior. A range check should not be named as a minimum-only check.
- Flag misleading names in review.
- Watch for dead code, unsafe casts, DTO/model mismatches, unused queries, and fields overwritten by object spreads.
- Keep refactors scoped to the requested task.
- Reuse `PrismaService`, `JwtAuthGuard`, `CurrentUser`, `PartialType`, and the validators in `src/common/` before adding new abstractions.

### 10. Multi-instance safety

Assume more than one API process can run.

- Do not store booking, auth, or availability state in process memory.
- JWT auth is stateless. Do not require server-side sessions for protected routes.
- Use database constraints and `$transaction()` for operations that must not interleave, including the one-service-per-type uniqueness rule.
- Do not add scheduled jobs that perform the same business write on every instance unless the task includes a coordination strategy.

## HTTP surface

Routes below are the current controllers. Re-read the controller before adding or changing a route.

| Area | Routes | Auth |
|---|---|---|
| App | `GET /` | Public |
| Auth | `GET /auth/google`, `GET /auth/google/redirect` | Public |
| Users | `GET /users/me`, `PATCH /users/me`, `DELETE /users/me`, `GET /users/:id` | JWT |
| Pets | `POST /pets`, `GET /pets/:id`, `PATCH /pets/:id`, `DELETE /pets/:id` | JWT |
| Sitters | `GET /sitters`, `GET/POST/PATCH/DELETE /sitters/profile` | JWT |
| Sitter services | `GET/POST /sitters/services`, `GET/PATCH/DELETE /sitters/services/:id` | JWT |
| Bookings | `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id` | JWT |
| Reviews | `POST /reviews`, `GET /reviews/user/:userId` | JWT |

## Domain enums

| Enum | Values |
|---|---|
| `BookingStatus` | `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED`, `COMPLETED` |
| `ServiceType` | `WALKING`, `DAYCARE`, `HOME_VISIT`, `OVERNIGHT` |
| `PetType` | `DOG`, `CAT`, `BIRD`, `OTHER` |
| `PetCoat` | `SHORT`, `MEDIUM`, `LONG` |
| `PetGeneralHealth` | `HEALTHY`, `NORMAL`, `NEEDS_ADDITIONAL_CARE` |
| `PetTemperament` | `PASSIVE`, `ENERGETIC`, `ASSERTIVE`, `PASSIVE_AGGRESSIVE`, `AGGRESSIVE` |
| `PetGender` | `MALE`, `FEMALE` |

## Validation quickstart

Run the checks that match the change:

```bash
pnpm lint
pnpm format
pnpm typecheck
pnpm build
pnpm test
pnpm test:cov
pnpm test:e2e
pnpm test -- <path-or-name>
```

After a schema change, run `pnpm prisma:generate`. Ask before `pnpm prisma:migrate`.

Do not invent script names. Read `package.json` before running commands.

Unit tests live next to source as `*.spec.ts`. E2E tests use `test/jest-e2e.json` and hit a real Postgres database. Build unit tests with `@nestjs/testing`. Mock `PrismaService` in unit tests. Do not hit Postgres from unit tests. Add or update tests when changing business rules such as booking transitions, ownership checks, or DTO validation.

E2E tests call `configureApp` from `src/app.setup.ts`, the same setup `main.ts` uses. They sign JWTs with `JWT_SECRET` instead of going through Google. `pnpm test:e2e` loads `.env.test` when that file exists. Otherwise it copies `DATABASE_URL` from the environment or `.env` and, when the database name does not already contain `test`, uses `<name>_test`. The suite exits before connecting if the database name does not contain `test`. Apply migrations with `pnpm test:e2e:db` or let `pnpm test:e2e` apply them during Jest global setup.

Local Postgres is `pnpm docker:up` (`docker-compose.dev.yml`), which reads `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE`.

## Environment

Read values through `ConfigService` where the surrounding code already does. `PrismaService` currently reads `process.env.DATABASE_URL` itself; do not add further direct `process.env` reads in feature code.

| Variable | Used for |
|---|---|
| `DATABASE_URL` | Prisma CLI and `PrismaService` |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Local Postgres in Docker Compose |
| `PORT` | HTTP port (`src/config/app.config.ts`, default 3000) |
| `ALLOWED_ORIGINS` | CORS origin list, comma-separated |
| `FRONTEND_URL` | OAuth success redirect (default `http://localhost:5173`) |
| `JWT_SECRET` | JWT sign and verify |
| `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI` | Google OAuth |

`.env.example` is not a complete list. Confirm a variable against the code before documenting or requiring it.

## Dependency versions

- Never state a package version from memory. Read it from the repository.
- `package.json` declares requested ranges.
- `pnpm-lock.yaml` is the source of truth for resolved versions.
- Check installed `prisma`, `@prisma/client`, and `@prisma/adapter-pg` before using version-specific APIs.
- This project uses Prisma 7 (`prisma-client` generator, driver adapters, `prisma.config.ts`). Do not apply Prisma 5 or 6 setup steps.

## Ask first before…

- **Dependencies:** Adding any package that changes the lockfile, security surface, or bundle.
- **Database:** Creating or executing migrations, editing `schema.prisma`, or changing persistent structures.
- **CI/CD:** Adding or editing workflow or deployment config.
- **Git:** Rebasing, force-pushing, or pushing to the default branch.
- **Destructive operations:** Database resets, dropped tables, deleted migration history, or other irreversible actions.
- **Architecture:** Adding a repository layer, CQRS, another ORM, sessions, or a new auth mechanism.

## AI agent workflow

1. Read this document before making changes.
2. Inspect the affected feature and copy its existing patterns.
3. Check `prisma/schema.prisma` before writing queries.
4. Reuse `PrismaService`, current DTOs, guards, and validators.
5. Keep the diff limited to the requested task.
6. Add or update tests when business logic changes.
7. Run the applicable validation commands.
8. Review the diff for unrelated edits, wrong Prisma imports, missing ownership filters, and secrets.

Do not claim that tests, builds, migrations, or other checks passed unless they were actually executed successfully.
