# Feature Specification: Bookmark Posts

**Feature Branch**: `004-bookmark-posts`
**Created**: 2026-04-25
**Status**: Draft
**Input**: User description: "Allow users to bookmark/save posts for later viewing in the post-it social app. Users can maintain a private collection of saved posts, view them in a dedicated feed, and remove bookmarks."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bookmark a Post (Priority: P1)

A logged-in user browsing their feed sees an interesting post they want to revisit later. They tap a bookmark icon on the post, and the post is saved to their private bookmarks collection. The icon visually confirms the bookmark was saved.

**Why this priority**: This is the core action — without the ability to save, no other bookmark functionality matters. It delivers immediate value by letting users flag content for later.

**Independent Test**: Can be fully tested by having a logged-in user view any post and tap the bookmark icon, confirming the visual indicator appears and the post appears in their saved collection.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing a post, **When** they tap the bookmark icon, **Then** the post is saved to their bookmarks and the icon reflects the bookmarked state
2. **Given** a logged-in user viewing a post they have already bookmarked, **When** they view the post, **Then** the bookmark icon already shows the bookmarked state
3. **Given** a user who is not logged in, **When** they attempt to bookmark a post, **Then** they are prompted to log in first
4. **Given** a logged-in user viewing a bookmarked post, **When** they tap the bookmark icon again, **Then** the bookmark is removed and the icon reflects the unbookmarked state

---

### User Story 2 - View Bookmarked Posts Feed (Priority: P2)

A user wants to revisit all the posts they have saved. They navigate to their bookmarks feed and see a paginated list of their bookmarked posts, ordered by the most recently saved first. They can scroll through and interact with these posts just like in the main feed.

**Why this priority**: Viewing saved content is the second half of the bookmark loop (save → retrieve). Without it, bookmarks have no practical value.

**Independent Test**: Can be fully tested by bookmarking several posts, navigating to the bookmarks feed, and confirming all bookmarked posts appear in reverse-chronological order with pagination working as expected.

**Acceptance Scenarios**:

1. **Given** a user with 5 or more bookmarked posts, **When** they open their bookmarks feed, **Then** they see the most recently bookmarked posts first, with older posts loadable via pagination
2. **Given** a user with no bookmarked posts, **When** they open their bookmarks feed, **Then** they see an empty state message indicating no saved posts
3. **Given** a user scrolling their bookmarks feed, **When** they reach the end of the current page, **Then** the next set of bookmarked posts loads seamlessly

---

### User Story 3 - Remove a Bookmark (Priority: P3)

A user no longer needs a saved post and wants to remove it from their bookmarks. They can unbookmark it from either the bookmarks feed or the post detail view.

**Why this priority**: Cleanup is important for long-term usability but less critical than saving and viewing. Users can function without removing bookmarks.

**Independent Test**: Can be fully tested by bookmarking a post, navigating to the bookmarks feed, unbookmarking it, and confirming it disappears from the feed.

**Acceptance Scenarios**:

1. **Given** a user viewing their bookmarks feed, **When** they unbookmark a post, **Then** the post is removed from their bookmarks feed immediately
2. **Given** a user viewing a bookmarked post in the main feed, **When** they unbookmark it, **Then** the bookmark indicator updates and the post is removed from their bookmarks collection
3. **Given** a user who has just unbookmarked a post, **When** they refresh their bookmarks feed, **Then** the post no longer appears

---

### Edge Cases

- What happens when a user tries to bookmark a post that has been deleted? The bookmark action should fail gracefully with a clear message that the post no longer exists.
- What happens when a user tries to bookmark a post they have already bookmarked? The toggle removes the existing bookmark (idempotent toggle semantics).
- What happens when the same post is bookmarked and then its author deletes it? All bookmarks for that post should be automatically removed.
- What happens when a user account is deleted? All of that user's bookmarks should be automatically removed.
- What happens if the bookmarks feed is accessed while the user's session has expired? The user should be redirected to log in.
- What happens with very large bookmark collections (hundreds or thousands)? Pagination should handle this smoothly without performance degradation.
- What happens if a user tries to unbookmark a post they never bookmarked? Return a not-found error.
- What happens if a post is soft-deleted while bookmarked? Treat as non-existent — remove bookmarks and reject new bookmark attempts.
- What happens if a user attempts to access another user's bookmarks? Return an authorization error.
- What happens with concurrent toggle requests on the same post? Database-level uniqueness constraint prevents duplicates; the existence check resolves the toggle direction.

