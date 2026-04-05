# Tasks: Fix Auth Rate Limiter Blocking Legitimate Users

**Input**: Design documents from `/specs/002-fix-auth-rate-limit/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/rate-limit-api.md

**Tests**: Not included — testing is deferred per constitution. Manual verification via quickstart.md curl scripts.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project (server/)**: `server/src/` at repository root
- This is a backend-only middleware and configuration change

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add configuration entries for the new refresh limiter tier

- [ ] T001 Add `rate_limit_refresh_window_ms` and `rate_limit_refresh_max_requests` config keys to `server/src/configs/config.ts` (in the rate limiting section, after the auth group block, following the existing pattern of `Number(process.env.* || default)`)
- [ ] T002 [P] Add `RATE_LIMIT_REFRESH_WINDOW_MS=60000` and `RATE_LIMIT_REFRESH_MAX=30` environment variables to `server/.env`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Replace the blanket `authLimiter` with targeted per-route limiter instances in the middleware file. This MUST be complete before any route wiring changes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 In `server/src/middlewares/rateLimiter.ts`, make the following changes:
  1. **Replace `authLimiter`** with three new exports: `loginLimiter` (windowMs from `config.rate_limit_auth_window_ms`, max from `config.rate_limit_auth_max_requests`, prefix `rl:auth:login:`, IP-keyed), `registerLimiter` (same window/max as loginLimiter, prefix `rl:auth:register:`, IP-keyed), and `refreshLimiter` (windowMs from `config.rate_limit_refresh_window_ms`, max from `config.rate_limit_refresh_max_requests`, prefix `rl:refresh:`, keyed by SHA-256 hash of `refresh_token` cookie truncated to 16 hex chars via `crypto.createHash('sha256').update(cookieValue).digest('hex').slice(0, 16)`, fallback to IP). All three use `safeSendCommand`, `passOnStoreError: true`, `standardHeaders: true`, `legacyHeaders: false`, and the existing `limitHandler` for 429 responses. Remove the old `authLimiter` export entirely.
  2. **Fix `any` type in `limitHandler`**: Replace `(req as any).user?.id` with `(req as ICustomRequest).user?.id` — Constitution Principle I forbids `any` without documented justification. The `ICustomRequest` import already exists in the file.
  3. **Add `crypto` import**: Import `createHash` from `node:crypto` at the top of the file (needed for the refresh limiter's keyGenerator).
  4. **Apply sectional comments**: Use the constitution-mandated pattern `// ───── LABEL ──────────────────────────────` to separate logical blocks in the file (e.g., `RATE LIMIT HELPERS`, `GLOBAL LIMITER`, `LOGIN LIMITER`, `REGISTER LIMITER`, `REFRESH LIMITER`, `CONTENT CREATION LIMITER`).
- [ ] T004 Update the import in `server/src/routes/index.ts` to import `loginLimiter`, `registerLimiter`, `refreshLimiter`, and `globalLimiter` from `rateLimiter.js` (replacing the old `authLimiter` import)

**Checkpoint**: Foundation ready — three new limiter instances exist and are importable, `any` type eliminated, sectional comments applied

---

## Phase 3: User Story 1 + User Story 2 + User Story 3 — Wire All Per-Route Limiters (Priority: P1+P2) 🎯 MVP

**Goal**: Replace the blanket `authLimiter` with targeted per-route limiters for ALL endpoints in a single atomic change: login/register get strict brute-force protection (5/15min), refresh-token gets dedicated limiter (30/min per cookie hash), and logout/is-authenticated get global limiter only.

**Independent Test**: Refresh the page 5+ times without 429 (US1), send 6 rapid login attempts and confirm 6th returns 429 (US2), send 31 rapid refresh requests and confirm 31st returns 429 (US3). Verify login and registration counters are independent.

> All three user stories are combined into a single wiring task because separating them would create a broken intermediate state where the old blanket limiter is removed but some new limiters are not yet applied. Wiring everything atomically ensures no endpoint is left unprotected at any point.

### Implementation for User Story 1 + User Story 2 + User Story 3

- [ ] T005 [US1] [US2] [US3] In `server/src/routes/index.ts`, replace `routes.use("/auth", authLimiter, authentication)` with the following per-route limiter application matching the middleware order specified in `contracts/rate-limit-api.md` §Middleware Application Order:
  ```typescript
  // Strict limiter on credential endpoints (brute-force protection)
  routes.use("/auth/login", loginLimiter);
  routes.use("/auth/register", registerLimiter);

  // Dedicated refresh limiter keyed by cookie hash (FR-010: before token validation)
  routes.use("/auth/refresh-token", refreshLimiter);

  // Global limiter for everything
  routes.use(globalLimiter);

  // Route groups (logout and is-authenticated fall under global limiter only)
  routes.use("/auth", authentication);
  routes.use("/users", users);
  routes.use("/posts", posts);
  routes.use("/comments", comments);
  routes.use("/follows", follows);
  routes.use("/upload", uploadRouter);
  ```

