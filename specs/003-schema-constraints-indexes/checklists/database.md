# Database Requirements Quality Checklist: Schema Constraints & Indexes

**Purpose**: Formal Audit of database-level requirements for production readiness and constitutional compliance.
**Created**: 2026-04-25
**Feature**: [spec.md](../spec.md)

## Constitutional Compliance (Senior Dev Audit)

- [ ] CHK001 - Are migration requirements defined to ensure full atomicity (all-or-nothing) during both deduplication and constraint application? [Completeness, Spec §Clarifications, Constitution §II]
- [ ] CHK002 - Are requirements specified to ensure the migration is idempotent (safe to run multiple times)? [Gap, Constitution §IV]
- [ ] CHK003 - Does the specification stay within the simplified 3-table scope limit or provide documented justification for deviations? [Consistency, Constitution §VII]
- [ ] CHK004 - Are indexing requirements exhaustive for ALL foreign keys in the affected tables (`posts`, `likes`, `follows`) to prevent sequential scans? [Completeness, Spec §FR-005-007, Constitution §IX]
- [ ] CHK005 - Is the use of raw SQL vs. ORM constraints explicitly mandated to ensure performance control? [Clarity, Constitution §IX]

## Data Integrity & Constraints

- [ ] CHK006 - Are `UNIQUE` constraint requirements explicitly mapped to specific (table, column) pairs? [Clarity, Spec §FR-001, FR-002]
- [ ] CHK007 - Are `CHECK` constraint requirements defined with explicit logical expressions (e.g., `user_id_following != user_id_followed`)? [Clarity, Spec §FR-003]
- [ ] CHK008 - Is the "oldest record" selection for deduplication quantified by a specific immutable timestamp column? [Clarity, Spec §Edge Cases]
- [ ] CHK009 - Is the scope of data-destructive actions (DELETE) clearly separated from schema-only modifications (ADD CONSTRAINT) in the requirements? [Clarity]
- [ ] CHK010 - Does the spec define whether existing NULL values in composite keys (if any) impact the `UNIQUE` constraint requirements? [Coverage, Gap]

## Performance & Indexing

- [ ] CHK011 - Are index scan success criteria defined with measurable query plan indicators (e.g., "Must utilize Index Scan on [Column]")? [Measurability, Spec §SC-003]
- [ ] CHK012 - Are requirements defined for handling the performance impact of deduplication on large tables (e.g., batching or execution timeouts)? [Gap]
- [ ] CHK013 - Does the spec address the lock-level implications of `ADD CONSTRAINT` on live production tables? [Gap, Senior Dev Audit]

## Edge Case & Failure Coverage

- [ ] CHK014 - Are requirements defined for the migration's behavior on tables with zero records or zero duplicates? [Coverage, Gap]
- [ ] CHK015 - Is the rollback behavior (down migration) specified to restore previous structural state without data loss or residual indexes? [Completeness, Spec §FR-008]
- [ ] CHK016 - Is the expected application-level behavior defined for handling concurrent race conditions during the migration window? [Coverage, Spec §Clarifications]

## Notes

- This formal audit focuses on Article IX (Performance) and Article IV (Idempotency), which were identified as critical for this senior-level database upgrade.
- Several gaps were identified regarding idempotency (`IF NOT EXISTS`) and production locking behavior which should be addressed in the `plan.md`.
