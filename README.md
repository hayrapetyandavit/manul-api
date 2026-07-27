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

## API Overview

All routes except `/auth/*` require a `Bearer <JWT>` token.

| Resource | Endpoints |
|---|---|
| Auth | `GET /auth/google`, `GET /auth/google/redirect` |
| Sitters | `GET /sitters`, `GET/POST/PATCH/DELETE /sitters/profile` |
| Sitter Services | `POST/PATCH/DELETE /sitters/services` |
| Bookings | `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id` |
| Pets | `GET/POST/PATCH/DELETE /pets` |

## Auth Flow

1. Redirect the user to `GET /auth/google`
2. After Google consent, the API issues a JWT and redirects to `FRONTEND_URL/auth/callback?token=<jwt>`
3. Include the token in all subsequent requests as `Authorization: Bearer <token>`

## Scripts

| Command | Purpose |
|---|---|
| `pnpm start:dev` | Dev server with hot-reload |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | End-to-end tests |
| `pnpm lint` | Lint & auto-fix |
| `pnpm typecheck` | Type-check without building |
| `pnpm prisma:studio` | Open Prisma Studio (DB GUI) |
| `pnpm docker:up` | Start local Postgres |
