# Feature Specification: Fix Auth Rate Limiter Blocking Legitimate Users

**Feature Branch**: `002-fix-auth-rate-limit`
**Created**: 2026-04-04
**Status**: Draft
**Input**: User description: "Fix rate limiter that blocks legitimate users. The authLimiter (5 req/15min) is currently applied to ALL /auth/* routes including refresh-token and is-authenticated. Page refresh consumes 2-3 quota slots, so after 2 refreshes the user gets 429 'too many requests' and cannot even log in."

## Clarifications

### Session 2026-04-04

- Q: Should the refresh token rate limit key by IP address, authenticated user ID, or hybrid? → A: Per refresh token cookie hash — the limiter runs before auth middleware (FR-010), so `req.user` is unavailable. Hashing the `refresh_token` cookie provides per-user identity without requiring authentication, preventing NAT collisions.
- Q: Should the session status check endpoint have its own dedicated limiter or share the global limiter? → A: Global limiter only (150 req/min) — sufficient for a read-only, idempotent endpoint that requires valid credentials.
- Q: Should the refresh rate limit threshold be adjusted from 30 req/min? → A: 30 req/min confirmed — balanced between normal usage and abuse prevention.
- Q: Should login and registration share a single limiter with per-route prefixes, or use separate limiter instances? → A: Separate limiter instances — one for login, one for register — providing full counter isolation.
- Q: Should the logout endpoint have any additional rate limit beyond the global 150 req/min? → A: Global limiter only (150 req/min) — sufficient for an idempotent, one-time-per-session action.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Normal Browsing Without Lockout (Priority: P1)

As a registered user, I need to be able to refresh pages and resume my session without being blocked, so that normal browsing behavior (page refreshes, returning after a brief absence) does not result in a "too many requests" error that prevents me from accessing my account.

**Why this priority**: This is a blocking production bug. Legitimate users are being locked out of their accounts during normal usage. Every page refresh consumes rate limit quota meant only for brute-force protection, making the app unusable after just a few refreshes.

**Independent Test**: Can be verified by refreshing the page 5+ times in quick succession and confirming no 429 error occurs, then logging out and logging back in successfully.

**Acceptance Scenarios**:

1. **Given** an authenticated user browsing the application, **When** the user refreshes the page 5 times within 2 minutes, **Then** all page loads succeed without a "too many requests" error.
2. **Given** an authenticated user whose access credentials have expired, **When** the application automatically attempts to renew the session in the background, **Then** the renewal succeeds and the user remains logged in.
3. **Given** an authenticated user who has refreshed the page multiple times, **When** the user navigates to the login page and submits credentials, **Then** the login succeeds without a "too many requests" error.

---

### User Story 2 - Brute-Force Protection Maintained (Priority: P1)

As a platform operator, I need the strict rate limit on registration and login to remain effective against brute-force attacks, so that credential-stuffing and automated account creation are still blocked after 5 attempts per 15-minute window.

**Why this priority**: Equal priority to US1 because the fix must not weaken existing security protections. The strict 5-request limit on credential endpoints must be preserved exactly as-is.

**Independent Test**: Can be verified by sending 6 rapid login attempts and confirming the 6th is blocked with a 429 status and a retry-after indicator.

**Acceptance Scenarios**:

1. **Given** an unauthenticated client attempting to log in, **When** the client exceeds 5 login attempts within a 15-minute window, **Then** the system returns a 429 status with a retry-after indicator.
2. **Given** an unauthenticated client attempting to register, **When** the client exceeds 5 registration attempts within a 15-minute window, **Then** the system returns a 429 status with a retry-after indicator.
3. **Given** a client that has been rate-limited on login, **When** the client attempts to register a new account, **Then** the registration is allowed if the registration limit has not been exceeded (separate counters).

---

### User Story 3 - Token Refresh Abuse Prevention (Priority: P2)

As a platform operator, I need the token refresh endpoint to have its own dedicated rate limit that is stricter than the global baseline but more lenient than the login/register tier, so that normal session renewals work freely while automated token refresh abuse is prevented.

**Why this priority**: Important for defense-in-depth but less critical than the primary bug fix (US1) and security preservation (US2). A dedicated refresh limiter prevents a compromised client from flooding the token refresh endpoint.

**Independent Test**: Can be verified by sending 31 rapid token refresh requests and confirming the 31st is blocked with a 429 status.

**Acceptance Scenarios**:

1. **Given** an authenticated client renewing session credentials, **When** the client exceeds 30 refresh requests within a 1-minute window, **Then** the system returns a 429 status with a retry-after indicator.
2. **Given** a legitimate user whose session credentials expire every 15 minutes, **When** the user browses the app normally over 30 minutes (triggering 2 automatic refreshes), **Then** both refreshes succeed without interruption.

---

### Edge Cases

- What happens when a user's token refresh is rate-limited and they also attempt to log in?
  → **Resolution**: The login and refresh limits are independent. A rate-limited refresh does not block login, and vice versa.
- What happens when two legitimate users share a single IP address (NAT/corporate network)?
  → **Resolution**: Known limitation — rate limits apply per IP for unauthenticated endpoints (login, register). The token refresh limiter keys by refresh token cookie hash, not IP, mitigating NAT impact for all users with an active refresh token.
