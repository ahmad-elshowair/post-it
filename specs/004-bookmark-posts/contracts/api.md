# API Contracts: Bookmark Posts

**Feature**: 004-bookmark-posts
**Date**: 2026-04-25

All endpoints are authenticated (`authorize_user` middleware). Base path: `/api/bookmarks`.

---

## POST /api/bookmarks/:post_id

Toggle bookmark on/off for a post. Creates bookmark if absent, removes if present.

**Middleware**: `authorize_user` → `contentCreationLimiter` → `validateBookmarkAction`

**Request**:

| Field | Location | Type | Required | Description |
|-------|----------|------|----------|-------------|
| `post_id` | param | `UUID` | yes | Post to bookmark/unbookmark |

**Response (bookmark created)** — 200:

```json
{
  "success": true,
  "data": {
    "bookmark_id": "uuid",
    "post_id": "uuid",
    "user_id": "uuid",
    "created_at": "2026-04-25T12:00:00.000Z"
  }
}
```

**Response (bookmark removed)** — 200:

```json
{
  "success": true,
  "data": {
    "bookmark_id": "uuid-of-removed-bookmark",
    "action": "unbookmarked"
  }
}
```

**Error Responses**:

| Status | Condition |
|--------|-----------|
| 400 | Validation error (invalid UUID) |
| 401 | Not authenticated |
| 404 | Post does not exist |
| 429 | Rate limit exceeded |

---

## GET /api/bookmarks

List the authenticated user's bookmarked posts, paginated, newest first.

**Middleware**: `authorize_user` → `paginationValidator`

**Request**:

| Field | Location | Type | Required | Default | Description |
|-------|----------|------|----------|---------|-------------|
| `limit` | query | `integer` | no | 20 | Results per page (max 50) |
| `cursor` | query | `string` | no | — | `bookmark_id` of last item from previous page |
| `direction` | query | `string` | no | `next` | `next` or `previous` |

**Response** — 200:

```json
{
  "success": true,
  "data": [
    {
      "bookmark_id": "uuid",
      "post_id": "uuid",
      "user_id": "uuid",
      "created_at": "2026-04-25T12:00:00.000Z"
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "uuid-of-last-item",
    "previousCursor": "uuid-of-first-item"
  }
}
```

**Error Responses**:

| Status | Condition |
|--------|-----------|
| 400 | Validation error |
| 401 | Not authenticated |

---

## GET /api/bookmarks/is-bookmarked/:post_id

Check if the authenticated user has bookmarked a specific post.

**Middleware**: `authorize_user` → `validateBookmarkAction`

**Request**:

| Field | Location | Type | Required | Description |
|-------|----------|------|----------|-------------|
| `post_id` | param | `UUID` | yes | Post to check |

**Response** — 200:

```json
{
  "success": true,
  "data": {
    "isBookmarked": true
  }
}
```

**Error Responses**:

| Status | Condition |
|--------|-----------|
| 400 | Validation error (invalid UUID) |
| 401 | Not authenticated |

---

## Modified: Post Feed Responses

The `is_bookmarked` field is added to all post-bearing responses via LEFT JOIN in the model layer.

**Added field on post objects**:

| Field | Type | Description |
|-------|------|-------------|
| `is_bookmarked` | `boolean` | `true` if requesting user bookmarked this post, `false` otherwise (including unauthenticated) |

Affected endpoints: `GET /api/posts/all`, `GET /api/posts/feed`, `GET /api/posts/user/:user_id`, `GET /api/posts/:post_id`, and the bookmarks feed.

---

## Response Envelope

All responses follow the existing standardized envelope per Constitution §V:

**Success**: `{ success: true, data: T }` or `{ success: true, data: T[], pagination: {...} }`

**Error**: `{ success: false, message: string, error?: unknown }`