## Clarifications

### Session 2026-04-25

- Q: Should there be bookmark collections/folders, or a flat list? → A: Flat list — no folders or collections in this version
- Q: Should there be a limit on how many posts a user can bookmark? → A: No limit initially
- Q: Should the bookmark toggle return the full post data, or just the bookmark record? → A: Return the bookmark record with post_id reference only

### Session 2026-04-25 (Checklist Gap Resolution)

- Q: Toggle endpoint design — single toggle or separate add/remove? → A: Single toggle endpoint; tap on unbookmarked post adds bookmark, tap on bookmarked post removes it
- Q: What does unbookmark return? → A: Confirmation response with removed bookmark ID (no record body since it no longer exists)
- Q: Default and max page size for bookmarks feed? → A: Default 20, max 50 per page
- Q: Pagination metadata fields? → A: Match existing feed — include has_more flag and next_cursor
- Q: is_bookmarked on post responses — which endpoints, what default? → A: All post-bearing endpoints; false for unauthenticated users
- Q: Batch lookup for is_bookmarked? → A: Must be resolved via batch lookup, not per-post queries
- Q: Can users bookmark their own posts? → A: Yes — "any existing post" includes own posts
- Q: Unbookmark a post never bookmarked? → A: Return not-found error
- Q: Soft delete interaction? → A: If soft deletes exist, treat soft-deleted posts as non-existent for bookmark purposes — same behavior as hard delete
- Q: Blocked users interaction? → A: Out of scope — blocking feature does not exist yet; revisit when implemented
- Q: Rate limit tier for bookmarks? → A: Bookmark toggle = content creation tier; bookmarks feed = global baseline tier
- Q: Race condition — post deleted during bookmark toggle? → A: Database-level uniqueness constraint and post existence check guarantee consistency; return appropriate error if post vanishes mid-operation
- Q: Cascade delete side effects? → A: None — bookmarks are private, no counters or notifications triggered on removal
- Q: Bookmark counts exposed anywhere? → A: No — explicitly excluded from all public-facing endpoints, post entities, and user profiles

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to bookmark any existing post
- **FR-002**: System MUST allow authenticated users to remove their own bookmarks (unbookmark)
- **FR-003**: System MUST prevent duplicate bookmarks for the same user and post combination
- **FR-004**: System MUST provide a dedicated bookmarks feed showing all posts bookmarked by the requesting user, ordered by most recently saved first
- **FR-005**: System MUST support cursor-based pagination on the bookmarks feed
- **FR-006**: System MUST automatically remove all bookmarks associated with a post when that post is deleted
- **FR-007**: System MUST automatically remove all bookmarks associated with a user when that user account is deleted
- **FR-008**: System MUST display a visual bookmark indicator on each post showing whether the requesting user has bookmarked it
- **FR-009**: System MUST keep bookmarks private — no endpoint or interface may expose another user's bookmarks
- **FR-010**: System MUST require authentication for all bookmark operations (add, remove, view feed)
- **FR-011**: System MUST return a clear error when a user attempts to bookmark a post that does not exist
- **FR-012**: System MUST return an empty collection with appropriate metadata when a user has no bookmarks
- **FR-013**: The bookmark toggle operation MUST return only the bookmark record (bookmark ID, post ID, user ID, timestamp) without embedding the full post data
- **FR-014**: The bookmark toggle MUST be a single endpoint that creates a bookmark if absent or removes it if present (add on unbookmarked, remove on bookmarked). Response shape differs by action: bookmarked returns the full bookmark record (FR-013), unbookmarked returns a confirmation with the removed bookmark ID (FR-015)
- **FR-015**: On successful bookmark removal, the system MUST return a confirmation containing the removed bookmark ID
- **FR-016**: The bookmarks feed MUST return a default of 20 results per page with a maximum allowable page size of 50
- **FR-017**: Paginated bookmark feed responses MUST include a has_more boolean and a next_cursor value for fetching the subsequent page
- **FR-018**: The pagination cursor format MUST be consistent with the existing feed pagination pattern
- **FR-019**: All post-bearing responses (feed, profile, search, bookmarks feed) MUST include an is_bookmarked boolean indicating whether the requesting user has bookmarked that post
- **FR-020**: The is_bookmarked field MUST default to false for unauthenticated users (forward-looking: applies when public post endpoints are introduced; all current post endpoints require authentication)
- **FR-021**: The is_bookmarked field MUST be determined via batch lookup across all posts in a response to avoid per-post query overhead
- **FR-022**: Bookmark counts MUST NOT be exposed on any post entity, user profile, or public-facing endpoint
- **FR-023**: Users attempting to unbookmark a post they have not bookmarked MUST receive a not-found error
- **FR-024**: If a post is soft-deleted, it MUST be treated as non-existent for all bookmark operations (same behavior as hard delete)
- **FR-025**: Authenticated users attempting to access or manipulate bookmarks belonging to another user MUST receive an authorization error
- **FR-026**: No side effects (notifications, counters, cache events) MUST be triggered when bookmarks are created or removed

