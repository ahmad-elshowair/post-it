# Data Model: Bookmark Posts

**Feature**: 004-bookmark-posts
**Date**: 2026-04-25

## Entity: Bookmark

Represents a user's saved reference to a post. Private, flat, no folders.

| Column        | Type          | Constraints                                            | Description           |
| ------------- | ------------- | ------------------------------------------------------ | --------------------- |
| `bookmark_id` | `UUID`        | `PRIMARY KEY DEFAULT uuid_generate_v4()`               | Surrogate primary key |
| `user_id`     | `UUID`        | `NOT NULL REFERENCES users(user_id) ON DELETE CASCADE` | Bookmark owner        |
| `post_id`     | `UUID`        | `NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE` | Saved post            |
| `created_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                               | When bookmarked       |

### Constraints

| Name                         | Definition                                                          | Purpose                                    |
| ---------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `bookmarks_pkey`             | `PRIMARY KEY (bookmark_id)`                                         | Surrogate PK                               |
| `bookmarks_user_post_unique` | `UNIQUE (user_id, post_id)`                                         | Prevent duplicate bookmarks (FR-003)       |
| `bookmarks_user_id_fkey`     | `FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE` | Remove bookmarks on user deletion (FR-007) |
| `bookmarks_post_id_fkey`     | `FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE` | Remove bookmarks on post deletion (FR-006) |

### Indexes

| Name                         | Definition                                            | Purpose                                          |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| `idx_bookmarks_user_id`      | `CREATE INDEX ON bookmarks(user_id)`                  | Fast lookup of user's bookmarks (feed query)     |
| `idx_bookmarks_post_id`      | `CREATE INDEX ON bookmarks(post_id)`                  | Fast cascade delete + is_bookmarked JOIN         |
| `idx_bookmarks_user_created` | `CREATE INDEX ON bookmarks(user_id, created_at DESC)` | Covers the paginated feed query (FR-004, FR-005) |

### Relationships

```
users 1 ──── ∞ bookmarks ∞ ──── 1 posts
```

- A user has many bookmarks. A post has many bookmarks (from different users).
- Both relationships are CASCADE DELETE: deleting either end removes all related bookmarks.
- The UNIQUE(user_id, post_id) constraint ensures a user can bookmark a post at most once.

## Entity Changes: Post (Existing)

No schema change to `posts` table. The `is_bookmarked` field is computed at query time via LEFT JOIN in the feed query, identical to the existing `is_liked` pattern.

## SQL DDL

### Up Migration

```sql
-- ───── BOOKMARKS TABLE ──────────────────────────────
CREATE TABLE bookmarks (
  bookmark_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookmarks_user_post_unique UNIQUE (user_id, post_id)
);

-- ───── PERFORMANCE INDEXES ──────────────────────────────
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_post_id ON bookmarks(post_id);
CREATE INDEX idx_bookmarks_user_created ON bookmarks(user_id, created_at DESC);
```

### Down Migration

```sql
DROP TABLE IF EXISTS bookmarks;
```
