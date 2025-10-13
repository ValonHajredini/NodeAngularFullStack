# Epic 15: Step Form (Multi-Step Wizard) - Brownfield Enhancement

## Epic Goal

Add multi-step wizard functionality to the form builder, enabling users to create guided, sequential
forms that display one step at a time with navigation controls, improving user experience for
complex data collection workflows.

## Epic Description

### Existing System Context

**Current Relevant Functionality:**

- Visual form builder with drag-and-drop interface using Angular CDK
- Row-based multi-column layout system with flexible column configurations (1-4 columns per row)
- Field positioning system using `FieldPosition` interface (rowId, columnIndex, orderInColumn)
- Form schema versioning and publishing system with short links and QR codes
- Public form rendering via `FormRendererComponent` with responsive layout
- Form submissions stored in PostgreSQL with validation and sanitization
- Real-time analytics and data visualization system
- Form builder service (`FormBuilderService`) managing form state with Angular signals

**Technology Stack:**

- Frontend: Angular 20+ (standalone components), PrimeNG 17+, Tailwind CSS, Angular CDK Drag-Drop
- Backend: Express.js with TypeScript, PostgreSQL 15+, Clean Architecture (Controllers → Services →
  Repositories)
- Shared Types: `@nodeangularfullstack/shared` package with form-related interfaces
- State Management: NgRx Signals for reactive state

**Integration Points:**

- `packages/shared/src/types/forms.types.ts`: Form schema type definitions
- `apps/api/src/services/forms.service.ts`: Form business logic and validation
- `apps/api/src/controllers/forms.controller.ts`: Form API endpoints
- `apps/web/src/app/features/tools/components/form-builder/`: Form builder components
- `apps/web/src/app/features/public/form-renderer/`: Public form rendering
- Database: `forms`, `form_schemas`, `form_submissions` tables

### Enhancement Details

**What's Being Added/Changed:**

1. **Step Configuration System:**
   - Add "Step Form" tab in right sidebar (UI placeholder already exists per screenshot)
   - UI for creating, reordering, and configuring form steps
   - Each step has: title, description, optional validation rules
   - Steps can be added, edited, removed, and reordered

2. **Schema Extensions:**
   - Extend `FormSettings` interface to include optional `stepForm` configuration
   - Add `FormStep` interface defining step metadata (id, title, description, order)
   - Extend `FieldPosition` interface to include optional `stepId` property
   - Maintain backward compatibility with non-step forms

3. **Builder Canvas Updates:**
   - Add step selector/navigator in canvas area showing all steps as tabs or list
   - Canvas displays fields for currently selected step only
   - Drag-drop functionality scoped to active step
   - Visual indicators showing which step is active

4. **Public Form Rendering:**
   - Detect step form configuration in `FormRendererComponent`
   - Render current step fields only (not all fields at once)
   - Add "Next" and "Previous" navigation buttons
   - Display step progress indicator (e.g., "Step 2 of 5")
   - Validate current step before allowing navigation to next step
   - Show "Submit" button only on final step
   - Maintain form state across steps using reactive forms

5. **Validation & Submission:**
   - Step-level validation before proceeding to next step
   - Backend validation respects step structure
   - Submission data flattened (no nested step structure in database)
   - Analytics track step completion rates and drop-off points

**How It Integrates:**

- **Backward Compatibility:** Forms without `stepForm` configuration continue to render as
  single-page forms
- **Row Layout Integration:** Each step contains rows and columns using existing row layout system
- **Field Positioning:** Fields get assigned to steps via `position.stepId` property (optional,
  undefined for non-step forms)
- **Drag-Drop:** Palette-to-canvas and within-canvas drag-drop scoped to active step
- **Preview Mode:** Preview dialog shows step navigation (uses existing `PreviewDialogComponent`)
- **Publishing:** Short links and QR codes work identically for step forms
- **Submissions:** Database schema unchanged - step information stored in form schema, not
  submissions

**Success Criteria:**

1. Users can create multi-step forms with 2-10 steps per form
2. Each step can have independent row/column layouts
3. Public forms display one step at a time with navigation controls
4. Step validation prevents progression to next step with invalid data
5. Form submissions capture all fields regardless of step structure
6. Existing single-page forms continue to function without changes
7. Analytics track step-specific metrics (completion rates, drop-offs)
8. All existing tests pass and new tests achieve >80% coverage

