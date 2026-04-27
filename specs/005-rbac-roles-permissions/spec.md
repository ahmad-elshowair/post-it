# Feature Specification: RBAC Roles & Permissions

**Feature Branch**: `005-rbac-roles-permissions`
**Created**: 2026-04-27
**Status**: Draft
**Input**: User description: "Replace the boolean is_admin field with a granular RBAC (Role-Based Access Control) system. Roles define what a user can do (user, moderator, admin, super_admin). Permissions are fine-grained capabilities assigned to roles."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Permission-Gated Route Protection (Priority: P1)

As a developer, I want every protected route to check fine-grained permissions so that the system enforces the principle of least privilege at the access layer. When a user attempts an action, the system resolves all their roles, computes the union of permissions, and either grants or denies access. A denied request returns a clear 403 response.

**Why this priority**: Without the middleware foundation, no other RBAC feature works. This is the backbone that all other user stories depend on. It replaces the unused `is_admin` boolean with a working authorization gate.

**Independent Test**: Can be fully tested by assigning a permission to a role, assigning that role to a test user, and verifying the middleware grants or denies access based on the user's effective permissions. Delivers immediate value by locking down sensitive routes.

**Acceptance Scenarios**:

1. **Given** a user with the "moderator" role (which has `reports.manage` but not `users.manage`), **When** they access a reports management endpoint, **Then** the request is allowed (200)
2. **Given** a user with the "moderator" role, **When** they access a user management endpoint requiring `users.manage`, **Then** the request is denied (403 Forbidden)
3. **Given** a user with no roles assigned, **When** they access any permission-gated endpoint, **Then** the request is denied (403 Forbidden)
4. **Given** a user with multiple roles (e.g., "moderator" and "user"), **When** the middleware evaluates permissions, **Then** the effective permissions are the union of all assigned roles' permissions
5. **Given** an unauthenticated user, **When** they access a permission-gated route, **Then** authentication middleware rejects the request before permission checking occurs (401 Unauthorized)

---

### User Story 2 - Role Assignment & Revocation by Super Admin (Priority: P1)

As a super admin, I want to assign and revoke roles for any user through dedicated management endpoints so that I can control who has elevated capabilities. I need to see a user's current roles, add new roles, and remove roles, with every change recorded in an audit log.

**Why this priority**: This is the primary administrative interface that makes RBAC operational. Without it, roles exist in the database but cannot be managed. Combined with P1 middleware, this forms a complete minimum viable RBAC system.

**Independent Test**: Can be fully tested by having a super admin assign the "moderator" role to a regular user, then verifying that user gains moderator permissions, and finally revoking the role and confirming permissions are removed.

**Acceptance Scenarios**:

1. **Given** a super admin is authenticated, **When** they assign the "admin" role to a regular user, **Then** that user gains all permissions associated with the "admin" role and the change is logged in the audit trail
2. **Given** a super admin is authenticated, **When** they revoke the "admin" role from a user who has only that role, **Then** the user retains only the default "user" role permissions
3. **Given** a super admin attempts to revoke their own "super_admin" role, **When** it is their only super_admin assignment, **Then** the system prevents the operation to avoid lockout
4. **Given** an admin (not super admin) attempts to assign roles, **When** they call the role assignment endpoint, **Then** the request is denied (403 Forbidden)

---

### User Story 3 - Role & Permission Management (Priority: P2)

As a super admin, I want to create, read, update, and delete custom roles with specific permission combinations so that I can define new authorization profiles as the platform evolves. System roles (user, moderator, admin, super_admin, banned) are protected from deletion but their descriptions can be updated.

**Why this priority**: Extends the system beyond predefined roles. Important for long-term flexibility but not required for initial operation since the predefined roles cover current needs.

**Independent Test**: Can be fully tested by creating a custom "content_manager" role with selected permissions, assigning it to a test user, and verifying the permissions work correctly, then deleting the role and confirming the user loses those permissions.

**Acceptance Scenarios**:

1. **Given** a super admin creates a custom role named "content_manager" with permissions `posts.delete.any` and `comments.delete.any`, **When** they save the role, **Then** the role is persisted and can be assigned to users
2. **Given** a super admin attempts to delete a system role (e.g., "moderator"), **When** they submit the deletion request, **Then** the system rejects it and preserves the predefined role
3. **Given** a super admin updates a custom role's permissions, **When** a user already has that role assigned, **Then** the user's effective permissions immediately reflect the updated role definition
4. **Given** a super admin attempts to create a role with a name that already exists, **Then** the system rejects the duplicate

---

### User Story 4 - Moderator Handles Reports Without User Management (Priority: P2)

As a moderator, I want to access report-handling capabilities (view, dismiss, escalate reports) without being able to manage users or modify roles. My scope is limited to content moderation tasks only.

**Why this priority**: Demonstrates the value of granular RBAC over the binary `is_admin` flag. This is the key use case that motivated the feature request but depends on P1 middleware being in place.

