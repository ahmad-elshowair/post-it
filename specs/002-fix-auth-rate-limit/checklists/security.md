# Security Requirements Quality Checklist: Fix Auth Rate Limiter

**Purpose**: Validate the quality, completeness, and clarity of security-related requirements before implementation begins
**Created**: 2026-04-04
**Feature**: [spec.md](../spec.md)

**Note**: This checklist tests whether the REQUIREMENTS are well-written — not whether the implementation is correct. Each item asks whether a security requirement is clearly specified, complete, and unambiguous.

## Brute-Force & Credential Stuffing Requirements

- [x] CHK001 Is the brute-force protection scope explicitly limited to specific endpoints (login, register) rather than a route glob pattern? [Completeness, Spec §FR-001]
  → FR-001 specifies "ONLY to the login and registration endpoints" using "separate limiter instances"
- [x] CHK002 Are the exact rate limit thresholds (5 req / 15 min) documented with rationale for why these values were chosen? [Clarity, Spec §FR-001]
  → Thresholds in FR-001; rationale in research.md Decision 3 (balanced against normal usage)
- [x] CHK003 Is the requirement for independent login and register counters specified with a clear definition of what "independent" means — i.e., zero shared state between the two counters? [Clarity, Spec §FR-006]
  → FR-006: "MUST share NO rate limit counter — exceeding the login limit MUST NOT block registration attempts, and vice versa"
- [x] CHK004 Is there a requirement defining the behavior when an attacker alternates between login and register attempts to probe both endpoints simultaneously? [Coverage, Edge Case]
  → Added to spec Edge Cases: "Counters are fully independent (FR-006) — alternating provides no advantage"
- [x] CHK005 Is the keying strategy for login/register rate limits (per IP vs per user) explicitly specified, including the rationale? [Clarity, Spec §FR-001]
  → FR-001 specifies "per client" (IP); research.md Decision 2 contrasts IP vs user-ID keying rationale
- [x] CHK006 Are requirements specified for protecting against distributed brute-force attacks where multiple IPs target a single account? [Coverage, Gap → Addressed]
  → Added to spec Edge Cases: "Known limitation — outside this feature's scope; would require account lockout or CAPTCHA"
- [x] CHK007 Is it clearly specified that the strict auth limit MUST NOT apply to any non-credential endpoints (refresh, logout, is-authenticated)? [Completeness, Spec §FR-003]
  → FR-003: "MUST be subject only to the global rate limit… and MUST NOT be subject to the stricter authentication rate limit"

## Rate Limit Counter Isolation & Independence

- [x] CHK008 Is the requirement for counter isolation between all tiers (global, login, register, refresh, content) stated as an explicit, testable requirement? [Completeness, Spec §FR-005]
  → FR-005: "Each rate limit tier MUST maintain independent counters"
- [x] CHK009 Are the Redis key prefixes for each tier specified with a guarantee of no collision? [Clarity, Data Model]
  → data-model.md specifies distinct prefixes: `rl:global:`, `rl:auth:login:`, `rl:auth:register:`, `rl:refresh:`, `rl:content:`
- [x] CHK010 Is the requirement that being rate-limited on one tier MUST NOT affect quotas on other tiers specified with examples of cross-tier independence? [Measurability, Spec §FR-005]
  → FR-005 states independence; SC-005 provides measurable test case for login vs register independence
- [x] CHK011 Are requirements defined for counter behavior during concurrent requests hitting different tiers from the same client? [Coverage, Edge Case → Addressed]
  → Added to spec Edge Cases: "Each tier counts independently (FR-005) — concurrent requests across tiers do not interfere"

## 429 Response & Error Disclosure

- [x] CHK012 Is the 429 response format specified with exact field names, status codes, and error codes? [Completeness, Spec §FR-004]
  → contracts/rate-limit-api.md specifies: `{ success, status: 429, message, error: { code: "RATE_LIMIT_EXCEEDED", retry_after } }`
- [x] CHK013 Are requirements specified for what information MUST NOT be disclosed in rate limit error responses (e.g., internal tier names, counter values)? [Coverage, Gap → Addressed]
  → Added FR-008: "MUST NOT disclose internal security configuration details such as tier names, counter values, or internal identifiers"
