# Feature Specification: Schema Constraints & Indexes

**Feature Branch**: `003-schema-constraints-indexes`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: User description: "Add missing database constraints and indexes to the existing PostgreSQL tables in the post-it social app."

## Clarifications

### Session 2026-04-25

- Q: Should self-likes be prevented via a CHECK constraint (like self-follows)? → A: No. Self-likes are permitted — no CHECK constraint on the `likes` table.
- Q: Should dedup and constraints be in one atomic transaction or phased? → A: Full atomic — dedup + constraints in a single transaction; all changes roll back on any failure.
- Q: How should the app handle a duplicate like attempt after the UNIQUE constraint is in place? → A: Idempotent no-op — if the user already liked, the UI reflects the existing liked state. The DB constraint is the safety net; the app should not surface an error.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unique Post Likes (Priority: P1)

As a user, I want my like to be unique per post so that I cannot accidentally double-like.

**Why this priority**: Core data integrity. Duplicate likes undermine the credibility of engagement metrics and can cause application state bugs.

**Independent Test**: Can be fully tested by attempting to insert duplicate like records for the same user and post directly into the database or via concurrent API requests, and verifying only one record persists.

**Acceptance Scenarios**:

1. **Given** a user has already liked a post, **When** they attempt to like the same post again, **Then** the system prevents a duplicate record from being created.
2. **Given** two concurrent requests from the same user to like the same post, **When** both reach the database, **Then** only one succeeds and the other fails with a constraint violation.

---

### User Story 2 - Unique Follows (Priority: P1)

As a user, I want my follow to be unique so that I cannot follow someone twice.

**Why this priority**: Core data integrity. Duplicate follow relationships distort follower counts and feed generation logic.

**Independent Test**: Can be fully tested by attempting to insert duplicate follow records for the same follower and followee, ensuring the database rejects the duplicate.

**Acceptance Scenarios**:

1. **Given** User A already follows User B, **When** User A attempts to follow User B again, **Then** the database prevents the creation of a duplicate relationship.

---

### User Story 3 - Prevent Self-Follows (Priority: P1)

As a user, I should not be able to follow myself.

**Why this priority**: Logical consistency. Self-following is logically invalid in this social domain and can cause unexpected behavior in feed queries.

**Independent Test**: Can be fully tested by attempting to insert a follow record where `user_id_following` equals `user_id_followed` and verifying it is rejected.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** an operation attempts to create a follow relationship targeting their own user ID, **Then** the database rejects the operation via a check constraint.

---

### User Story 4 - Fast Feed Loading (Priority: P2)

As a user, I want the feed to load fast even with thousands of posts.

**Why this priority**: Performance and user experience. Without indexes on foreign keys, table joins and filtering operations require sequential scans, leading to exponential degradation as data grows.

**Independent Test**: Can be fully tested by analyzing query execution plans (`EXPLAIN ANALYZE`) for queries that filter by the indexed columns to ensure index scans are utilized instead of sequential scans.

**Acceptance Scenarios**:

1. **Given** a database with a large volume of posts, likes, and follows, **When** a query requests a user's feed (joining these tables), **Then** the query planner utilizes index scans for foreign key lookups.

---

### Edge Cases

- What happens when applying constraints to a table that already has duplicate records? (System must deduplicate existing data before applying UNIQUE constraints).
- How does the system determine which duplicate record to keep during deduplication? (Should keep the oldest record based on creation timestamp).
- Can the migration be rolled back safely if issues occur? (Down migration must drop added constraints and indexes without deleting data).
- Are self-likes permitted? Yes — unlike self-follows, self-likes are allowed and require no CHECK constraint.
- What happens if ADD CONSTRAINT fails after deduplication? The entire migration rolls back atomically — no partial state is possible.
- What happens when a user who already liked a post sends another like request? The app treats it as a no-op and returns the current liked state to the UI. The UNIQUE constraint prevents duplicates at the DB level as a safety net.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enforce a `UNIQUE` constraint on the `likes` table for the composite key `(user_id, post_id)`.
- **FR-002**: System MUST enforce a `UNIQUE` constraint on the `follows` table for the composite key `(user_id_following, user_id_followed)`.
- **FR-003**: System MUST enforce a `CHECK` constraint on the `follows` table ensuring `user_id_following != user_id_followed`.
- **FR-004**: System MUST deduplicate any existing conflicting data in the `likes` and `follows` tables before applying `UNIQUE` constraints (retaining the oldest record).
- **FR-005**: System MUST maintain database indexes on `posts.user_id`.
- **FR-006**: System MUST maintain database indexes on `follows.user_id_following` and `follows.user_id_followed`.
- **FR-007**: System MUST maintain database indexes on `likes.post_id` and `likes.user_id`.
- **FR-008**: System MUST provide a fully reversible database migration (down migration drops all added constraints and indexes).

### Key Entities

- **Like**: Represents a user's engagement with a post. Relies on user and post foreign keys.
- **Follow**: Represents a directional relationship between two users. Relies on two user foreign keys.
- **Post**: Represents content created by a user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of concurrent duplicate like/follow requests result in exactly one persistent record.
- **SC-002**: 100% of self-follow attempts are rejected at the database level.
- **SC-003**: Query planner utilizes index scans for filtering operations on `posts.user_id`, `follows.user_id_following`, `follows.user_id_followed`, `likes.post_id`, and `likes.user_id`.
- **SC-004**: Execution of the migration succeeds on databases with pre-existing duplicate records due to successful automated deduplication.
- **SC-005**: Execution of the down migration leaves the database in its exact prior structural state without dropping tables or columns.

## Assumptions

- The database engine is PostgreSQL.
- Existing duplicate rows in `likes` and `follows` can be safely deduplicated by keeping the oldest record and deleting subsequent duplicates.
- The migration will be executed within a single transactional block (`BEGIN; ... COMMIT;`) to ensure full atomicity — if any step fails (dedup or constraint creation), all changes roll back.
- App-level like/follow handlers should treat constraint violations as idempotent no-ops (return current state, not an error). Implementation of this app-level handling is outside the scope of this migration spec.