**Independent Test**: Can be fully tested by logging in as a moderator and verifying access to report management endpoints while simultaneously verifying denial of user management and role management endpoints.

**Acceptance Scenarios**:

1. **Given** a user with the "moderator" role, **When** they access a report management endpoint, **Then** they can view, dismiss, and escalate reports
2. **Given** a user with the "moderator" role, **When** they attempt to ban a user (requires `users.ban`), **Then** the request is denied (403 Forbidden)
3. **Given** a user with the "moderator" role, **When** they attempt to modify roles (requires `roles.manage`), **Then** the request is denied (403 Forbidden)
4. **Given** a user with the "moderator" role, **When** they delete their own comment (requires `comments.delete.own`), **Then** the request is allowed

---

### User Story 5 - Admin Manages Content and Handles Reports (Priority: P2)

As an admin, I want full content management capabilities including handling reports and managing users (viewing profiles, banning problematic users) so that I can maintain platform quality. I should not be able to modify roles or assign elevated roles.

**Why this priority**: Completes the moderator-admin-super_admin hierarchy. Admins cover most day-to-day moderation, reducing the need for super admin intervention.

**Independent Test**: Can be fully tested by logging in as an admin and verifying access to reports, user management, and content deletion while verifying denial of role management operations.

**Acceptance Scenarios**:

1. **Given** a user with the "admin" role, **When** they ban a problematic user (requires `users.ban`), **Then** the operation succeeds and the banned user loses normal access
2. **Given** a user with the "admin" role, **When** they attempt to assign roles (requires `roles.assign`), **Then** the request is denied (403 Forbidden)
3. **Given** a user with the "admin" role, **When** they delete any post or comment (requires `posts.delete.any`, `comments.delete.any`), **Then** the operation succeeds

---

### User Story 6 - Audit Log of Role Changes (Priority: P3)

As a super admin, I want to view a chronological audit trail of all role and permission changes so that I can review who made what change, when, and to whom. This provides accountability and supports incident investigation.

**Why this priority**: Essential for security compliance and incident response, but not blocking for the core RBAC system to function.

**Independent Test**: Can be fully tested by performing several role assignment/revocation operations and then verifying the audit log entries match the operations performed, including actor, target user, action, and timestamp.

**Acceptance Scenarios**:

1. **Given** a super admin assigns a role to a user, **When** they view the audit log, **Then** they see an entry with the actor's identity, the target user, the role assigned, and the timestamp
2. **Given** a super admin creates a custom role, **When** they view the audit log, **Then** they see an entry documenting the role creation with its permission set
3. **Given** a super admin views the audit log, **When** they apply filters (by actor, target user, action type, date range), **Then** only matching entries are returned
4. **Given** audit log entries exist, **When** any user (non-super-admin) attempts to access the audit log, **Then** the request is denied (403 Forbidden)

---

### User Story 7 - Regular User Platform Access (Priority: P1)

As a regular user, I want to use the platform normally — create posts, comment, like, follow, bookmark — without any disruption from the RBAC system. The "user" role grants me all standard permissions, and I should notice no difference from the current experience.

**Why this priority**: Ensures backward compatibility. The majority of users fall into this category and must not be disrupted by the RBAC migration.

**Independent Test**: Can be fully tested by registering a new user (who automatically receives the "user" role) and performing all standard platform actions to verify nothing is broken.

**Acceptance Scenarios**:

1. **Given** a newly registered user, **When** their account is created, **Then** they are automatically assigned the "user" role with standard platform permissions
2. **Given** a regular user with the "user" role, **When** they create a post, comment, like, follow, or bookmark, **Then** all actions succeed as before
3. **Given** existing users in the system, **When** the RBAC migration runs, **Then** all users receive the "user" role and their experience remains unchanged

---

### Edge Cases

- What happens when a user has both "user" and "banned" roles? The "banned" role's deny semantics take precedence — the user is blocked from performing actions even though "user" grants them. [NEEDS CLARIFICATION: Should the "banned" role use deny-first semantics (explicit deny overrides any grant), or should banning simply remove all other roles?]
- What happens when a super admin revokes a role that is currently being used by the affected user in an active session? The user's next request fails the permission check since permissions are resolved fresh from the database on each request, not cached in the session token.
- What happens when a custom role is deleted while users still have it assigned? The role-user associations are cascade-deleted, and affected users lose those permissions immediately.
- How does the system handle concurrent role modifications by two super admins? Last-write-wins semantics apply; the audit log records both changes independently.
- What happens if the seed data for predefined roles/permissions is missing after migration? The migration is transactional — if seeding fails, the entire migration rolls back.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define a `roles` entity with a name, description, and a flag indicating whether the role is system-defined (non-deletable) or custom.
- **FR-002**: The system MUST define a `permissions` entity with a name (in `resource.action` format), description, resource identifier, and action type.
- **FR-003**: The system MUST support a many-to-many relationship between roles and permissions, allowing each role to have multiple permissions and each permission to belong to multiple roles.
- **FR-004**: The system MUST support a many-to-many relationship between users and roles, allowing each user to have multiple roles and each role to be assigned to multiple users.
- **FR-005**: A user's effective permissions MUST be the union of all permissions from all roles assigned to that user.
- **FR-006**: The system MUST provide a permission-checking mechanism that can be applied to any route, accepting a permission name and denying access (403) if the authenticated user lacks that permission.
- **FR-007**: The system MUST seed the following predefined roles during migration: user, moderator, admin, super_admin, banned.
- **FR-008**: The system MUST seed the following predefined permissions during migration: posts.delete.own, posts.delete.any, comments.delete.own, comments.delete.any, reports.manage, users.read, users.ban, users.manage, roles.manage, roles.assign.
- **FR-009**: Predefined role-to-permission mappings MUST be:
  - **user**: posts.delete.own, comments.delete.own
  - **moderator**: all "user" permissions + posts.delete.any, comments.delete.any, reports.manage, users.read
  - **admin**: all "moderator" permissions + users.ban, users.manage
  - **super_admin**: all "admin" permissions + roles.manage, roles.assign
  - **banned**: no permissions