- [x] CHK014 Is the `Retry-After` header value specified with its semantics — is it seconds, a timestamp, or derived from the window? [Clarity, Spec §FR-004]
  → contracts/rate-limit-api.md specifies `standardHeaders: true` which sets `Retry-After` in seconds per IETF draft
- [x] CHK015 Are the standard headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) required or optional, and is this explicitly stated? [Completeness, Contracts]
  → contracts/rate-limit-api.md: "set by `standardHeaders: true`" — required for all tiers
- [x] CHK016 Is the error response format consistent across ALL rate limit tiers, and is this consistency explicitly required? [Consistency, Spec §FR-004]
  → FR-004: "consistent with the existing rate limit behavior"; contracts state "Unchanged from original contract"

## Token Refresh Security

- [x] CHK017 Is the keying strategy for the refresh limiter (per authenticated user ID) explicitly specified with the fallback behavior when user identity is unavailable? [Clarity, Spec §FR-002 → Updated]
  → FR-002 updated: keyed by SHA-256 hash of refresh_token cookie (truncated 16 hex chars), fallback to IP. Cookie is available before auth middleware (FR-010), hash provides per-user identity without `req.user`.
- [x] CHK018 Is the 30 req/min threshold for refresh documented with rationale for why this value balances abuse prevention and normal usage? [Completeness, Spec §FR-002]
  → FR-002 specifies 30 req/min; research.md Decision 3 documents rationale (normal user ≤ 5/min, 30/min allows pathological clients)
- [x] CHK019 Are requirements specified for what happens when a compromised refresh token is used to flood the refresh endpoint — is the limiter keyed before or after token validation? [Coverage, Gap → Addressed]
  → FR-010: "rate limit check MUST execute before token validation"; keyed by SHA-256 hash of refresh_token cookie (available before auth middleware). Resolves design tension: cookie hash provides per-user identity without requiring `req.user`, which is unavailable at limiter execution time.
- [x] CHK020 Is the requirement that refresh limits are independent from login/register limits explicitly stated? [Consistency, Spec §FR-005]
  → FR-005: "Each rate limit tier MUST maintain independent counters"; spec Edge Cases: "login and refresh limits are independent"

## Redis / Store Failure Mode

- [x] CHK021 Is the fail-open behavior (allow request when Redis is unreachable) explicitly documented as a deliberate security trade-off? [Clarity, Assumptions → Addressed]
  → contracts/rate-limit-api.md: "fail-open strategy with `passOnStoreError: true`"; spec Edge Case on store failure
- [x] CHK022 Are requirements specified for logging or alerting when the rate limit store becomes unreachable and fail-open is triggered? [Coverage, Gap → Addressed]
  → Added FR-009 (logging security events); plan.md §Security Logging documents fail-open logging behavior
- [x] CHK023 Is the maximum acceptable duration for Redis unavailability before security posture degrades defined? [Gap → Addressed]
  → plan.md §Redis Reconnection Behavior: "maximum impact window is bounded by the longest rate limit window (15 minutes for auth)"
- [x] CHK024 Are requirements specified for the behavior when Redis reconnects mid-window — are partial counters trusted or reset? [Coverage, Edge Case → Addressed]
  → plan.md §Redis Reconnection Behavior: "Partial counters from before the outage are preserved in Redis… If Redis was completely flushed during the outage, all counters reset"

## NAT / Shared-IP Scenarios

- [x] CHK025 Is the known limitation that unauthenticated endpoints are rate-limited per IP (causing NAT collisions) explicitly documented? [Completeness, Spec Edge Cases]
  → Spec Edge Cases: "Known limitation — rate limits apply per IP for unauthenticated endpoints"
- [x] CHK026 Are requirements specified for mitigating NAT collision impact specifically on the login endpoint, where keying is per-IP? [Coverage, Gap → Addressed]
  → plan.md §NAT / Shared-IP Mitigation: "5 req/15min window is conservative enough that occasional NAT collisions rarely block legitimate users"; spec Edge Case documents distributed attack scope limitation
