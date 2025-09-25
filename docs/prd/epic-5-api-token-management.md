# Epic 5: API Token Management - Brownfield Enhancement

## Epic Status

**Status:** Ready for Development **Type:** Brownfield Enhancement **Priority:** Medium **Estimated
Effort:** 3 Stories

## Epic Overview

### Epic Goal

Enable users to generate and manage API tokens within the settings interface, providing secure
programmatic access to system APIs for external software integration while maintaining the existing
authentication architecture.

### Epic Description

**Existing System Context:**

- Current relevant functionality: JWT-based authentication with user sessions, profile/settings
  components, role-based access control
- Technology stack: Angular 20+ frontend, Express.js backend, JWT utilities, PostgreSQL database
- Integration points: Existing auth middleware, profile component, user management system, tenant
  system

**Enhancement Details:**

- What's being added/changed: Adding API token generation and management functionality to the
  settings/profile area
- How it integrates: Extends existing JWT system with long-lived API tokens, integrates with current
  user/tenant context
- Success criteria: Users can generate, view, revoke API tokens; external software can authenticate
  using these tokens

## Business Value

### User Benefits

- **For End Users:** Simple, secure way to generate API tokens for external integrations
- **For Developers:** Programmatic access to system APIs using persistent tokens
- **For System:** Maintains security while enabling external integrations

### Technical Benefits

- Leverages existing authentication infrastructure
- Follows established patterns for minimal risk
- Enables future API ecosystem growth

## Epic Stories

### Story 5.1: API Token Backend Infrastructure

**Status:** Ready for Development

#### User Story

As a **system administrator or API consumer**, I want **the backend system to generate, store, and
validate API tokens**, So that **external software can securely authenticate and access our APIs
using persistent tokens**.

#### Story Context

**Existing System Integration:**

- Integrates with: Existing JWT authentication system, user/tenant repositories, auth middleware
- Technology: Express.js, TypeScript, PostgreSQL, existing JWT utilities
- Follows pattern: Existing auth.middleware.ts and jwt.utils.ts patterns
- Touch points: AuthRequest interface, existing authentication flow, tenant context system

#### Acceptance Criteria

**Functional Requirements:**

1. Create `api_tokens` database table with columns: id, user_id, tenant_id, token_hash, name,
   scopes, expires_at, created_at, last_used_at, is_active
2. Implement API token CRUD endpoints (`POST /api/tokens`, `GET /api/tokens`,
   `DELETE /api/tokens/:id`)
3. Extend existing AuthMiddleware to validate API tokens from Authorization header (Bearer format)

**Integration Requirements:** 4. Existing JWT session authentication continues to work unchanged 5.
New token validation follows existing AuthMiddleware pattern in auth.middleware.ts 6. Integration
with tenant system maintains current behavior via existing AuthRequest interface

**Quality Requirements:** 7. API token endpoints are covered by unit and integration tests 8.
Database migration script is created and tested 9. No regression in existing authentication
functionality verified through existing test suite

#### Technical Notes

- **Integration Approach:** Extend AuthRequest interface to include tokenType field; modify
  AuthMiddleware.authenticate() to handle both JWT and API tokens
- **Existing Pattern Reference:** Follow auth.middleware.ts structure and jwt.utils.ts for token
  handling
- **Key Constraints:** API tokens must work with existing tenant-aware system; token scopes should
  be simple (start with 'read', 'write')

#### Definition of Done

- [x] Database migration creates api_tokens table
- [x] CRUD endpoints implemented following existing API patterns
- [x] AuthMiddleware extended to validate API tokens
- [x] Existing JWT authentication regression tested
- [x] Unit tests cover new token functionality
- [x] Integration tests verify token-based API access

---

### Story 5.2: Settings UI for Token Management

**Status:** Ready for Development

#### User Story

As a **registered user**, I want **a simple interface in my profile settings to create, view, and
revoke API tokens**, So that **I can generate secure tokens for my external applications while
managing them easily**.

#### Story Context

**Existing System Integration:**

- Integrates with: Existing profile.component.ts, Angular standalone component architecture
- Technology: Angular 20+, TypeScript, reactive forms, existing UI patterns
- Follows pattern: Existing profile component structure with form management
- Touch points: Profile settings section, existing AuthService, form validation patterns

#### Acceptance Criteria

**Functional Requirements:**

1. Add "API Tokens" section to existing profile.component.ts with light, simple design matching
   current theme
2. Implement token generation form with fields: token name and simple scope selection (read/write)
3. Display existing tokens in a clean list showing: name, created date, last used date, and revoke
   button

**Integration Requirements:** 4. Existing profile functionality (user info editing, password change)
continues to work unchanged 5. New token section follows existing profile.component.ts form patterns
and validation 6. Integration with existing AuthService maintains current user context and error
handling

**Quality Requirements:** 7. Token UI components covered by Angular component tests 8. Form
validation follows existing pattern in profile component 9. No regression in existing profile
functionality verified through existing tests

