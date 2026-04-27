# Implementation Plan: RBAC Roles & Permissions

**Branch**: `005-rbac-roles-permissions` | **Date**: 2026-04-27 | **Spec**: [specs/005-rbac-roles-permissions/spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-rbac-roles-permissions/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the boolean `is_admin` field with a granular, Redis-cached Role-Based Access Control (RBAC) system. The implementation ensures strict compliance with database migration constraints, uses atomic `pg` transactions, and enforces airtight authentication and authorization semantics for the `banned` role.

> **Prompt Discrepancy Note**: The user prompt requested 5 tables (including `role_audit_log`). This plan ignores that outdated instruction and strictly follows the finalized `spec.md` (4 tables, 2 sequential migrations) to adhere to the Article VII constraint, as the audit log was extracted to Spec 013.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Node.js, Express 4, `pg` (node-postgres), `ioredis`, `db-migrate`
**Storage**: PostgreSQL 15+, Redis
**Testing**: Manual / Integration (TBD)
**Target Platform**: Backend Node.js API
**Project Type**: web-service
**Performance Goals**: Sub-millisecond permission resolution via Redis caching
**Constraints**: Max 3 tables per DB migration (Article VII)
**Scale/Scope**: 4 new tables, 1 middleware, CRUD endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Full-Stack TypeScript Strictness**: Enforced. Strict types for `TRole`, `TPermission`, `TUserRole` will be defined. No `any`.
- **II. Security & Authentication Priority**: Enforced. Parameterized queries via `pg`. Immediate session invalidation explicitly implemented for the `banned` role.
- **IV. Relational Data Integrity**: Enforced. Schema changes via `db-migrate`. Multi-table mutations wrapped in `BEGIN/COMMIT` transactions (FR-025).
- **V. Predictable RESTful API Design**: Enforced. Logical route structure (`/api/roles`) and standardized error responses (401 vs 403).

## Project Structure

### Documentation (this feature)

```text
specs/005-rbac-roles-permissions/
├── plan.md              # This file
├── spec.md              # Feature specification
├── checklists/          # Requirements Quality Checklists
└── tasks.md             # To be created by /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/          # Redis connection setup
│   ├── controllers/     # roles.controller.ts, update auth.controller.ts
│   ├── middlewares/     # auth/requirePermission.ts
│   ├── models/          # role.ts
│   ├── routes/apis/     # roles.routes.ts
│   ├── services/        # permissionCache.ts
│   └── types/           # role.ts, update users.ts
└── migrations/          # 2 sequential SQL migrations
```

**Structure Decision**: Standard web application backend structure matching the existing Express layout.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | Design complies fully with Constitution. |

## Clarifications Resolved (Feedback Incorporated)

1. **Redis Configuration**: `ioredis` is already installed and configured in `server/src/database/redis.ts`. We will utilize this existing client for the permission caching layer.
2. **Session Invalidation Best Practices**: The application currently uses short-lived access JWTs and long-lived stateful refresh tokens. 
   - *Best Practice*: To strictly satisfy FR-024 (immediate termination), we will explicitly revoke all refresh tokens (via `revokeAllUserTokens`) when a user is banned. 
   - *Why we don't need a JWT Blacklist*: Because our new `requirePermission` middleware will consult the Redis permission cache on *every* protected request, the moment a user receives the `banned` role, their cache entry will be updated, and the middleware will instantly reject their active JWT with a `403 Forbidden`. This achieves immediate invalidation without a token blacklist.
3. **Naming Conventions**: Files have been renamed to `roles.controller.ts`, `roles.routes.ts` (in the `apis/` folder), and `role.ts` to strictly match the existing codebase conventions.
