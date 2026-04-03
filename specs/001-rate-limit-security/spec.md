# Feature Specification: Rate Limiting & Security Hardening

**Feature Branch**: `001-rate-limit-security`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Implement rate limiting and security hardening for the Post-It social media app. This includes: (1) Tiered rate limiting with three tiers, (2) File upload security with MIME validation, (3) Content Security Policy for XSS prevention, (4) Frontend like-button debounce, (5) Remove SELECT COUNT(*) from cursor-paginated endpoints."

## User Scenarios & Testing

### User Story 1 - Abuse Protection via Tiered Rate Limits (Priority: P1)

As a platform operator, I need the application to automatically throttle and block abusive traffic patterns so that legitimate users are not disrupted by bots, scrapers, or credential-stuffing attacks.

**Why this priority**: Without rate limiting, every endpoint is vulnerable to automated abuse. This is the highest-risk gap — brute-force login attacks and bulk scrapers can currently run unchecked.

**Independent Test**: Can be verified by sending requests exceeding each tier's threshold and confirming the correct rejection response with a retry-after indicator.

**Acceptance Scenarios**:

1. **Given** a client making requests to any endpoint, **When** the client exceeds 150 requests within a 1-minute window, **Then** the system returns a 429 status with a Retry-After header indicating when the client may resume.
2. **Given** a client attempting to log in or register, **When** the client exceeds 5 requests within a 15-minute window, **Then** the system returns a 429 status with a Retry-After header.
3. **Given** an authenticated user creating posts, comments, or likes, **When** the user exceeds 25 creation requests within a 1-minute window, **Then** the system returns a 429 status with a Retry-After header.
4. **Given** a legitimate user scrolling through the feed at a normal pace (under 150 requests/min), **When** they interact with the app, **Then** all requests succeed without interruption.

---

### User Story 2 - Secure File Uploads (Priority: P1)

As a platform operator, I need user-uploaded files to be validated for type and size before being stored so that malicious files (renamed executables, oversized payloads) cannot exploit the upload endpoint for attacks or storage exhaustion.

**Why this priority**: The upload endpoint currently accepts any file type and size with no validation. This is a critical security vulnerability — a malicious user could upload executable scripts or exhaust server storage with no limit.

**Independent Test**: Can be verified by attempting uploads of disallowed file types (e.g., a .exe renamed to .png), oversized files (>5MB), and path-traversal folder names, and confirming each is rejected with a clear error message.

**Acceptance Scenarios**:

1. **Given** a user uploading a valid JPEG, PNG, WebP, or GIF image under 5MB, **When** the upload completes, **Then** the file is stored and its path is returned.
2. **Given** a user uploading a file that is not a JPEG, PNG, WebP, or GIF image, **When** the upload is attempted, **Then** the system rejects the file with a clear error indicating the allowed file types.
3. **Given** a user uploading an image exceeding 5MB, **When** the upload is attempted, **Then** the system rejects the file with a clear error indicating the maximum file size.
4. **Given** a user supplying a folder name containing path traversal characters (e.g., `../`, `..\\`), **When** the upload is attempted, **Then** the system rejects the request with a clear error (no silent sanitization).
5. **Given** a file with a `.png` extension but actual content is an executable, **When** the upload is attempted, **Then** the system inspects the actual file content (not the extension) and rejects it.

---

### User Story 3 - XSS Prevention via Content Security Policy (Priority: P2)

As a platform operator, I need the application to instruct browsers to only execute scripts from verified origins so that user-generated content containing malicious scripts is neutralized and cannot execute in other users' browsers.

**Why this priority**: The platform already uses security headers, but the Content Security Policy is not explicitly configured. While important, XSS prevention is a defense-in-depth measure complementing the existing security header setup.

**Independent Test**: Can be verified by injecting a script tag into a user-generated field and confirming the browser blocks its execution, and by inspecting response headers for the correct CSP directive.

**Acceptance Scenarios**:

1. **Given** the application serves any page, **When** the response headers are inspected, **Then** a Content-Security-Policy header is present that restricts script sources to the application's own domain.
2. **Given** a user submitting a post containing a `<script>` tag, **When** another user views that post, **Then** the browser does not execute the script.
3. **Given** the application in development mode, **When** the response headers are inspected, **Then** the CSP allows necessary development tools (e.g., localhost origins, unsafe-eval for hot-reloading) without compromising production security.

---

### User Story 4 - Efficient Feed Interaction (Priority: P2)

As a highly active user who rapidly likes multiple posts, I need the application to respond instantly to my interactions while efficiently communicating with the server so that my experience feels fast and responsive without overwhelming the platform.

**Why this priority**: Performance optimization that improves user experience and reduces unnecessary server load. Each rapid click currently triggers a separate server request, and loading a feed triggers N+1 requests to check like status, causing high latency and redundant API calls.

