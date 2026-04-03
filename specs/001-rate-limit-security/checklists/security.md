# Security Requirements Quality Checklist: Rate Limiting & Security Hardening

**Purpose**: Validate the quality, clarity, and completeness of security-related requirements across rate limiting, file upload validation, CSP directives, debounce behavior, and cursor pagination
**Created**: 2026-04-03
**Feature**: [spec.md](../spec.md)

**Note**: This checklist tests whether the REQUIREMENTS are well-written — not whether the implementation works. Each item asks "is X specified/documented/defined?" not "does X work?".

## Rate Limiting Threshold Requirements

- [x] CHK001 Are all three tier thresholds (150 req/60s global, 5 req/900s auth, 25 req/60s content) specified with exact numeric values and time windows? [Completeness, Spec §FR-001–003]
- [x] CHK002 Is the client identity key (IP address vs authenticated user ID) explicitly defined for each tier? [Clarity, Spec §FR-012, Contract rate-limit-api.md]
- [x] CHK003 Is the sliding vs fixed window semantics specified for rate limit counter evaluation? [Clarity, Contract rate-limit-api.md §Redis Configuration]
- [x] CHK004 Is the 429 response envelope format fully specified including JSON body structure and all standard headers (`Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`)? [Completeness, Spec §FR-004, Contract rate-limit-api.md §HTTP 429 Response Format]
- [x] CHK005 Are the Redis key prefix and counter expiration strategy documented? [Completeness, Contract rate-limit-api.md §Redis Configuration]
- [x] CHK006 Is the NAT/shared IP limitation acknowledged with a documented mitigation strategy? [Edge Case, Spec §Edge Cases L85–91]
- [x] CHK007 Is the middleware application order specified relative to CORS, helmet, and route handlers? [Completeness, Contract rate-limit-api.md §Middleware Application Order]
- [x] CHK008 Are rate limit configuration values documented as environment-sourced with sensible defaults? [Clarity, Spec §FR-011, Plan §Technical Context]
- [x] CHK009 Is the relationship between global and auth tiers defined — does an auth request count against both the auth tier AND the global tier simultaneously, or only the stricter auth tier? [Ambiguity, Gap] — Resolved: Contract rate-limit-api.md §Middleware Application Order shows auth routes get authLimiter only, other routes get globalLimiter; they are mutually exclusive route groups.
- [x] CHK010 Is the behavior when a rate limit resets during an active session documented — do pending or queued requests automatically succeed? [Edge Case, Spec §Edge Cases L80–81]
- [x] CHK011 Is the `X-Forwarded-For` header handling strategy specified (first IP, last IP, trusted proxy count)? [Clarity, Spec §FR-012, Gap] — Resolved: Spec FR-012 now specifies first (leftmost) IP from X-Forwarded-For. Contract rate-limit-api.md §Client Identity Resolution documents trust proxy config and keyGenerator behavior.

## File Upload Validation Requirements

