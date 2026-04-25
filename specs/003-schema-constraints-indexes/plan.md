# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add missing database constraints and indexes to the existing PostgreSQL tables in the post-it social app. The approach uses a single migration file with three atomic phases: deduplication (via `DELETE ... USING`), constraint addition (`UNIQUE` and `CHECK` with PL/pgSQL idempotency guards), and index creation (`CREATE INDEX IF NOT EXISTS`).

## Technical Context

**Language/Version**: PostgreSQL 15+ (Raw SQL), Node.js (migration script)
**Primary Dependencies**: `db-migrate`, `pg`
**Storage**: PostgreSQL
**Testing**: Manual testing of up/down migrations and query planner (`EXPLAIN ANALYZE`)
**Target Platform**: Node.js backend / PostgreSQL database
**Project Type**: Database Migration
**Performance Goals**: Prevent sequential scans on FKs via indexes; efficient deduplication using `DELETE ... USING`
**Constraints**: Zero data loss on rollback, single atomic transaction, strictly idempotent
**Scale/Scope**: 3 tables modified (`posts`, `likes`, `follows`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Article II (Security & Authentication Priority)**: N/A - This migration does not affect authentication or security.
- **Article IV (Relational Data Integrity)**: PASS - All changes are executed through `db-migrate` using raw SQL in atomic, idempotent migrations. No ORM used.
- **Article VII (Simplicity Gate)**: PASS - The scope modifies exactly 3 tables (`posts`, `likes`, `follows`). No new tables introduced.
- **Article IX (Performance)**: PASS - Introduces indexes on all identified foreign keys to eliminate sequential scans. Deduplication uses efficient PostgreSQL-native methods.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
server/
└── migrations/
    ├── sqls/
    │   ├── <timestamp>-schema-constraints-indexes-up.sql
    │   └── <timestamp>-schema-constraints-indexes-down.sql
    └── <timestamp>-schema-constraints-indexes.js
```

**Structure Decision**: The project uses db-migrate with raw SQL files for the up/down migrations, executed via a JavaScript wrapper script. This directly matches existing migrations in `server/migrations`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Constitution fully respected.