## Stories

### Story 1: Backend - Step Schema Support and Validation

**Description:** Extend form schema types and backend services to support step configuration,
ensuring backward compatibility with existing forms.

**Tasks:**

- Add `FormStep`, `StepFormConfig` interfaces to `packages/shared/src/types/forms.types.ts`
- Extend `FormSettings` interface with optional `stepForm?: StepFormConfig` property
- Extend `FieldPosition` interface with optional `stepId?: string` property
- Update `forms.service.ts` validation to handle step configurations
- Add migration helper function to convert single-page forms to step forms
- Write unit tests for step validation logic
- Update API documentation (Swagger/JSDoc comments)

**Acceptance Criteria:**

- New types compile without errors across frontend and backend
- Validation accepts step form schemas with 2-10 steps
- Validation rejects invalid step configurations (e.g., duplicate step IDs, missing required fields)
- Existing forms without `stepForm` property continue to validate successfully
- Migration helper successfully converts single-page form to step form structure
- All existing backend tests pass
- New tests achieve >80% coverage for step-related code

### Story 2: Frontend - Step Configuration UI in Sidebar

**Description:** Implement the "Step Form" tab in the right sidebar, allowing users to enable step
mode, create steps, and configure step properties.

**Tasks:**

- Create `StepFormSidebarComponent` (standalone component) for step management UI
- Add "Enable Step Form" toggle switch with confirmation dialog
- Implement step list UI showing all steps with drag-to-reorder functionality
- Add "Add Step" button that creates new step with default values
- Create step edit dialog/modal for configuring step title, description
- Add "Delete Step" action with confirmation (prevent deleting last step)
- Update `FormBuilderService` to manage step state using signals
- Add methods: `enableStepForm()`, `addStep()`, `removeStep()`, `updateStep()`, `reorderSteps()`
- Persist step configuration to form schema on save
- Write unit tests for `StepFormSidebarComponent` and service methods

**Acceptance Criteria:**

- User can toggle step form mode on/off
- Enabling step form creates default first step and migrates existing fields
- User can add up to 10 steps total
- User can reorder steps via drag-and-drop
- User can edit step title and description via modal dialog
- User can delete steps (except when only 1 step remains)
- Step configuration persists when saving form
- Component tests achieve >80% coverage

### Story 3: Frontend - Canvas Step Navigation and Field Assignment

**Description:** Update form canvas to display step selector and scope field editing to the active
step.

**Tasks:**

- Add step navigation tabs/selector to `FormCanvasComponent` above canvas area
- Implement active step tracking using `FormBuilderService` signal
- Filter displayed fields to show only fields belonging to active step
- Update drag-drop logic to assign `position.stepId` when dropping fields
- Show visual indicator of active step (e.g., highlighted tab, badge)
- Add empty state message when step has no fields ("Drag fields here to add to Step 1")
- Update field deletion to handle step-specific fields
- Ensure row layout configuration is step-specific (each step has independent rows)
- Add "Step Settings" button to quickly edit active step properties
- Write unit tests for step navigation and field filtering logic

**Acceptance Criteria:**

- Step tabs/selector displays all steps with clear active state
- Clicking step tab switches canvas to display that step's fields
- Dragging field from palette assigns it to active step
- Fields cannot be dragged between steps (future enhancement)
- Empty steps show appropriate placeholder message
- Row layout sidebar shows rows for active step only
- All existing canvas tests pass
- New tests achieve >80% coverage

### Story 4: Frontend - Public Step Form Rendering and Navigation

**Description:** Update `FormRendererComponent` to detect step forms and render with step-by-step
navigation controls.

**Tasks:**

- Detect `formSchema.settings.stepForm.enabled` in `FormRendererComponent`
- Add step navigation state management (current step index, validation states)
- Render current step fields only (filter by `field.position.stepId`)
- Add step progress indicator component (e.g., "Step 2 of 5" or progress bar)
- Implement "Next" button with step-level validation before proceeding
- Implement "Previous" button to navigate back (preserves entered data)
- Show "Submit" button only on final step
- Add visual transition/animation between steps (optional, nice-to-have)
- Maintain form state across steps using single reactive form group
- Handle responsive layout for mobile (step navigation stacks vertically)
- Add keyboard navigation support (Enter = Next, Shift+Enter = Previous)
- Write unit tests for step rendering and navigation logic
- Add E2E test for complete step form submission workflow

