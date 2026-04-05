# post-it Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-04

## Active Technologies
- TypeScript 5.x (strict mode), Node.js + Express 4, express-rate-limit, rate-limit-redis, Redis, pg 8 (002-fix-auth-rate-limit)
- Redis (rate limit counters), PostgreSQL (user data) (002-fix-auth-rate-limit)

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

### General Rules
- Use `const` over `let` when the variable is never reassigned (`prefer-const`)
- Do not use unnecessary escape characters in regex/string literals (`no-useless-escape`)

## Recent Changes
- 002-fix-auth-rate-limit: Added TypeScript 5.x (strict mode), Node.js + Express 4, express-rate-limit, rate-limit-redis, Redis, pg 8

- 001-rate-limit-security: Added TypeScript 5.x (strict mode), Node.js + Express 4, React 18, Zustand 5, Multer 1.4, Helmet 7, pg 8, jsonwebtoken 9, bcryptjs 3

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
