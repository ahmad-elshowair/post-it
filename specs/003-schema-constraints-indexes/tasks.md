# Implementation Tasks: Schema Constraints & Indexes

**Feature Branch**: `003-schema-constraints-indexes`  
**Date**: 2026-04-25  

## Phase 1: Migration Setup & Deduplication (US1, US2, US3)

**Story Goal**: Set up migration infrastructure and deduplicate existing conflicting data cleanly.
**Independent Test**: Ensure the SQL runs idempotently without constraints applied yet.

- [ ] T001 [US1] Create migration runner .js file at `server/migrations/<timestamp>-schema-constraints-indexes.js`
- [ ] T002 [US1] Write `up.sql` — Phase 1: deduplicate likes (keep earliest `created_at`) in `server/migrations/sqls/<timestamp>-schema-constraints-indexes-up.sql`
- [ ] T003 [US2] Write `up.sql` — Phase 1: deduplicate follows (keep earliest `created_on`) in `server/migrations/sqls/<timestamp>-schema-constraints-indexes-up.sql`
- [ ] T004 [US3] Write `up.sql` — Phase 1: remove self-follows in `server/migrations/sqls/<timestamp>-schema-constraints-indexes-up.sql`

## Phase 2: Constraints & Indexes (US1, US2, US3, US4)

**Story Goal**: Add UNIQUE and CHECK constraints and apply all necessary foreign key indexes.
**Independent Test**: Inserting a duplicate or self-follow returns a constraint violation error.

- [ ] T005 [US1] Write `up.sql` — Phase 2: add UNIQUE constraints on likes and follows in `server/migrations/sqls/<timestamp>-schema-constraints-indexes-up.sql`
- [ ] T006 [US3] Write `up.sql` — Phase 2: add CHECK constraint (no self-follow) in `server/migrations/sqls/<timestamp>-schema-constraints-indexes-up.sql`
- [ ] T007 [US4] Write `up.sql` — Phase 3: add 5 indexes (`posts.user_id`, `follows.*`, `likes.*`) in `server/migrations/sqls/<timestamp>-schema-constraints-indexes-up.sql`
- [ ] T008 [P] [US1] Write `down.sql` — drop indexes, then constraints in reverse order in `server/migrations/sqls/<timestamp>-schema-constraints-indexes-down.sql`

## Phase 3: Verification & Polish

**Story Goal**: Apply migrations locally, verify query planner and database schema, and run code linters.
**Independent Test**: All migrations apply/rollback successfully, no lint errors, schema matches expectations.

- [ ] T009 Run migration against local dev database (`pnpx db-migrate up`)
- [ ] T010 Verify: `\d likes` shows UNIQUE, `\d follows` shows UNIQUE + CHECK via local psql
- [ ] T011 Verify: `EXPLAIN ANALYZE` shows index scans on `posts` WHERE `user_id = ...` via local psql
- [ ] T012 Run `pnpm run lint` && `pnpm run prettier:check` in `server/`

## Implementation Strategy

1. **MVP First**: T001 through T007 handle the complete database migration "up" workflow.
2. **Reverse/Rollback**: T008 ensures the migration is safely reversible per Constitution §IV.
3. **Validation**: T009 to T011 ensure constitutional performance and schema integrity prior to committing.

## Dependency Graph

- Phase 1 must complete before Phase 2.
- T008 (`down.sql`) can be written in parallel with T007 since it's a separate file.
- Phase 3 depends on all prior SQL files being completely written.
