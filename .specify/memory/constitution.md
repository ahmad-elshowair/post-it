<!--
Sync Impact Report:
- Version Change: 1.0.0 → 1.1.0 (MINOR — 3 new principles added)
- Modified Principles:
  - Principle II: Security & Authentication Priority (expanded with explicit token-rotation and CSP mandates)
- Added Principles:
  - Principle VI: Tiered Rate Limiting (New)
  - Principle VII: File Upload Validation & Content Security (New)
  - Principle VIII: Frontend Efficiency & Performance (New)
- Added Sections: (none — existing sections preserved)
- Removed Sections: (none)
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ no changes needed — Constitution Check gate remains generic)
  - .specify/templates/spec-template.md (✅ no changes needed — functional-requirement and edge-case slots accommodate new principles)
  - .specify/templates/tasks-template.md (✅ no changes needed — foundational phase already includes security hardening and performance tasks)
- Follow-up TODOs:
  - Rate-limit configuration values already exist in config.ts but express-rate-limit is NOT installed — implementation required
  - Multer fileFilter and limits are NOT applied — implementation required
  - Helmet CSP directives are NOT configured — implementation required
  - SELECT COUNT(*) alongside cursor pagination in user.ts — removal required
  - Frontend like-debounce and N+1 checkIfLiked — implementation required
-->

# Post-It Constitution

## Core Principles

### I. Full-Stack TypeScript Strictness
Both the React client and Express server MUST utilize TypeScript with strict typing configurations.
The use of `any` types is forbidden unless absolutely necessary (and MUST be documented with an inline comment). Shared types or interfaces MUST be used for API contracts (request payloads, JSON responses) to ensure data structure consistency across boundaries.

### II. Security & Authentication Priority
As a social platform, user data protection and zero-trust authentication are non-negotiable.
The API MUST utilize `helmet` with an explicitly configured Content Security Policy (CSP) that restricts script execution to verified origins, neutralizing Cross-Site Scripting (XSS) attacks. CORS MUST enforce strict origin allow-lists. Access tokens are short-lived; refresh tokens MUST use secure `httpOnly` cookies. Token rotation is mandatory: when a refresh token is consumed, a new one MUST be issued and the old one invalidated atomically. If reuse of a revoked refresh token is detected, the system MUST immediately revoke ALL sessions for the affected user. The backend MUST enforce parameterized database queries via the `pg` client to prevent SQL injection. Passwords MUST be hashed using `bcrypt` with a global pepper before storage.

### III. Component-Driven UI & State Management
Frontend components in `client/src/components` MUST be modular and reusable.
Global state MUST be managed exclusively via `zustand`, while local component form state MUST utilize `react-hook-form`. CSS and UI frameworks MUST cleanly separate presentation logic from state management to keep components testable and predictable.

### IV. Relational Data Integrity
All database schema alterations MUST be executed through version-managed migrations using `db-migrate`.
Direct manual alterations in the Postgres database are prohibited. API endpoints that execute complex, multi-step actions MUST handle transaction failures gracefully and ensure referential integrity (e.g., cascading deletions). Queries MUST never leak database structure directly to the client.

### V. Predictable RESTful API Design
All Express routes MUST be organized logically by domain (e.g., users, posts, follows) and firmly adhere to REST semantics (GET, POST, PUT, DELETE).
APIs MUST ALWAYS respond with a standardized response envelope containing unified error and success fields.

### VI. Tiered Rate Limiting
A single global rate limit is insufficient for a social media application. The server MUST enforce tiered rate limits using `express-rate-limit` (or equivalent) with distinct tiers calibrated to each endpoint category's risk profile and expected traffic:
- **Global Baseline**: 150 requests per minute per IP. Allows normal feed scrolling while blocking bulk scrapers.
- **Authentication Endpoints** (`/api/auth/login`, `/api/auth/register`): 5 requests per 15 minutes per IP. Non-negotiable for preventing brute-force credential-stuffing attacks.
- **Content Creation** (posts, comments, likes): 25 requests per minute per authenticated user. Prevents bot-driven spam and artificial engagement inflation.

Rate-limit configuration values MUST be sourced from environment variables and MUST be applied before route handlers. Exceeded limits MUST return HTTP 429 with a `Retry-After` header.

### VII. File Upload Validation & Content Security
File uploads via `multer` MUST enforce all three of the following controls — none are optional:
1. **MIME-type validation**: The server MUST verify the actual internal file signature (magic bytes), not rely on the client-provided extension or `Content-Type` header. Acceptable MIME types MUST be an explicit allow-list (e.g., `image/jpeg`, `image/png`, `image/webp`).
2. **File size limit**: A strict maximum of 5 MB per file MUST be enforced via `multer`'s `limits.fileSize` option to prevent storage-exhaustion attacks.
3. **Path safety**: Any user-supplied `folder` or path component MUST be sanitized before use in filesystem operations to prevent directory traversal.

### VIII. Frontend Efficiency & Performance
Interactive controls that trigger API calls on rapid user input (e.g., like buttons) MUST implement debounce or throttle logic in the frontend layer. A minimum debounce interval of 500 ms is required to collapse rapid repeated actions into a single API request.
Paginated data feeds MUST use cursor-based (keyset) pagination exclusively. The server MUST NOT execute `SELECT COUNT(*)` queries alongside cursor-paginated endpoints, as counting large tables defeats the performance benefits of keyset pagination. Total-count metadata, if required by the UI, MUST be derived from the cursor state or omitted.

## Quality Standards

- **Code Formatting & Linting**: All frontend code MUST pass the `eslint-config-react-app` standard. No code can be merged into the main branch with unresolved linter warnings.
- **Testing Requirements**: *Deferred per user input*. Quality processes rely strictly on thorough manual checks and senior developer best practices until designated test frameworks are established.

## Development Workflow

- **Speckit First**: All features and significant structural updates MUST start with an approved Speckit `spec`, `plan` and `tasks` breakdown BEFORE any code changes occur.
- **Commit Discipline**: Atomically structured commits using the Conventional Commits specification (e.g., `feat:`, `fix:`, `chore:`, `refactor:`) are mandatory to ensure clear semantic history tracking over time.

## Governance

This Constitution supersedes all other documentation, READMEs, and ad-hoc practices. Any architectural deviation from these rules requires an explicitly written amendment to this Constitution. All PRs MUST verify strict compliance with the core principles outlined above. The complexity of new additions MUST always be justified.

**Amendment Procedure**: Proposed changes MUST be drafted as a diff against this document, reviewed for cross-principle conflicts, and ratified with an incremented semantic version before merge.

**Versioning Policy**: Amendments follow Semantic Versioning — MAJOR for principle removals or redefinitions, MINOR for new principles or materially expanded guidance, PATCH for clarifications and wording fixes.

**Compliance Review**: Every PR MUST pass a constitution compliance check referencing the applicable principle numbers before approval.

**Version**: 1.1.0 | **Ratified**: 2026-03-30 | **Last Amended**: 2026-04-02
