# Post-It

A full-stack social media application built with React and Express, featuring a Facebook-inspired experience with posts, comments, likes, follows, and real-time user interactions. Designed with security-first principles including JWT-based authentication, CSRF protection, tiered rate limiting, and browser fingerprinting.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication & Security](#authentication--security)
- [Rate Limiting](#rate-limiting)
- [Code Quality](#code-quality)
- [Environment Variables](#environment-variables)
- [Scripts Reference](#scripts-reference)
- [Database Migrations](#database-migrations)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

### Core Social Features

- **User Profiles** — Registration, login, profile customization (bio, picture, cover photo, city, marital status)
- **Posts** — Create, read, update, and delete posts with optional image uploads
- **Comments** — Threaded comment system with nested replies (parent/child hierarchy)
- **Likes** — Toggle likes on posts with debounced UI updates
- **Follows** — Follow/unfollow users with follower/following counts
- **Feed** — Personalized home feed showing posts from followed users
- **Image Uploads** — Profile pictures, cover photos, and post images with MIME-type validation

### Security Features

- **Dual-Token JWT Authentication** — Access + Refresh token architecture with HttpOnly cookies
- **CSRF Protection** — Double-submit cookie pattern with constant-time comparison
- **Browser Fingerprinting** — Session binding via hashed fingerprints embedded in tokens
- **Token Rotation** — Automatic refresh token rotation on each renewal
- **Tiered Rate Limiting** — Redis-backed, per-route rate limits (global, auth, refresh, content)
- **Content Security Policy** — Environment-aware Helmet CSP directives
- **Scheduled Token Cleanup** — Cron-based revocation of expired refresh tokens

---

## Tech Stack

### Server

| Technology             | Version      | Purpose                              |
| ---------------------- | ------------ | ------------------------------------ |
| **Node.js**            | 20+          | Runtime                              |
| **Express**            | 4.x          | HTTP framework                       |
| **TypeScript**         | 5.x (strict) | Type safety                          |
| **PostgreSQL**         | 15+          | Primary database                     |
| **Redis**              | 7+           | Rate limit counters, session caching |
| **pg**                 | 8.x          | PostgreSQL driver (raw SQL, no ORM)  |
| **jsonwebtoken**       | 9.x          | JWT access/refresh tokens            |
| **bcryptjs**           | 3.x          | Password hashing (salt + pepper)     |
| **Helmet**             | 7.x          | HTTP security headers                |
| **express-rate-limit** | 8.x          | Rate limiting                        |
| **rate-limit-redis**   | 4.x          | Redis store for rate limits          |
| **Multer**             | 1.4.x        | File upload handling                 |
| **express-validator**  | 7.x          | Request validation                   |
| **db-migrate**         | 0.11.x       | Database migration management        |
| **ioredis**            | 5.x          | Redis client                         |
| **morgan**             | 1.x          | HTTP request logging                 |
| **node-cron**          | 3.x          | Scheduled tasks                      |
| **tsx**                | 4.x          | TypeScript execution (dev)           |

### Client

| Technology          | Version | Purpose                       |
| ------------------- | ------- | ----------------------------- |
| **React**           | 18.x    | UI framework                  |
| **TypeScript**      | 5.x     | Type safety                   |
| **Zustand**         | 5.x     | State management              |
| **React Router**    | 6.x     | Client-side routing           |
| **Axios**           | 1.x     | HTTP client with interceptors |
| **React Hook Form** | 7.x     | Form state management         |
| **Bootstrap**       | 5.x     | UI component library          |
| **MUI**             | 5.x     | Material UI components        |
| **React Icons**     | 4.x     | Icon library                  |
| **Immer**           | 10.x    | Immutable state updates       |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Client (React)                   │
│                                                      │
│  Pages ──▶ Components ──▶ Hooks ──▶ Services ──▶ API │
│                               │                      │
│                          Stores (Zustand)            │
└────────────────────────┬─────────────────────────────┘
                         │ HTTPS (Axios + Interceptors)
                         ▼
┌──────────────────────────────────────────────────────┐
│                   Server (Express)                   │
│                                                      │
│  Routes ──▶ Rate Limiters ──▶ Auth Middleware        │
│  ──▶ Validators ──▶ Controllers ──▶ Models           │
│                                          │           │
│                                   ┌──────┴──────┐    │
│                                   │  PostgreSQL │    │
│                                   │    (pg)     │    │
│                                   └─────────────┘    │
│                                   ┌─────────────┐    │
│                                   │    Redis    │    │
│                                   │  (ioredis)  │    │
│                                   └─────────────┘    │
└──────────────────────────────────────────────────────┘
```

### Design Principles

- **Raw SQL** — All database operations use `pg` (node-postgres) directly. No ORMs.
- **Layered Architecture** — Routes → Middleware → Controllers → Models → Database
- **Transaction Safety** — Multi-table writes use `BEGIN`/`COMMIT`/`ROLLBACK` with `connection.release()` in `finally`
- **Fail-Open Rate Limiting** — If Redis is unavailable, rate limiters degrade gracefully instead of blocking all traffic
- **Cookie-First Auth** — Tokens stored in HttpOnly cookies with prefix conventions (`__Host-` in production, plain in development)

---

## Project Structure

```
post-it/
├── AGENTS.md                    # Development guidelines and code conventions
├── README.md                    # This file
├── docs/                        # Feature specifications and upgrade plans
│   └── spec-kit-database-upgrade/
│       ├── README.md            # Constitution and execution order
│       ├── spec-001 → spec-009  # Database upgrade specifications
│       └── templates/           # Model, controller, and type templates
│
├── server/
│   ├── database.json            # db-migrate configuration
│   ├── migrations/              # Database migration files
│   │   └── sqls/                # Raw SQL migration scripts (up/down)
│   ├── public/images/           # Uploaded image storage
│   ├── src/
│   │   ├── index.ts             # Express app entry point
│   │   ├── configs/             # Environment configuration
│   │   ├── controllers/         # Route handlers (auth, posts, comments, likes, follows, users)
│   │   ├── database/            # PostgreSQL pool and Redis client
│   │   ├── interfaces/          # TypeScript interfaces
│   │   ├── middlewares/         # Auth, rate limiting, validation, error handling
│   │   ├── models/              # Database query layer (raw SQL)
│   │   ├── routes/              # Express route definitions
│   │   │   └── apis/            # Versioned API routes
│   │   ├── types/               # TypeScript type definitions
│   │   └── utilities/           # Shared helpers (tokens, responses, cron tasks)
│   ├── package.json
│   └── tsconfig.json
│
├── client/
│   ├── src/
│   │   ├── App.tsx              # Root component with routing
│   │   ├── api/                 # Axios instance, interceptors, error classes
│   │   ├── components/          # UI components (auth, post, comment, feed, ...)
│   │   ├── configs/             # Client configuration
│   │   ├── hooks/               # Custom hooks (useSecureApi, useDebouncedLike, ...)
│   │   ├── pages/               # Page components (home, login, register, profile)
│   │   ├── services/            # Auth service, storage, token sync
│   │   ├── stores/              # Zustand stores (auth, post)
│   │   ├── types/               # Client-side type definitions
│   │   └── utils/               # Utility functions
│   ├── package.json
│   └── tsconfig.json
│
└── specs/                       # Legacy specification files
```

---

## Prerequisites

| Dependency     | Version | Installation                                           |
| -------------- | ------- | ------------------------------------------------------ |
| **Node.js**    | ≥ 20.x  | [nodejs.org](https://nodejs.org/)                      |
| **pnpm**       | ≥ 8.x   | `npm install -g pnpm`                                  |
| **PostgreSQL** | ≥ 15    | [postgresql.org](https://www.postgresql.org/download/) |
| **Redis**      | ≥ 7     | [redis.io](https://redis.io/download)                  |

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ahmad-elshowair/post-it.git
cd post-it
```

### 2. Install Dependencies

```bash
# Server
cd server && pnpm install

# Client
cd ../client && pnpm install
```

### 3. Configure Environment Variables

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your database credentials and secrets

# Client
cp client/.env.example client/.env
# Edit client/.env with your API URL
```

See the full [Environment Variables](#environment-variables) reference below.

### 4. Set Up the Database

```bash
# Create the PostgreSQL database
createdb post_it

# Run all migrations
cd server && pnpm run migrate:up
```

### 5. Start Redis

```bash
redis-server
```

### 6. Start Development Servers

```bash
# Terminal 1 — Server (http://localhost:5000)
cd server && pnpm run dev

# Terminal 2 — Client (http://localhost:3000)
cd client && pnpm run dev
```

---

## Database Schema

```
┌────────────────┐       ┌────────────────┐       ┌────────────────┐
│     users      │       │     posts      │       │    comments    │
├────────────────┤       ├────────────────┤       ├────────────────┤
│ user_id    PK  │◀──┐   │ post_id    PK  │◀──┐   │ comment_id PK  │
│ user_name      │   │   │ user_id    FK  │───┘   │ post_id    FK  │───┐
│ first_name     │   │   │ description    │       │ user_id    FK  │───┤
│ last_name      │   │   │ image          │       │ content        │   │
│ email          │   │   │ number_of_likes│       │ parent_id  FK  │───┘ (self-ref)
│ password       │   │   │ number_of_comm │       │ created_at     │
│ picture        │   │   │ created_at     │       │ updated_at     │
│ cover          │   │   │ updated_at     │       └────────────────┘
│ is_admin       │   │   └────────────────┘
│ bio            │   │
│ city           │   │   ┌────────────────┐       ┌──────────────────┐
│ home_town      │   │   │     likes      │       │  refresh_tokens  │
│ marital_status │   │   ├────────────────┤       ├──────────────────┤
│ followers_cnt  │   │   │ like_id    PK  │       │ token_id     PK  │
│ followings_cnt │   │   │ user_id    FK  │───┐   │ user_id      FK  │───┐
│ is_online      │   │   │ post_id    FK  │───┤   │ fingerprint_hash │   │
│ created_at     │   │   │ created_at     │   │   │ expires_at       │   │
│ updated_at     │   │   └────────────────┘   │   │ is_revoked       │   │
└────────────────┘   │                        │   │ revoked_at       │   │
         ▲           │   ┌────────────────┐   │   │ created_at       │   │
         │           │   │    follows     │   │   └──────────────────┘   │
         │           │   ├────────────────┤   │                          │
         │           └───│ following  FK  │   │                          │
         │               │ followed   FK  │───┘                          │
         └───────────────│ created_on     │◀─────────────────────────────┘
                         └────────────────┘
```

### Migrations

| #   | Migration                       | Tables                                                     |
| --- | ------------------------------- | ---------------------------------------------------------- |
| 1   | `20240902133431-init`           | `users`, `posts`, `follows`, `likes`                       |
| 2   | `20250309105041-refresh-tokens` | `refresh_tokens` (with indexes)                            |
| 3   | `20250430113309-comments`       | `comments` (with threaded replies via `parent_comment_id`) |

---

## API Reference

All endpoints are prefixed with `/api`.

### Authentication (`/api/auth`)

| Method | Endpoint                 | Description                    | Rate Limit     |
| ------ | ------------------------ | ------------------------------ | -------------- |
| `POST` | `/auth/register`         | Register a new user            | 5 req / 15 min |
| `POST` | `/auth/login`            | Login with email & password    | 5 req / 15 min |
| `POST` | `/auth/logout`           | Logout (revoke refresh token)  | Global         |
| `POST` | `/auth/refresh-token`    | Rotate access + refresh tokens | 30 req / 1 min |
| `GET`  | `/auth/is-authenticated` | Verify current session         | Global         |

### Users (`/api/users`)

| Method   | Endpoint                   | Description          | Auth |
| -------- | -------------------------- | -------------------- | ---- |
| `GET`    | `/users/:id`               | Get user by ID       | ✅   |
| `GET`    | `/users/profile/:username` | Get user by username | ✅   |
| `PUT`    | `/users/:id`               | Update user profile  | ✅   |
| `DELETE` | `/users/:id`               | Delete user account  | ✅   |

### Posts (`/api/posts`)

| Method   | Endpoint              | Description           | Auth |
| -------- | --------------------- | --------------------- | ---- |
| `POST`   | `/posts`              | Create a new post     | ✅   |
| `GET`    | `/posts/feed`         | Get personalized feed | ✅   |
| `GET`    | `/posts/:id`          | Get a single post     | ✅   |
| `GET`    | `/posts/user/:userId` | Get posts by user     | ✅   |
| `PUT`    | `/posts/:id`          | Update a post         | ✅   |
| `DELETE` | `/posts/:id`          | Delete a post         | ✅   |
| `POST`   | `/posts/:id/like`     | Toggle like on a post | ✅   |

### Comments (`/api/comments`)

| Method   | Endpoint                 | Description                 | Auth |
| -------- | ------------------------ | --------------------------- | ---- |
| `POST`   | `/comments`              | Create a comment (or reply) | ✅   |
| `GET`    | `/comments/post/:postId` | Get comments for a post     | ✅   |
| `PUT`    | `/comments/:id`          | Update a comment            | ✅   |
| `DELETE` | `/comments/:id`          | Delete a comment            | ✅   |

### Follows (`/api/follows`)

| Method   | Endpoint                     | Description               | Auth |
| -------- | ---------------------------- | ------------------------- | ---- |
| `POST`   | `/follows/:userId`           | Follow a user             | ✅   |
| `DELETE` | `/follows/:userId`           | Unfollow a user           | ✅   |
| `GET`    | `/follows/followers/:userId` | Get user's followers      | ✅   |
| `GET`    | `/follows/following/:userId` | Get user's following list | ✅   |

### Uploads (`/api/upload`)

| Method | Endpoint          | Description                                      | Auth |
| ------ | ----------------- | ------------------------------------------------ | ---- |
| `POST` | `/upload/:folder` | Upload image to folder (posts, profiles, covers) | ✅   |

---

## Authentication & Security

### Token Architecture

```
Login
  │
  ▼
┌──────────────────────────────┐
│  Generate Access Token (15m) │──▶ HttpOnly Cookie (__Host-access_token)
│  Generate Refresh Token (7d) │──▶ HttpOnly Cookie (refresh_token)
│  Generate CSRF Token         │──▶ HttpOnly Cookie (__Secure-csrf_token)
│  Hash Browser Fingerprint    │──▶ Embedded in JWT payload
└──────────────────────────────┘
```

### Security Layers

| Layer                | Implementation                   | Details                                               |
| -------------------- | -------------------------------- | ----------------------------------------------------- |
| **Password Hashing** | bcryptjs with salt + pepper      | Configurable salt rounds, server-side pepper          |
| **Access Tokens**    | JWT (15 min expiry)              | Stored in `__Host-` prefixed HttpOnly cookie          |
| **Refresh Tokens**   | JWT (7 day expiry) + DB record   | Stored in DB with fingerprint binding, auto-rotated   |
| **CSRF Protection**  | Double-submit cookie             | Constant-time comparison via `crypto.timingSafeEqual` |
| **Fingerprinting**   | SHA-256 of browser fingerprint   | Embedded in token, verified on each request           |
| **Token Rotation**   | On every refresh                 | Old token revoked, new token issued                   |
| **Token Cleanup**    | node-cron scheduled task         | Periodic deletion of expired/revoked tokens           |
| **CSP Headers**      | Helmet with env-aware directives | Strict production policy, relaxed dev policy          |
| **CORS**             | Whitelist-based                  | Strict origin checking in production                  |

### Cookie Configuration

| Cookie        | Prefix             | HttpOnly | Secure    | SameSite |
| ------------- | ------------------ | -------- | --------- | -------- |
| Access Token  | `__Host-` (prod)   | ✅       | ✅ (prod) | Strict   |
| Refresh Token | —                  | ✅       | ✅ (prod) | Strict   |
| CSRF Token    | `__Secure-` (prod) | ✅       | ✅ (prod) | Strict   |
| Fingerprint   | `__Host-` (prod)   | ✅       | ✅ (prod) | Strict   |

---

## Rate Limiting

All rate limiters use Redis as the backing store via `rate-limit-redis`. If Redis is unavailable, limiters **fail open** to prevent blocking legitimate traffic.

| Tier                | Scope                 | Window | Max Requests | Key Strategy                   |
| ------------------- | --------------------- | ------ | ------------ | ------------------------------ |
| **Global**          | All routes            | 1 min  | 150          | IP address                     |
| **Auth (Login)**    | `/auth/login`         | 15 min | 5            | IP address                     |
| **Auth (Register)** | `/auth/register`      | 15 min | 5            | IP address                     |
| **Refresh**         | `/auth/refresh-token` | 1 min  | 30           | SHA-256(cookie) or IP fallback |
| **Content**         | Post/Comment creation | 1 min  | 25           | User ID or IP fallback         |

Rate limit responses follow a standardized format:

```json
{
	"message": "Too many requests, please try again later.",
	"error": {
		"code": "RATE_LIMIT_EXCEEDED",
		"retry_after": 60
	}
}
```

---

## Code Quality

### TypeScript

- **Strict mode** enabled (`strict: true` in `tsconfig.json`)
- **No `any`** — Use proper types, `unknown`, or generics
- **No non-null assertions on optional chains** — Handle `undefined` explicitly
- **Unused parameters** — Prefix with `_` (e.g., `_next`)

### Linting & Formatting

- **ESLint** with `eslint-config-prettier` to avoid conflicts
- **Prettier** with consistent config across client and server:

```json
{
	"semi": true,
	"singleQuote": true,
	"tabWidth": 2,
	"trailingComma": "all",
	"printWidth": 100
}
```

### Error Handling

- **Preserve caught errors** — Always use `{ cause: error }` when rethrowing
- **No useless try/catch** — Don't wrap code if you only rethrow without context
- **Use `const`** over `let` when the variable is never reassigned

### JSDoc Conventions (Server)

- Start with imperative description (e.g., "Register a new user")
- Always include `@route` for controllers (e.g., `@route POST /api/auth/login`)
- Include `@returns` with status codes
- Document side effects (cookie setting, token revocation)
- No `@description` tag, no type annotations in `@param`

### JSDoc Conventions (Client)

- Document what triggers the function and what state it touches
- For hooks: document the return shape and non-obvious behavior
- For services: document auth flow, token sync, CSRF handling
- Skip: components (props types suffice), stores, configs

### Pre-Commit Checklist

```bash
# Run from both client/ and server/
pnpm run lint
pnpm run prettier:check
```

---

## Environment Variables

### Server (`server/.env`)

| Variable                       | Description                                | Default                  |
| ------------------------------ | ------------------------------------------ | ------------------------ |
| `PORT`                         | Server port                                | `5000`                   |
| `NODE_ENV`                     | Environment (`development` / `production`) | —                        |
| `PG_HOST`                      | PostgreSQL host                            | `localhost`              |
| `PG_PORT`                      | PostgreSQL port                            | `5432`                   |
| `PG_USER`                      | PostgreSQL user                            | —                        |
| `PG_PASSWORD`                  | PostgreSQL password                        | —                        |
| `PG_DATABASE`                  | PostgreSQL database name                   | —                        |
| `JWT_ACCESS_SECRET`            | Secret for signing access tokens           | —                        |
| `JWT_REFRESH_SECRET`           | Secret for signing refresh tokens          | —                        |
| `SALT_ROUNDS`                  | bcrypt salt rounds                         | `12`                     |
| `PEPPER`                       | Server-side pepper for password hashing    | —                        |
| `CLIENT_URL_DEV`               | Client URL for development CORS            | `http://localhost:3000`  |
| `CLIENT_URL_PROD`              | Client URL for production CORS             | —                        |
| `ACCESS_TOKEN_EXPIRY`          | Access token lifetime                      | `15m`                    |
| `REFRESH_TOKEN_EXPIRY`         | Refresh token lifetime                     | `7d`                     |
| `CSRF_PROTECTION_ENABLED`      | Enable CSRF validation                     | `true`                   |
| `COOKIE_SECURE`                | Force secure cookies                       | `false` (auto in prod)   |
| `COOKIE_SAME_SITE`             | SameSite cookie policy                     | `strict`                 |
| `TOKEN_ISSUER`                 | JWT issuer claim                           | `chat-it-api`            |
| `TOKEN_AUDIENCE`               | JWT audience claim                         | `chat-it-client`         |
| `REDIS_URL`                    | Redis connection URL                       | `redis://localhost:6379` |
| `RATE_LIMIT_GLOBAL_WINDOW_MS`  | Global rate limit window                   | `60000`                  |
| `RATE_LIMIT_GLOBAL_MAX`        | Global max requests                        | `150`                    |
| `RATE_LIMIT_AUTH_WINDOW_MS`    | Auth rate limit window                     | `900000`                 |
| `RATE_LIMIT_AUTH_MAX`          | Auth max attempts                          | `5`                      |
| `RATE_LIMIT_REFRESH_WINDOW_MS` | Refresh rate limit window                  | `60000`                  |
| `RATE_LIMIT_REFRESH_MAX`       | Refresh max attempts                       | `30`                     |
| `RATE_LIMIT_CONTENT_WINDOW_MS` | Content creation window                    | `60000`                  |
| `RATE_LIMIT_CONTENT_MAX`       | Content max requests                       | `25`                     |
| `UPLOAD_MAX_SIZE_BYTES`        | Max upload file size                       | `5242880` (5 MB)         |
| `ENABLE_TOKEN_ROTATION`        | Enable refresh token rotation              | `true`                   |
| `ENABLE_FINGERPRINTING`        | Enable browser fingerprinting              | `true`                   |

### Client (`client/.env`)

| Variable               | Description                    | Default                     |
| ---------------------- | ------------------------------ | --------------------------- |
| `REACT_APP_API_URL`    | Server API base URL            | `http://localhost:5000/api` |
| `REACT_APP_CLIENT_URL` | Client base URL                | `http://localhost:3000`     |
| `NODE_ENV`             | Environment                    | —                           |
| `ACCESS_TOKEN_EXPIRY`  | Token expiry for client sync   | `15m`                       |
| `REFRESH_TOKEN_EXPIRY` | Refresh expiry for client sync | `7d`                        |

---

## Scripts Reference

### Server (`cd server`)

| Script                    | Command                          | Description                      |
| ------------------------- | -------------------------------- | -------------------------------- |
| `pnpm run dev`            | `tsx watch src/index.ts`         | Start dev server with hot reload |
| `pnpm run migrate:up`     | `db-migrate up`                  | Apply pending migrations         |
| `pnpm run migrate:down`   | `db-migrate down`                | Roll back last migration         |
| `pnpm run lint`           | `eslint "src/**/*.ts"`           | Check for lint errors            |
| `pnpm run lint:fix`       | `eslint --fix "src/**/*.ts"`     | Auto-fix lint errors             |
| `pnpm run prettier`       | `prettier --write "src/**/*.ts"` | Format code                      |
| `pnpm run prettier:check` | `prettier --check "src/**/*.ts"` | Check formatting                 |

### Client (`cd client`)

| Script                    | Command                                       | Description                  |
| ------------------------- | --------------------------------------------- | ---------------------------- |
| `pnpm run dev`            | `react-scripts start`                         | Start dev server (port 3000) |
| `pnpm run build`          | `react-scripts build`                         | Production build             |
| `pnpm run test`           | `react-scripts test`                          | Run tests                    |
| `pnpm run lint`           | `eslint "src/**/*.{js,jsx,ts,tsx}"`           | Check for lint errors        |
| `pnpm run lint:fix`       | `eslint --fix "src/**/*.{js,jsx,ts,tsx}"`     | Auto-fix lint errors         |
| `pnpm run prettier`       | `prettier --write "src/**/*.{js,jsx,ts,tsx}"` | Format code                  |
| `pnpm run prettier:check` | `prettier --check "src/**/*.{js,jsx,ts,tsx}"` | Check formatting             |

---

## Database Migrations

This project uses [db-migrate](https://db-migrate.readthedocs.io/) for schema management. All migrations are raw SQL files.

### Creating a New Migration

```bash
cd server
npx db-migrate create <migration-name> --sql-file
```

This generates:

- `migrations/<timestamp>-<name>.js` — Migration runner
- `migrations/sqls/<timestamp>-<name>-up.sql` — Schema changes
- `migrations/sqls/<timestamp>-<name>-down.sql` — Rollback script

### Migration Rules (from Constitution)

1. **Transaction Safety** — Multi-table writes must use `BEGIN`/`COMMIT`/`ROLLBACK`
2. **Idempotent DDL** — Use `IF NOT EXISTS` / `IF EXISTS` for all `CREATE` and `DROP`
3. **Rollback Required** — Every `up.sql` must have a corresponding `down.sql`
4. **Max 3 Tables** — A single migration should create no more than 3 tables
5. **Backwards Compatibility** — New columns must have `DEFAULT` values
6. **Drop Order** — `down.sql` must drop indexes before tables, respecting FK dependencies

### Running Migrations

```bash
cd server

# Apply all pending migrations
pnpm run migrate:up

# Roll back the last migration
pnpm run migrate:down
```

---

## Roadmap

The following database upgrades are planned and documented in [`docs/spec-kit-database-upgrade/`](./docs/spec-kit-database-upgrade/README.md):

| Priority | Spec | Feature                         | Status     |
| -------- | ---- | ------------------------------- | ---------- |
| P0       | 001  | Schema Constraints & Indexes    | 📋 Planned |
| P2       | 008  | User Roles & Permissions (RBAC) | 📋 Planned |
| P2       | 004  | Reports & Moderation            | 📋 Planned |
| P3       | 009  | Full-Text Search                | 📋 Planned |
| P3       | 005  | Hashtags & Tags                 | 📋 Planned |
| P2       | 002  | Bookmarks & Saves               | 📋 Planned |
| P3       | 006  | Shares & Reposts                | 📋 Planned |
| P2       | 003  | Notifications                   | 📋 Planned |
| P3       | 007  | Messages & DMs                  | 📋 Planned |

---

## License

ISC