- What happens when a rate-limited user waits for the window to expire?
  → **Resolution**: The counter resets after the window expires. The user can resume normal activity immediately.
- What happens when the background session check and an explicit user action trigger simultaneous refreshes?
  → **Resolution**: Each request is counted independently. The 30 req/min refresh allowance is generous enough to handle concurrent refreshes without blocking legitimate use.
- What happens to the existing auth rate limit counter data during the migration?
  → **Resolution**: Existing Redis counters for the old blanket auth limiter will naturally expire via TTL. No manual cleanup is required.
- What happens when an attacker alternates between login and register attempts to probe both endpoints simultaneously?
  → **Resolution**: Counters are fully independent (FR-006) — alternating provides no advantage over targeting a single endpoint.
- What happens when an attacker uses multiple IP addresses to target a single account's login?
  → **Resolution**: Known limitation — login rate limiting is per-IP (FR-001). Distributed brute-force (many IPs, one account) is outside this feature's scope and would require additional mechanisms such as account lockout or CAPTCHA.
- What happens when concurrent requests hit different rate limit tiers from the same client?
  → **Resolution**: Each tier counts independently (FR-005) — concurrent requests across tiers do not interfere with each other's counters.
- What happens during the migration when old and new rate limit counters coexist?
  → **Resolution**: Old counters expire within 15 minutes via TTL. During the coexistence window, requests are protected by at least the new per-route limiters, which are applied before the old blanket limiter is removed.
- What happens if the new per-route limiters cause issues and need to be rolled back?
  → **Resolution**: The old blanket limiter can be safely re-applied — old Redis keys persist for up to 15 minutes after migration, and the new route-specific keys are additive rather than destructive.
- What happens when the rate limit store becomes temporarily unreachable?
  → **Resolution**: The system uses a fail-open strategy — requests proceed without rate limiting when the store is unavailable. Security events (store failures, rate limit triggers) are logged with tier type, client identifier, and endpoint path, excluding any sensitive data (passwords, tokens).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST restrict the strict authentication rate limit (5 requests per 15 minutes per client) to apply ONLY to the login and registration endpoints, using separate limiter instances with independent counters for each endpoint.
- **FR-002**: The system MUST enforce a dedicated rate limit of 30 requests per minute per refresh token cookie hash (not per IP address) on the token refresh endpoint, separate from both the authentication and global tiers. The limiter runs before token validation (FR-010), so keying by cookie hash provides per-user identity without requiring an authenticated session.
- **FR-003**: The session status check and logout endpoints MUST be subject only to the global rate limit (150 requests per minute per client) and MUST NOT be subject to the stricter authentication rate limit.
- **FR-004**: When any rate limit is exceeded, the system MUST return an HTTP 429 response with a retry-after header, consistent with the existing rate limit behavior.
- **FR-005**: Each rate limit tier MUST maintain independent counters — being rate-limited on one tier MUST NOT affect quotas on other tiers.
- **FR-006**: The login and registration endpoints MUST share NO rate limit counter — exceeding the login limit MUST NOT block registration attempts, and vice versa.
- **FR-007**: A legitimate user performing normal browsing activities — defined as up to 10 page refreshes and 5 automatic session renewals within a 15-minute session — MUST NEVER encounter a rate limit response.
- **FR-008**: Error responses from rate limit violations MUST NOT disclose internal security configuration details such as tier names, counter values, or internal identifiers beyond what is required by standard headers (Retry-After, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset).
- **FR-009**: The system MUST log security-relevant rate limit events (limit exceeded, store failure triggering fail-open) including the event type, client identifier, and targeted endpoint. Logged events MUST NOT include sensitive data such as passwords or tokens.
- **FR-010**: The rate limit check on the refresh endpoint MUST execute before token validation, ensuring that invalid or revoked tokens are still subject to rate limiting to prevent token-probe abuse.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can refresh any page 10 times within 2 minutes and encounter zero "too many requests" errors.
- **SC-002**: A user can successfully log in immediately after performing 5+ page refreshes.
- **SC-003**: An attacker submitting 6 login attempts within 15 minutes is blocked on the 6th attempt with a clear retry-after indicator.
- **SC-004**: An attacker submitting 31 token refresh requests within 1 minute is blocked on the 31st attempt.
- **SC-005**: Login and registration rate limit counters are fully independent — exhausting one has zero impact on the other.

## Assumptions

- The existing global rate limit (150 req/min) and content creation rate limit (25 req/min) are correctly configured and require no changes.
- The rate limit counter storage backend (shared store) remains the same as currently configured.
- Rate limit thresholds (5/15min for auth, 30/min for refresh, 150/min global) are appropriate for current traffic and may require tuning based on production patterns.
- The client's current error handling for 429 responses is sufficient and requires no changes.
- The existing safeSendCommand error handling (dangling promise suppression) fix is already applied and does not need to be revisited.
- The rate limiting strategy addresses single-source brute-force attacks (one IP targeting one endpoint). Distributed brute-force (multiple IPs coordinating against one account) is outside this feature's scope and would require additional mechanisms (e.g., account lockout, CAPTCHA).
- No request will bypass rate limiting entirely during the migration — the per-route limiters are applied before the old blanket limiter is removed.
