# Research: Schema Constraints & Indexes

**Branch**: `003-schema-constraints-indexes` | **Date**: 2026-04-25

## Research Tasks & Findings

### R1: Deduplication Strategy for Existing Data

**Decision**: Use `DELETE ... USING` (PostgreSQL-specific) self-join to remove duplicates, retaining the row with the earliest timestamp.

**Rationale**: `DELETE ... USING` is the most performant PostgreSQL-native approach for deduplication. It avoids subqueries and leverages the planner's join optimization. The `likes` table uses `created_at` and the `follows` table uses `created_on` as their timestamp columns.

**Alternatives considered**:
- `DELETE WHERE ctid NOT IN (SELECT MIN(ctid) ...)` — less readable, no timestamp control
- CTEs with `ROW_NUMBER()` — more portable but slower on large tables
- Temp table swap — over-engineered for this use case

### R2: Idempotent Constraint and Index Creation

**Decision**: Use `CREATE INDEX IF NOT EXISTS` for indexes. For UNIQUE constraints, use `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE` with a prior `DO $$ ... END $$` guard checking `pg_constraint`.

**Rationale**: PostgreSQL does not support `IF NOT EXISTS` for `ADD CONSTRAINT`. A PL/pgSQL guard block is the standard idempotent pattern. Indexes natively support `IF NOT EXISTS`.

**Alternatives considered**:
- `CREATE UNIQUE INDEX IF NOT EXISTS` then `ALTER TABLE ADD CONSTRAINT USING INDEX` — viable but more complex
- Drop-and-recreate — violates idempotency and risks data loss during re-creation window

### R3: Lock-Level Implications

**Decision**: Accept `ACCESS EXCLUSIVE` lock for `ADD CONSTRAINT` (CHECK/UNIQUE validation requires full table scan). Document expected lock duration for production awareness.

**Rationale**: For the current scale of the post-it app (low thousands of rows), lock duration is negligible. At production scale, `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` + `VALIDATE CONSTRAINT` could be used, but this is premature optimization for the current state.

**Alternatives considered**:
- `NOT VALID` + `VALIDATE CONSTRAINT` two-step — deferred until table sizes warrant it
- Online schema change tools (pg_repack) — over-engineered for current scale

### R4: db-migrate Integration Pattern

**Decision**: Follow the existing project pattern: a `.js` driver file that reads corresponding `-up.sql` and `-down.sql` files from the `sqls/` directory.

**Rationale**: All three existing migrations (init, refresh-tokens, comments) use this identical pattern. Consistency is paramount per Constitution §IV.

### R5: Timestamp Column Naming

**Decision**: Use `created_at` for `likes` table dedup and `created_on` for `follows` table dedup.

**Rationale**: The existing schema uses inconsistent naming: `likes.created_at` vs `follows.created_on`. This migration does NOT rename columns — it works with the existing schema as-is. Column standardization is out of scope.