**Independent Test**: Can be verified by rapidly clicking the like button 10 times within 1 second and confirming the UI updates instantly but only 1 server request is sent after the clicks settle.

**Acceptance Scenarios**:

1. **Given** a user viewing their feed, **When** the user clicks the like button on a post, **Then** the UI instantly reflects the liked state without waiting for a server response.
2. **Given** a user rapidly clicking the like button multiple times within 500ms, **When** the clicks settle, **Then** only a single server request is sent reflecting the final state (liked or unliked).
3. **Given** a user scrolling through a feed with many posts, **When** the feed loads, **Then** the system fetches posts using cursor-based pagination without executing a total-count query, and includes the "is-liked" status for each post in the primary response to avoid N+1 check requests.
4. **Given** a debounced like action that ultimately fails on the server, **When** the error is received, **Then** the UI reverts to the previous state and shows an appropriate error message (Global Toast).

---

### Edge Cases

- What happens when a rate-limited user has an active session and the limit resets — do pending requests automatically succeed?
  → **Resolution**: Pending requests do NOT automatically retry. The client receives a 429 and must respect the `Retry-After` header. No server-side queuing.
- What happens when two concurrent uploads from the same user hit the size limit simultaneously?
  → **Resolution**: Each upload is validated independently. If both exceed the limit, both are rejected with 413. No partial acceptance.
- What happens when a user's debounced like request is still in flight and the user navigates away from the page?
  → **Resolution**: The request completes server-side (idempotent like/unlike). No abort controller needed. UI state on the new page is independent.
- What happens when the MIME-type inspection yields an ambiguous result (e.g., a valid image with extra metadata appended)?
  → **Resolution**: Reject the file. If `file-type` cannot conclusively identify the MIME, the file is treated as disallowed. Strict validation: only files with a detected MIME matching the allowlist are accepted.
- What happens when a file has valid magic bytes (passes MIME check) but is corrupted or truncated (e.g., a partial JPEG)?
  → **Resolution**: Accept the file. The upload endpoint validates content type via magic bytes only, not file integrity. Storage of a corrupted image is a quality issue, not a security issue. The frontend should handle display failures gracefully (broken image icon). Adding full image integrity validation is out of scope for this iteration.
- What happens if a CSP-compliant inline script is needed for a third-party integration in the future?
  → **Resolution**: Out of scope for this iteration. Future integrations would require a constitution amendment to update CSP directives.
- What happens when multiple legitimate users share a single IP address (NAT/corporate network) and collectively exceed the 150/min global limit?
  → **Resolution**: Known limitation. The 150 req/min global limit applies per IP. Users behind shared NAT may hit limits faster. Authenticated content-creation tier (25/min per user ID) mitigates this for logged-in users. Future: consider user-ID-based keys for global tier when authenticated.
- What happens on a fresh Redis instance with no existing rate limit counters?
  → **Resolution**: Counters start at 0 for each new client key. This is the default behavior of express-rate-limit with rate-limit-redis — the first request from any client creates a new counter. No special initialization is required.
- What happens when Redis is unavailable during a rate limit check (connection failure, timeout)?
  → **Resolution**: Fail-open. If Redis cannot be reached, the rate limiter MUST allow the request to proceed and log a structured error (source IP, endpoint, "rate-limit-store-unavailable"). This prevents a Redis outage from blocking all traffic. The `redis.ts` client should handle reconnection automatically via ioredis defaults. A monitoring alert should be configured for sustained Redis connection failures.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST enforce a global rate limit of 150 requests per minute per client identity across all endpoints.
