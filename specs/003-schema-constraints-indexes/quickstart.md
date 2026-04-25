# Quickstart: Schema Constraints & Indexes

**Branch**: `003-schema-constraints-indexes` | **Date**: 2026-04-25

## Development Flow

This feature consists entirely of database migrations to enforce constraints and add performance indexes. It does not introduce new application code, APIs, or dependencies.

### Prerequisites
- Node.js environment
- PostgreSQL 15+ database running locally
- `db-migrate` installed in the `server/` directory

### Setting up the workspace
```bash
# 1. Start the database (assuming docker-compose setup or similar)
# docker-compose up -d db

# 2. Navigate to the server directory
cd server

# 3. Create the new migration template
pnpx db-migrate create schema-constraints-indexes --sql-file
```

### Implementing the Migration
1. Open the newly generated `migrations/sqls/<timestamp>-schema-constraints-indexes-up.sql`.
2. Write the 3-phase migration (Deduplication -> Constraints -> Indexes).
3. Open `migrations/sqls/<timestamp>-schema-constraints-indexes-down.sql`.
4. Write the rollback script (Drop Constraints -> Drop Indexes).

### Testing the Migration
```bash
# Run the migration
pnpx db-migrate up

# Test the rollback
pnpx db-migrate down

# Verify constraints manually via psql
# psql -U postgres -d postit
# \d likes
# \d follows
```

### Key Technical Guidelines
- **Idempotency**: Use `IF NOT EXISTS` for indexes and `DO $$ ... END $$` blocks for constraints.
- **Rollback Safety**: The `down.sql` must leave the schema exactly as it was, with no data deletion.
- **Atomicity**: `db-migrate` wraps `up.sql` and `down.sql` in transactions automatically, but explicit bounds are recommended if multiple statements depend on one another.