**Checkpoint**: At this point, all three user stories should be functional and independently testable via quickstart.md — normal browsing succeeds, brute-force protection is maintained with independent login/register counters, and refresh abuse is blocked at 30/min keyed by cookie hash

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [ ] T006 [P] Update the `limitHandler` type-detection logic in `server/src/middlewares/rateLimiter.ts` to distinguish between `LOGIN_LIMIT`, `REGISTER_LIMIT`, `REFRESH_LIMIT`, and `GLOBAL_LIMIT` based on `req.path` instead of the current broad `/auth` check, for more precise security logging (FR-009). Also add a `console.warn` in `safeSendCommand`'s catch block to log when Redis store failure triggers fail-open (FR-009).
- [ ] T007 [P] Run `pnpm test && pnpm run lint` from repository root to verify no TypeScript or lint errors
- [ ] T008 Run full manual verification per quickstart.md, plus these additional checks from the security checklist:
  - **US1**: Page refresh 10 times within 2 min — zero 429 errors (SC-001)
  - **US2**: 6 rapid login attempts — 6th blocked with 429 + Retry-After header (SC-003); 5 registration attempts after login rate-limited — all succeed (SC-005)
  - **US3**: 31 rapid refresh requests — 31st blocked with 429 + Retry-After header (SC-004)
  - **FR-008 verification**: Inspect the 429 response body — confirm it contains only `RATE_LIMIT_EXCEEDED` code, no internal tier names or counter values
  - **FR-010 verification**: Send a refresh request with an invalid/expired refresh token cookie — confirm it is still counted by the rate limiter (not rejected by auth middleware first)
  - **Cross-tier independence (FR-005)**: Hit the global limiter threshold (150+ rapid requests to any endpoint) and confirm login/register/refresh limits are unaffected
  - **Performance (plan §Performance Goals)**: Spot-check rate limit overhead via `curl -w "%{time_total}"` — should be <50ms per request

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phase 3)**: Depends on Phase 2 completion (T003 + T004 must be done)
- **Polish (Phase 4)**: Depends on Phase 3 being complete

### User Story Dependencies

- **US1 + US2 + US3 (combined)**: Can start after Foundational (Phase 2) — wired in a single atomic task (T005)

### Within Each Phase

- Config before middleware instances
- Middleware instances before route wiring
- Route wiring before verification

### Parallel Opportunities

- T001 and T002 can run in parallel (different files: config.ts and .env)
- T003 must complete before T004 (import depends on exports)
- T006 and T007 can run in parallel (different concerns: logging logic vs lint check)

---

## Parallel Example: Phase 1

```text
# Launch both setup tasks together:
Task: "Add refresh limiter config keys to server/src/configs/config.ts"
Task: "Add refresh limiter env vars to server/.env"
```

## Parallel Example: Phase 4

```text
# Launch polish tasks together:
Task: "Update limitHandler type-detection logic + fail-open logging in rateLimiter.ts"
Task: "Run pnpm test && pnpm run lint"
```

---

## Implementation Strategy

### MVP First (All User Stories — Atomic)

1. Complete Phase 1: Setup (config + env vars)
2. Complete Phase 2: Foundational (replace authLimiter with three new limiters + fix `any` type + add sectional comments)
3. Complete Phase 3: Wire ALL per-route limiters atomically (US1 + US2 + US3)
4. **STOP and VALIDATE**: Run T008 full verification
5. Polish (Phase 4) — logging improvements and lint

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Wire all limiters atomically → All user stories satisfied → Deploy (MVP)
3. Polish → Final verification and cleanup

---

## Notes

- US1, US2, and US3 are combined in Phase 3 to avoid a broken intermediate state where some endpoints have limiters and others don't
- The `contentCreationLimiter` is unchanged and not touched by any task
- Old `rl:auth:*` Redis keys expire naturally via TTL — no cleanup task needed
- The `auth.routes.ts` file requires NO changes (route definitions stay the same; only middleware application changes in `index.ts`)
- Testing is manual via curl scripts in quickstart.md (automated testing deferred per constitution)
- The refresh limiter keys by SHA-256 hash of the `refresh_token` cookie (not `req.user`) because the limiter runs before auth middleware (FR-010). The hash is truncated to 16 hex chars for Redis key efficiency and is irreversible (actual token never stored in Redis)