#### Technical Notes

- **Integration Approach:** Add new token management section to existing profile.component.ts
  template; create TokenService following existing service patterns
- **Existing Pattern Reference:** Follow profile.component.ts reactive forms structure and styling
  classes
- **Key Constraints:** Design must be minimal and light; use existing Tailwind classes; follow
  current component architecture

#### Definition of Done

- [x] API Tokens section added to profile component
- [x] Token generation form implemented with validation
- [x] Token list display with revoke functionality
- [x] Existing profile functionality regression tested
- [x] Component tests cover new token management features
- [x] UI follows existing design patterns and theme

---

### Story 5.3: API Token Authentication Integration

**Status:** Ready for Development

#### User Story

As a **external software developer**, I want **to use API tokens to authenticate API requests and
have usage tracked**, So that **my software can securely access the system's APIs with proper
monitoring and accountability**.

#### Story Context

**Existing System Integration:**

- Integrates with: Existing route protection system, monitoring utilities, auth middleware
- Technology: Express.js middleware, existing monitoring.utils.ts, auth route patterns
- Follows pattern: Existing route protection and logging in auth middleware
- Touch points: Protected routes, existing monitoring system, auth error handling

#### Acceptance Criteria

**Functional Requirements:**

1. Apply API token authentication to existing protected routes alongside JWT session auth
2. Implement basic usage logging to track API token requests (timestamp, endpoint, token_id,
   success/failure)
3. Create simple API usage endpoint (`GET /api/tokens/:id/usage`) for users to view their token
   activity

**Integration Requirements:** 4. Existing JWT session-based route protection continues to work
unchanged 5. New token authentication integrates seamlessly with current AuthMiddleware flow 6.
Integration with existing monitoring.utils.ts maintains current logging patterns

**Quality Requirements:** 7. API token authentication covered by integration tests on protected
routes 8. Usage logging verified through existing monitoring test patterns 9. No regression in
existing route protection and session authentication

#### Technical Notes

- **Integration Approach:** Modify existing route protection to accept both token types; extend
  monitoring.utils.ts for API token logging
- **Existing Pattern Reference:** Follow current middleware chain and monitoring.utils.ts logging
  structure
- **Key Constraints:** Must not break existing session-based authentication; logging should be
  lightweight; usage endpoint should be simple read-only

#### Definition of Done

- [x] API token authentication works on all protected routes
- [x] Usage logging implemented following existing monitoring patterns
- [x] Usage viewing endpoint created
- [x] Existing session authentication regression tested
- [x] Integration tests cover API token route access
- [x] Monitoring integration verified through existing test suite

## Epic Compatibility Requirements

- ✅ Existing JWT session authentication remains unchanged
- ✅ Database schema changes are backward compatible (new tables only)
- ✅ UI changes follow existing Angular 20+ standalone component patterns
- ✅ Performance impact is minimal (token validation uses existing middleware pattern)

## Epic Risk Mitigation

- **Primary Risk:** API tokens could compromise security if improperly managed
- **Mitigation:** Implement proper token scoping, expiration, and rate limiting using existing
  security middleware
- **Rollback Plan:** API token features can be disabled via feature flag; database tables can remain
  without affecting existing functionality

## Epic Definition of Done

- [x] All stories completed with acceptance criteria met
- [x] Existing user authentication and profile functionality verified through testing
- [x] Integration points (auth middleware, settings UI) working correctly
- [x] Documentation updated for API token usage
- [x] No regression in existing authentication features

## Implementation Sequence

**Recommended Development Order:**

1. **Story 5.1 First** - Backend infrastructure provides foundation
2. **Story 5.2 Second** - UI can be built and tested with backend ready
3. **Story 5.3 Last** - Integration and logging complete the feature

**Key Integration Points:**

- All stories build on existing JWT/auth patterns
- Token validation reuses AuthMiddleware architecture
- UI follows current profile component structure
- Logging integrates with existing monitoring system

## Story Manager Handoff

**Development Team Handoff:**

"This brownfield epic enhances the existing system with API token management. Key considerations:

- This builds on existing system running Angular 20+ frontend, Express.js backend, PostgreSQL, with
  JWT authentication
- Integration points: existing auth middleware, profile/settings component, user/tenant management
  system
- Existing patterns to follow: JWT utilities, Angular standalone components, Express middleware
  patterns, role-based access control
- Critical compatibility requirements: maintain existing session auth, follow current UI patterns,
  ensure backward database compatibility
- Each story includes verification that existing authentication and profile functionality remains
  intact

The epic maintains system integrity while delivering secure API token management for external
software integration."

## Notes

- This task is specifically for API token management enhancement
- Scope is appropriate for brownfield epic (3 focused stories)
- Always prioritize existing system integrity over new functionality
- All stories leverage existing authentication and UI patterns
- Epic provides foundation for future API ecosystem growth