### Key Entities

- **Bookmark**: Represents a user's saved reference to a post. Each bookmark links one user to one post with a timestamp of when it was saved. Bookmarks are stored in a single flat list per user (no folders or collections). A user can have many bookmarks with no upper limit, and a post can have many bookmarks (from different users), but the combination of user and post must be unique. Bookmarks are automatically removed when either the referenced user or post is deleted.
- **Post**: An existing entity in the system. The bookmark feature adds a relationship between users and posts without modifying the post itself.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can bookmark or unbookmark a post within 1 second of tapping the bookmark icon
- **SC-002**: The bookmarks feed loads the first page of results within 2 seconds
- **SC-003**: Each bookmarks feed page must load in under 2 seconds regardless of the total number of bookmarks a user has accumulated
- **SC-004**: 100% of bookmarks are private — no user can discover or access another user's bookmarks through any interface
- **SC-005**: 90% of users who bookmark at least one post return to view their bookmarks feed within 7 days
- **SC-006**: Bookmarking a post the user has already bookmarked does not create a duplicate entry

## Assumptions

- Users are already authenticated through the existing authentication system; this feature does not introduce new auth mechanisms
- The existing post entity and feed infrastructure are available for extending with bookmark functionality
- Bookmarks are stored as a single flat list per user — no folders, collections, or organizational grouping in this version
- Bookmark collections are personal and private by default — there is no social sharing or public bookmark profile in scope
- The maximum number of bookmarks a user can accumulate is not capped in this version (no per-user limit)
- Bookmark counts or statistics (e.g., total number of saved posts) are not displayed on user profiles to maintain privacy
- The existing pagination pattern used in the main feed will be reused for the bookmarks feed
- Notifications are not sent when a post is bookmarked (bookmarks are private actions)
- Bookmark toggle and feed endpoints will enforce rate limits aligned with existing tiers (toggle = content creation tier, feed = global baseline tier)
- The blocking feature does not exist yet; bookmark behavior in the presence of blocked users is out of scope and will be revisited when blocking is implemented
- Database-level constraints (unique on user_id + post_id, cascade deletes) guarantee data integrity regardless of application-layer bugs
- All new bookmark endpoints will follow the existing standardized response envelope
- Frontend 500ms debounce on bookmark toggle (Constitution §VIII) is tracked as a follow-up to be implemented when the bookmark UI is built