- **FR-002**: The system MUST enforce a strict rate limit of 5 requests per 15 minutes per client identity on login and registration endpoints only.
- **FR-003**: The system MUST enforce a rate limit of 25 requests per minute per authenticated user on content creation actions (creating posts, comments, and liking).
- **FR-004**: When any rate limit is exceeded, the system MUST return an HTTP 429 response using the application's standardized error response envelope, with a Retry-After header indicating the time before the client may retry.
- **FR-005**: The system MUST validate the actual content type of uploaded files using internal file signature inspection, not the file extension or declared content type.
- **FR-006**: The system MUST only accept uploaded files whose content type matches an explicit allow-list: JPEG, PNG, WebP, and GIF images, uniformly across all upload contexts (avatars, cover photos, post images). The application has a single upload endpoint (`POST /api/upload`) handling all upload contexts via a `folder` parameter — validation applies uniformly at this endpoint.
- **FR-007**: The system MUST reject any uploaded file larger than 5 megabytes.
- **FR-008**: The system MUST reject (not sanitize) any upload request containing path traversal characters in user-supplied directory path components.
- **FR-009**: The system MUST include a Content-Security-Policy header in all responses that restricts `script-src` to 'self', `object-src` to 'none', and `base-uri` to 'self'.
- **FR-010**: The system MUST allow development-specific CSP relaxations (localhost, unsafe-eval) only in non-production environments.
- **FR-011**: The system MUST store rate limit counters in a shared Redis instance to ensure global consistency across multiple app servers. Production Redis hardening (authentication, TLS, Sentinel) is out of scope for this iteration; the implementation uses a single `REDIS_URL` environment variable.
- **FR-012**: The system MUST identify unique clients using their source IP address (via `X-Forwarded-For` or similar headers) for unauthenticated tiered rate limits. The system MUST use the first IP in the `X-Forwarded-For` header (leftmost value) as the client identity and configure Express `trust proxy` appropriately for the deployment environment.
- **FR-013**: The client MUST update the like/unlike UI state instantly upon user interaction, before receiving a server response.
- **FR-014**: The client MUST collapse rapid like/unlike interactions within a 500-millisecond window into a single server request reflecting the final state, with an independent debounce timer per post (liking different posts in quick succession sends separate requests per post).
- **FR-015**: The client MUST revert the like/unlike UI state and display a global toast error notification if the debounced server request fails.
- **FR-016**: The system MUST include the authenticated user's "is-liked" status for each post within the primary feed response payload to eliminate N+1 individual check requests.
- **FR-017**: The system MUST NOT execute total-count queries on cursor-paginated endpoints, including user lists and friend lists.
- **FR-018**: The system MUST derive pagination metadata (has-more indicator, next/previous cursors) solely from the cursor state and returned data, without counting total records.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Credential-stuffing attacks are blocked after 5 failed attempts per 15-minute window per attacker identity.
- **SC-002**: Users can scroll and interact with the feed normally (under 150 requests/min) without ever encountering a rate limit response.
- **SC-003**: No file with a disallowed content type or exceeding the size limit is stored on the server — 100% rejection rate for invalid uploads.
- **SC-004**: A user clicking the like button 10 times in 2 seconds results in at most 1 server request.
- **SC-005**: Loading a 20-post feed results in exactly 0 secondary requests for "is-liked" status (data must be bundled in primary feed response).
- **SC-006**: Feed pagination response times remain consistent regardless of total data volume (no degradation as the dataset grows from thousands to millions of records).
- **SC-007**: Injected script tags in user-generated content are blocked from executing in 100% of tested browsers.

### Observability Requirements

- **OR-001**: The system MUST export Prometheus-compatible metrics for all HTTP 429 response codes, labeled by endpoint name.
  > **Scope Note (2026-04-03)**: OR-001 (Prometheus metrics) is deferred to a follow-up iteration. Initial implementation relies on structured logging (OR-002) for 429 observability. A Prometheus metrics endpoint with `prom-client` instrumentation will be added in a subsequent feature.
- **OR-002**: The system MUST log every blocked request (429) with a structured payload containing the source IP, target endpoint, and the specific enforcement point (rate limit tier, upload validation, CSP), across all 429-producing middleware and routes.

## Assumptions

- Rate limit thresholds (150/min global, 5/15min auth, 25/min content creation) are appropriate for initial launch and may require tuning based on production traffic patterns.
- The application's verified origin for CSP is the same domain serving the application; no third-party script dependencies exist beyond the application itself in production.
- Authenticated users are identified by their unique user identity for content-creation rate limiting, while unauthenticated endpoints use the client's network address.
- The file upload endpoint only needs to support images (JPEG, PNG, WebP, and GIF); no video, document, or audio upload support is in scope.
- Cursor-paginated endpoints currently return a total count that the frontend may use; if the frontend depends on total count, it will need to be adapted to use only has-more/cursor metadata.
- Development mode CSP relaxations include allowing localhost origins and unsafe-eval for hot module replacement.

## Clarifications

### Session 2026-04-02

- Q: Rate Limiting Storage & Synchronization → A: Shared Redis (Global consistency across all app instances).
- Q: Client Identity Definition → A: IP Address (via headers like `X-Forwarded-For`).
- Q: Monitoring & Observability → A: Metrics + Logs (High-level counts and detailed audit logs of all 429 events).
- Q: Content Security Policy (CSP) Policy Breadth → A: Balanced Policy (`script-src 'self'`, `object-src 'none'`, `base-uri 'self'`).
- Q: UX for Interaction Failures → A: Global Toast (Non-blocking notifications for throttled or failed requests).
- Q: N+1 Like-Check on Feed Load → A: Embed is-liked status in primary feed response payload (eliminates N+1 individual check requests).
- Q: MIME Allowlist (GIF Support) → A: JPEG, PNG, WebP, and GIF uniformly across all upload contexts (avatars, cover photos, post images).
- Q: Path Traversal Handling → A: Reject ( not sanitize) — fail fast with clear error, no silent sanitization.
- Q: Debounce Behavior Across Multiple Posts → A: Independent debounce timer per post (liking different posts in quick succession sends separate requests per post).
