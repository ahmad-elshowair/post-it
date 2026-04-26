# post-it Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-25

## Active Technologies
- TypeScript 5.x (strict mode), Node.js + Express 4, express-rate-limit, rate-limit-redis, Redis, pg 8 (002-fix-auth-rate-limit)
- Redis (rate limit counters), PostgreSQL (user data) (002-fix-auth-rate-limit)
- TypeScript 5.x (strict mode), Node.js + Express 4, pg (node-postgres), db-migrate, express-rate-limit, rate-limit-redis, express-validator (004-bookmark-posts)
- PostgreSQL 15+ (primary), Redis (rate limiting) (004-bookmark-posts)

- TypeScript 5.x (strict mode), Node.js + Express 4, React 18, Zustand 5, Multer 1.4, Helmet 7, pg 8, jsonwebtoken 9, bcryptjs 3 (001-rate-limit-security)

## Project Structure

```text
src/
tests/
```

## Commands

- Lint: `pnpm run lint` (run in both `client/` and `server/`)
- Prettier: `pnpm run prettier:check` (run in both `client/` and `server/`)
- Fix lint: `pnpm run lint:fix`
- Fix prettier: `pnpm run prettier`
- Test: `pnpm test`

## Code Style

- TypeScript 5.x (strict mode)
- Prettier config (both client & server): `{ "semi": true, "singleQuote": true, "tabWidth": 2, "trailingComma": "all", "printWidth": 100 }`
- ESLint: `eslint-config-prettier` is enabled in both client and server
- Always run `pnpm run lint` and `pnpm run prettier:check` before committing

### Error Handling Rules
- **Always preserve caught errors**: When rethrowing after a catch, use `throw new CustomError('message', { cause: error })` to preserve the original stack trace (`preserve-caught-error` rule)
- **No useless try/catch**: Do not wrap code in try/catch if you only rethrow the error without adding context (`no-useless-catch` rule)

### TypeScript Rules
- **No non-null assertions on optional chains**: Never use `!` after `?.` (e.g., `obj?.prop!`). Handle `undefined` explicitly with checks or defaults (`@typescript-eslint/no-non-null-asserted-optional-chain`)
- **No explicit `any`**: Avoid `any` type. Use proper types, `unknown`, or generics instead (`@typescript-eslint/no-explicit-any`)
- **Unused parameters**: Prefix unused parameters with `_` (e.g., `_next`) (`@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"`)

### JSDoc / Documentation Rules (Server)

- **No redundant function names**: Don't repeat the function name as the first line — start directly with the description
- **No explicit `@description` tag**: The first untagged paragraph is implicitly the description
- **No type annotations in `@param`**: TypeScript already enforces types. Use `@param req - context` not `@param {Request} req`. Only include `@param` when adding context beyond what the type conveys
- **Always include `@route`**: Document the HTTP method and path (e.g., `@route POST /api/auth/login`)
- **Document return values and side effects**: Include `@returns` with status codes and note side effects (cookie setting, token revocation, etc.)
- **Keep descriptions imperative and concise**: "Register a new user" not "This function registers a new user"

**Apply to**: controllers, middleware, models, utilities

**Skip**: types/interfaces, route definitions (thin wrappers), config files, database pool setup

### JSDoc / Documentation Rules (Client)

- **Same base rules as server**: No redundant names, no `@description`, no type annotations in `@param`, keep descriptions imperative
- **No `@route` tag**: Client functions aren't HTTP endpoints
- **No `@returns` with status codes**: That's server-side
- **Document instead**: what triggers the function, what state it touches (stores, localStorage, cookies), and what errors it can throw
- **For hooks**: document the return shape and any non-obvious behavior (debounce strategy, retry logic, timeout handling)
- **For services**: document the flow — especially auth operations that involve token sync, CSRF handling, and error recovery
- **For API layer**: document interceptor behavior and retry strategies

**Apply to**: `api/` (axiosInstance, interceptors, ApiError), `hooks/` (useSecureApi, useDebouncedLike, useAuthVerification), `services/` (authService, auth, storage)

**Skip**: components (props types suffice), pages (composition layer), stores (Zustand interface is the documentation), hooks that are pure store selectors (useAuthState, useAuthActions, usePost), configs, types

### General Rules
- Use `const` over `let` when the variable is never reassigned (`prefer-const`)
- Do not use unnecessary escape characters in regex/string literals (`no-useless-escape`)

## Recent Changes
- 004-bookmark-posts: Added TypeScript 5.x (strict mode), Node.js + Express 4, pg (node-postgres), db-migrate, express-rate-limit, rate-limit-redis, express-validator
- 002-fix-auth-rate-limit: Added TypeScript 5.x (strict mode), Node.js + Express 4, express-rate-limit, rate-limit-redis, Redis, pg 8

- 001-rate-limit-security: Added TypeScript 5.x (strict mode), Node.js + Express 4, React 18, Zustand 5, Multer 1.4, Helmet 7, pg 8, jsonwebtoken 9, bcryptjs 3

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
