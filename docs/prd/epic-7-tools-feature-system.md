# Epic: Tools Feature System (Super Admin Managed) - Brownfield Enhancement

## Epic Goal

Add a “Tools” system managed from Super Admin → Settings that lets super admins globally enable or
disable modular tools. Deliver the first tool: Short Link (standalone component usable on public and
private pages) which shortens URLs, supports optional expiration, and exposes a copy-to-clipboard
action. Every tool checks DB activation before rendering.

## Existing System Context

- Current relevant functionality: Admin dashboards with role-based access.
- Technology stack: Angular 20 (PrimeNG/Tailwind), Node/Express API, PostgreSQL.
- Integration points: Admin auth/roles, API for feature toggles, DB for tool registry, API and DB
  for short links, public redirect route.

## Enhancement Details

- What’s being added/changed:
  - A global Tools management page (Super Admin → Settings) listing tools with on/off toggles;
    updates persist to DB.
  - A lightweight feature-gate mechanism in the front end to hide/show tool components based on
    DB-configured status.
  - First tool: Short Link (standalone component usable in public/private contexts) with create +
    copy + optional expiration and a public redirect route.
- How it integrates:
  - Admin UI follows existing Settings UX patterns.
  - API adds a tools registry (DB table) and endpoints to read/update tool statuses.
  - Front end uses a `ToolsService` / feature gate directive to fetch status and guard tool
    rendering.
  - Short Link adds API endpoints and DB table for short links; public redirect route.
- Success criteria:
  - Super admin can toggle tools globally; changes persist and reflect in UI without code redeploy.
  - Disabled tools do not render anywhere in the app (public or private).
  - Short Link creates a short URL, supports copy-to-clipboard, and optional expiration; expired
    links don’t resolve.
  - Public redirect works via app domain path (e.g., `/s/:code`) with proper HTTP 30x behavior and
    validation.

## Stories

1. Super Admin: Tools Settings + Registry
   - Admin Settings page lists tools with toggles; updates persist to DB.
   - API: list/update tool statuses; DB table `tools` (columns: `id`, `key` (unique), `name`,
     `description`, `active` (bool), timestamps).
   - Secure to super admin role; add basic caching/ETag where appropriate.

2. App: Feature Gate + Tools Registry Client
   - Angular `ToolsService` fetches status; directive/guard to conditionally render tool components.
   - Minimal client cache with invalidation on admin changes.
   - Update sample pages to respect gating for tool components.

3. Tool: Short Link (UI + API + Redirect)
   - Component: input URL, optional expiration, create action, copy result.
   - API: create/read/resolve short links (validates URL, respects feature flag); DB table
     `short_links` (columns: `id`, `code` (unique), `original_url`, `expires_at` (nullable),
     `created_by` (nullable), timestamps).
   - Public redirect route `/s/:code`; returns 404/410 on invalid/expired; safe redirect with
     scheme/domain validation.

## Compatibility Requirements

- Existing APIs remain unchanged; new endpoints are additive.
- Database changes are backward compatible (additive new tables only).
- UI follows existing Angular/PrimeNG/Tailwind patterns.
- Minimal performance impact; cache where sensible.

## Risk Mitigation

- Primary risk: Feature gate inconsistencies between client and server.
- Mitigation: Single source of truth via API + short TTL client cache + server-side checks on tool
  APIs.
- Rollback Plan: Disable tools via admin toggle; the feature-gate hides components. If needed,
  revert seed/migration for the tools registry.

## Definition of Done

- [ ] All stories completed with acceptance criteria met
- [ ] Existing functionality verified through testing
- [ ] Integration points working correctly
- [ ] Documentation updated appropriately
- [ ] No regression in existing features

## Validation Checklist

### Scope Validation

- [ ] Epic can be completed in 1–3 stories maximum
- [ ] No architectural documentation is required
- [ ] Enhancement follows existing patterns
- [ ] Integration complexity is manageable

### Risk Assessment

- [ ] Risk to existing system is low
- [ ] Rollback plan is feasible
- [ ] Testing approach covers existing functionality
- [ ] Team has sufficient knowledge of integration points

### Completeness Check

- [ ] Epic goal is clear and achievable
- [ ] Stories are properly scoped
- [ ] Success criteria are measurable
- [ ] Dependencies are identified

## Story Manager Handoff

“This brownfield epic adds a Tools system managed from Super Admin → Settings with global on/off
toggles. Stack: Angular 20 + Node/Express + PostgreSQL. Integration points: admin auth, tools
registry API, short links API, public redirect route. Follow established Angular/PrimeNG patterns,
REST API conventions, and DB migration practices. Critical compatibility: additive APIs/DB, minimal
performance impact, safe redirects. Each story must validate that existing functionality remains
intact.”

## Open Clarifications (Pending Decision)

- Tool key naming: prefer kebab-case keys, e.g., `short-link` — confirm?
- Short link path: use `/s/:code` — confirm?
- Expiration defaults: none by default; optional TTL parameter — confirm default TTL (if any)?
- Initial surfacing of Short Link: dedicate a small page + shared component for embedding — confirm?
- Additional initial tools beyond Short Link in this epic — any?
