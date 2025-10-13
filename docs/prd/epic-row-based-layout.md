# **Epic: Form Builder Row-Based Multi-Column Layout System - Brownfield Enhancement**

## **Epic Goal**

Add a collapsible right sidebar to the form builder that enables row-by-row column configuration
(0-4 columns), allowing users to precisely control field placement within each row for flexible
multi-column form layouts.

## **Epic Description**

### **Existing System Context:**

- **Current relevant functionality:** Angular 20+ form builder with drag-and-drop field placement,
  two-panel layout (left field palette, center canvas), field properties modal, and global column
  layout settings (1-3 columns)
- **Technology stack:** Angular 20+ standalone components, PrimeNG 17+, Tailwind CSS, Angular CDK
  Drag-Drop, NgRx Signals for state management, TypeScript shared types in monorepo
- **Integration points:**
  - FormBuilderComponent
    ([form-builder.component.ts:354](apps/web/src/app/features/tools/components/form-builder/form-builder.component.ts#L354)) -
    Main component managing layout and settings
  - FormCanvasComponent
    ([form-canvas/form-canvas.component.ts](apps/web/src/app/features/tools/components/form-builder/form-canvas/form-canvas.component.ts)) -
    Canvas for field rendering with drag-drop
  - FormBuilderService
    ([form-builder.service.ts](apps/web/src/app/features/tools/components/form-builder/form-builder.service.ts)) -
    State management for form fields
  - FormSettings interface
    ([form-settings.component.ts:24](apps/web/src/app/features/tools/components/form-builder/form-settings/form-settings.component.ts#L24)) -
    Form configuration settings
  - FormField interface ([forms.types.ts:99](packages/shared/src/types/forms.types.ts#L99)) - Shared
    type definitions
  - FormLayout interface ([forms.types.ts:133](packages/shared/src/types/forms.types.ts#L133)) -
    Layout configuration (columns: 1-4)

### **Enhancement Details:**

- **What's being added/changed:**
  1. New collapsible right sidebar component with row-based column selector
  2. Row metadata model to track column count per row (0-4 columns)
  3. Enhanced drag-drop zones that respect row-column structure
  4. Field-to-row-column mapping in form schema
  5. Extended FormField type to include row/column position metadata

- **How it integrates:**
  - New `RowLayoutSidebarComponent` integrated into FormBuilderComponent's three-panel layout
  - FormBuilderService extended with row layout state management
  - FormCanvasComponent updated to render row-based column drop zones
  - Shared types extended with row/column positioning metadata
  - Existing field properties modal and settings remain unchanged

- **Success criteria:**
  - Users can toggle right sidebar visibility
  - Users can configure column count (0-4) for each form row
  - Fields can be dragged into specific row-column positions
  - Fields stay in assigned row-column positions when dropped
  - Row layout configuration persists with form schema
  - Existing forms without row layout continue to work (backward compatible)

## **Stories**

### 1. **Story 1: Collapsible Right Sidebar Component**

Create a collapsible right sidebar that displays form rows and allows users to configure column
layouts per row.

**Acceptance Criteria:**

- Sidebar component created as standalone Angular component (`RowLayoutSidebarComponent`)
- Toggle button to collapse/expand sidebar (icon changes based on state)
- Sidebar displays list of all form rows with visual row indicators
- Sidebar state persists across page reloads (localStorage)
- Sidebar integrates into FormBuilderComponent layout (three-panel: palette | canvas | row-layout)
- Responsive behavior: sidebar min-width 280px, max-width 400px
- Follows existing PrimeNG + Tailwind styling patterns

**Technical Details:**

- Location: `apps/web/src/app/features/tools/components/form-builder/row-layout-sidebar/`
- Integration point: FormBuilderComponent template (after `<app-form-canvas>`)
- State management: Signal-based local state for collapse/expand
- Styling: Tailwind classes matching existing sidebar patterns

---

### 2. **Story 2: Row-Column Configuration & Schema**

Extend the form schema and state management to support row-based column configuration.

**Acceptance Criteria:**

- Shared types extended with row/column metadata:
  - `RowLayoutConfig` interface (rowId, columnCount: 0-4)
  - `FieldPosition` interface (rowId, columnIndex: 0-3)
  - FormField extended with optional `position?: FieldPosition`
- Row configuration UI in sidebar (dropdown/buttons to select column count per row)
- FormBuilderService methods for row layout management:
  - `addRow()`, `removeRow(rowId)`, `updateRowColumns(rowId, count)`
  - `setFieldPosition(fieldId, position)`, `getRowLayout()`
- Form schema serialization includes row layout configuration
- Backward compatibility: forms without row metadata use default single-column layout
- Migration helper function to convert global column layout to row-based layout

**Technical Details:**

- Extend `packages/shared/src/types/forms.types.ts`
- Update `FormBuilderService` in
  `apps/web/src/app/features/tools/components/form-builder/form-builder.service.ts`
- Schema version bump or feature detection for row layout support
- Default row creation when fields are added without explicit row assignment

---

### 3. **Story 3: Enhanced Drag-Drop with Row-Column Zones**

Update the form canvas to render row-based column drop zones and handle field placement within
specific row-column positions.

**Acceptance Criteria:**

- FormCanvasComponent renders visual row separators and column drop zones
- Each row displays configured number of columns (0-4) as drop zones
- Drag-drop handlers updated to:
  - Accept drops into specific row-column positions
  - Validate drop targets (no duplicate fields in same position)
  - Update field position metadata on successful drop
- Visual feedback for valid/invalid drop targets (highlight, border colors)
- Fields render in their assigned row-column positions
- Dragging field from palette creates new field in target row-column
- Dragging existing field moves it to new row-column position
- Field ordering within rows respects columnIndex
- Empty columns show placeholder "Drop field here" state

**Technical Details:**

- Update
  `apps/web/src/app/features/tools/components/form-builder/form-canvas/form-canvas.component.ts`
- Angular CDK Drag-Drop with custom drop predicates
- Row/column rendering using CSS Grid layout
- Event emitters for field position changes
- Integration with FormBuilderService for state updates

---

## **Compatibility Requirements**

- [x] Existing APIs remain unchanged (FormBuilderService public API backward compatible)
- [x] Database schema changes are backward compatible (add optional row/column fields to FormField)
- [x] UI changes follow existing patterns (PrimeNG + Tailwind, Angular standalone components)
- [x] Performance impact is minimal (component-level state, lazy rendering, no additional API calls)

## **Risk Mitigation**

- **Primary Risk:** Breaking existing drag-drop functionality or field positioning in saved forms
- **Mitigation:**
  - Feature flag for row layout mode (default: disabled for existing forms, enabled for new forms)
  - Comprehensive unit tests for new drag-drop logic (Jasmine/Karma)
  - Backward compatibility layer: forms without row metadata render using existing single-column
    logic
  - Migration helper to convert global column layout to row-based layout (optional user action)
  - Visual indicator in UI showing row layout mode active/inactive
- **Rollback Plan:**
  - Hide sidebar via feature flag toggle (environment variable or user setting)
  - Forms created with row layout degrade gracefully to default single-column rendering
  - Database schema additions are nullable/optional fields (no migration required)
  - Revert component integration by removing `<app-row-layout-sidebar>` from template

## **Definition of Done**

- [x] All stories completed with acceptance criteria met
- [x] Existing functionality verified through testing (drag-drop, field properties, save/load)
- [x] Integration points working correctly (sidebar ↔ canvas ↔ service)
- [x] Unit tests written for:
  - RowLayoutSidebarComponent (collapse/expand, row display)
  - Row layout state management (FormBuilderService methods)
  - Drag-drop row-column logic (FormCanvasComponent)
- [x] E2E tests updated to cover row layout scenarios
- [x] Documentation updated appropriately:
  - CLAUDE.md with row layout feature description
  - JSDoc comments for new interfaces and methods
  - Component documentation in code
- [x] No regression in existing features (verified via existing test suite)
- [x] Code review completed
- [x] Deployed to staging environment for QA testing

---

## **Validation Checklist**

### **Scope Validation:**

- [x] Epic can be completed in 1-3 stories maximum ✓ (3 stories defined)
- [x] No architectural documentation is required ✓ (follows existing patterns)
- [x] Enhancement follows existing patterns ✓ (Angular standalone, PrimeNG, Tailwind)
- [x] Integration complexity is manageable ✓ (extends existing components)

### **Risk Assessment:**

- [x] Risk to existing system is low ✓ (backward compatible, feature flag)
- [x] Rollback plan is feasible ✓ (hide sidebar, degrade gracefully)
- [x] Testing approach covers existing functionality ✓ (unit + E2E tests)
- [x] Team has sufficient knowledge of integration points ✓ (Angular CDK, signals)

### **Completeness Check:**

- [x] Epic goal is clear and achievable ✓
- [x] Stories are properly scoped ✓ (UI, schema, drag-drop)
- [x] Success criteria are measurable ✓
- [x] Dependencies are identified ✓ (FormBuilderService, FormCanvasComponent, shared types)

---

## **Handoff to Story Manager**

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running **Angular 20+ standalone components, PrimeNG
  17+, Tailwind CSS, Angular CDK Drag-Drop**
- Integration points:
  - **FormBuilderComponent** - Main layout component (add sidebar integration)
  - **FormCanvasComponent** - Drag-drop canvas (add row-column zones)
  - **FormBuilderService** - State management (add row layout methods)
  - **Shared types** (`packages/shared/src/types/forms.types.ts`) - Extend with row/column metadata
- Existing patterns to follow:
  - Standalone components with `ChangeDetectionStrategy.OnPush`
  - Signal-based state management (NgRx Signals)
  - PrimeNG components (Button, Dialog, etc.) with Tailwind utility classes
  - Angular CDK Drag-Drop for drag-and-drop functionality
- Critical compatibility requirements:
  - **Backward compatibility** - existing forms without row metadata must render correctly
  - **Optional feature** - row layout should be opt-in, not forced on existing forms
  - **Schema extension** - add nullable/optional fields to FormField interface
  - **Migration path** - provide helper to convert global column layout to row-based layout
- Each story must include verification that existing functionality remains intact:
  - Existing drag-drop from palette to canvas
  - Field properties modal
  - Form save/load/publish workflows
  - Settings dialog

The epic should maintain system integrity while delivering **row-by-row multi-column layout control
via collapsible right sidebar**."

---

**Epic Status:** ✅ Ready for Story Development

**Epic ID:** `epic-row-based-layout`

**Target Milestone:** Form Builder Enhancement - Phase 2

**Estimated Effort:** 3-5 days (1-2 days per story)
