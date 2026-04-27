---
description: "Task list for RBAC Roles & Permissions"
---

# Tasks: RBAC Roles & Permissions

**Input**: Design documents from `/specs/005-rbac-roles-permissions/`
**Prerequisites**: plan.md, spec.md

**Organization**: Tasks are grouped by phase to enable independent implementation and testing of the backend RBAC rewrite.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Exact file paths are included in descriptions

## Path Conventions

- **Backend**: `server/src/`
- **Migrations**: `server/migrations/`

---

## Phase 1: Setup & Database Schema

**Purpose**: Database migrations creation to support the 4 new RBAC tables.

- [ ] T001 Create Migration 1: `server/migrations/*-core-rbac-dictionary.sql` (up/down for `roles`, `permissions`, `role_permissions`)
- [ ] T002 Create Migration 2: `server/migrations/*-rbac-user-assignments.sql` (up/down for `user_roles` + seed data + `is_admin` data conversion)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data access and service layer that MUST be complete before API routes can be implemented.

**⚠️ CRITICAL**: No API route work can begin until this phase is complete.

- [ ] T003 Create `server/src/types/role.ts` defining `TRole`, `TPermission`, `TUserRole`
- [ ] T004 Create `server/src/models/role.ts` (implement 12+ methods using `pg` transactions)
- [ ] T005 [P] Create `server/src/services/permissionCache.ts` (`ioredis` wrapper for caching)
- [ ] T006 Create `server/src/middlewares/auth/requirePermission.ts` (reads from Redis cache)

**Checkpoint**: Foundation ready - API implementation can now begin.

---

## Phase 3: User Story 1 - RBAC Application Layer Integration 🎯 MVP

**Goal**: Integrate the foundational RBAC logic into the API endpoints and enforce access control.

**Independent Test**: Super admin can create custom roles, assign them to users, and access control middleware immediately respects the cached permissions.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Create `server/src/controllers/roles.controller.ts` (implement 8 role management endpoints)
- [ ] T008 [P] [US1] Create `server/src/routes/apis/roles.routes.ts` (route definitions guarded by `super_admin`)
- [ ] T009 [P] [US1] Modify `server/src/types/users.ts` to add `roles[]` and `permissions[]` to the user payload
- [ ] T010 [US1] Modify `server/src/controllers/auth.controller.ts` — update login to block 'banned' role and trigger `revokeAllUserTokens`
- [ ] T011 [US1] Modify all admin-guarded routes across the codebase to replace `is_admin` checks with `requirePermission()`
- [ ] T012 [US1] Register `roles.routes` in `server/src/routes/index.ts` (import + mount under `/api/roles`)

### Tests for User Story 1

- [ ] T013 [P] [US1] Write tests for `server/src/models/role.ts`
- [ ] T014 [P] [US1] Write tests for `server/src/middlewares/auth/requirePermission.ts`
- [ ] T015 [P] [US1] Write tests for `server/src/controllers/roles.controller.ts`

**Checkpoint**: At this point, the RBAC feature should be fully functional and testable independently.

---

## Phase 4: Polish & Validation

**Purpose**: Verify the end-to-end functionality and code quality.

- [ ] T016 Run migrations and manually verify seed data and schema integrity (`npx db-migrate up`)
- [ ] T017 Run `pnpm run lint`, `pnpm run prettier:check`, and `pnpm test` to ensure CI/CD compliance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all API routes
- **User Stories (Phase 3)**: Depends on Foundational phase completion
- **Polish (Final Phase)**: Depends on all implementation phases

### Parallel Opportunities

- Migration tasks can be written independently of the TypeScript types.
- The Redis cache service (`permissionCache.ts`) can be written in parallel with `models/role.ts`.
- The controller (`roles.controller.ts`) and types (`users.ts`) can be written in parallel before integrating them into `index.ts`.
- All test files (`T013`, `T014`, `T015`) can be written in parallel.

## Implementation Strategy

### Incremental Delivery

1. Execute database migrations (Phase 1) locally to ensure schema stability.
2. Build data models and cache layer (Phase 2). Test the raw SQL transactions manually.
3. Hook up the middleware and route handlers (Phase 3).
4. Do a final codebase-wide sweep to replace legacy `is_admin` with `requirePermission`.
5. Run full linters, formatters, and testing suites.