- [x] CHK027 Is the requirement that authenticated endpoints (refresh, content creation) key by user ID — not IP — explicitly stated as a NAT mitigation? [Clarity, Spec §FR-002]
  → FR-002: "per authenticated user identity (not per IP address)"; research.md Decision 2: "prevents NAT collisions"

## Migration & Rollback Safety

- [x] CHK028 Is the migration strategy (old Redis keys expire via TTL, no manual cleanup) documented as a deliberate choice with its security implications? [Completeness, Spec Edge Cases]
  → Spec Edge Cases: "Existing Redis counters… will naturally expire via TTL. No manual cleanup is required"
- [x] CHK029 Is the maximum time window during which old and new rate limit counters coexist specified? [Clarity, Gap → Addressed]
  → Added to spec Edge Cases: "Old counters expire within 15 minutes via TTL"
- [x] CHK030 Are rollback requirements defined — if the new per-route limiters cause issues, can the old blanket limiter be safely re-applied? [Coverage, Gap → Addressed]
  → Added to spec Edge Cases: "The old blanket limiter can be safely re-applied — old Redis keys persist for up to 15 minutes"
- [x] CHK031 Is it specified that no request should bypass rate limiting entirely during the migration transition? [Completeness, Gap → Addressed]
  → Added to spec Assumptions: "No request will bypass rate limiting entirely during the migration — the per-route limiters are applied before the old blanket limiter is removed"

## Security Logging & Audit

- [x] CHK032 Are requirements specified for what security-relevant events must be logged when rate limits are triggered? [Completeness, Gap → Addressed]
  → Added FR-009: "The system MUST log security-relevant rate limit events (limit exceeded, store failure triggering fail-open)"
- [x] CHK033 Is the log format for security events specified — does it include the tier type, client identifier, and endpoint path? [Clarity, Gap → Addressed]
  → plan.md §Security Logging: structured JSON with type, ip, userId, path fields
- [x] CHK034 Are requirements specified for NOT logging sensitive data (passwords, tokens) in rate limit security events? [Coverage, Gap → Addressed]
  → Added FR-009: "Logged events MUST NOT include sensitive data such as passwords or tokens"; plan.md §Security Logging confirms exclusions
- [x] CHK035 Is it specified whether security log events should be distinguishable by tier (login vs register vs refresh vs global)? [Clarity, Gap → Addressed]
  → plan.md §Security Logging: type field values include `LOGIN_LIMIT`, `REGISTER_LIMIT`, `REFRESH_LIMIT`, `GLOBAL_LIMIT`

## Assumptions & Threat Model

- [x] CHK036 Is the assumption that existing global and content creation rate limiters are correctly configured documented and validated? [Assumption, Spec §Assumptions]
  → Spec Assumptions: "The existing global rate limit (150 req/min) and content creation rate limit (25 req/min) are correctly configured"
- [x] CHK037 Is the assumption that client-side 429 error handling is sufficient documented — what happens if the client retries aggressively on 429? [Assumption, Spec §Assumptions]
  → Spec Assumptions: "The client's current error handling for 429 responses is sufficient and requires no changes"
- [x] CHK038 Is the assumption that rate limit thresholds are appropriate for current traffic volumes documented with a plan for tuning? [Assumption, Spec §Assumptions]
  → Spec Assumptions: "may require tuning based on production patterns"
- [x] CHK039 Is a threat model or attacker profile referenced that justifies the specific thresholds and keying strategies? [Gap → Addressed]
  → Added to spec Assumptions: "strategy addresses single-source brute-force attacks"; distributed brute-force explicitly scoped out; research.md Decisions 2-3 justify keying and thresholds
- [x] CHK040 Are the security boundaries clearly defined — which endpoints are treated as high-risk (credential) vs low-risk (read-only, idempotent)? [Completeness, Spec §FR-003]
  → FR-001 (high-risk: login, register at 5/15min), FR-002 (medium: refresh at 30/min), FR-003 (low: logout, is-authenticated at global 150/min)

## Notes

- All 40 items checked — requirements quality validated
- Originally 12 gaps identified; all addressed through updates to spec.md (FR-008, FR-009, FR-010, 5 new edge cases, 2 new assumptions) and plan.md (Security Implementation Details section)
- Items focus on whether security REQUIREMENTS are clearly specified, not on implementation correctness
