<!--
Sync Impact Report:
- Version Change: 0.0.0 → 1.0.0 (Initial Ratification)
- Modified Principles:
  - Added Principle 1: Full-Stack TypeScript Strictness (New)
  - Added Principle 2: Security & Authentication Priority (New)
  - Added Principle 3: Component-Driven UI & State Management (New)
  - Added Principle 4: Relational Data Integrity (New)
  - Added Principle 5: Predictable RESTful API Design (New)
- Added Sections:
  - Quality Standards
  - Development Workflow
- Follow-up TODOs: 
  - (Deferred testing framework codification per user instruction until future release)
- Templates requiring updates:
  - .specify/templates/plan-template.md (⚠ pending verification)
  - .specify/templates/spec-template.md (⚠ pending verification)
  - .specify/templates/tasks-template.md (⚠ pending verification)
-->

# Post-It Constitution

## Core Principles

### I. Full-Stack TypeScript Strictness
Both the React client and Express server MUST utilize TypeScript with strict typing configurations. 
The use of `any` types is forbidden unless absolutely necessary (and must be documented with an inline comment). Shared types or interfaces must be used for API contracts (request payloads, JSON responses) to ensure data structure consistency across boundaries.

### II. Security & Authentication Priority
As a social platform, user data protection and zero-trust authentication are non-negotiable.
The API MUST utilize `helmet`, CORS, and secure JWT handling. Access tokens are short-lived, while refresh tokens must use secure `httpOnly` cookies. The backend MUST enforce parameterized database queries via the `pg` client to prevent SQL injections. Passwords MUST be hashed using `bcrypt` and a global pepper before storage.

### III. Component-Driven UI & State Management
Frontend components in `client/src/components` must be modular and reusable. 
Global state MUST be managed exclusively via `zustand`, while local component form state MUST utilize `react-hook-form`. CSS and UI frameworks (Material UI, React Bootstrap) should cleanly separate presentation logic from state management to keep components testable and predictable.

### IV. Relational Data Integrity
All database schema alterations MUST be executed through version-managed migrations using `db-migrate`. 
Direct manual alterations in the Postgres database are prohibited. API endpoints that execute complex, multi-step actions must handle transaction failures gracefully and ensure referential integrity (e.g., cascading deletions). Queries must never leak database structure directly to the client.

### V. Predictable RESTful API Design
All Express routes MUST be organized logically by domain (e.g., users, posts, follows) and firmly adhere to REST semantics (GET, POST, PUT, DELETE). 
APIs MUST ALWAYS respond with a standardized response envelope containing unified error and success fields.

## Quality Standards

- **Code Formatting & Linting**: All frontend code MUST pass the `eslint-config-react-app` standard. No code can be merged into the main branch with unresolved linter warnings.
- **Testing Requirements**: *Deferred per user input*. Quality processes rely strictly on thorough manual checks and senior developer best practices until designated test frameworks are established.

## Development Workflow

- **Speckit First**: All features and significant structural updates MUST start with an approved Speckit `spec`, `plan` and `tasks` breakdown BEFORE any code changes occur.
- **Commit Discipline**: Atomically structured commits using the Conventional Commits specification (e.g., `feat:`, `fix:`, `chore:`, `refactor:`) are mandatory to ensure clear semantic history tracking over time.

## Governance

This Constitution supersedes all other documentation, READMEs, and ad-hoc practices. Any architectural deviation from these rules requires an explicitly written amendment to this Constitution. All PRs must verify strict compliance with the core principles outlined above. The complexity of new additions must always be justified.

**Version**: 1.0.0 | **Ratified**: 2026-03-30 | **Last Amended**: 2026-03-30