- **FR-010**: The migration MUST assign the "user" role to every existing user and the "admin" role to any existing user where `is_admin` is `true`.
- **FR-011**: The existing `is_admin` column MUST be retained in the users table for backward compatibility but treated as deprecated (no new code should reference it for authorization decisions).
- **FR-012**: Super admins MUST be able to assign and revoke roles for any user through dedicated endpoints.
- **FR-013**: Super admins MUST be prevented from removing their own last "super_admin" role assignment to avoid accidental lockout.
- **FR-014**: Super admins MUST be able to create custom roles with any combination of existing permissions.
- **FR-015**: Super admins MUST be able to update the permissions of custom roles. Changes MUST take effect immediately for all users with that role.
- **FR-016**: Super admins MUST be able to delete custom roles. System-defined roles MUST NOT be deletable.
- **FR-017**: When a custom role is deleted, all user assignments to that role MUST be removed.
- **FR-018**: Every role assignment, revocation, creation, update, or deletion MUST be recorded in an audit log with: the actor, the target (user or role), the action performed, the previous and new values, and the timestamp.
- **FR-019**: Only super admins MUST be able to view the audit log, with support for filtering by actor, target, action type, and date range.
- **FR-020**: Newly registered users MUST automatically receive the "user" role upon account creation.
- **FR-021**: The permission checking mechanism MUST resolve permissions from the database on each request rather than caching them in the session token, ensuring immediate effect of role changes.
- **FR-022**: The system MUST return distinct error responses for authentication failure (401) versus authorization failure (403).

### Key Entities

- **Role**: Represents a named collection of permissions. Has a unique name, a human-readable description, and a flag distinguishing system roles (non-deletable) from custom roles. Relates to many permissions and many users.
- **Permission**: Represents a single fine-grained capability in `resource.action` format (e.g., `posts.delete.any`). Has a resource identifier (e.g., `posts`), an action type (e.g., `delete.any`), and a description. Relates to many roles.
- **Role-Permission Assignment**: A junction linking one role to one permission. Enables the many-to-many relationship.
- **User-Role Assignment**: A junction linking one user to one role with a timestamp. Enables the many-to-many relationship and tracks when a role was assigned.
- **Audit Log Entry**: An immutable record of a role or permission change. Captures who performed the action, what was changed, the previous and new state, and when it occurred.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing users retain full platform functionality after migration with zero disruption to their experience.
- **SC-002**: A super admin can assign a role to a user and the user's permissions update within their next request (no re-login required).
- **SC-003**: The permission middleware correctly denies 100% of unauthorized access attempts while allowing 100% of authorized ones, as verified by test coverage of all predefined role-permission combinations.
- **SC-004**: The audit log captures every role or permission modification with complete details (actor, target, action, previous/new values, timestamp) with zero data loss.
- **SC-005**: Role management operations (create, read, update, delete custom roles) complete within 2 seconds under normal load.
- **SC-006**: All predefined roles and permissions are seeded during migration, and existing `is_admin=true` users are correctly mapped to the "admin" role with 100% accuracy.

## Assumptions

- The existing authentication middleware (`authorizeUser`) continues to handle identity verification; RBAC middleware layers on top of it for authorization.
- Permissions follow the `resource.action` naming convention (e.g., `posts.delete.own`). Future resources follow the same pattern.
- The "banned" role is assigned separately and is not automatically assigned; banning a user is an explicit action by an admin or super admin.
- Audit log entries are retained indefinitely unless a separate data retention policy is introduced later.
- The permission check is performed per request by querying the database, trading a small performance cost for immediate consistency of role changes.
- Existing routes that do not currently require admin access will continue to work without permission checks unless explicitly gated in future work.
- Custom roles are limited to combining existing permissions; creating entirely new permissions (beyond the predefined set) is out of scope for this feature and requires a database migration.
- The RBAC migration runs as a single database migration file following the existing `db-migrate` convention.
