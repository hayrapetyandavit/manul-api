# manul-api

Backend REST API for the **Manul Pro** pet-sitting marketplace — connecting pet owners with sitters for walking, daycare, home visits, and overnight stays.

## Tech Stack

- **NestJS** + TypeScript
- **PostgreSQL** + Prisma ORM
- **Google OAuth 2.0** → JWT authentication
- **Docker** (local Postgres)

## Getting Started

```bash
# 1. Start Postgres
pnpm docker:up

# 2. Install dependencies
pnpm install

# 3. Apply migrations & generate Prisma client
pnpm prisma:migrate
pnpm prisma:generate

# 4. Start dev server
pnpm start:dev   # → http://localhost:3000
```

Copy `.env.example` to `.env` and fill in your values before running.

## End-to-end tests

`pnpm test:e2e` boots the real Nest application (helmet, validation, and the Prisma exception filter) and talks to PostgreSQL through supertest. It refuses to run unless the database name contains `test`.

With local Docker Postgres already defined in `.env`, the suite derives a `<name>_test` database from `DATABASE_URL`. To pin the settings yourself, copy `.env.test.example` to `.env.test`. Google OAuth is not exercised past the redirect to Google; protected routes use JWTs signed with `JWT_SECRET`.

```bash
pnpm docker:up
pnpm test:e2e
```

## API Overview

All routes except `/auth/*` require a `Bearer <JWT>` token.

| Resource | Endpoints |
|---|---|
| Auth | `GET /auth/google`, `GET /auth/google/redirect` |
| Sitters | `GET /sitters`, `GET/POST/PATCH/DELETE /sitters/profile` |
| Sitter Services | `POST/PATCH/DELETE /sitters/services` |
| Bookings | `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id` |
| Pets | `GET/POST/PATCH/DELETE /pets` |
| Reviews | `POST /reviews`, `GET /reviews/user/:userId` |

## Auth Flow

1. Redirect the user to `GET /auth/google`
2. After Google consent, the API issues a JWT and redirects to `FRONTEND_URL/auth/callback?token=<jwt>`
3. Include the token in all subsequent requests as `Authorization: Bearer <token>`

## Scripts

| Command | Purpose |
|---|---|
| `pnpm start:dev` | Dev server with hot-reload |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | End-to-end tests against a database whose name contains `test` |
| `pnpm test:e2e:db` | Create that database (if needed) and apply migrations |
| `pnpm lint` | Lint & auto-fix |
| `pnpm typecheck` | Type-check without building |
| `pnpm prisma:studio` | Open Prisma Studio (DB GUI) |
| `pnpm docker:up` | Start local Postgres |