- [x] CHK012 Is the MIME allowlist specified with exact MIME types (image/jpeg, image/png, image/webp, image/gif) and not just format names? [Completeness, Spec §FR-006, Contract upload-validation.md §MIME Allowlist]
- [x] CHK013 Are magic byte signatures documented for each allowed type (e.g., FF D8 FF E0 for JPEG)? [Clarity, Contract upload-validation.md §MIME Allowlist]
- [x] CHK014 Is the validation method explicitly stated as "internal file signature inspection, not file extension or declared Content-Type"? [Clarity, Spec §FR-005]
- [x] CHK015 Is the maximum file size quantified (5MB / 5242880 bytes) with the enforcement mechanism (`multer limits.fileSize`)? [Clarity, Spec §FR-007, Contract upload-validation.md §Multer Configuration]
- [x] CHK016 Is the path traversal rejection strategy specified as "reject, not sanitize" with explicit mention of rejected characters (`..`, `/`, `\`, null bytes)? [Clarity, Spec §FR-008, Constitution §VII]
- [x] CHK017 Is the ambiguous MIME result behavior specified — what happens when `file-type` cannot conclusively identify the file? [Edge Case, Spec §Edge Cases L83–87]
- [x] CHK018 Are error response codes (400 for bad type/folder, 413 for size) and exact error messages specified for each rejection type? [Completeness, Contract upload-validation.md §Error Responses]
- [x] CHK019 Is the validation flow order documented (size check → MIME detection → folder validation)? [Completeness, Contract upload-validation.md §Validation Flow]
- [x] CHK020 Is the `ALLOWED_FOLDERS` constant defined with specific values (posts, profiles, covers)? [Completeness, Contract upload-validation.md §Folder Name Validation]
- [x] CHK021 Are requirements for preserving existing filename generation and directory creation during the memoryStorage migration specified? [Completeness, Contract upload-validation.md §Migration]
- [x] CHK022 Is the concurrent upload rejection behavior defined — are multiple simultaneous uploads from the same user validated independently? [Edge Case, Spec §Edge Cases L82–83]
- [x] CHK023 Is the behavior for files with valid MIME type but corrupted/truncated content (e.g., a partial JPEG) specified? [Coverage, Gap] — Resolved: Spec §Edge Cases now specifies: accept the file (type validation only, not integrity). Contract upload-validation.md §Validation Flow documents this as out of scope for integrity checks.

## CSP Directive Coverage Requirements

- [x] CHK024 Are all required production CSP directives specified (`script-src`, `object-src`, `base-uri`, `form-action`, `frame-ancestors`, `img-src`, `style-src`, `font-src`, `connect-src`)? [Completeness, Spec §FR-009, Contract csp-configuration.md §Production]
- [x] CHK025 Is the `style-src 'unsafe-inline'` exception for MUI/Bootstrap documented with an explicit justification note? [Clarity, Contract csp-configuration.md §Production Note]
- [x] CHK026 Are development-specific relaxations (`unsafe-eval`, `unsafe-inline`, `localhost:3000`) explicitly scoped to non-production environments only? [Completeness, Spec §FR-010, Contract csp-configuration.md §Development]
- [x] CHK027 Is the environment detection mechanism for CSP mode selection specified (e.g., `config.node_env === "development"`)? [Clarity, Contract csp-configuration.md §Helmet Configuration]
- [x] CHK028 Are all supplementary HTTP security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security) documented with expected values for both environments? [Completeness, Contract csp-configuration.md §Headers Set]
- [x] CHK029 Is the `connect-src` directive specified for both environments, including `ws://localhost:3000` for WebSocket in development? [Completeness, Contract csp-configuration.md §Development]
- [x] CHK030 Is the policy for future third-party script integrations documented with a requirement for constitution amendment? [Edge Case, Spec §Edge Cases L84–89]
- [x] CHK031 Is the `media-src` directive intentionally omitted or explicitly set — are there requirements governing video/audio content loading? [Coverage, Gap] — Resolved: Spec §FR-006 explicitly scopes uploads to images only ("no video, document, or audio upload support is in scope"), making media-src irrelevant. Omission is intentional per scope.

## Debounce Behavior Requirements

- [x] CHK032 Is the debounce interval quantified as exactly 500ms? [Clarity, Spec §FR-014, Constitution §VIII]
- [x] CHK033 Is the per-post independent timer behavior explicitly specified — does each post get its own `setTimeout` reference? [Clarity, Spec §FR-014, Contract like-debounce.md §Behavior]
- [x] CHK034 Is the optimistic update pattern defined — which state properties update before server response and what triggers the update? [Clarity, Spec §FR-013, Contract like-debounce.md §State Management]
- [x] CHK035 Is the rollback behavior on server error defined with both state reversion and "global toast" notification specified? [Completeness, Spec §FR-015, Contract like-debounce.md §Behavior §3]
- [x] CHK036 Is the in-flight request behavior on page navigation specified — does the request complete or abort? [Edge Case, Spec §Edge Cases L84–85, Contract like-debounce.md §Behavior §4]
- [x] CHK037 Is the API contract for the debounced request documented — does it send the final `isLiked` state (liked/unliked) as the payload? [Clarity, Contract like-debounce.md §Behavior §1]
- [x] CHK038 Are the hook's interface parameters (`postId`) and return type (`{ isLiked, isLoading, toggleLike }`) specified? [Completeness, Contract like-debounce.md §Client-Side Hook]
- [x] CHK039 Is the state management approach clearly specified — does optimistic state live in Zustand store or local component `useState`? [Clarity, Contract like-debounce.md §State Management] — Resolved: Contract like-debounce.md §State Management specifies Zustand store for optimistic updates. Note: tasks.md T025 references local useState — this is a task-level implementation detail; the contract specifies Zustand.
- [x] CHK040 Is the relationship between the debounce hook and the existing `checkIfLiked` endpoint defined — is the endpoint deprecated, kept for single-post views, or removed? [Consistency, Contract like-debounce.md §Feed Response Integration]

## Cursor Pagination Correctness Requirements

- [x] CHK041 Is the `totalCount` removal from `IPaginatedResult` interface specified as a breaking change to the response shape? [Completeness, Contract pagination-fix.md §Response Changes]
- [x] CHK042 Is the `limit+1` fetch strategy for `hasMore` derivation documented — who fetches the extra row, the model or the utility? [Clarity, Contract pagination-fix.md §createPaginationResult Utility Changes] — Resolved: Tasks.md T007 specifies `getCursorPaginationOptions` requests limit+1; research.md R6 confirms the utility handles this.
- [x] CHK043 Are ALL affected endpoints listed exhaustively — posts (all, feed, user), users (paginated), friends, follows (followings, followers)? [Completeness, Contract pagination-fix.md §Affected Endpoints]
- [x] CHK044 Is the `createPaginationResult` signature change (removing `totalCount` parameter) specified with the exact before/after function signature? [Completeness, Contract pagination-fix.md §Utility Changes]
- [x] CHK045 Are all models containing `SELECT COUNT(*)` queries identified for removal (user, post, follow)? [Completeness, Contract pagination-fix.md §Model Changes]
- [x] CHK046 Are all controllers passing `totalCount` to `createPaginationResult` identified for update (posts, users, follows)? [Completeness, Contract pagination-fix.md §Controller Changes]
- [x] CHK047 Is the frontend adaptation for missing `totalCount` specified — does any client code currently depend on it? [Completeness, Spec §Assumptions L140]
- [x] CHK048 Is the `hasMore` derivation logic from the `limit+1` pattern documented unambiguously — specifically that `hasMore = data.length > originalLimit` and the extra item is stripped? [Clarity, Contract pagination-fix.md §After]
- [x] CHK049 Is the cursor field used for `nextCursor`/`previousCursor` derivation specified per endpoint (post_id, user_id)? [Clarity, Contract pagination-fix.md §After]
- [x] CHK050 Is the `getCursorPaginationOptions` function updated to request `limit + 1` from the query parameter, or do models handle this independently? [Ambiguity, Contract pagination-fix.md] — Resolved: Tasks.md T007 specifies the utility `getCursorPaginationOptions` handles the limit+1 adjustment.

## Cross-Domain Consistency

- [x] CHK051 Is the 429 response format consistent between rate limiting rejections and upload validation rejections — do both use the same standardized error envelope? [Consistency, Spec §FR-004 vs Contract upload-validation.md §Error Responses] — Resolved: Rate limiting produces 429s using the standardized envelope (FR-004). Upload validation produces 400/413 errors using the same envelope format via the existing error handler middleware. No 429 inconsistency exists.
- [x] CHK052 Are the observability requirements (OR-001 deferred, OR-002 structured logging) consistent with the actual enforcement points identified across all contracts? [Consistency, Spec §OR-001 vs OR-002]
- [x] CHK053 Is the Redis dependency consistently documented across spec (FR-011), plan (Technical Context), and rate-limit contract (Redis Configuration)? [Consistency, Spec §FR-011 vs Plan vs Contract]
- [x] CHK054 Is the "reject, not sanitize" principle consistently applied across both path traversal handling (FR-008) and MIME validation rejection? [Consistency, Spec §FR-005, §FR-008, Constitution §VII]

## Scenario & Edge Case Coverage

- [x] CHK055 Are requirements defined for the zero-state scenario — what happens on a fresh Redis instance with no existing counters? [Coverage, Gap] — Resolved: Spec §Edge Cases now specifies counters start at 0, no initialization required. Contract rate-limit-api.md §Redis Zero-State Behavior documents key creation on demand.
- [x] CHK056 Are requirements defined for Redis connection failure during rate limit checks — does the request proceed (fail-open) or get rejected (fail-closed)? [Coverage, Gap] — Resolved: Spec §Edge Cases specifies fail-open with structured error logging. Contract rate-limit-api.md §Redis Failure Behavior documents strategy, rationale, and reconnection behavior.
- [x] CHK057 Are requirements for backward compatibility with existing API clients during the pagination response shape change specified? [Coverage, Spec §Assumptions L140, Gap] — Resolved: Spec §Assumptions L140 addresses frontend adaptation; tasks.md T027 verifies no client-side totalCount references.

## Traceability & Assumptions

- [x] CHK058 Are all functional requirements (FR-001 through FR-018) traceable to specific implementation tasks? [Traceability, Tasks.md]
- [x] CHK059 Is the OR-001 Prometheus deferral documented with a clear scope note identifying the follow-up feature? [Traceability, Spec §OR-001]
- [x] CHK060 Are assumptions about threshold tuning documented with a "may require adjustment based on production traffic" caveat? [Assumption, Spec §Assumptions L136]
- [x] CHK061 Is the single-upload-endpoint assumption documented — are there truly no other upload paths in the application? [Assumption, Spec §FR-006]
- [x] CHK062 Are constitution principle references (VI, VII, VIII) consistent between the spec constitution check and the plan constitution check table? [Traceability, Plan §Constitution Check]

## Notes

- Check items off as completed: `[x]`
- Items marked `[Gap]` indicate a potentially missing requirement — investigate whether it was intentionally excluded or needs to be added
- Items marked `[Ambiguity]` indicate a requirement that may be underspecified — clarify before implementation
- Items marked `[Conflict]` indicate a potential inconsistency between two documents — resolve before implementation
- This checklist does NOT replace the existing `requirements.md` checklist — both serve different purposes
