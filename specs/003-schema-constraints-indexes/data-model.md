# Data Model: Schema Constraints & Indexes

**Branch**: `003-schema-constraints-indexes` | **Date**: 2026-04-25

## Affected Tables (No New Tables)

This migration modifies the schema of three existing tables. No new tables are created.

### likes

| Column | Type | Existing | Change |
|--------|------|----------|--------|
| `like_id` | UUID | PK | — |
| `user_id` | UUID | FK → users | **Add index** `idx_likes_user_id` |
| `post_id` | UUID | FK → posts | **Add index** `idx_likes_post_id` |
| `created_at` | TIMESTAMP | DEFAULT NOW() | — |
| *(composite)* | — | — | **Add UNIQUE** `uq_likes_user_post` on `(user_id, post_id)` |

### follows

| Column | Type | Existing | Change |
|--------|------|----------|--------|
| `id` | UUID | PK | — |
| `user_id_following` | UUID | FK → users | **Add index** `idx_follows_user_id_following` |
| `user_id_followed` | UUID | FK → users | **Add index** `idx_follows_user_id_followed` |
| `created_on` | TIMESTAMP | DEFAULT NOW() | — |
| *(composite)* | — | — | **Add UNIQUE** `uq_follows_pair` on `(user_id_following, user_id_followed)` |
| *(check)* | — | — | **Add CHECK** `chk_no_self_follow` (`user_id_following != user_id_followed`) |

### posts

| Column | Type | Existing | Change |
|--------|------|----------|--------|
| `post_id` | UUID | PK | — |
| `user_id` | UUID | FK → users | **Add index** `idx_posts_user_id` |
| *(other columns)* | — | — | No changes |

## Data-Destructive Operations

The migration includes **DELETE** operations to remove duplicate rows before adding UNIQUE constraints:

| Table | Delete Target | Keep Strategy | Timestamp Column |
|-------|---------------|---------------|------------------|
| `likes` | Duplicate `(user_id, post_id)` pairs | Keep oldest (`MIN(created_at)`) | `created_at` |
| `follows` | Duplicate `(user_id_following, user_id_followed)` pairs | Keep oldest (`MIN(created_on)`) | `created_on` |
| `follows` | Self-follow rows (`user_id_following = user_id_followed`) | Delete all | `created_on` |

## Constraint Naming Convention

All new constraints and indexes follow the project's existing naming patterns:
- Indexes: `idx_{table}_{column}`
- Unique constraints: `uq_{table}_{description}`
- Check constraints: `chk_{description}`