**Acceptance Criteria:**

- Step forms render first step initially
- Progress indicator shows current step position accurately
- "Next" button validates current step before allowing progression
- "Previous" button navigates back without losing entered data
- "Submit" button appears only on final step
- Validation errors prevent navigation to next step
- Form submission includes all fields from all steps
- Responsive layout works on mobile devices
- Keyboard navigation functions correctly
- E2E test covers happy path and validation scenarios
- All existing renderer tests pass
- New tests achieve >80% coverage

### Story 5: Analytics, Testing, and Documentation

**Description:** Add step-specific analytics, comprehensive testing, and update documentation.

**Tasks:**

- Extend `StatisticsEngineService` to track step completion rates
- Add step drop-off analytics (track which steps users abandon)
- Update form analytics dashboard to display step-specific metrics
- Add visual chart showing step completion funnel
- Write integration tests for backend step form APIs
- Write E2E tests for builder workflow (create step form, publish, submit)
- Add performance tests for step forms with 10 steps and 50+ fields
- Update CLAUDE.md with step form architecture documentation
- Add JSDoc comments to all new interfaces, functions, and components
- Create developer guide for extending step form functionality
- Update user-facing documentation (if exists)

**Acceptance Criteria:**

- Analytics dashboard shows step completion rates per step
- Drop-off chart visualizes where users abandon step forms
- All integration tests pass for step form CRUD operations
- E2E tests cover complete step form lifecycle (create → publish → submit)
- Performance tests verify no degradation with complex step forms
- CLAUDE.md includes comprehensive step form documentation
- All public APIs have JSDoc comments
- Developer guide explains step form extension points
- Overall test coverage remains >80%

## Compatibility Requirements

- [x] Existing APIs remain unchanged (new endpoints optional, existing endpoints extended)
- [x] Database schema changes are backward compatible (new optional columns/fields only)
- [x] UI changes follow existing patterns (PrimeNG components, Tailwind styling, Angular CDK)
- [x] Performance impact is minimal (lazy loading, efficient rendering, signals)
- [x] Single-page forms continue to work without modification
- [x] Published forms created before enhancement remain accessible
- [x] Form submissions schema unchanged (step info in form schema, not submissions)

## Risk Mitigation

**Primary Risk:** Breaking existing single-page forms or form rendering during step form
implementation.

**Mitigation:**

- Feature flag approach: step forms only activate when `settings.stepForm.enabled === true`
- Comprehensive unit and integration tests for backward compatibility
- Graceful degradation: forms without `stepForm` property render as single-page (current behavior)
- Separate rendering logic paths for step vs. single-page forms
- Code reviews with focus on backward compatibility

**Secondary Risk:** Complex validation logic across multiple steps causing performance issues or
bugs.

**Mitigation:**

- Leverage Angular reactive forms for efficient validation
- Validate only current step before navigation (not all steps at once)
- Use signals for reactive state updates without excessive re-renders
- Performance testing with large step forms (10 steps, 50+ fields)
- Backend validation remains unchanged (validates all fields on submission)

**Rollback Plan:**

- Feature flag can disable step forms globally if critical issues arise
- Database schema changes are additive (no destructive migrations)
- Forms created without step configuration continue to function normally
- Code changes isolated to form builder and renderer components (limited blast radius)
- Git branch strategy allows quick rollback to previous stable version

## Definition of Done

- [x] All 5 stories completed with acceptance criteria met
- [x] Existing functionality verified through regression testing (all existing tests pass)
- [x] Integration points working correctly (backend ↔ frontend, builder ↔ renderer)
- [x] Documentation updated appropriately (CLAUDE.md, JSDoc, developer guide)
- [x] No regression in existing features (single-page forms unaffected)
- [x] Step forms functional end-to-end (create → configure → publish → submit)
- [x] Analytics track step-specific metrics accurately
- [x] Code reviewed and approved by team
- [x] Test coverage >80% for new code
- [x] Performance metrics meet acceptance criteria (no degradation)
- [x] Accessibility standards maintained (WCAG AA compliance)

---

**Epic Owner:** Product Manager (PM) **Created:** 2025-10-13 **Target Completion:** TBD (estimate:
3-4 sprints for 5 stories) **Epic Status:** Draft
