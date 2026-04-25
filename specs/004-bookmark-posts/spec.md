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
- What happens when a user tries to bookmark a post they have already bookmarked? The system should prevent duplicates and treat it as a no-op or toggle to unbookmark.
- What happens when the same post is bookmarked and then its author deletes it? All bookmarks for that post should be automatically removed.
- What happens when a user account is deleted? All of that user's bookmarks should be automatically removed.
- What happens if the bookmarks feed is accessed while the user's session has expired? The user should be redirected to log in.
- What happens with very large bookmark collections (hundreds or thousands)? Pagination should handle this smoothly without performance degradation.

## Clarifications

### Session 2026-04-25

- Q: Should there be bookmark collections/folders, or a flat list? → A: Flat list — no folders or collections in this version
- Q: Should there be a limit on how many posts a user can bookmark? → A: No limit initially
- Q: Should the bookmark toggle return the full post data, or just the bookmark record? → A: Return the bookmark record with post_id reference only

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

### Key Entities

- **Bookmark**: Represents a user's saved reference to a post. Each bookmark links one user to one post with a timestamp of when it was saved. Bookmarks are stored in a single flat list per user (no folders or collections). A user can have many bookmarks with no upper limit, and a post can have many bookmarks (from different users), but the combination of user and post must be unique. Bookmarks are automatically removed when either the referenced user or post is deleted.
- **Post**: An existing entity in the system. The bookmark feature adds a relationship between users and posts without modifying the post itself.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can bookmark or unbookmark a post within 1 second of tapping the bookmark icon
- **SC-002**: The bookmarks feed loads the first page of results within 2 seconds
- **SC-003**: Users can scroll through thousands of bookmarked posts without the feed becoming sluggish or unresponsive
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
